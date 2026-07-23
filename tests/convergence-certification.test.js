// ============================================================
// EXP-GOVERNABILITY-005 — Convergence Certification Tests
// ============================================================
// Verifies that Convergence Certification:
//   - rejects drifted mission outcomes (D01-D03)
//   - certifies aligned mission outcomes (V01)
//   - produces deterministic results
//   - produces explainable traceability evidence
//   - gates Mission completion

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { buildObservedFeatures } from "../dist/governance/convergence-certification/index.js"
import { evaluateProposal } from "../dist/governance/proposal-evaluation/index.js"
import { program027RuleSet } from "../dist/governance/proposal-evaluation/rules/program-027.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-convergence-certification", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-convergence-certification")
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
    genesis: { projectName: "Convergence Certification Test", systemId: "convergence-test", partitions: 1 },
    skipGenesis: false,
  })
}

async function lastEvent(ctx, type, predicate = () => true) {
  const events = await ctx.infra.eventStore.loadAll()
  const matches = events.filter((e) => e.type === type && predicate(e))
  return matches[matches.length - 1]
}

async function approveMission(ctx, id) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id, name: `Mission ${id}`, purpose: "Convergence certification test" },
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

async function createExecutingExpedition(ctx, missionId, expeditionId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId, name: "Test Expedition" },
  })
  assert.equal(result.status, "ok", `CreateExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `ApproveExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `CommitExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
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

async function certifyConvergence(ctx, missionId, expeditionId, contractId, observedFeatures) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures,
      artifacts: [{ kind: "artifact", id: "homepage", path: "/homepage.html", description: "Homepage implementation" }],
      runtimeEvidence: [{ kind: "runtime", id: "render", source: "puppeteer", observation: "Workspace renders", timestamp: Date.now() }],
      executionEvidence: [{ kind: "execution", id: "build", eventIds: ["e1"], summary: "Build passed" }],
    },
  })
  return result
}

function assertConvergenceResultShape(result) {
  assert.ok(result, "Convergence result should exist")
  assert.ok(["converged", "diverged", "insufficient_evidence"].includes(result.decision), `Unexpected decision: ${result.decision}`)
  assert.equal(typeof result.confidence, "number", "Confidence should be a number")
  assert.ok(result.confidence >= 0 && result.confidence <= 1, "Confidence should be in [0, 1]")
  assert.ok(Array.isArray(result.dimensions), "dimensions should be an array")
  assert.equal(result.dimensions.length, 4, "Four dimensions should be evaluated")
  assert.ok(Array.isArray(result.failureClasses), "failureClasses should be an array")
  assert.ok(result.evidence, "Evidence trace should exist")
  assert.equal(typeof result.evidence.summary, "string", "Evidence summary should be a string")
  assert.ok(Array.isArray(result.reasoning), "reasoning should be an array")
  assert.ok(result.reasoning.length > 0, "reasoning should not be empty")
  assert.equal(result.deterministic, true, "Convergence result should be deterministic")
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-GOVERNABILITY-005 — Convergence Certification")
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
// Negative certification: drifted outcomes diverge
// ------------------------------------------------------------------

test("[D01] generic dashboard outcome diverges", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-D01")
  await createExecutingExpedition(ctx, "M-D01", "E-D01")
  await completeExpedition(ctx, "E-D01")

  const result = await certifyConvergence(ctx, "M-D01", "E-D01", contractId, {
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })

  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)
  assertConvergenceResultShape(result.result)
  assert.equal(result.result.decision, "diverged")
  assert.ok(result.result.failureClasses.includes("outcome_drift"), `Expected outcome_drift, got ${JSON.stringify(result.result.failureClasses)}`)

  const event = await lastEvent(ctx, "CONVERGENCE_DIVERGED", (e) => e.payload.missionId === "M-D01")
  assert.ok(event, "CONVERGENCE_DIVERGED event should be emitted")
})

test("[D02] marketing-first landing outcome diverges", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-D02")
  await createExecutingExpedition(ctx, "M-D02", "E-D02")
  await completeExpedition(ctx, "E-D02")

  const result = await certifyConvergence(ctx, "M-D02", "E-D02", contractId, {
    hasMarketingHero: true,
    hasFeatureGrid: true,
    hasMissionStudioAsSection: true,
  })

  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)
  assert.equal(result.result.decision, "diverged")
  assert.ok(result.result.failureClasses.includes("implementation_drift"), `Expected implementation_drift, got ${JSON.stringify(result.result.failureClasses)}`)
})

test("[D03] chat-primary interface outcome diverges", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-D03")
  await createExecutingExpedition(ctx, "M-D03", "E-D03")
  await completeExpedition(ctx, "E-D03")

  const result = await certifyConvergence(ctx, "M-D03", "E-D03", contractId, {
    hasChatPrimaryInteraction: true,
    hasDecorativeAiImagery: true,
  })

  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)
  assert.equal(result.result.decision, "diverged")
  assert.ok(result.result.failureClasses.includes("implementation_drift"), `Expected implementation_drift, got ${JSON.stringify(result.result.failureClasses)}`)
})

// ------------------------------------------------------------------
// Positive certification: aligned outcome converges
// ------------------------------------------------------------------

test("[V01] persistent workspace outcome converges", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-V01")
  await createExecutingExpedition(ctx, "M-V01", "E-V01")
  await completeExpedition(ctx, "E-V01")

  const result = await certifyConvergence(ctx, "M-V01", "E-V01", contractId, {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  })

  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)
  assertConvergenceResultShape(result.result)
  assert.equal(result.result.decision, "converged")
  assert.equal(result.result.failureClasses.length, 0, "Converged outcome should have no failure classes")

  const event = await lastEvent(ctx, "CONVERGENCE_CERTIFIED", (e) => e.payload.missionId === "M-V01")
  assert.ok(event, "CONVERGENCE_CERTIFIED event should be emitted")

  const derived = buildDerivedState(await ctx.infra.eventStore.loadAll())
  const certification = Object.values(derived.convergenceCertifications).find((c) => c.missionId === "M-V01")
  assert.ok(certification, "Convergence certification should appear in derived state")
  assert.equal(certification.decision, "converged")
  assert.equal(certification.status, "certified")
})

// ------------------------------------------------------------------
// Determinism
// ------------------------------------------------------------------

test("Convergence certification is deterministic", async () => {
  const ctx1 = await makeCtx()
  const ctx2 = await makeCtx()

  for (const ctx of [ctx1, ctx2]) {
    const { contractId } = await approveMission(ctx, "M-DET")
    await createExecutingExpedition(ctx, "M-DET", "E-DET")
    await completeExpedition(ctx, "E-DET")
    await certifyConvergence(ctx, "M-DET", "E-DET", contractId, {
      hasMetricCards: true,
      hasPromotionalBanners: false,
      hasDisconnectedWidgets: false,
    })
  }

  const derived1 = buildDerivedState(await ctx1.infra.eventStore.loadAll())
  const derived2 = buildDerivedState(await ctx2.infra.eventStore.loadAll())
  const cert1 = Object.values(derived1.convergenceCertifications).find((c) => c.missionId === "M-DET")
  const cert2 = Object.values(derived2.convergenceCertifications).find((c) => c.missionId === "M-DET")

  assert.ok(cert1 && cert2, "Both certifications should exist")
  assert.equal(cert1.decision, cert2.decision)
  assert.equal(cert1.confidence, cert2.confidence)
  assert.deepStrictEqual(cert1.failureClasses, cert2.failureClasses)
})

// ------------------------------------------------------------------
// Traceability
// ------------------------------------------------------------------

test("Divergence includes violated clauses and drift classes", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-TRACE")
  await createExecutingExpedition(ctx, "M-TRACE", "E-TRACE")
  await completeExpedition(ctx, "E-TRACE")

  const result = await certifyConvergence(ctx, "M-TRACE", "E-TRACE", contractId, {
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })

  const evidence = result.result.evidence
  assert.ok(evidence.violatedContractFields.length > 0, "Evidence should include violated contract fields")
  assert.ok(evidence.violatedIntentClauses.length > 0, "Evidence should include violated intent clauses")
  assert.ok(evidence.matchedDriftClasses.includes("D01"), `Expected D01 drift class, got ${JSON.stringify(evidence.matchedDriftClasses)}`)

  const reasoning = result.result.reasoning
  assert.ok(reasoning.some((line) => line.includes("intent_fidelity")), "Reasoning should mention intent_fidelity")
  assert.ok(reasoning.some((line) => line.includes("contract_fidelity")), "Reasoning should mention contract_fidelity")
  assert.ok(reasoning.some((line) => line.includes("drift_absence")), "Reasoning should mention drift_absence")
})

// ------------------------------------------------------------------
// Mission completion gate
// ------------------------------------------------------------------

test("Mission cannot complete without converged certification", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-GATE")
  await createExecutingExpedition(ctx, "M-GATE", "E-GATE")
  await completeExpedition(ctx, "E-GATE")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteMission",
    payload: { id: "M-GATE" },
  })

  assert.equal(result.status, "error", "CompleteMission should fail without certification")
  assert.ok(result.error.includes("CONVERGENCE_CERTIFICATION_REQUIRED"), `Expected CONVERGENCE_CERTIFICATION_REQUIRED, got ${result.error}`)
})

test("Mission completes after converged certification", async () => {
  const ctx = await makeCtx()
  const { contractId } = await approveMission(ctx, "M-GATE-OK")
  await createExecutingExpedition(ctx, "M-GATE-OK", "E-GATE-OK")
  await completeExpedition(ctx, "E-GATE-OK")

  let result = await certifyConvergence(ctx, "M-GATE-OK", "E-GATE-OK", contractId, {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  })
  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteMission",
    payload: { id: "M-GATE-OK" },
  })

  assert.equal(result.status, "ok", `CompleteMission should succeed after certification: ${result.error}`)

  const state = rebuildState(await ctx.infra.eventStore.loadAll())
  assert.equal(state.missions["M-GATE-OK"].status, "completed")
})

// ------------------------------------------------------------------
// Direct capability API
// ------------------------------------------------------------------

test("buildObservedFeatures mirrors buildProposal shape", () => {
  const proposal = buildObservedFeatures({ hasPersistentHeader: true, hasPersistentSidebar: false })
  assert.equal(proposal.kind, "feature-list")
  assert.equal(proposal.features.length, 2)
  assert.equal(proposal.features[0].kind, "boolean")
  assert.equal(proposal.features[0].name, "hasPersistentHeader")
  assert.equal(proposal.features[0].value, true)
})

await cleanData()
try {
  await run()
} finally {
  await cleanData()
}
