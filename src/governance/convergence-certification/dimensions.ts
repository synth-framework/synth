// ============================================================
// GOVERNANCE: Convergence Certification — Dimension Evaluation
// ============================================================

import type { EvaluationResult, RuleResult, EvidenceTrace } from "../proposal-evaluation/types.js"
import type {
  CertificationSubject,
  CertificationDimension,
  DimensionResult,
  DimensionOutcome,
  FailureClass,
  ConvergenceDecision,
} from "./types.js"

const CONTRACT_FIDELITY_FIELDS: Array<RuleResult["contractClauses"]["field"]> = [
  "forbiddenDrift",
  "requiredProperties",
  "requiredBehaviors",
  "allowedInterpretation",
  "allowedVariation",
  "successCriteria",
]

function emptyEvidence(summary: string): EvidenceTrace {
  return {
    summary,
    ruleResults: [],
    matchedDriftClasses: [],
    violatedContractFields: [],
    violatedIntentClauses: [],
  }
}

function buildDimensionEvidence(
  dimension: CertificationDimension,
  violatedRules: RuleResult[],
  passedRules: RuleResult[]
): EvidenceTrace {
  const allRules = [...violatedRules, ...passedRules]
  const violatedContractFields = Array.from(new Set(violatedRules.map((r) => r.contractClauses.field)))
  const violatedIntentClauses = Array.from(
    new Set(
      violatedRules.flatMap((r) =>
        r.contractClauses.values.map((v) => `${r.contractClauses.field}: ${v}`)
      )
    )
  )

  const summary = violatedRules.length > 0
    ? `${dimension}: ${violatedRules.length} rule(s) violated.`
    : `${dimension}: all relevant rules satisfied.`

  return {
    summary,
    ruleResults: allRules,
    matchedDriftClasses: [],
    violatedContractFields,
    violatedIntentClauses,
  }
}

function evaluateIntentFidelity(evaluation: EvaluationResult): DimensionResult {
  const relevantViolations = evaluation.violatedRules.filter(
    (r) => r.contractClauses.field === "forbiddenInterpretation"
  )
  const relevantPasses = evaluation.matchedRules.filter(
    (r) => r.contractClauses.field === "forbiddenInterpretation"
  )
  const outcome: DimensionOutcome = relevantViolations.length > 0 ? "fail" : "pass"
  const confidence = outcome === "pass" ? 1 : Math.max(0, 1 - relevantViolations.length * 0.2)

  return {
    dimension: "intent_fidelity",
    outcome,
    confidence,
    rationale:
      outcome === "pass"
        ? "No forbidden interpretations detected in outcome."
        : `Forbidden interpretations detected: ${relevantViolations
            .map((r) => r.contractClauses.values.join(", "))
            .join("; ")}`,
    evidence: buildDimensionEvidence("intent_fidelity", relevantViolations, relevantPasses),
  }
}

function evaluateContractFidelity(evaluation: EvaluationResult): DimensionResult {
  const relevantViolations = evaluation.violatedRules.filter((r) =>
    CONTRACT_FIDELITY_FIELDS.includes(r.contractClauses.field)
  )
  const relevantPasses = evaluation.matchedRules.filter((r) =>
    CONTRACT_FIDELITY_FIELDS.includes(r.contractClauses.field)
  )
  const outcome: DimensionOutcome = relevantViolations.length > 0 ? "fail" : "pass"
  const confidence = outcome === "pass" ? 1 : Math.max(0, 1 - relevantViolations.length * 0.15)

  return {
    dimension: "contract_fidelity",
    outcome,
    confidence,
    rationale:
      outcome === "pass"
        ? "Outcome satisfies contract constraints."
        : `Contract constraints violated: ${relevantViolations
            .map((r) => r.contractClauses.values.join(", "))
            .join("; ")}`,
    evidence: buildDimensionEvidence("contract_fidelity", relevantViolations, relevantPasses),
  }
}

function evaluateEvidenceFidelity(subject: CertificationSubject): DimensionResult {
  const hasArtifacts = subject.artifacts.length > 0
  const hasRuntime = subject.runtimeEvidence.length > 0
  const hasExecution = subject.executionEvidence.length > 0
  const missing: string[] = []
  if (!hasArtifacts) missing.push("artifacts")
  if (!hasRuntime) missing.push("runtime evidence")
  if (!hasExecution) missing.push("execution evidence")

  const outcome: DimensionOutcome =
    missing.length === 0 ? "pass" : missing.length === 3 ? "insufficient_evidence" : "fail"

  return {
    dimension: "evidence_fidelity",
    outcome,
    confidence: missing.length === 0 ? 1 : 0,
    rationale:
      missing.length === 0
        ? "Required evidence artifacts are present."
        : `Missing required evidence: ${missing.join(", ")}`,
    evidence: emptyEvidence(
      missing.length === 0
        ? "Evidence package complete."
        : `Evidence package incomplete: ${missing.join(", ")}`
    ),
  }
}

function evaluateDriftAbsence(evaluation: EvaluationResult): DimensionResult {
  const hasDrift = evaluation.matchedDriftClasses.length > 0
  const outcome: DimensionOutcome = hasDrift ? "fail" : "pass"

  const violatedContractFields = Array.from(
    new Set(evaluation.violatedRules.map((r) => r.contractClauses.field))
  )
  const violatedIntentClauses = Array.from(
    new Set(
      evaluation.violatedRules.flatMap((r) =>
        r.contractClauses.values.map((v) => `${r.contractClauses.field}: ${v}`)
      )
    )
  )

  return {
    dimension: "drift_absence",
    outcome,
    confidence: hasDrift ? 0 : 1,
    rationale: hasDrift
      ? `Drift classes detected: ${evaluation.matchedDriftClasses.join(", ")}`
      : "No drift classes detected in outcome.",
    evidence: {
      summary: hasDrift
        ? `Drift classes matched: ${evaluation.matchedDriftClasses.join(", ")}`
        : "No drift classes matched.",
      ruleResults: evaluation.violatedRules,
      matchedDriftClasses: evaluation.matchedDriftClasses,
      violatedContractFields,
      violatedIntentClauses,
    },
  }
}

function determineFailureClasses(dimensions: DimensionResult[]): FailureClass[] {
  const failures = new Set<FailureClass>()

  const intentFidelity = dimensions.find((d) => d.dimension === "intent_fidelity")
  if (intentFidelity?.outcome === "fail") {
    failures.add("implementation_drift")
  }

  const contractFidelity = dimensions.find((d) => d.dimension === "contract_fidelity")
  if (contractFidelity?.outcome === "fail") {
    failures.add("contract_drift")
  }

  const evidenceFidelity = dimensions.find((d) => d.dimension === "evidence_fidelity")
  if (evidenceFidelity?.outcome === "fail" || evidenceFidelity?.outcome === "insufficient_evidence") {
    failures.add("insufficient_evidence")
  }

  const driftAbsence = dimensions.find((d) => d.dimension === "drift_absence")
  if (driftAbsence?.outcome === "fail") {
    failures.add("outcome_drift")
  }

  return Array.from(failures)
}

export function evaluateDimensions(
  subject: CertificationSubject,
  evaluation: EvaluationResult
): { dimensions: DimensionResult[]; failureClasses: FailureClass[] } {
  const dimensions: DimensionResult[] = [
    evaluateIntentFidelity(evaluation),
    evaluateContractFidelity(evaluation),
    evaluateEvidenceFidelity(subject),
    evaluateDriftAbsence(evaluation),
  ]

  return {
    dimensions,
    failureClasses: determineFailureClasses(dimensions),
  }
}

export function determineConvergenceDecision(dimensions: DimensionResult[]): ConvergenceDecision {
  if (dimensions.some((d) => d.outcome === "insufficient_evidence")) {
    return "insufficient_evidence"
  }
  if (dimensions.some((d) => d.outcome === "fail")) {
    return "diverged"
  }
  return "converged"
}
