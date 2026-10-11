import { describe, it } from "node:test"
import assert from "node:assert"
import {
  createReviewGateExpedition,
  beginExecution,
  completeImplementation,
  resolveReviewGate,
  openAcceptanceGate,
  approveRefinedIntent,
  fulfillCondition,
  GATE_POLICIES,
} from "../dist/governance/review-gates.js"
import { engineOpenAcceptanceGate } from "../dist/governance/review-gate-engine.js"
import { deriveAlignmentContractFromIntentModel } from "../dist/governance/alignment-contract.js"
import { mapToReviewDecision, mapToAcceptanceDecision } from "../dist/governance/proposal-evaluation/decision-mapping.js"
import { makeRefinedIntentInput } from "./helpers/domain-runner.js"

const humanReviewer = { kind: "human", id: "operator" }

/** Arrange an expedition through conditional review-gate resolution. */
function setupConditionalGate(expeditionId, conditions) {
  let expedition = createReviewGateExpedition(expeditionId)

  const { expedition: afterRefinement } = approveRefinedIntent(
    expedition,
    makeRefinedIntentInput(expeditionId),
    humanReviewer,
    GATE_POLICIES.humanRequired()
  )
  expedition = afterRefinement
  expedition = beginExecution(expedition)

  const { expedition: afterComplete } = completeImplementation(
    expedition,
    "impl-ref",
    GATE_POLICIES.humanRequired()
  )
  expedition = afterComplete

  const { expedition: afterResolve, gate: resolvedGate } = resolveReviewGate(
    expedition,
    "approve_with_conditions",
    humanReviewer,
    "Approved with conditions",
    [],
    [],
    conditions
  )
  return { expedition: afterResolve, resolvedGate }
}

function makeIntentModel() {
  return {
    id: "im-001",
    rawIntentReference: "intent-raw-001",
    explicitObjectives: ["Build a homepage"],
    implicitObjectives: ["Use modern design"],
    nonGoals: ["Backend runtime"],
    forbiddenInterpretations: ["No dark mode"],
    allowedInterpretations: ["Use light theme"],
    referenceEvidenceIds: ["ev-001"],
    knownUnknowns: ["Scroll threshold"],
    desiredOutcome: "Visitor understands SYNTH",
    audience: "Developers",
    problemStatement: "SYNTH needs a homepage",
    unresolvedAmbiguity: [],
  }
}

void describe("Gate Decision Completeness (EXP-GOV-015)", () => {
  void it("approve_with_conditions creates conditions stored on gate state", () => {
    const conditions = ["Fix the scroll behavior", "Add loading state", "Update tests"]
    const { resolvedGate } = setupConditionalGate("exp-gov-015-001", conditions)

    assert.ok(resolvedGate.conditions, "Gate should have conditions")
    assert.strictEqual(resolvedGate.conditions.length, 3)
    assert.strictEqual(resolvedGate.conditions[0].description, "Fix the scroll behavior")
    assert.strictEqual(resolvedGate.conditions[0].fulfilled, false)
    assert.strictEqual(resolvedGate.conditions[1].description, "Add loading state")
    assert.strictEqual(resolvedGate.conditions[2].description, "Update tests")
  })

  void it("FulfillCondition marks a condition as fulfilled", () => {
    const conditions = ["Fix scroll behavior"]
    const { resolvedGate } = setupConditionalGate("exp-gov-015-002", conditions)

    assert.ok(resolvedGate.conditions, "Gate should have conditions")
    assert.strictEqual(resolvedGate.conditions.length, 1)
    assert.strictEqual(resolvedGate.conditions[0].fulfilled, false)

    const conditionId = resolvedGate.conditions[0].id
    const updatedGate = fulfillCondition(resolvedGate, conditionId, "operator")

    assert.ok(updatedGate.conditions[0].fulfilled, "Condition should be fulfilled")
    assert.strictEqual(updatedGate.conditions[0].fulfilledBy, "operator")
    assert.ok(updatedGate.conditions[0].fulfilledAt, "fulfilledAt should be set")
  })

  void it("OpenAcceptanceGate blocks if conditions remain unfulfilled", () => {
    const conditions = ["Fix scroll behavior"]
    const { expedition, resolvedGate } = setupConditionalGate("exp-gov-015-003", conditions)

    assert.ok(resolvedGate.conditions, "Gate should have conditions")
    assert.strictEqual(resolvedGate.conditions.length, 1)
    assert.strictEqual(resolvedGate.conditions[0].fulfilled, false)

    assert.throws(
      () => engineOpenAcceptanceGate(expedition, GATE_POLICIES.council()),
      /unfulfilled conditions/
    )
  })

  void it("OpenAcceptanceGate proceeds if all conditions fulfilled", () => {
    const conditions = ["Fix scroll behavior"]
    const { expedition, resolvedGate } = setupConditionalGate("exp-gov-015-004", conditions)

    const conditionId = resolvedGate.conditions[0].id
    const updatedGate = fulfillCondition(resolvedGate, conditionId, "operator")
    assert.ok(updatedGate.conditions[0].fulfilled, "Condition should be fulfilled")

    const { expedition: afterAcceptance } = openAcceptanceGate(expedition, {
      id: resolvedGate.decisionId ?? "decision-1",
      gateId: resolvedGate.id,
      gateType: "review",
      expeditionId: expedition.expeditionId,
      decision: "approve_with_conditions",
      reason: "Approved with conditions",
      affectedAssets: [],
      evidence: [],
      reviewer: humanReviewer,
      validity: "valid",
      timestamp: Date.now(),
    })
    assert.strictEqual(afterAcceptance.status, "awaiting_acceptance")
  })

  void it("superseded evaluation maps to a valid gate decision", () => {
    const reviewDecision = mapToReviewDecision({ decision: "superseded", confidence: 0, matchedRules: [], violatedRules: [], matchedDriftClasses: [], evidence: { summary: "", ruleResults: [], matchedDriftClasses: [], violatedContractFields: [], violatedIntentClauses: [] }, reasoning: [], deterministic: true })
    assert.strictEqual(reviewDecision, "supersede_expedition")

    const acceptanceDecision = mapToAcceptanceDecision({ decision: "superseded", confidence: 0, matchedRules: [], violatedRules: [], matchedDriftClasses: [], evidence: { summary: "", ruleResults: [], matchedDriftClasses: [], violatedContractFields: [], violatedIntentClauses: [] }, reasoning: [], deterministic: true })
    assert.strictEqual(acceptanceDecision, "rejected")
  })

  void it("Alignment contract derivation produces null/default scores", () => {
    const intentModel = makeIntentModel()
    const contract = deriveAlignmentContractFromIntentModel(intentModel)

    assert.ok(contract.dimensions, "Contract should have dimensions")
    for (const dim of contract.dimensions) {
      assert.strictEqual(dim.score, null, `Dimension ${dim.name} should have null score`)
    }

    assert.ok(contract.objectiveCoverage, "Contract should have objective coverage")
    for (const oc of contract.objectiveCoverage) {
      assert.strictEqual(oc.aligned, false, "Objective coverage should not be pre-aligned")
    }

    assert.ok(contract.confidenceExplanation, "Contract should have confidence explanation")
    assert.strictEqual(contract.confidenceExplanation.score, null, "Confidence score should be null")

    assert.ok(contract.residualDivergence, "Contract should have residual divergence")
    for (const rd of contract.residualDivergence) {
      assert.strictEqual(rd.risk, null, "Residual divergence risk should be null")
    }
  })
})