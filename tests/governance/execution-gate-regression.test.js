// ============================================================
// ExecutionGate Mutation Boundary Regression Test
// ============================================================
// Verifies the single mutation boundary introduced by
// EXP-CAPABILITY-BOUNDARY-001.
//
// Scenarios:
//   1. FilesystemWrite without governance authority is blocked.
//   2. FilesystemWrite with approved mission + committed expedition succeeds
//      and emits EXPEDITION_AUTHORIZED.
//   3. Scoped expedition allows in-scope mutations and blocks out-of-scope
//      mutations.
//
// This test proves the primitive works when invoked. It does NOT prove that
// every direct fs.writeFile path has been migrated; that is a follow-up
// expedition to wire remaining mutation producers behind ExecutionGate.
// ============================================================

import { strict as assert } from "assert"
import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"
import { createAlignedContract } from "../helpers/alignment-fixture.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BOOTSTRAP_PATH = path.resolve(__dirname, "..", "..", "dist", "core", "bootstrap.js")
const HASH_PATH = path.resolve(__dirname, "..", "..", "dist", "core", "hash.js")
const GATE_PATH = path.resolve(__dirname, "..", "..", "dist", "control", "execution-gate.js")
const STATE_STORE_PATH = path.resolve(__dirname, "..", "..", "dist", "infra", "state-store.js")
const ERRORS_PATH = path.resolve(__dirname, "..", "..", "dist", "core", "errors.js")

async function loadModules() {
  const { bootstrap } = await import(BOOTSTRAP_PATH)
  const { computeEventHash } = await import(HASH_PATH)
  const { ExecutionGateError } = await import(GATE_PATH)
  return { bootstrap, computeEventHash, ExecutionGateError }
}

function buildEvent({ type, payload, previousHash, actor = "test", capability = "test" }, computeEventHash) {
  const id = crypto.randomUUID()
  const event = {
    id,
    type,
    timestamp: Date.now(),
    transactionId: `tx-${id}`,
    capability,
    actor,
    payload,
    previousHash,
    eventHash: "",
  }
  event.eventHash = computeEventHash(event)
  return event
}

function baseMission(id) {
  return {
    id,
    name: "Boundary Test Mission",
    purpose: "Test the mutation authority boundary",
    status: "draft",
    expeditions: [],
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function baseExpedition(id, missionId, scope) {
  return {
    id,
    missionId,
    name: "Boundary Test Expedition",
    goal: "Exercise ExecutionGate mutation boundary",
    status: "draft",
    objectives: [],
    discoveries: [],
    decisions: [],
    dependsOn: [],
    metadata: scope ? { scope } : {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function humanApprovedIdentity() {
  return {
    agentId: "test-agent",
    sessionId: "test-session",
    approvalMode: "human-approved",
    issuedAt: new Date().toISOString(),
  }
}

function autonomousIdentity() {
  return {
    agentId: "test-agent",
    sessionId: "test-session",
    approvalMode: "autonomous",
    issuedAt: new Date().toISOString(),
  }
}

async function seedExecutingAuthority(ctx, computeEventHash, { missionId, expeditionId, scope }) {
  const result = await seedAuthority(ctx, computeEventHash, { missionId, expeditionId, scope })

  const startResult = await ctx.gate.execute({
    actor: "test",
    capability: "StartExpedition",
    payload: { id: expeditionId },
    context: { identity: humanApprovedIdentity() },
  })
  assert.strictEqual(startResult.contract.finalState, "COMMITTED", "StartExpedition must commit")

  return result
}

async function seedAuthority(ctx, computeEventHash, { missionId, expeditionId, scope }) {
  let previousHash = await ctx.gate.getLastEventHash()
  const events = []

  const mission = baseMission(missionId)
  events.push(buildEvent({ type: "MISSION_CREATED", payload: { mission }, previousHash }, computeEventHash))
  previousHash = events[events.length - 1].eventHash

  const expedition = baseExpedition(expeditionId, missionId, scope)
  events.push(buildEvent({ type: "EXPEDITION_CREATED", payload: { expedition }, previousHash }, computeEventHash))

  // Genesis may only seed structural objects. Operational lifecycle
  // transitions must execute through the governed operational path.
  await ctx.gate.executeGenesis(events)

  // Establish an aligned alignment contract so the mission can be approved.
  const { contractId } = await createAlignedContract(ctx)

  let result = await ctx.gate.execute({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.strictEqual(result.contract.finalState, "COMMITTED", "ApproveMission must commit")

  result = await ctx.gate.execute({
    actor: "test",
    capability: "ApproveExpedition",
    payload: { id: expeditionId },
  })
  assert.strictEqual(result.contract.finalState, "COMMITTED", "ApproveExpedition must commit")

  result = await ctx.gate.execute({
    actor: "test",
    capability: "CommitExpedition",
    payload: { id: expeditionId },
  })
  assert.strictEqual(result.contract.finalState, "COMMITTED", "CommitExpedition must commit")

  return { mission, expedition, contractId }
}

async function registerRuntimeCapabilities(ctx) {
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }
}

async function testBlockedWithoutAuthority() {
  const { bootstrap, ExecutionGateError } = await loadModules()
  const ctx = await bootstrap({ infra: { persistence: "memory" }, skipGenesis: true })
  await registerRuntimeCapabilities(ctx)

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "synth-boundary-blocked-"))
  const target = path.join(tempRoot, "website", "index.html")

  try {
    await ctx.gate.execute({
      actor: "agent",
      capability: "FilesystemWrite",
      payload: { path: target, content: "should not be written" },
    })
    assert.fail("mutation without authority must be blocked")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.strictEqual(err.phase, "MUTATE_EXTERNAL", "failure must occur in mutation phase")
    assert.ok(err.message.includes("No approved Mission exists"), `reason should cite missing mission: ${err.message}`)
  }

  try {
    await fs.access(target)
    assert.fail("target file must not exist when mutation is blocked")
  } catch {
    // expected
  }

  await fs.rm(tempRoot, { recursive: true, force: true })
  console.log("[PASS] FilesystemWrite blocked without authority")
}

async function testGenesisRejectsOperationalEvents() {
  const { bootstrap, computeEventHash } = await loadModules()
  const ctx = await bootstrap({ infra: { persistence: "memory" }, skipGenesis: true })

  const previousHash = await ctx.gate.getLastEventHash()
  const operationalEvents = [
    buildEvent({ type: "MISSION_APPROVED", payload: { id: "m-guard" }, previousHash }, computeEventHash),
  ]

  try {
    await ctx.gate.executeGenesis(operationalEvents)
    assert.fail("genesis must reject operational lifecycle events")
  } catch (err) {
    assert.ok(err.message.includes("GENESIS_EVENT_TYPE_REJECTED"), `expected genesis rejection, got ${err.message}`)
    assert.ok(err.message.includes("MISSION_APPROVED"), `rejection must cite the offending type: ${err.message}`)
  }

  // EXPEDITION_AUTHORIZED in particular must never be seeded — it is the
  // operational proof that a mutation was authorized by an expedition.
  const authorizedEvent = buildEvent(
    { type: "EXPEDITION_AUTHORIZED", payload: { id: "exp-guard", targets: ["/etc/passwd"] }, previousHash },
    computeEventHash,
  )
  try {
    await ctx.gate.executeGenesis([authorizedEvent])
    assert.fail("genesis must reject EXPEDITION_AUTHORIZED events")
  } catch (err) {
    assert.ok(err.message.includes("EXPEDITION_AUTHORIZED"), `rejection must cite EXPEDITION_AUTHORIZED: ${err.message}`)
  }

  console.log("[PASS] Genesis rejects operational lifecycle events")
}

async function testAllowedWithAuthority() {
  const { bootstrap, computeEventHash } = await loadModules()
  const ctx = await bootstrap({ infra: { persistence: "memory" }, skipGenesis: true })
  await registerRuntimeCapabilities(ctx)

  const missionId = "mission-boundary"
  const expeditionId = "exp-boundary-001"
  await seedAuthority(ctx, computeEventHash, { missionId, expeditionId })

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "synth-boundary-allowed-"))
  const target = path.join(tempRoot, "website", "index.html")
  const content = "<html>Mutation boundary works</html>"

  const beforeEvents = await ctx.infra.eventStore.loadAll()
  const beforeCount = beforeEvents.length

  const { result, contract } = await ctx.gate.execute({
    actor: "agent",
    capability: "FilesystemWrite",
    payload: { path: target, content },
  })

  assert.strictEqual(contract.finalState, "COMMITTED", "authorized mutation must commit")
  assert.ok(result.success, "execution result must report success")

  const written = await fs.readFile(target, "utf-8")
  assert.strictEqual(written, content, "filesystem provider must write exact content")

  const afterEvents = await ctx.infra.eventStore.loadAll()
  assert.ok(afterEvents.length > beforeCount, "mutation must emit at least one new event")

  const authorizedEvent = afterEvents[afterEvents.length - 1]
  assert.strictEqual(authorizedEvent.type, "EXPEDITION_AUTHORIZED", "successful mutation must emit EXPEDITION_AUTHORIZED")
  assert.strictEqual(authorizedEvent.payload.id, expeditionId, "event must reference the authorizing expedition")
  assert.deepStrictEqual(authorizedEvent.payload.targets, [target], "event must record the mutation target")

  await fs.rm(tempRoot, { recursive: true, force: true })
  console.log("[PASS] FilesystemWrite allowed with proper authority")
}

async function testScopeBoundary() {
  const { bootstrap, computeEventHash, ExecutionGateError } = await loadModules()
  const ctx = await bootstrap({ infra: { persistence: "memory" }, skipGenesis: true })
  await registerRuntimeCapabilities(ctx)

  const missionId = "mission-scope"
  const expeditionId = "exp-scope-001"
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "synth-boundary-scope-"))
  const scopeRoot = path.join(tempRoot, "website", "hero") + path.sep
  await fs.mkdir(scopeRoot, { recursive: true })

  const relativeScope = path.relative(process.cwd(), scopeRoot).split(path.sep).join("/") + "/**"
  await seedAuthority(ctx, computeEventHash, {
    missionId,
    expeditionId,
    scope: [relativeScope],
  })

  // In-scope mutation should succeed.
  const inScopeTarget = path.join(scopeRoot, "hero.html")
  const inScopeResult = await ctx.gate.execute({
    actor: "agent",
    capability: "FilesystemWrite",
    payload: { path: inScopeTarget, content: "in scope" },
  })
  assert.strictEqual(inScopeResult.contract.finalState, "COMMITTED", "in-scope mutation must commit")
  assert.strictEqual(await fs.readFile(inScopeTarget, "utf-8"), "in scope", "in-scope file must be written")

  // Out-of-scope mutations should be blocked.
  const outOfScopeTargets = [
    { target: path.join(tempRoot, "auth", "login.html"), label: "authentication module" },
    { target: path.join(tempRoot, "package.json"), label: "dependency manifest" },
    { target: path.join(tempRoot, "src", "database", "schema.sql"), label: "database schema" },
  ]

  for (const { target, label } of outOfScopeTargets) {
    try {
      await ctx.gate.execute({
        actor: "agent",
        capability: "FilesystemWrite",
        payload: { path: target, content: label },
      })
      assert.fail(`${label} mutation must be blocked when outside scope`)
    } catch (err) {
      assert.ok(err instanceof ExecutionGateError, `${label}: expected ExecutionGateError`)
      assert.strictEqual(err.phase, "MUTATE_EXTERNAL", `${label}: failure must occur in mutation phase`)
      assert.ok(err.message.includes("outside authorized expedition scope"), `${label}: reason should cite scope: ${err.message}`)
    }
    try {
      await fs.access(target)
      assert.fail(`${label}: out-of-scope file must not exist`)
    } catch {
      // expected
    }
  }

  await fs.rm(tempRoot, { recursive: true, force: true })
  console.log("[PASS] Scope boundary enforced")
}

async function testStateStoreGuard() {
  const { StateStore } = await import(STATE_STORE_PATH)
  const { IllegalMutationError } = await import(ERRORS_PATH)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-state-guard-"))
  const statePath = path.join(tmpDir, "canonical-state.json")
  const minimalState = {
    stateHash: "test-hash",
    version: 1,
    missions: {},
    expeditions: {},
    workItems: {},
    plans: {},
    milestones: {},
    projects: {},
    objectives: {},
    discoveries: {},
    decisions: {},
    referenceEvidence: {},
    repository: {},
  }

  // Direct instantiation must be read-only.
  const unauthorizedStore = new StateStore(statePath)
  await unauthorizedStore.initialize()
  try {
    await unauthorizedStore.save(minimalState)
    assert.fail("direct StateStore.save must be blocked")
  } catch (err) {
    assert.ok(err instanceof IllegalMutationError, `expected IllegalMutationError, got ${err}`)
    assert.ok(err.message.includes("ILLEGAL_STATESTORE_WRITE"), `reason should cite illegal write: ${err.message}`)
  }
  try {
    await unauthorizedStore.commit({ id: "tx-test", intent: {}, status: "pending", startedAt: 0, events: [] }, minimalState)
    assert.fail("direct StateStore.commit must be blocked")
  } catch (err) {
    assert.ok(err instanceof IllegalMutationError, `expected IllegalMutationError, got ${err}`)
  }

  // Authorized instantiation (from createInfra) must permit writes.
  const authorizedStore = StateStore.createAuthorized(statePath)
  await authorizedStore.save(minimalState)
  const loaded = await authorizedStore.load()
  assert.ok(loaded, "authorized store must persist and load state")
  assert.strictEqual(loaded.stateHash, minimalState.stateHash, "loaded state must match saved state")

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] StateStore write guard blocks unauthorized mutations")
}

async function testRuntimeDataBoundary() {
  const { bootstrap, computeEventHash, ExecutionGateError } = await loadModules()
  const ctx = await bootstrap({ infra: { persistence: "memory" }, skipGenesis: true })
  await registerRuntimeCapabilities(ctx)

  const missionId = "mission-runtime-data"
  const expeditionId = "exp-runtime-data-001"
  const runtimeTarget = path.resolve("data", "runtime-data-test.json")

  // With only a committed expedition and autonomous identity, runtime data writes are blocked.
  await seedAuthority(ctx, computeEventHash, { missionId, expeditionId })

  try {
    await ctx.gate.execute({
      actor: "agent",
      capability: "FilesystemWrite",
      payload: { path: runtimeTarget, content: "should not write" },
      context: { identity: autonomousIdentity() },
    })
    assert.fail("runtime data mutation without executing expedition must be blocked")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.strictEqual(err.phase, "MUTATE_EXTERNAL", "failure must occur in mutation phase")
    assert.ok(err.message.includes("executing status"), `reason should cite executing status: ${err.message}`)
  }

  // Start the expedition, but keep identity autonomous — still blocked.
  const startResult = await ctx.gate.execute({
    actor: "test",
    capability: "StartExpedition",
    payload: { id: expeditionId },
    context: { identity: humanApprovedIdentity() },
  })
  assert.strictEqual(startResult.contract.finalState, "COMMITTED", "StartExpedition must commit")

  try {
    await ctx.gate.execute({
      actor: "agent",
      capability: "FilesystemWrite",
      payload: { path: runtimeTarget, content: "should not write" },
      context: { identity: autonomousIdentity() },
    })
    assert.fail("runtime data mutation without operator approval must be blocked")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.ok(err.message.includes("operator approval"), `reason should cite operator approval: ${err.message}`)
  }

  // With executing expedition and human-approved identity, the runtime data write succeeds.
  const { result, contract } = await ctx.gate.execute({
    actor: "agent",
    capability: "FilesystemWrite",
    payload: { path: runtimeTarget, content: "runtime data write ok" },
    context: { identity: humanApprovedIdentity() },
  })
  assert.strictEqual(contract.finalState, "COMMITTED", "authorized runtime data mutation must commit")
  assert.ok(result.success, "execution result must report success")
  assert.strictEqual(await fs.readFile(runtimeTarget, "utf-8"), "runtime data write ok", "runtime data file must be written")

  await fs.rm(runtimeTarget, { force: true })
  console.log("[PASS] Runtime data mutation boundary enforced")
}

async function main() {
  for (const file of [BOOTSTRAP_PATH, HASH_PATH, GATE_PATH, STATE_STORE_PATH, ERRORS_PATH]) {
    try {
      await fs.access(file)
    } catch {
      console.error(`[SKIP] Required module not built: ${file}. Run 'npm run build' first.`)
      process.exit(0)
    }
  }

  await testBlockedWithoutAuthority()
  await testGenesisRejectsOperationalEvents()
  await testAllowedWithAuthority()
  await testScopeBoundary()
  await testStateStoreGuard()
  await testRuntimeDataBoundary()

  console.log("\n[EXECUTION GATE REGRESSION] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  if (err.stack) console.error(err.stack)
  process.exit(1)
})
