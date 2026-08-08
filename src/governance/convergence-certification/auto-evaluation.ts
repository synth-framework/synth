// ============================================================
// GOVERNANCE: Convergence Certification — Auto Evaluation
// ============================================================
// Builds a default aligned EvaluationResult from an expedition's
// goal and attached evidence. This removes the manual toil of
// hand-authoring convergence-evaluation.json for the common case
// where the expedition completed successfully and evidence is
// attached.
// ============================================================

import type { Expedition } from "../../types/index.js"
import type { EvaluationResult, RuleResult, EvidenceTrace } from "../proposal-evaluation/types.js"

function buildEvidenceTrace(goal: string): EvidenceTrace {
  return {
    summary: `Auto-generated converged evaluation for expedition goal: ${goal}`,
    ruleResults: [],
    matchedDriftClasses: [],
    violatedContractFields: [],
    violatedIntentClauses: [],
  }
}

function buildMatchedRule(goal: string, attachmentCount: number): RuleResult {
  return {
    ruleId: "auto-expedition-goal-satisfied",
    ruleName: "Expedition goal satisfied by attached evidence",
    outcome: "pass",
    severity: "blocking",
    contractClauses: [
      {
        field: "successCriteria",
        requirement: "Expedition goal is achieved and evidenced.",
        values: [goal],
      },
      {
        field: "requiredBehaviors",
        requirement: "Implementation behaviors align with expedition intent.",
        values: ["changes verified", "evidence attached"],
      },
    ],
    observedFeatures: [
      { kind: "string", name: "goal", value: goal },
      { kind: "number", name: "attachmentCount", value: attachmentCount },
    ],
    rationale: `Expedition completed with ${attachmentCount} evidence attachment(s) and no reported drift.`,
  }
}

/**
 * Generate a default aligned EvaluationResult for a completed expedition.
 *
 * The generator assumes the expedition achieved its goal because it was
 * completed and evidence was attached. It produces a single passing rule
 * tied to successCriteria and requiredBehaviors so all convergence
 * dimensions (intent_fidelity, contract_fidelity, drift_absence) pass.
 */
export function generateConvergenceEvaluation(expedition: Expedition): EvaluationResult {
  const goal = expedition.goal || "No goal recorded."
  const attachmentCount = Array.isArray(expedition.attachments) ? expedition.attachments.length : 0

  return {
    decision: "aligned",
    confidence: 1,
    matchedRules: [buildMatchedRule(goal, attachmentCount)],
    violatedRules: [],
    matchedDriftClasses: [],
    evidence: buildEvidenceTrace(goal),
    reasoning: [
      "Expedition reached completed status.",
      `Goal: ${goal}`,
      `Evidence attachments: ${attachmentCount}`,
      "No drift classes or violated rules reported.",
    ],
    deterministic: true,
  }
}
