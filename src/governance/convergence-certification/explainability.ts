// ============================================================
// GOVERNANCE: Convergence Certification — Explainability
// ============================================================

import type { EvidenceTrace } from "../proposal-evaluation/types.js"
import type { DimensionResult, FailureClass } from "./types.js"

/** Build a top-level evidence trace from dimension results. */
export function buildCertificationEvidence(
  dimensions: DimensionResult[],
  failureClasses: FailureClass[]
): EvidenceTrace {
  const violatedContractFields = Array.from(
    new Set(
      dimensions
        .flatMap((d) => d.evidence.violatedContractFields)
    )
  )

  const violatedIntentClauses = Array.from(
    new Set(
      dimensions
        .flatMap((d) => d.evidence.violatedIntentClauses)
    )
  )

  const matchedDriftClasses = Array.from(
    new Set(
      dimensions
        .flatMap((d) => d.evidence.matchedDriftClasses)
    )
  )

  const summary = failureClasses.length === 0
    ? "Outcome is converged with approved intent and contract."
    : `Outcome divergence detected: ${failureClasses.join(", ")}.`

  return {
    summary,
    ruleResults: dimensions.flatMap((d) => d.evidence.ruleResults),
    matchedDriftClasses,
    violatedContractFields,
    violatedIntentClauses,
  }
}

/** Build human-readable reasoning from dimension results and failure classes. */
export function buildCertificationReasoning(
  dimensions: DimensionResult[],
  failureClasses: FailureClass[]
): string[] {
  const reasoning: string[] = []

  for (const dimension of dimensions) {
    reasoning.push(
      `${dimension.dimension}: ${dimension.outcome} (${dimension.rationale})`
    )
  }

  if (failureClasses.length > 0) {
    reasoning.push(`Failure classes: ${failureClasses.join(", ")}`)
  }

  return reasoning
}
