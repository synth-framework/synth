// ============================================================
// EXP-GATE-013 — Expedition Dependency Enforcement Tests
// ============================================================
// Verifies that:
//   - upstream gate status propagates to downstream expeditions
//   - partial_pass / fail / missing certifications block downstream work
//   - pass unblocks downstream work
//   - the execution gate pre-flight denies blocked capabilities
// ============================================================

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import os from "os"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-dependency-enforcement", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-dependency-enforcement")
  try { await fs.rm(base, { recursive: true }) } catch { /* ok */ }
}

async function makeCtx() {
  const dataDir = makeDataDir()
  const ctx = await bootstrap({
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
    },
    genesis: { projectName: "Dependency Enforcement Test", systemId: "dep-test", partitions: 1 },
    skipGenesis: false,
  })
  const originalHandleIntent = ctx.api.handleIntent.bind(ctx.api)
  ctx.api.handleIntent = (req) =>
    originalHandleIntent({
      ...req,
      context: { ...(req.context || {}), disableLifecycleContinuation: true },
    })
  return ctx
}

async function approveMission(ctx, id) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id, name: `Mission ${id}`, purpose: "Dependency enforcement test" },
  })
  assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)

  const { contractId } = await createAlignedContract(ctx)
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)
  return { contractId }
}

async function createExpedition(ctx, missionId, expeditionId, dependsOn = []) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId, name: `Expedition ${expeditionId}`, dependsOn },
  })
  assert.equal(result.status, "ok", `CreateExpedition should succeed: ${result.error}`)
}

async function advanceToCommitted(ctx, expeditionId) {
  let result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `ApproveExpedition should succeed: ${result.error}`)
  result = await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `CommitExpedition should succeed: ${result.error}`)
}

async function advanceToExecuting(ctx, expeditionId) {
  await advanceToCommitted(ctx, expeditionId)
  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `StartExpedition should succeed: ${result.error}`)
}

async function completeExpedition(ctx, expeditionId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteExpedition",
    payload: { id: expeditionId },
  })
  assert.equal(result.status, "ok", `CompleteExpedition should succeed: ${result.error}`)
}

async function certifyConvergence(ctx, missionId, expeditionId, contractId, decision) {
  // Force the desired certification decision by controlling evidence completeness.
  // Aligned observed features satisfy the required-behavior rule; incomplete evidence
  // forces insufficient_evidence while complete evidence produces converged.
  const emptyEvidence = decision === "insufficient_evidence"
  const alignedFeatures = {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  }
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: alignedFeatures,
      artifacts: emptyEvidence ? [] : [{ kind: "artifact", id: "impl", path: "/impl.html", description: "Implementation" }],
      runtimeEvidence: emptyEvidence ? [] : [{ kind: "runtime", id: "runtime", source: "test", observation: "ok", timestamp: Date.now() }],
      executionEvidence: emptyEvidence ? [] : [{ kind: "execution", id: "exec", eventIds: ["e1"], summary: "passed" }],
    },
  })
  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)
  assert.equal(result.result?.decision, decision, `Expected ${decision}, got ${result.result?.decision}`)
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-GATE-013 — Dependency Enforcement")
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

// ------------------------------------------------------------------
// Status propagation
// ------------------------------------------------------------------

test("downstream blocked when upstream completed without certification", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-NO-CERT")
  await createExpedition(ctx, "M-NO-CERT", "upstream-no-cert")
  await advanceToExecuting(ctx, "upstream-no-cert")
  await completeExpedition(ctx, "upstream-no-cert")

  await createExpedition(ctx, "M-NO-CERT", "downstream-no-cert", ["upstream-no-cert"])

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveExpedition",
    payload: { id: "downstream-no-cert" },
  })
  assert.equal(result.status, "error", "downstream approval should be blocked")
  assert.ok(
    result.error?.includes("dependency-enforcement") || result.error?.includes("DEPENDENCY_GATE_BLOCKED"),
    `expected dependency gate block, got: ${result.error}`,
  )
})

test("downstream blocked when upstream certification is partial_pass", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-PARTIAL")
  await createExpedition(ctx, "M-PARTIAL", "upstream-partial")
  await advanceToExecuting(ctx, "upstream-partial")
  await completeExpedition(ctx, "upstream-partial")
  await certifyConvergence(ctx, "M-PARTIAL", "upstream-partial", contractId, "insufficient_evidence")

  await createExpedition(ctx, "M-PARTIAL", "downstream-partial", ["upstream-partial"])

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveExpedition",
    payload: { id: "downstream-partial" },
  })
  assert.equal(result.status, "error", "downstream approval should be blocked")
  assert.ok(
    result.error?.includes("dependency-enforcement") || result.error?.includes("DEPENDENCY_GATE_BLOCKED"),
    `expected dependency gate block, got: ${result.error}`,
  )
})

test("downstream proceeds when upstream certification passes", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-PASS")
  await createExpedition(ctx, "M-PASS", "upstream-pass")
  await advanceToExecuting(ctx, "upstream-pass")
  await completeExpedition(ctx, "upstream-pass")
  await certifyConvergence(ctx, "M-PASS", "upstream-pass", contractId, "converged")

  await createExpedition(ctx, "M-PASS", "downstream-pass", ["upstream-pass"])
  await advanceToCommitted(ctx, "downstream-pass")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "StartExpedition",
    payload: { id: "downstream-pass" },
  })
  assert.equal(result.status, "ok", `downstream start should succeed: ${result.error}`)
})

// ------------------------------------------------------------------
// Dependency status map propagation
// ------------------------------------------------------------------

test("derived state dependencyStatusMap reflects upstream certification", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-MAP")
  await createExpedition(ctx, "M-MAP", "upstream-map")
  await advanceToExecuting(ctx, "upstream-map")
  await completeExpedition(ctx, "upstream-map")
  await certifyConvergence(ctx, "M-MAP", "upstream-map", contractId, "insufficient_evidence")

  await createExpedition(ctx, "M-MAP", "downstream-map", ["upstream-map"])

  const derived = ctx.runtime.getDerivedState
    ? await ctx.runtime.getDerivedState()
    : (await import("../dist/state/derived/index.js")).buildDerivedState(await ctx.infra.eventStore.loadAll())

  assert.ok(derived.dependencyStatusMap, "dependencyStatusMap should exist")
  assert.equal(derived.dependencyStatusMap["downstream-map"], "partial", "downstream should be partial")
})

// ------------------------------------------------------------------

cleanData().then(run)
