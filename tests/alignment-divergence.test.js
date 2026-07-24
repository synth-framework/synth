// ============================================================
// EXP-PROGRAM-036 Phase 2 — Alignment Contract & Divergence Gate
// ============================================================
// Verifies that Mission approval is gated by an aligned Alignment
// Contract and that Divergence Gate decisions are replayable.

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { bootstrap } from "../dist/core/bootstrap.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { createAlignedContract, createAlignmentContract, createIntentModel, approveAlignmentContract } from "./helpers/alignment-fixture.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-alignment", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-alignment")
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
    genesis: { projectName: "Alignment Test", systemId: "alignment-test", partitions: 1 },
    skipGenesis: false,
  })
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-PROGRAM-036 Phase 2 — Alignment & Divergence")
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

test("Mission approval succeeds with aligned contract", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-ALIGNED", name: "Aligned Mission" } })
  const { contractId } = await createAlignedContract(ctx)

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-ALIGNED", alignmentContractId: contractId },
  })

  assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)
  const state = await ctx.runtime.getState()
  assert.equal(state.missions["M-ALIGNED"].status, "active", "Mission should be active after approval")
  assert.equal(state.missions["M-ALIGNED"].alignmentContractId, contractId, "Mission should record alignment contract")
})

test("Mission approval fails without alignment contract", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-UNALIGNED", name: "Unaligned Mission" } })

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-UNALIGNED" },
  })

  assert.equal(result.status, "error", "ApproveMission should fail without alignment contract")
  assert.ok(result.error.includes("ALIGNMENT_CONTRACT_REQUIRED"), `Error should mention ALIGNMENT_CONTRACT_REQUIRED: ${result.error}`)
  const state = await ctx.runtime.getState()
  assert.equal(state.missions["M-UNALIGNED"].status, "draft", "Mission should remain draft")
})

test("Mission approval fails with unknown alignment contract", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-UNKNOWN", name: "Unknown Contract Mission" } })

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-UNKNOWN", alignmentContractId: "contract-does-not-exist" },
  })

  assert.equal(result.status, "error", "ApproveMission should fail with unknown contract")
  assert.ok(result.error.includes("ALIGNMENT_CONTRACT_NOT_FOUND"), `Error should mention ALIGNMENT_CONTRACT_NOT_FOUND: ${result.error}`)
})

test("Mission approval fails when divergence gate is not aligned", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-NOT-ALIGNED", name: "Not Aligned Mission" } })

  const { intentModelId } = await createIntentModel(ctx)
  const { contractId } = await createAlignmentContract(ctx, intentModelId)
  await approveAlignmentContract(ctx, contractId)

  // Open the gate but do not resolve it
  const openResult = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  assert.equal(openResult.status, "ok", `OpenDivergenceGate should succeed: ${openResult.error}`)

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-NOT-ALIGNED", alignmentContractId: contractId },
  })

  assert.equal(result.status, "error", "ApproveMission should fail when gate is not aligned")
  assert.ok(result.error.includes("DIVERGENCE_GATE_NOT_ALIGNED"), `Error should mention DIVERGENCE_GATE_NOT_ALIGNED: ${result.error}`)
})

test("Mission approval fails when divergence gate requires revision", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-REVISION", name: "Revision Mission" } })

  const { intentModelId } = await createIntentModel(ctx)
  const { contractId } = await createAlignmentContract(ctx, intentModelId)
  await approveAlignmentContract(ctx, contractId)

  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  assert.equal(result.status, "ok", `OpenDivergenceGate should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const opened = events.slice().reverse().find((e) => e.type === "DIVERGENCE_GATE_OPENED" && e.payload.contractId === contractId)
  assert.ok(opened, "DIVERGENCE_GATE_OPENED event should exist")

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ResolveDivergenceGate",
    payload: {
      gateId: opened.payload.gateId,
      decision: "revision_required",
      reviewer: { kind: "human", id: "test-operator" },
      reason: "Contract does not yet capture the workspace-first metaphor",
      evidence: ["design-board-v4.png"],
    },
  })
  assert.equal(result.status, "ok", `ResolveDivergenceGate should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-REVISION", alignmentContractId: contractId },
  })

  assert.equal(result.status, "error", "ApproveMission should fail when gate requires revision")
  assert.ok(result.error.includes("DIVERGENCE_GATE_NOT_ALIGNED"), `Error should mention DIVERGENCE_GATE_NOT_ALIGNED: ${result.error}`)
})

test("Divergence gate events are replayable", async () => {
  const ctx = await makeCtx()
  const { intentModelId, contractId, gateId } = await createAlignedContract(ctx)

  const events = await ctx.infra.eventStore.loadAll()
  const created = events.find((e) => e.type === "ALIGNMENT_CONTRACT_CREATED" && e.payload.contractId === contractId)
  const submitted = events.find((e) => e.type === "ALIGNMENT_CONTRACT_SUBMITTED" && e.payload.contractId === contractId)
  const approved = events.find((e) => e.type === "ALIGNMENT_CONTRACT_APPROVED" && e.payload.contractId === contractId)
  const opened = events.find((e) => e.type === "DIVERGENCE_GATE_OPENED" && e.payload.gateId === gateId)
  const resolved = events.find((e) => e.type === "DIVERGENCE_GATE_RESOLVED" && e.payload.gateId === gateId)

  assert.ok(created, "ALIGNMENT_CONTRACT_CREATED event should exist")
  assert.ok(submitted, "ALIGNMENT_CONTRACT_SUBMITTED event should exist")
  assert.ok(approved, "ALIGNMENT_CONTRACT_APPROVED event should exist")
  assert.ok(opened, "DIVERGENCE_GATE_OPENED event should exist")
  assert.ok(resolved, "DIVERGENCE_GATE_RESOLVED event should exist")
  assert.equal(resolved.payload.decision, "aligned", "Resolved decision should be aligned")

  const state = await ctx.runtime.getState()
  const derived = buildDerivedState(events)
  assert.equal(derived.alignmentContracts[contractId].status, "approved", "Contract should be approved in derived state")
  assert.equal(derived.divergenceGates[gateId].status, "aligned", "Gate should be aligned in derived state")
})

await run()
