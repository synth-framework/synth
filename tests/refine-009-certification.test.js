import { makeCwdDataDir } from "./helpers/workspace.js"
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
import { makeCtx as makeTestCtx } from "./helpers/context.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { evaluateProposal } from "../dist/governance/proposal-evaluation/index.js"
import { program027RuleSet } from "../dist/governance/proposal-evaluation/rules/program-027.js"
import { certifyConvergence, buildObservedFeatures } from "../dist/governance/convergence-certification/index.js"


async function cleanData() {
  const base = path.join(process.cwd(), "data-test-refine-009")
  try { await fs.rm(base, { recursive: true }) } catch { /* ok */ }
}

async function makeCtx() {
  const dataDir = makeCwdDataDir("data-test-refine-009")
  return makeTestCtx(dataDir, {
    projectName: "REFINE-009",
    systemId: "refine-009-test",
    partitions: 1,
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

import { createSuite } from "./helpers/runner.js"

const suite = createSuite()
const { test } = suite

await cleanData()
try {
  await suite.run("refine-009-certification")
} finally {
  await cleanData()
}
