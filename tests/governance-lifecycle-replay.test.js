// ============================================================
// EXP-GOVERNABILITY-006B — Deterministic Governance Lifecycle Replay
// ============================================================
// Certification expedition.
// Proves that the complete governance lifecycle executes deterministically
// through public capabilities and produces reproducible evidence.
//
// Lifecycle under certification:
//   Raw Intent → Intent Model → Alignment Contract → Divergence Gate →
//   Mission → Expedition → Refined Intent → Review Gate → Acceptance Gate →
//   Convergence Certification → Mission Completion
// ============================================================

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { createHash } from "crypto"
import { bootstrap } from "../dist/core/bootstrap.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { rebuildState } from "../dist/runtime/replay.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-governance-lifecycle-replay", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-governance-lifecycle-replay")
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
    genesis: { projectName: "Governance Lifecycle Replay", systemId: "gov-lifecycle-replay", partitions: 1 },
    skipGenesis: false,
  })
  // Disable automatic lifecycle continuation so the replay can assert each
  // governance stage independently.
  const originalHandleIntent = ctx.api.handleIntent.bind(ctx.api)
  ctx.api.handleIntent = (req) =>
    originalHandleIntent({
      ...req,
      context: { ...(req.context || {}), disableLifecycleContinuation: true },
    })
  return ctx
}

async function lastEvent(ctx, type, predicate = () => true) {
  const events = await ctx.infra.eventStore.loadAll()
  const matches = events.filter((e) => e.type === type && predicate(e))
  return matches[matches.length - 1]
}

async function createReferenceEvidence(ctx) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateReferenceEvidence",
    payload: {
      input: { kind: "image", uri: "file://test/ref.png", hash: "sha256:ref006b", mimeType: "image/png", description: "Lifecycle replay reference evidence" },
    },
  })
  assert.equal(result.status, "ok", `CreateReferenceEvidence failed: ${result.error}`)
  const event = await lastEvent(ctx, "REFERENCE_EVIDENCE_CREATED")
  assert.ok(event, "REFERENCE_EVIDENCE_CREATED event should exist")
  return event.payload.evidenceId
}

async function createIntentModel(ctx) {
  const evidenceId = await createReferenceEvidence(ctx)
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateIntentModel",
    payload: {
      input: {
        rawIntentReference: "EXP-GOVERNABILITY-006B: Certify deterministic lifecycle",
        explicitObjectives: ["Make Mission Studio the SYNTH homepage"],
        implicitObjectives: ["Visitor understands SYNTH without reading docs"],
        audience: "developers",
        problemStatement: "Homepage implementations drift from original intent",
        desiredOutcome: "A persistent Mission Studio workspace as the homepage",
        nonGoals: ["Build a chat interface", "Build a marketing landing page"],
        forbiddenInterpretations: ["Generic dashboard", "Marketing landing page", "Chat-primary interface"],
        allowedInterpretations: ["Mission Studio workspace"],
        referenceEvidenceIds: [evidenceId],
        unresolvedAmbiguity: [],
        knownUnknowns: [],
      },
    },
  })
  assert.equal(result.status, "ok", `CreateIntentModel failed: ${result.error}`)
  const event = await lastEvent(ctx, "INTENT_MODEL_CREATED")
  assert.ok(event, "INTENT_MODEL_CREATED event should exist")
  return { intentModelId: event.payload.intentModelId, evidenceId }
}

async function createAlignmentContract(ctx, intentModelId, evidenceId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: "Mission Studio is the SYNTH homepage",
        expectedExperience: "Persistent Mission Studio workspace embedded in the homepage",
        requiredProperties: ["Persistent workspace", "Scroll-driven phases"],
        forbiddenProperties: ["Generic dashboard", "Marketing-first layout"],
        requiredBehaviors: ["Lifecycle progression visible", "Replay visibility"],
        successCriteria: ["Homepage matches approved design boards"],
        forbiddenInterpretation: ["Generic dashboard", "Marketing landing page", "Chat-primary interface"],
        forbiddenDrift: ["Bootstrap aesthetics", "Page-jump navigation", "Storybook component grid"],
        referenceEvidenceIds: [evidenceId],
      },
    },
  })
  assert.equal(result.status, "ok", `CreateAlignmentContract failed: ${result.error}`)
  const event = await lastEvent(ctx, "ALIGNMENT_CONTRACT_CREATED")
  assert.ok(event, "ALIGNMENT_CONTRACT_CREATED event should exist")
  return event.payload.contractId
}

async function approveAlignmentContract(ctx, contractId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "SubmitAlignmentContract",
    payload: { contractId },
  })
  assert.equal(result.status, "ok", `SubmitAlignmentContract failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveAlignmentContract",
    payload: { contractId, reviewer: { kind: "human", id: "test-operator" } },
  })
  assert.equal(result.status, "ok", `ApproveAlignmentContract failed: ${result.error}`)
}

async function alignDivergenceGate(ctx, contractId, intentModelId, proposal) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  assert.equal(result.status, "ok", `OpenDivergenceGate failed: ${result.error}`)
  const opened = await lastEvent(ctx, "DIVERGENCE_GATE_OPENED", (e) => e.payload.contractId === contractId)
  assert.ok(opened, "DIVERGENCE_GATE_OPENED event should exist")

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveDivergenceGate",
    payload: {
      gateId: opened.payload.gateId,
      proposal,
      ruleSetId: "program-027-homepage",
      reviewer: { kind: "engine", id: "gov-lifecycle-replay" },
    },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveDivergenceGate failed: ${result.error}`)
  const resolved = await lastEvent(ctx, "DIVERGENCE_GATE_RESOLVED", (e) => e.payload.gateId === opened.payload.gateId)
  assert.ok(resolved, "DIVERGENCE_GATE_RESOLVED event should exist")
  return { gateId: opened.payload.gateId, decision: resolved.payload.decision }
}

async function createApprovedMission(ctx, missionId, contractId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: `Mission ${missionId}`, purpose: "Governance lifecycle replay" },
  })
  assert.equal(result.status, "ok", `CreateMission failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission failed: ${result.error}`)
}

async function createExecutingExpedition(ctx, missionId, expeditionId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId, name: `Expedition ${expeditionId}`, goal: "Implement homepage" },
  })
  assert.equal(result.status, "ok", `CreateExpedition failed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `ApproveExpedition failed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `CommitExpedition failed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `StartExpedition failed: ${result.error}`)
}

async function completeExpedition(ctx, expeditionId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteExpedition",
    payload: { id: expeditionId },
  })
  assert.equal(result.status, "ok", `CompleteExpedition failed: ${result.error}`)
}

async function approveRefinedIntent(ctx, expeditionId, missionId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveRefinedIntent",
    payload: {
      expeditionId,
      refinedIntent: {
        missionId,
        objective: "Build a homepage that demonstrates SYNTH",
        scope: "Mission Studio shell embedded in the homepage",
        nonGoals: ["Backend runtime"],
        successCriteria: ["Visitor understands SYNTH"],
        visualReferences: [],
        behavioralReferences: [],
        constraints: [],
        protectedAssets: [],
        acceptanceExamples: [],
        knownUnknowns: [],
        risks: [],
      },
      reviewer: { kind: "engine", id: "gov-lifecycle-replay" },
      policy: { reviewers: ["engine"], quorum: "any", autoAdvance: true },
    },
  })
  assert.equal(result.status, "ok", `ApproveRefinedIntent failed: ${result.error}`)
}

async function evaluateAndResolveReviewGate(ctx, expeditionId, proposal) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveReviewGate",
    payload: { expeditionId, implementationReference: "homepage.html", proposal },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveReviewGate failed: ${result.error}`)
  const event = await lastEvent(ctx, "REVIEW_GATE_RESOLVED", (e) => e.payload.expeditionId === expeditionId)
  assert.ok(event, "REVIEW_GATE_RESOLVED event should exist")
  return event.payload
}

async function evaluateAndResolveAcceptanceGate(ctx, expeditionId) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveAcceptanceGate",
    payload: { expeditionId },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveAcceptanceGate failed: ${result.error}`)
  const event = await lastEvent(ctx, "ACCEPTANCE_GATE_RESOLVED", (e) => e.payload.expeditionId === expeditionId)
  assert.ok(event, "ACCEPTANCE_GATE_RESOLVED event should exist")
  return event.payload
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
      runtimeEvidence: [{ kind: "runtime", id: "render", source: "replay", observation: "Workspace renders", timestamp: 0 }],
      executionEvidence: [{ kind: "execution", id: "build", eventIds: ["e1"], summary: "Build passed" }],
    },
  })
  return result
}

function buildProposal(features) {
  return {
    kind: "feature-list",
    features: Object.entries(features).map(([name, value]) => ({ kind: typeof value === "boolean" ? "boolean" : "string", name, value })),
  }
}

const ID_FIELD_NAMES = new Set([
  "id",
  "evidenceId",
  "intentModelId",
  "contractId",
  "gateId",
  "reportId",
  "decisionId",
  "missionId",
  "expeditionId",
  "refinedIntentId",
  "reviewPackageId",
  "acceptancePackageId",
  "recordId",
  "certificationId",
  "revisionRequestId",
  "conditionId",
])

const TIMESTAMP_FIELD_NAMES = new Set([
  "timestamp",
  "createdAt",
  "updatedAt",
  "approvedAt",
  "capturedAt",
  "resolvedAt",
  "executedAt",
  "certifiedAt",
])

// Generated IDs follow the runtime pattern: prefix-base36timestamp-base36random
const GENERATED_ID_PATTERN = /^[a-z]+(?:-[a-z]+)*-[a-z0-9]{8,14}-[a-z0-9]{4,8}$/

function deepNormalize(value, key = "") {
  if (value === null || typeof value !== "object") {
    if (TIMESTAMP_FIELD_NAMES.has(key) && typeof value === "number") return "__timestamp__"
    if (ID_FIELD_NAMES.has(key) && typeof value === "string") return `__${key}__`
    if (key === "id" && typeof value === "string") return "__id__"
    if (typeof value === "string" && GENERATED_ID_PATTERN.test(value)) return "__generatedId__"
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepNormalize(item, ""))
  }
  const result = {}
  for (const [k, v] of Object.entries(value)) {
    const normalizedKey = GENERATED_ID_PATTERN.test(k) ? "__generatedKey__" : k
    result[normalizedKey] = deepNormalize(v, k)
  }
  return result
}

function normalizeEvent(event) {
  const { id, timestamp, transactionId, eventHash, previousHash, partition, offset, type, payload, ...rest } = event
  return { type, ...deepNormalize(rest), payload: deepNormalize(payload, "payload") }
}

function normalizeDerived(derived) {
  return deepNormalize(derived)
}

function semanticStateHash(state) {
  const normalized = deepNormalize({ ...state, stateHash: "__stateHash__" })
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
}

async function executeHappyPathReplay(ctx, missionId, expeditionId) {
  const { intentModelId, evidenceId } = await createIntentModel(ctx)
  const contractId = await createAlignmentContract(ctx, intentModelId, evidenceId)
  await approveAlignmentContract(ctx, contractId)

  const proposal = buildProposal({
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
    hasPersistentWorkspace: true,
    hasShortHero: true,
    hasHeroCtaIntoWorkspace: true,
  })
  const divergence = await alignDivergenceGate(ctx, contractId, intentModelId, proposal)
  assert.equal(divergence.decision, "aligned", `Happy path Divergence Gate should be aligned, got ${divergence.decision}`)

  await createApprovedMission(ctx, missionId, contractId)
  await createExecutingExpedition(ctx, missionId, expeditionId)
  await approveRefinedIntent(ctx, expeditionId, missionId)

  const review = await evaluateAndResolveReviewGate(ctx, expeditionId, proposal)
  assert.equal(review.decision, "approve", `Happy path Review Gate should approve, got ${review.decision}`)

  const acceptance = await evaluateAndResolveAcceptanceGate(ctx, expeditionId)
  assert.equal(acceptance.decision, "accepted", `Happy path Acceptance Gate should accept, got ${acceptance.decision}`)

  await completeExpedition(ctx, expeditionId)

  const convergence = await certifyConvergence(ctx, missionId, expeditionId, contractId, {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
    hasPersistentWorkspace: true,
    hasShortHero: true,
    hasHeroCtaIntoWorkspace: true,
    hasLightThemeDefault: true,
  })
  assert.equal(convergence.status, "ok", `CertifyConvergence should succeed: ${convergence.error}`)
  assert.equal(convergence.result.decision, "converged", `Happy path should converge, got ${convergence.result.decision}`)

  const complete = await ctx.api.handleIntent({ actor: "test", capability: "CompleteMission", payload: { id: missionId } })
  assert.equal(complete.status, "ok", `CompleteMission should succeed: ${complete.error}`)

  const state = rebuildState(await ctx.infra.eventStore.loadAll())
  assert.equal(state.missions[missionId].status, "completed", "Mission should be completed")

  return { intentModelId, contractId, divergenceGateId: divergence.gateId }
}

async function executeRecoveryReplay(ctx, missionId, expeditionId) {
  const { intentModelId, evidenceId } = await createIntentModel(ctx)
  const contractId = await createAlignmentContract(ctx, intentModelId, evidenceId)
  await approveAlignmentContract(ctx, contractId)

  const alignedProposal = buildProposal({
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
    hasPersistentWorkspace: true,
    hasShortHero: true,
    hasHeroCtaIntoWorkspace: true,
  })
  const divergence = await alignDivergenceGate(ctx, contractId, intentModelId, alignedProposal)
  assert.equal(divergence.decision, "aligned", `Recovery Divergence Gate should be aligned`)

  await createApprovedMission(ctx, missionId, contractId)
  await createExecutingExpedition(ctx, missionId, expeditionId)
  await approveRefinedIntent(ctx, expeditionId, missionId)

  // Warning-level drift: hero invitation is used but lacks the required workspace CTA.
  const driftedProposal = buildProposal({
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
    hasPersistentWorkspace: true,
    hasShortHero: true,
    hasHeroCtaIntoWorkspace: false,
  })
  const review1 = await evaluateAndResolveReviewGate(ctx, expeditionId, driftedProposal)
  assert.equal(review1.decision, "revision_required", `Drifted proposal should require revision, got ${review1.decision}`)

  // Begin revision and re-evaluate with the aligned proposal.
  const revision = await ctx.api.handleIntent({
    actor: "test",
    capability: "RequestRevision",
    payload: {
      expeditionId,
      gateId: review1.gateId,
      reviewer: { kind: "engine", id: "proposal-evaluation" },
      reason: "Hero invitation lacks workspace CTA",
      evidence: ["Add hasHeroCtaIntoWorkspace"],
    },
  })
  assert.equal(revision.status, "ok", `RequestRevision should succeed: ${revision.error}`)

  const review2 = await evaluateAndResolveReviewGate(ctx, expeditionId, alignedProposal)
  assert.equal(review2.decision, "approve", `Revised aligned proposal should be approved, got ${review2.decision}`)

  const acceptance = await evaluateAndResolveAcceptanceGate(ctx, expeditionId)
  assert.equal(acceptance.decision, "accepted", `Recovery Acceptance Gate should accept`)

  await completeExpedition(ctx, expeditionId)

  const convergence = await certifyConvergence(ctx, missionId, expeditionId, contractId, {
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
    hasPersistentWorkspace: true,
    hasShortHero: true,
    hasHeroCtaIntoWorkspace: true,
    hasLightThemeDefault: true,
  })
  assert.equal(convergence.result.decision, "converged", `Recovery should converge`)

  const complete = await ctx.api.handleIntent({ actor: "test", capability: "CompleteMission", payload: { id: missionId } })
  assert.equal(complete.status, "ok", `CompleteMission should succeed after recovery: ${complete.error}`)
}

async function executeDivergenceRejectionReplay(ctx, missionId) {
  const { intentModelId, evidenceId } = await createIntentModel(ctx)
  const contractId = await createAlignmentContract(ctx, intentModelId, evidenceId)
  await approveAlignmentContract(ctx, contractId)

  const driftedProposal = buildProposal({
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })
  const divergence = await alignDivergenceGate(ctx, contractId, intentModelId, driftedProposal)
  assert.equal(divergence.decision, "rejected", `Divergence Gate should reject drift, got ${divergence.decision}`)

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: `Mission ${missionId}`, purpose: "Should be blocked" },
  })
  assert.equal(result.status, "ok", `CreateMission should succeed`)

  const approve = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(approve.status, "error", `ApproveMission should be blocked when Divergence Gate rejected`)
  assert.ok(approve.error.includes("DIVERGENCE_GATE_NOT_ALIGNED"), `Expected DIVERGENCE_GATE_NOT_ALIGNED, got ${approve.error}`)
}

async function executeConvergenceFailureReplay(ctx, missionId, expeditionId) {
  const { intentModelId, evidenceId } = await createIntentModel(ctx)
  const contractId = await createAlignmentContract(ctx, intentModelId, evidenceId)
  await approveAlignmentContract(ctx, contractId)

  const alignedProposal = buildProposal({
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  })
  const divergence = await alignDivergenceGate(ctx, contractId, intentModelId, alignedProposal)
  assert.equal(divergence.decision, "aligned", `Convergence-failure Divergence Gate should be aligned`)

  await createApprovedMission(ctx, missionId, contractId)
  await createExecutingExpedition(ctx, missionId, expeditionId)
  await approveRefinedIntent(ctx, expeditionId, missionId)

  const review = await evaluateAndResolveReviewGate(ctx, expeditionId, alignedProposal)
  assert.equal(review.decision, "approve", `Convergence-failure Review Gate should approve`)

  const acceptance = await evaluateAndResolveAcceptanceGate(ctx, expeditionId)
  assert.equal(acceptance.decision, "accepted", `Convergence-failure Acceptance Gate should accept`)

  await completeExpedition(ctx, expeditionId)

  const convergence = await certifyConvergence(ctx, missionId, expeditionId, contractId, {
    hasPersistentHeader: true,
    hasMarketingHero: true,
    hasFeatureGrid: true,
    hasMissionStudioAsSection: true,
  })
  assert.equal(convergence.result.decision, "diverged", `Marketing outcome should diverge, got ${convergence.result.decision}`)

  const complete = await ctx.api.handleIntent({ actor: "test", capability: "CompleteMission", payload: { id: missionId } })
  assert.equal(complete.status, "error", `CompleteMission should be blocked after divergence`)
  assert.ok(complete.error.includes("CONVERGENCE_CERTIFICATION_REQUIRED"), `Expected CONVERGENCE_CERTIFICATION_REQUIRED, got ${complete.error}`)
}

async function captureReplay(ctx, executor) {
  await executor(ctx)
  const events = await ctx.infra.eventStore.loadAll()
  const derived = buildDerivedState(events)
  const state = rebuildState(events)
  return {
    normalizedEvents: events.map(normalizeEvent),
    normalizedDerived: normalizeDerived(derived),
    stateHash: semanticStateHash(state),
    missionStatus: state.missions,
    eventTypes: events.map((e) => e.type),
  }
}

async function assertDeterminism(name, executor, ids) {
  const runs = []
  const fixedMissionId = ids.missionId(0)
  const fixedExpeditionId = ids.expeditionId(0)
  for (let i = 0; i < 3; i++) {
    const ctx = await makeCtx()
    const result = await captureReplay(ctx, (c) => executor(c, fixedMissionId, fixedExpeditionId))
    runs.push(result)
  }

  for (let i = 1; i < runs.length; i++) {
    assert.deepStrictEqual(
      runs[0].normalizedEvents,
      runs[i].normalizedEvents,
      `${name}: normalized event logs should be identical across run 0 and run ${i}`
    )
    assert.deepStrictEqual(
      runs[0].normalizedDerived,
      runs[i].normalizedDerived,
      `${name}: normalized derived state should be identical across run 0 and run ${i}`
    )
    assert.equal(
      runs[0].stateHash,
      runs[i].stateHash,
      `${name}: canonical state hash should be identical across run 0 and run ${i}`
    )
    assert.deepStrictEqual(
      runs[0].eventTypes,
      runs[i].eventTypes,
      `${name}: event type sequence should be identical across run 0 and run ${i}`
    )
  }

  return runs[0]
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-GOVERNABILITY-006B — Governance Lifecycle Replay")
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

const evidence = {
  expedition: "EXP-GOVERNABILITY-006B",
  specificationId: "lifecycle-replay-specification-program-027",
  generatedAt: new Date().toISOString(),
  replays: {},
}

test("Happy path replay is deterministic and completes Mission", async () => {
  const baseline = await assertDeterminism(
    "happy-path",
    executeHappyPathReplay,
    {
      missionId: (i) => `M-HAPPY-00${i}`,
      expeditionId: (i) => `E-HAPPY-00${i}`,
    }
  )
  evidence.replays.happyPath = {
    type: "happy",
    result: "Mission completed",
    eventCount: baseline.normalizedEvents.length,
    stateHash: baseline.stateHash,
    eventSequence: baseline.eventTypes,
  }
})

test("Recovery replay (revision loop) is deterministic and completes Mission", async () => {
  const baseline = await assertDeterminism(
    "recovery-revision-loop",
    executeRecoveryReplay,
    {
      missionId: (i) => `M-RECOVERY-00${i}`,
      expeditionId: (i) => `E-RECOVERY-00${i}`,
    }
  )
  evidence.replays.recovery = {
    type: "recovery",
    result: "Mission completed after revision",
    eventCount: baseline.normalizedEvents.length,
    stateHash: baseline.stateHash,
    eventSequence: baseline.eventTypes,
  }
})

test("Drift rejected at Divergence Gate is deterministic", async () => {
  const baseline = await assertDeterminism(
    "drift-divergence-rejected",
    executeDivergenceRejectionReplay,
    {
      missionId: (i) => `M-DRIFT-DIV-00${i}`,
      expeditionId: (i) => `E-DRIFT-DIV-00${i}`,
    }
  )
  evidence.replays.driftDivergenceRejected = {
    type: "drift",
    driftClassId: "D01",
    result: "Mission blocked",
    eventCount: baseline.normalizedEvents.length,
    stateHash: baseline.stateHash,
    eventSequence: baseline.eventTypes,
  }
})

test("Convergence failure replay is deterministic and blocks Mission completion", async () => {
  const baseline = await assertDeterminism(
    "drift-convergence-fails",
    executeConvergenceFailureReplay,
    {
      missionId: (i) => `M-DRIFT-CONV-00${i}`,
      expeditionId: (i) => `E-DRIFT-CONV-00${i}`,
    }
  )
  evidence.replays.driftConvergenceFails = {
    type: "drift",
    driftClassId: "D02",
    result: "Mission completion blocked",
    eventCount: baseline.normalizedEvents.length,
    stateHash: baseline.stateHash,
    eventSequence: baseline.eventTypes,
  }
})

await cleanData()
try {
  await run()
  const evidencePath = path.join(process.cwd(), "docs/governance/program-027/lifecycle-replay-evidence.json")
  await fs.mkdir(path.dirname(evidencePath), { recursive: true })
  await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2))
  console.log(`Evidence written: ${evidencePath}`)
} finally {
  await cleanData()
}
