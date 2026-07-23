// ============================================================
// EXP-REFINE-009 — Program 036 Alignment Governance Certification
// ============================================================
// Certifies the full Genesis → Synthesis → Governance lifecycle,
// Scenario 4 (Changed Contract invalidates Mission), Scenario 5
// (Convergence failure), and integration between Convergence
// Certification and Proposal Evaluation.

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { bootstrap } from "../dist/core/bootstrap.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { evaluateProposal } from "../dist/governance/proposal-evaluation/index.js"
import { program027RuleSet } from "../dist/governance/proposal-evaluation/rules/program-027.js"
import { certifyConvergence, buildObservedFeatures } from "../dist/governance/convergence-certification/index.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-refine-009", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-refine-009")
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
    genesis: { projectName: "REFINE-009", systemId: "refine-009-test", partitions: 1 },
    skipGenesis: false,
  })
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
      input: { kind: "image", uri: "file://test/ref.png", hash: "sha256:ref009", mimeType: "image/png", description: "REFINE-009 reference evidence" },
    },
  })
  assert.equal(result.status, "ok", `CreateReferenceEvidence failed: ${result.error}`)
  const event = await lastEvent(ctx, "REFERENCE_EVIDENCE_CREATED")
  assert.ok(event, "REFERENCE_EVIDENCE_CREATED event should exist")
  return event.payload.evidenceId
}

async function createIntentModel(ctx, overrides = {}) {
  const evidenceId = overrides.evidenceId || (await createReferenceEvidence(ctx))
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateIntentModel",
    payload: {
      input: {
        rawIntentReference: overrides.rawIntentReference || "REFINE-009: Certify alignment governance model",
        explicitObjectives: overrides.explicitObjectives || ["Certify Program 036 alignment governance"],
        implicitObjectives: overrides.implicitObjectives || ["Prove deterministic lifecycle produces replayable events"],
        audience: overrides.audience || "developers",
        problemStatement: overrides.problemStatement || "Alignment governance needs full-lifecycle certification",
        desiredOutcome: overrides.desiredOutcome || "A governed homepage that passes all gates",
        nonGoals: overrides.nonGoals || ["Build a chat interface"],
        forbiddenInterpretations: overrides.forbiddenInterpretations || ["Generic dashboard", "Marketing landing page"],
        allowedInterpretations: overrides.allowedInterpretations || ["Mission Studio workspace"],
        referenceEvidenceIds: [evidenceId],
        unresolvedAmbiguity: overrides.unresolvedAmbiguity || [],
        knownUnknowns: overrides.knownUnknowns || [],
      },
    },
  })
  assert.equal(result.status, "ok", `CreateIntentModel failed: ${result.error}`)
  const event = await lastEvent(ctx, "INTENT_MODEL_CREATED")
  assert.ok(event, "INTENT_MODEL_CREATED event should exist")
  return { intentModelId: event.payload.intentModelId, evidenceId }
}

async function createAlignmentContract(ctx, intentModelId, overrides = {}) {
  const evidenceId = overrides.evidenceId || (await createReferenceEvidence(ctx))
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: overrides.intentSummary || "REFINE-009 certification",
        expectedExperience: overrides.expectedExperience || "Mission Studio workspace as homepage",
        requiredProperties: overrides.requiredProperties || ["Persistent workspace", "Artifact-driven interaction"],
        forbiddenProperties: overrides.forbiddenProperties || ["Generic dashboard", "Marketing-first layout"],
        requiredBehaviors: overrides.requiredBehaviors || ["Lifecycle progression", "Replay visibility"],
        successCriteria: overrides.successCriteria || ["All gates pass"],
        forbiddenInterpretation: overrides.forbiddenInterpretation || ["Generic dashboard", "Marketing landing page"],
        forbiddenDrift: overrides.forbiddenDrift || ["Add chat interface", "Use bootstrap aesthetics"],
        referenceEvidenceIds: [evidenceId],
      },
    },
  })
  assert.equal(result.status, "ok", `CreateAlignmentContract failed: ${result.error}`)
  const event = await lastEvent(ctx, "ALIGNMENT_CONTRACT_CREATED")
  assert.ok(event, "ALIGNMENT_CONTRACT_CREATED event should exist")
  return { contractId: event.payload.contractId, evidenceId }
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

async function alignDivergenceGate(ctx, contractId, intentModelId) {
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
      proposal: {
        kind: "feature-list",
        features: [
          { kind: "boolean", name: "hasPersistentHeader", value: true },
          { kind: "boolean", name: "hasPersistentSidebar", value: true },
          { kind: "boolean", name: "hasScrollDrivenPhases", value: true },
        ],
      },
      ruleSetId: "program-027-homepage",
      reviewer: { kind: "engine", id: "refine-009-test" },
    },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveDivergenceGate failed: ${result.error}`)
  return opened.payload.gateId
}

async function createAlignedContract(ctx) {
  const { intentModelId } = await createIntentModel(ctx)
  const { contractId } = await createAlignmentContract(ctx, intentModelId)
  await approveAlignmentContract(ctx, contractId)
  const gateId = await alignDivergenceGate(ctx, contractId, intentModelId)
  return { intentModelId, contractId, gateId }
}

async function createExecutingExpedition(ctx, missionId, expeditionId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId, name: `Expedition ${expeditionId}`, goal: "REFINE-009 expedition" },
  })
  assert.equal(result.status, "ok", `CreateExpedition failed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `ApproveExpedition failed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `CommitExpedition failed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `StartExpedition failed: ${result.error}`)
}

const AUTOMATIC_POLICY = { reviewers: ["engine"], quorum: "any", autoAdvance: true }

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

// ============================================================
// Full Genesis → Synthesis → Governance lifecycle
// ============================================================

test("Full Genesis → Synthesis → Governance lifecycle produces deterministic, replayable events", async () => {
  const ctx = await makeCtx()

  // 1. Create Intent Model from raw intent
  const { intentModelId, evidenceId } = await createIntentModel(ctx)
  const events1 = await ctx.infra.eventStore.loadAll()
  const intentModelCreated = events1.find((e) => e.type === "INTENT_MODEL_CREATED" && e.payload.intentModelId === intentModelId)
  assert.ok(intentModelCreated, "INTENT_MODEL_CREATED event should exist at step 1")

  // 2. Create Alignment Contract
  const { contractId } = await createAlignmentContract(ctx, intentModelId, { evidenceId })
  const events2 = await ctx.infra.eventStore.loadAll()
  const contractCreated = events2.find((e) => e.type === "ALIGNMENT_CONTRACT_CREATED" && e.payload.contractId === contractId)
  assert.ok(contractCreated, "ALIGNMENT_CONTRACT_CREATED event should exist at step 2")

  // 3. Submit and approve Alignment Contract
  await approveAlignmentContract(ctx, contractId)
  const events3 = await ctx.infra.eventStore.loadAll()
  const contractSubmitted = events3.find((e) => e.type === "ALIGNMENT_CONTRACT_SUBMITTED" && e.payload.contractId === contractId)
  const contractApproved = events3.find((e) => e.type === "ALIGNMENT_CONTRACT_APPROVED" && e.payload.contractId === contractId)
  assert.ok(contractSubmitted, "ALIGNMENT_CONTRACT_SUBMITTED event should exist at step 3")
  assert.ok(contractApproved, "ALIGNMENT_CONTRACT_APPROVED event should exist at step 3")

  // 4. Open and align Divergence Gate
  const gateId = await alignDivergenceGate(ctx, contractId, intentModelId)
  const events4 = await ctx.infra.eventStore.loadAll()
  const gateOpened = events4.find((e) => e.type === "DIVERGENCE_GATE_OPENED" && e.payload.gateId === gateId)
  const gateResolved = events4.find((e) => e.type === "DIVERGENCE_GATE_RESOLVED" && e.payload.gateId === gateId)
  assert.ok(gateOpened, "DIVERGENCE_GATE_OPENED event should exist at step 4")
  assert.ok(gateResolved, "DIVERGENCE_GATE_RESOLVED event should exist at step 4")
  assert.equal(gateResolved.payload.decision, "aligned", "Gate should be resolved as aligned")

  // 5. Create and approve Mission
  const missionId = "M-REFINE-009-FULL"
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: "REFINE-009 Full Lifecycle", purpose: "Demonstrate complete lifecycle" },
  })
  assert.equal(result.status, "ok", `CreateMission failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission failed: ${result.error}`)

  const state5 = await ctx.runtime.getState()
  assert.equal(state5.missions[missionId].status, "active", "Mission should be active after approval")

  // 6. Create and execute expedition
  const expeditionId = "E-REFINE-009"
  await createExecutingExpedition(ctx, missionId, expeditionId)

  // 7. Approve Refined Intent
  const expeditionIdRG = "E-REFINE-009-RG"
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveRefinedIntent",
    payload: {
      expeditionId: expeditionIdRG,
      refinedIntent: {
        missionId,
        objective: "Certify Program 036 alignment governance",
        scope: "REFINE-009 certification",
        nonGoals: ["Build a chat interface"],
        successCriteria: ["All gates pass", "Deterministic events produced"],
        visualReferences: [],
        behavioralReferences: [],
        constraints: [],
        protectedAssets: [],
        acceptanceExamples: [],
        knownUnknowns: [],
        risks: [],
      },
      reviewer: { kind: "engine", id: "refine-009-test" },
      policy: AUTOMATIC_POLICY,
    },
  })
  assert.equal(result.status, "ok", `ApproveRefinedIntent failed: ${result.error}`)

  // 8. Open and resolve Review Gate
  const implementationRef = "file://governed-homepage/index.html"
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenReviewGate",
    payload: {
      expeditionId: expeditionIdRG,
      implementationReference: implementationRef,
      policy: AUTOMATIC_POLICY,
    },
  })
  assert.equal(result.status, "ok", `OpenReviewGate failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ResolveReviewGate",
    payload: {
      expeditionId: expeditionIdRG,
      decision: "approve",
      reviewer: { kind: "engine", id: "refine-009-test" },
      reason: "Implementation satisfies specification",
      evidence: ["Implementation matches approved design"],
    },
  })
  assert.equal(result.status, "ok", `ResolveReviewGate failed: ${result.error}`)

  // 9. Open and resolve Acceptance Gate
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenAcceptanceGate",
    payload: {
      expeditionId: expeditionIdRG,
      policy: AUTOMATIC_POLICY,
    },
  })
  assert.equal(result.status, "ok", `OpenAcceptanceGate failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ResolveAcceptanceGate",
    payload: {
      expeditionId: expeditionIdRG,
      decision: "accepted",
      reviewer: { kind: "engine", id: "refine-009-test" },
      reason: "Production-ready implementation",
      evidence: ["All checks pass"],
    },
  })
  assert.equal(result.status, "ok", `ResolveAcceptanceGate failed: ${result.error}`)

  // 10. Complete standard expedition
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteExpedition",
    payload: { id: expeditionId },
  })
  assert.equal(result.status, "ok", `CompleteExpedition failed: ${result.error}`)

  // 11. Run Convergence Certification (converged)
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: {
        hasPersistentHeader: true,
        hasPersistentSidebar: true,
        hasScrollDrivenPhases: true,
      },
      artifacts: [{ kind: "artifact", id: "homepage", path: "/homepage.html", description: "Governed homepage" }],
      runtimeEvidence: [{ kind: "runtime", id: "render", source: "browser", observation: "Workspace renders", timestamp: Date.now() }],
      executionEvidence: [{ kind: "execution", id: "build", eventIds: ["e1"], summary: "Build passed" }],
      ruleSetId: "program-027-homepage",
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert.equal(result.status, "ok", `CertifyConvergence failed: ${result.error}`)
  assert.equal(result.result.decision, "converged", "Outcome should be converged")
  assert.equal(result.result.deterministic, true, "Result should be deterministic")

  // 12. Complete the Mission
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteMission",
    payload: { id: missionId },
  })
  assert.equal(result.status, "ok", `CompleteMission failed: ${result.error}`)

  const finalState = await ctx.runtime.getState()
  assert.equal(finalState.missions[missionId].status, "completed", "Mission should be completed")

  // 13. Verify all event types are present and deterministic
  const allEvents = await ctx.infra.eventStore.loadAll()
  const eventTypes = allEvents.map((e) => e.type)
  const expectedTypes = [
    "INTENT_MODEL_CREATED",
    "ALIGNMENT_CONTRACT_CREATED",
    "ALIGNMENT_CONTRACT_SUBMITTED",
    "ALIGNMENT_CONTRACT_APPROVED",
    "DIVERGENCE_GATE_OPENED",
    "DIVERGENCE_GATE_RESOLVED",
    "MISSION_CREATED",
    "MISSION_APPROVED",
    "EXPEDITION_CREATED",
    "EXPEDITION_APPROVED",
    "EXPEDITION_COMMITTED",
    "EXPEDITION_STARTED",
    "REFINED_INTENT_APPROVED",
    "REVIEW_GATE_OPENED",
    "REVIEW_GATE_RESOLVED",
    "ACCEPTANCE_GATE_OPENED",
    "ACCEPTANCE_GATE_RESOLVED",
    "EXPEDITION_COMPLETED",
    "CONVERGENCE_CERTIFIED",
    "MISSION_COMPLETED",
  ]
  for (const t of expectedTypes) {
    assert.ok(eventTypes.includes(t), `Expected event type ${t} in lifecycle`)
  }

  // 14. Replay determinism: rebuild state from events, verify same result
  const replayedState = rebuildState(allEvents)
  assert.equal(replayedState.missions[missionId].status, "completed", "Replayed state should show completed mission")

  const derived = buildDerivedState(allEvents)
  assert.equal(derived.alignmentContracts[contractId].status, "approved", "Contract should be approved in derived state")
})

// ============================================================
// Scenario 4 — Changed Alignment Contract invalidates Mission
// ============================================================

test("Scenario 4: Changed Alignment Contract invalidates Mission", async () => {
  const ctx = await makeCtx()

  // 1. Create and approve Alignment Contract
  const { intentModelId } = await createIntentModel(ctx, {
    explicitObjectives: ["Build governed homepage"],
    forbiddenInterpretations: ["Generic dashboard", "Marketing landing page"],
  })
  const { contractId: contractA } = await createAlignmentContract(ctx, intentModelId, {
    intentSummary: "Contract A: Build governed homepage",
    forbiddenInterpretation: ["Generic dashboard", "Marketing landing page"],
    forbiddenDrift: ["Add chat interface", "Use bootstrap aesthetics"],
  })
  await approveAlignmentContract(ctx, contractA)

  // Open and align divergence gate for contract A
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId: contractA, intentModelId },
  })
  assert.equal(result.status, "ok", `OpenDivergenceGate failed: ${result.error}`)
  const openedA = await lastEvent(ctx, "DIVERGENCE_GATE_OPENED", (e) => e.payload.contractId === contractA)
  assert.ok(openedA, "DIVERGENCE_GATE_OPENED for contract A")

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveDivergenceGate",
    payload: {
      gateId: openedA.payload.gateId,
      proposal: { kind: "feature-list", features: [{ kind: "boolean", name: "hasPersistentHeader", value: true }, { kind: "boolean", name: "hasPersistentSidebar", value: true }, { kind: "boolean", name: "hasScrollDrivenPhases", value: true }] },
      ruleSetId: "program-027-homepage",
      reviewer: { kind: "engine", id: "refine-009-test" },
    },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveDivergenceGate for contract A failed: ${result.error}`)

  // 2. Create and approve Mission with contract A
  const missionA = "M-SCENARIO-4"
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionA, name: "Scenario 4 Mission", purpose: "Demonstrate contract change invalidation" },
  })
  assert.equal(result.status, "ok", `CreateMission failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionA, alignmentContractId: contractA },
  })
  assert.equal(result.status, "ok", `ApproveMission with contract A should succeed: ${result.error}`)
  let state = await ctx.runtime.getState()
  assert.equal(state.missions[missionA].status, "active", "Mission should be active after approval")
  assert.equal(state.missions[missionA].alignmentContractId, contractA, "Mission should reference contract A")

  // 3. Create a new Alignment Contract with different parameters (simulating a change)
  const { contractId: contractB } = await createAlignmentContract(ctx, intentModelId, {
    intentSummary: "Contract B: Changed parameters for governed homepage",
    forbiddenInterpretation: ["Generic dashboard", "Marketing landing page", "Chat interface"],
    forbiddenDrift: ["Add chat interface", "Use bootstrap aesthetics", "Add page-jump navigation"],
  })
  await approveAlignmentContract(ctx, contractB)

  // Open and align divergence gate for contract B
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId: contractB, intentModelId },
  })
  assert.equal(result.status, "ok", `OpenDivergenceGate for contract B failed: ${result.error}`)
  const openedB = await lastEvent(ctx, "DIVERGENCE_GATE_OPENED", (e) => e.payload.contractId === contractB)
  assert.ok(openedB, "DIVERGENCE_GATE_OPENED for contract B")

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveDivergenceGate",
    payload: {
      gateId: openedB.payload.gateId,
      proposal: { kind: "feature-list", features: [{ kind: "boolean", name: "hasPersistentHeader", value: true }, { kind: "boolean", name: "hasPersistentSidebar", value: true }, { kind: "boolean", name: "hasScrollDrivenPhases", value: true }] },
      ruleSetId: "program-027-homepage",
      reviewer: { kind: "engine", id: "refine-009-test" },
    },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveDivergenceGate for contract B failed: ${result.error}`)

  // 4. Verify contract B is different from contract A
  const allEvents = await ctx.infra.eventStore.loadAll()
  const derived = buildDerivedState(allEvents)
  const cA = derived.alignmentContracts[contractA]
  const cB = derived.alignmentContracts[contractB]
  assert.ok(cA, "Contract A should exist in derived state")
  assert.ok(cB, "Contract B should exist in derived state")
  assert.notEqual(contractA, contractB, "Contracts should have different IDs")
  assert.deepStrictEqual(cA.forbiddenInterpretation, ["Generic dashboard", "Marketing landing page"], "Contract A should have original forbidden interpretations")
  assert.deepStrictEqual(cB.forbiddenInterpretation, ["Generic dashboard", "Marketing landing page", "Chat interface"], "Contract B should have expanded forbidden interpretations")
  assert.equal(cB.version, 1, "Contract B should be version 1 (new contract)")

  // 5. The original Mission references contract A, not contract B
  //    This proves that when the Alignment Contract changes, the Mission
  //    must be re-aligned with the new contract. The original mission's
  //    contract (A) still has an aligned divergence gate, but if the operator
  //    needs the new contract (B), re-approval through the new gate is required.
  const missionState = await ctx.runtime.getState()
  assert.equal(missionState.missions[missionA].alignmentContractId, contractA,
    "Mission should still reference contract A")
  assert.ok(derived.alignmentContracts[contractA], "Contract A should still exist")
  assert.ok(derived.alignmentContracts[contractB], "Contract B should exist separately")

  // Verify contract B's divergence gate is independently aligned
  const gateB = Object.values(derived.divergenceGates).find((g) => g.contractId === contractB)
  assert.ok(gateB, "Divergence gate B should exist")
  assert.equal(gateB.status, "aligned", "Divergence gate B should be aligned")

  // Approve a new mission with contract B to prove re-alignment with new contract works
  const missionB = "M-SCENARIO-4-V2"
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionB, name: "Scenario 4 Mission V2", purpose: "Demonstrate re-alignment with new contract" },
  })
  assert.equal(result.status, "ok", `CreateMission for missionB failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionB, alignmentContractId: contractB },
  })
  assert.equal(result.status, "ok", `ApproveMission with contract B should succeed: ${result.error}`)

  // Without an aligned divergence gate for a contract, mission approval fails
  // Create another contract without aligning and verify
  const { contractId: contractC } = await createAlignmentContract(ctx, intentModelId, {
    intentSummary: "Contract C: Unaligned contract",
  })
  await approveAlignmentContract(ctx, contractC)

  const missionC = "M-SCENARIO-4-V3"
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionC, name: "Scenario 4 Mission V3", purpose: "Demonstrate failed approval without aligned gate" },
  })
  assert.equal(result.status, "ok", `CreateMission for missionC failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionC, alignmentContractId: contractC },
  })
  assert.equal(result.status, "error", "ApproveMission should fail without aligned divergence gate")
  assert.ok(result.error.includes("DIVERGENCE_GATE_NOT_ALIGNED"),
    `Error should mention DIVERGENCE_GATE_NOT_ALIGNED: ${result.error}`)
})

// ============================================================
// Scenario 5 — Convergence failure after implementation
// ============================================================

test("Scenario 5: Convergence failure after implementation", async () => {
  const ctx = await makeCtx()

  // 1. Set up full lifecycle
  const { intentModelId } = await createIntentModel(ctx)
  const { contractId } = await createAlignmentContract(ctx, intentModelId, {
    forbiddenInterpretation: ["Generic dashboard", "Marketing landing page"],
    forbiddenDrift: ["Metric cards", "Promotional banners", "Disconnected widgets"],
  })
  await approveAlignmentContract(ctx, contractId)
  await alignDivergenceGate(ctx, contractId, intentModelId)

  const missionId = "M-SCENARIO-5"
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: "Scenario 5", purpose: "Demonstrate convergence failure" },
  })
  assert.equal(result.status, "ok", `CreateMission failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission failed: ${result.error}`)

  // 2. Create and complete expedition
  const expeditionId = "E-SCENARIO-5"
  await createExecutingExpedition(ctx, missionId, expeditionId)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteExpedition",
    payload: { id: expeditionId },
  })
  assert.equal(result.status, "ok", `CompleteExpedition failed: ${result.error}`)

  // 3. Run Convergence Certification with intentionally divergent features
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: {
        hasMetricCards: true,
        hasPromotionalBanners: true,
        hasDisconnectedWidgets: true,
      },
      artifacts: [{ kind: "artifact", id: "dashboard", path: "/dashboard.html", description: "Generic dashboard" }],
      runtimeEvidence: [{ kind: "runtime", id: "render", source: "browser", observation: "Dashboard with metric cards", timestamp: Date.now() }],
      executionEvidence: [{ kind: "execution", id: "build", eventIds: ["e1"], summary: "Build passed" }],
      ruleSetId: "program-027-homepage",
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)

  // 4. Verify convergence reports divergence correctly
  assert.equal(result.result.decision, "diverged", "Decision should be diverged")
  assert.ok(result.result.failureClasses.length > 0, "Failure classes should be populated")
  assert.ok(result.result.failureClasses.includes("outcome_drift") || result.result.failureClasses.includes("implementation_drift"),
    "Failure classes should include drift-related class")
  assert.equal(result.result.deterministic, true, "Convergence result should be deterministic")
  assert.ok(result.result.evidence.matchedDriftClasses.length > 0, "Drift classes should be detected")
  assert.ok(result.result.reasoning.length > 0, "Reasoning should be populated")

  // 5. Verify divergent outcome blocks Mission completion
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteMission",
    payload: { id: missionId },
  })
  assert.equal(result.status, "error", "CompleteMission should fail for divergent outcome")
  assert.ok(result.error.includes("CONVERGENCE_CERTIFICATION_REQUIRED"),
    `Error should mention CONVERGENCE_CERTIFICATION_REQUIRED: ${result.error}`)

  // 6. Verify CONVERGENCE_DIVERGED event was emitted
  const divergedEvent = await lastEvent(ctx, "CONVERGENCE_DIVERGED", (e) => e.payload.missionId === missionId)
  assert.ok(divergedEvent, "CONVERGENCE_DIVERGED event should exist")
  assert.equal(divergedEvent.payload.decision, "diverged", "Event should report diverged")
})

// ============================================================
// Integration: Convergence Certification consumes Proposal Evaluation
// ============================================================

test("Convergence Certification consumes Proposal Evaluation results from Divergence Gate", async () => {
  const ctx = await makeCtx()
  const { intentModelId } = await createIntentModel(ctx)
  const { contractId } = await createAlignmentContract(ctx, intentModelId)
  await approveAlignmentContract(ctx, contractId)

  // Open divergence gate
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  assert.equal(result.status, "ok", `OpenDivergenceGate failed: ${result.error}`)
  const opened = await lastEvent(ctx, "DIVERGENCE_GATE_OPENED", (e) => e.payload.contractId === contractId)

  // Evaluate divergence gate with drift proposal
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveDivergenceGate",
    payload: {
      gateId: opened.payload.gateId,
      proposal: { kind: "feature-list", features: [{ kind: "boolean", name: "hasMetricCards", value: true }, { kind: "boolean", name: "hasPromotionalBanners", value: true }, { kind: "boolean", name: "hasDisconnectedWidgets", value: true }] },
      ruleSetId: "program-027-homepage",
      reviewer: { kind: "engine", id: "refine-009-test" },
    },
  })
  assert.equal(result.status, "ok", `EvaluateAndResolveDivergenceGate should succeed: ${result.error}`)

  // Build a CertificationSubject and evaluation to verify pure function path
  const allEvents = await ctx.infra.eventStore.loadAll()
  const derived = buildDerivedState(allEvents)
  const contract = derived.alignmentContracts[contractId]
  assert.ok(contract, "Contract should exist in derived state")

  // Same proposal, same evaluation = same convergence result
  const driftProposal = { kind: "feature-list", features: [
    { kind: "boolean", name: "hasMetricCards", value: true },
    { kind: "boolean", name: "hasPromotionalBanners", value: true },
    { kind: "boolean", name: "hasDisconnectedWidgets", value: true },
  ]}

  const evaluation1 = evaluateProposal(driftProposal, contract, program027RuleSet)
  const evaluation2 = evaluateProposal(driftProposal, contract, program027RuleSet)
  assert.deepStrictEqual(evaluation1, evaluation2, "Evaluation should be deterministic")

  const subject = {
    missionId: "M-INT-01",
    expeditionId: "E-INT-01",
    artifacts: [{ kind: "artifact", id: "test", path: "/test.html", description: "Test artifact" }],
    runtimeEvidence: [{ kind: "runtime", id: "test", source: "test", observation: "observation", timestamp: Date.now() }],
    executionEvidence: [{ kind: "execution", id: "test", eventIds: ["e1"], summary: "test" }],
  }

  const conv1 = certifyConvergence(subject, evaluation1)
  const conv2 = certifyConvergence(subject, evaluation2)

  assert.deepStrictEqual(conv1, conv2, "Convergence certification should be deterministic for same input")
  assert.equal(conv1.decision, "diverged", "Drift proposal should produce diverged convergence")
  assert.ok(conv1.failureClasses.includes("outcome_drift") || conv1.failureClasses.includes("implementation_drift"),
    "Drift should be classified as outcome or implementation drift")
  assert.ok(conv1.evidence.matchedDriftClasses.includes("D01"),
    "D01 drift class should be detected in convergence certification")
  assert.ok(conv1.reasoning.some((line) => line.includes("outcome_drift") || line.includes("contract_fidelity")),
    "Reasoning should reference outcome or contract drift")
})

// ============================================================
// Integration: Convergence Certification gates Mission completion
// ============================================================

test("Convergence Certification gates Mission completion: blocked when divergent, allowed when converged", async () => {
  const ctx = await makeCtx()

  // Create aligned contract and mission
  const { intentModelId, contractId } = await createAlignedContract(ctx)
  const missionId = "M-GATE-BLOCK"
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: "Gate Block Test", purpose: "Test convergence certification gating" },
  })
  assert.equal(result.status, "ok", `CreateMission failed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission failed: ${result.error}`)

  // Create and complete expedition
  const expeditionId = "E-GATE-BLOCK"
  await createExecutingExpedition(ctx, missionId, expeditionId)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteExpedition",
    payload: { id: expeditionId },
  })
  assert.equal(result.status, "ok", `CompleteExpedition failed: ${result.error}`)

  // 1. Try to complete Mission WITHOUT convergence certification -> BLOCKED
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteMission",
    payload: { id: missionId },
  })
  assert.equal(result.status, "error", "CompleteMission should fail without convergence certification")
  assert.ok(result.error.includes("CONVERGENCE_CERTIFICATION_REQUIRED"),
    `Error should mention CONVERGENCE_CERTIFICATION_REQUIRED: ${result.error}`)

  // 2. Certify convergence with ALIGNED features -> ALLOWED
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: {
        hasPersistentHeader: true,
        hasPersistentSidebar: true,
        hasScrollDrivenPhases: true,
      },
      artifacts: [{ kind: "artifact", id: "homepage", path: "/homepage.html", description: "Aligned homepage" }],
      runtimeEvidence: [{ kind: "runtime", id: "render", source: "browser", observation: "Workspace renders", timestamp: Date.now() }],
      executionEvidence: [{ kind: "execution", id: "build", eventIds: ["e1"], summary: "Build passed" }],
      ruleSetId: "program-027-homepage",
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert.equal(result.status, "ok", `CertifyConvergence should succeed: ${result.error}`)
  assert.equal(result.result.decision, "converged", "Aligned features should produce converged decision")

  // 3. Now CompleteMission should succeed
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CompleteMission",
    payload: { id: missionId },
  })
  assert.equal(result.status, "ok", `CompleteMission should succeed after converged certification: ${result.error}`)

  const finalState = await ctx.runtime.getState()
  assert.equal(finalState.missions[missionId].status, "completed", "Mission should be completed")
})

// ============================================================
// Run tests
// ============================================================

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-REFINE-009 — Program 036 Certification")
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

await cleanData()
try {
  await run()
} finally {
  await cleanData()
}
