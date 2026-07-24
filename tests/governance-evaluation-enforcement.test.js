// ============================================================
// EXP-GOVERNABILITY-003 — Governance Evaluation Enforcement Tests
// ============================================================
// Verifies that the Proposal Evaluation Capability is wired into
// Review Gate and Acceptance Gate lifecycles:
//   - drifted implementation proposals are rejected automatically
//   - aligned proposals are approved automatically
//   - Acceptance Gate consumes the Review Gate evaluation deterministically
//   - evaluation audit artifacts are explainable and replay-consistent
//   - manual gate capabilities remain untouched

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { buildProposal } from "../dist/governance/proposal-evaluation/rules/program-027.js"
import { mapToAcceptanceDecision } from "../dist/governance/proposal-evaluation/decision-mapping.js"


let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-governance-evaluation", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-governance-evaluation")
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
    genesis: { projectName: "Governance Evaluation Test", systemId: "gov-eval-test", partitions: 1 },
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
    payload: { id, name: `Mission ${id}`, purpose: "Governance evaluation enforcement test" },
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

function makeRefinedIntentInput(missionId) {
  return {
    missionId,
    objective: "Build a homepage that demonstrates SYNTH",
    scope: "Mission Studio shell embedded in the homepage",
    nonGoals: ["Backend runtime"],
    successCriteria: ["Visitor understands SYNTH"],
    visualReferences: ["design-board-v4.png"],
    behavioralReferences: ["sticky workspace"],
    constraints: ["No filesystem dependencies"],
    protectedAssets: ["Public Vocabulary"],
    acceptanceExamples: ["Storybook matches design board"],
    knownUnknowns: ["Exact scroll thresholds"],
    risks: ["Performance on low-end devices"],
  }
}

async function approveRefinedIntent(ctx, expeditionId, missionId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveRefinedIntent",
    payload: {
      expeditionId,
      refinedIntent: makeRefinedIntentInput(missionId),
      reviewer: { kind: "human", id: "operator" },
      policy: { reviewers: ["human"], quorum: "all" },
    },
  })
  assert.equal(result.status, "ok", `ApproveRefinedIntent should succeed: ${result.error}`)
}

async function evaluateAndResolveReviewGate(ctx, expeditionId, features) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveReviewGate",
    payload: {
      expeditionId,
      implementationReference: "storybook.html",
      proposal: buildProposal(features),
    },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveReviewGate should succeed: ${result.error}`)
  return lastEvent(ctx, "REVIEW_GATE_RESOLVED", (e) => e.payload.expeditionId === expeditionId)
}

async function evaluateAndResolveAcceptanceGate(ctx, expeditionId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveAcceptanceGate",
    payload: { expeditionId },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveAcceptanceGate should succeed: ${result.error}`)
  return lastEvent(ctx, "ACCEPTANCE_GATE_RESOLVED", (e) => e.payload.expeditionId === expeditionId)
}

function assertEvaluationShape(evaluation) {
  assert.ok(evaluation, "Evaluation payload should exist")
  assert.ok(["aligned", "revision_required", "rejected"].includes(evaluation.decision), `Unexpected decision: ${evaluation.decision}`)
  assert.equal(typeof evaluation.confidence, "number", "Confidence should be a number")
  assert.ok(evaluation.confidence >= 0 && evaluation.confidence <= 1, "Confidence should be in [0, 1]")
  assert.ok(Array.isArray(evaluation.matchedRules), "matchedRules should be an array")
  assert.ok(Array.isArray(evaluation.violatedRules), "violatedRules should be an array")
  assert.ok(Array.isArray(evaluation.matchedDriftClasses), "matchedDriftClasses should be an array")
  assert.ok(evaluation.evidence, "Evidence trace should exist")
  assert.equal(typeof evaluation.evidence.summary, "string", "Evidence summary should be a string")
  assert.ok(Array.isArray(evaluation.reasoning), "reasoning should be an array")
  assert.ok(evaluation.reasoning.length > 0, "reasoning should not be empty")
  assert.equal(evaluation.deterministic, true, "Evaluation should be deterministic")
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-GOVERNABILITY-003 — Governance Evaluation Enforcement")
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
// Automatic rejection of drifted proposals at Review Gate
// ------------------------------------------------------------------

test("[D01] generic dashboard drift is rejected at Review Gate", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-D01")
  await createExecutingExpedition(ctx, "M-D01", "E-D01")
  await approveRefinedIntent(ctx, "E-D01", "M-D01")

  const event = await evaluateAndResolveReviewGate(ctx, "E-D01", {
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })

  assert.equal(event.payload.decision, "reject", `Expected reject, got ${event.payload.decision}`)
  assertEvaluationShape(event.payload.evaluation)
  assert.ok(
    event.payload.evaluation.matchedDriftClasses.includes("D01"),
    `Expected drift class D01, got ${JSON.stringify(event.payload.evaluation.matchedDriftClasses)}`
  )

  const derived = buildDerivedState(await ctx.infra.eventStore.loadAll())
  assert.equal(derived.reviewGateExpeditions["E-D01"].status, "rejected")
  assert.ok(derived.reviewGateExpeditions["E-D01"].evaluation, "Review evaluation should be persisted in derived state")
})

// ------------------------------------------------------------------
// Automatic approval of aligned proposals at Review Gate
// ------------------------------------------------------------------

test("[V01] persistent workspace proposal is approved at Review Gate", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-V01")
  await createExecutingExpedition(ctx, "M-V01", "E-V01")
  await approveRefinedIntent(ctx, "E-V01", "M-V01")

  const event = await evaluateAndResolveReviewGate(ctx, "E-V01", {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  })

  assert.equal(event.payload.decision, "approve", `Expected approve, got ${event.payload.decision}`)
  assertEvaluationShape(event.payload.evaluation)
  assert.equal(event.payload.evaluation.matchedDriftClasses.length, 0, "Aligned proposal should not match drift classes")

  const derived = buildDerivedState(await ctx.infra.eventStore.loadAll())
  // Auto-chaining progresses to acceptance gate, so status is "accepted"
  assert.equal(derived.reviewGateExpeditions["E-V01"].status, "accepted")
})

// ------------------------------------------------------------------
// Acceptance Gate consumes Review Gate evaluation deterministically
// ------------------------------------------------------------------

test("Acceptance Gate decision mapping treats revision_required and rejected as rejected", () => {
  assert.equal(mapToAcceptanceDecision({ decision: "aligned" }), "accepted")
  assert.equal(mapToAcceptanceDecision({ decision: "revision_required" }), "rejected")
  assert.equal(mapToAcceptanceDecision({ decision: "rejected" }), "rejected")
})

test("Rejected review prevents acceptance and closes expedition", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-ACCEPT-REJECT")
  await createExecutingExpedition(ctx, "M-ACCEPT-REJECT", "E-ACCEPT-REJECT")
  await approveRefinedIntent(ctx, "E-ACCEPT-REJECT", "M-ACCEPT-REJECT")

  const reviewEvent = await evaluateAndResolveReviewGate(ctx, "E-ACCEPT-REJECT", {
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })

  assert.equal(reviewEvent.payload.decision, "reject", "Review should reject drifted proposal")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveAcceptanceGate",
    payload: { expeditionId: "E-ACCEPT-REJECT" },
  })
  assert.equal(result.status, "error", "Acceptance should not be reachable after rejection")
  assert.ok(result.error.includes("ACCEPTANCE_EVALUATION_INVALID_STATE"), `Expected ACCEPTANCE_EVALUATION_INVALID_STATE, got ${result.error}`)

  const derived = buildDerivedState(await ctx.infra.eventStore.loadAll())
  assert.equal(derived.reviewGateExpeditions["E-ACCEPT-REJECT"].status, "rejected")
})

test("Acceptance Gate auto-fires after Review Gate approval", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-ACCEPT-ACCEPT")
  await createExecutingExpedition(ctx, "M-ACCEPT-ACCEPT", "E-ACCEPT-ACCEPT")
  await approveRefinedIntent(ctx, "E-ACCEPT-ACCEPT", "M-ACCEPT-ACCEPT")

  // Single EvaluateAndResolveReviewGate call auto-chains through acceptance gate
  await evaluateAndResolveReviewGate(ctx, "E-ACCEPT-ACCEPT", {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  })

  const allEvents = await ctx.infra.eventStore.loadAll()
  const acceptanceEvent = allEvents
    .filter((e) => e.type === "ACCEPTANCE_GATE_RESOLVED" && e.payload.expeditionId === "E-ACCEPT-ACCEPT")
    .pop()
  assert.ok(acceptanceEvent, "Acceptance gate should auto-resolve after review approval")
  assert.equal(acceptanceEvent.payload.decision, "accepted", "Acceptance should accept when review approved")
  assert.ok(acceptanceEvent.payload.evaluation, "Acceptance event should carry the review evaluation")

  const derived = buildDerivedState(allEvents)
  assert.equal(derived.reviewGateExpeditions["E-ACCEPT-ACCEPT"].status, "accepted")
})

// ------------------------------------------------------------------
// Replay consistency
// ------------------------------------------------------------------

test("Review Gate evaluation is replay-consistent", async () => {
  const ctx1 = await makeCtx()
  const ctx2 = await makeCtx()

  for (const ctx of [ctx1, ctx2]) {
    await approveMission(ctx, "M-REPLAY")
    await createExecutingExpedition(ctx, "M-REPLAY", "E-REPLAY")
    await approveRefinedIntent(ctx, "E-REPLAY", "M-REPLAY")
    await evaluateAndResolveReviewGate(ctx, "E-REPLAY", {
      hasMarketingHero: true,
      hasFeatureGrid: true,
      hasMissionStudioAsSection: true,
    })
  }

  const events1 = await ctx1.infra.eventStore.loadAll()
  const events2 = await ctx2.infra.eventStore.loadAll()
  const derived1 = buildDerivedState(events1)
  const derived2 = buildDerivedState(events2)

  const eval1 = derived1.reviewGateExpeditions["E-REPLAY"].evaluation
  const eval2 = derived2.reviewGateExpeditions["E-REPLAY"].evaluation

  assert.deepStrictEqual(eval1.decision, eval2.decision)
  assert.deepStrictEqual(eval1.confidence, eval2.confidence)
  assert.deepStrictEqual(eval1.matchedDriftClasses, eval2.matchedDriftClasses)
  assert.deepStrictEqual(eval1.reasoning, eval2.reasoning)
  assert.equal(derived1.reviewGateExpeditions["E-REPLAY"].status, derived2.reviewGateExpeditions["E-REPLAY"].status)
})

// ------------------------------------------------------------------
// Automatic Lifecycle Chaining (EXP-GOVERNABILITY-006A)
//   Single EvaluateAndResolveReviewGate invocation should auto-chain:
//     Review Gate → Acceptance Gate → Convergence → Mission Complete
// ------------------------------------------------------------------

test("[L01] Review Gate approval auto-chains through Acceptance Gate, Convergence, and Mission completion", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-L01")
  await createExecutingExpedition(ctx, "M-L01", "E-L01")
  await approveRefinedIntent(ctx, "E-L01", "M-L01")

  // Single invocation should trigger the full lifecycle chain
  const reviewEvent = await evaluateAndResolveReviewGate(ctx, "E-L01", {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  })

  assert.equal(reviewEvent.payload.decision, "approve", "Review should approve aligned proposal")

  // Verify all lifecycle events exist
  const allEvents = await ctx.infra.eventStore.loadAll()

  const reviewResolved = allEvents.filter(
    (e) => e.type === "REVIEW_GATE_RESOLVED" && e.payload.expeditionId === "E-L01"
  )
  assert.equal(reviewResolved.length, 1, "Exactly one REVIEW_GATE_RESOLVED event")
  assert.equal(reviewResolved[0].payload.decision, "approve")

  const acceptanceOpened = allEvents.filter(
    (e) => e.type === "ACCEPTANCE_GATE_OPENED" && e.payload.expeditionId === "E-L01"
  )
  assert.equal(acceptanceOpened.length, 1, "Exactly one ACCEPTANCE_GATE_OPENED event")

  const acceptanceResolved = allEvents.filter(
    (e) => e.type === "ACCEPTANCE_GATE_RESOLVED" && e.payload.expeditionId === "E-L01"
  )
  assert.equal(acceptanceResolved.length, 1, "Exactly one ACCEPTANCE_GATE_RESOLVED event")
  assert.equal(acceptanceResolved[0].payload.decision, "accepted")

  const convergenceCertified = allEvents.filter((e) => e.type === "CONVERGENCE_CERTIFIED")
  assert.equal(convergenceCertified.length, 1, "Exactly one CONVERGENCE_CERTIFIED event")
  assert.equal(convergenceCertified[0].payload.decision, "converged")
  assert.equal(convergenceCertified[0].payload.missionId, "M-L01")

  const missionCompleted = allEvents.filter(
    (e) => e.type === "MISSION_COMPLETED" && e.payload.id === "M-L01"
  )
  assert.equal(missionCompleted.length, 1, "Exactly one MISSION_COMPLETED event")

  // Verify event ordering
  const ri = allEvents.indexOf(reviewResolved[0])
  const ai = allEvents.indexOf(acceptanceResolved[0])
  const ci = allEvents.indexOf(convergenceCertified[0])
  const mi = allEvents.indexOf(missionCompleted[0])
  assert.ok(ri < ai, "Review gate before acceptance gate")
  assert.ok(ai < ci, "Acceptance gate before convergence certification")
  assert.ok(ci < mi, "Convergence certification before mission completion")

  // Verify derived state
  const derived = buildDerivedState(allEvents)
  assert.equal(derived.reviewGateExpeditions["E-L01"].status, "accepted", "Expedition should be accepted")

  const state = await ctx.infra.stateStore.load()
  assert.equal(state.missions["M-L01"].status, "completed", "Mission should be completed")
})

test("[L02] Rejected review gate does NOT auto-chain to acceptance gate", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-L02")
  await createExecutingExpedition(ctx, "M-L02", "E-L02")
  await approveRefinedIntent(ctx, "E-L02", "M-L02")

  // Drifted proposal should be rejected
  const reviewEvent = await evaluateAndResolveReviewGate(ctx, "E-L02", {
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })

  assert.equal(reviewEvent.payload.decision, "reject", "Review should reject drifted proposal")

  // Verify chain stopped at review gate rejection
  const allEvents = await ctx.infra.eventStore.loadAll()
  const acceptanceGates = allEvents.filter((e) => e.type === "ACCEPTANCE_GATE_OPENED" || e.type === "ACCEPTANCE_GATE_RESOLVED")
  assert.equal(acceptanceGates.length, 0, "No acceptance gate events after rejection")
  const convergences = allEvents.filter((e) => e.type === "CONVERGENCE_CERTIFIED" || e.type === "CONVERGENCE_DIVERGED")
  assert.equal(convergences.length, 0, "No convergence events after rejection")
  const completions = allEvents.filter((e) => e.type === "MISSION_COMPLETED")
  assert.equal(completions.length, 0, "No mission completion after rejection")
})

// ------------------------------------------------------------------
// Manual gate capabilities remain untouched
// ------------------------------------------------------------------

test("manual Review Gate capabilities still work", async () => {
  const ctx = await makeCtx()
  await approveMission(ctx, "M-MANUAL")
  await createExecutingExpedition(ctx, "M-MANUAL", "E-MANUAL")
  await approveRefinedIntent(ctx, "E-MANUAL", "M-MANUAL")

  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenReviewGate",
    payload: {
      expeditionId: "E-MANUAL",
      implementationReference: "manual.html",
      policy: { reviewers: ["human"], quorum: "all" },
    },
  })
  assert.equal(result.status, "ok", `OpenReviewGate should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ResolveReviewGate",
    payload: {
      expeditionId: "E-MANUAL",
      decision: "approve",
      reviewer: { kind: "human", id: "operator" },
      reason: "Manual approval",
    },
  })
  assert.equal(result.status, "ok", `ResolveReviewGate should succeed: ${result.error}`)

  const derived = buildDerivedState(await ctx.infra.eventStore.loadAll())
  assert.equal(derived.reviewGateExpeditions["E-MANUAL"].status, "approved")
  assert.equal(derived.reviewGateExpeditions["E-MANUAL"].evaluation, undefined, "Manual review should not populate evaluation")
})

await cleanData()
try {
  await run()
} finally {
  await cleanData()
}
