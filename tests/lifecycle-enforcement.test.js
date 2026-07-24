// Regression guards for EXP-GOV-006 — Agent Lifecycle Enforcement.
//
// These tests verify the intake gate: the runtime boundary that decides
// whether an agent action is allowed against the current canonical state.

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { bootstrap } from "../dist/core/bootstrap.js"
import { validateAgentAction } from "../dist/governance/intake.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-lifecycle", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-lifecycle")
  try { await fs.rm(base, { recursive: true }) } catch { /* ok */ }
}

async function makeCtx() {
  const dataDir = makeDataDir()
  return bootstrap({
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
    },
    genesis: { projectName: "Lifecycle Test", systemId: "lifecycle-test", partitions: 1 },
    skipGenesis: false,
  })
}

async function getState(ctx) {
  return ctx.runtime.getState()
}

async function approveMission(ctx, id) {
  const { contractId } = await createAlignedContract(ctx)
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-GOV-006 — Lifecycle Enforcement Tests")
  console.log("═══════════════════════════════════════════════════\n")

  for (const t of TESTS) {
    try {
      await t.fn()
      console.log(`  [PASS] ${t.name}`)
      passed++
    } catch (err) {
      console.log(`  [FAIL] ${t.name}`)
      console.log(`         ${err.message || err}`)
      failed++
    }
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log("═══════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

test("mission.create is always allowed on empty state", async () => {
  const ctx = await makeCtx()
  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "mission.create" }, state)
  assert.equal(result.decision, "ALLOW")
})

test("expedition.create is allowed on empty state", async () => {
  const ctx = await makeCtx()
  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.create" }, state)
  assert.equal(result.decision, "ALLOW")
})

test("expedition.create is allowed when a mission is active", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.create" }, state)
  assert.equal(result.decision, "ALLOW")
  assert.equal(result.activeMissionId, "M-1")
})

test("expedition.create is blocked while another expedition is executing", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-1", missionId: "M-1", name: "First Expedition" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-1" } })

  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.create" }, state)
  assert.equal(result.decision, "BLOCK")
  assert.match(result.reason, /E-1.*executing/i)
})

test("expedition.start is blocked when expedition is only approved but another is executing", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-1", missionId: "M-1", name: "First" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-1" } })

  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-2", missionId: "M-1", name: "Second" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-2" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-2" } })

  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.start", expeditionId: "E-2" }, state)
  assert.equal(result.decision, "BLOCK")
  assert.match(result.reason, /E-1.*already executing/i)
})

test("expedition.complete is blocked when expedition is not executing", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-1", missionId: "M-1", name: "Test Expedition" } })

  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.complete", expeditionId: "E-1" }, state)
  assert.equal(result.decision, "BLOCK")
  assert.match(result.reason, /draft.*executing/i)
})

test("expedition.complete is allowed when expedition is executing", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-1", missionId: "M-1", name: "Test Expedition" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-1" } })

  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.complete", expeditionId: "E-1" }, state)
  assert.equal(result.decision, "ALLOW")
  assert.equal(result.activeExpeditionId, "E-1")
})

test("execution.mutate is blocked without an active expedition", async () => {
  const ctx = await makeCtx()
  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "execution.mutate", expeditionId: "E-1" }, state)
  assert.equal(result.decision, "BLOCK")
  assert.match(result.reason, /no expedition.*executing/i)
})

test("execution.mutate is allowed with an active expedition", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-1", missionId: "M-1", name: "Test Expedition" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-1" } })

  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "execution.mutate", expeditionId: "E-1" }, state)
  assert.equal(result.decision, "ALLOW")
  assert.equal(result.activeExpeditionId, "E-1")
})

test("completing an expedition unlocks creating the next expedition", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-1", name: "Test Mission" } })
  await approveMission(ctx, "M-1")
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-1", missionId: "M-1", name: "First" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-1" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CompleteExpedition", payload: { id: "E-1" } })

  const state = await getState(ctx)
  const result = validateAgentAction({ kind: "expedition.create" }, state)
  assert.equal(result.decision, "ALLOW")
})

await cleanData()
try {
  await run()
} finally {
  await cleanData()
}
