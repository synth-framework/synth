// ============================================================
// GOVERNANCE: Convergence Certification Capability
// ============================================================

import type { EvaluationResult, ProposalFeature } from "../proposal-evaluation/types.js"
import type {
  CertificationSubject,
  ConvergenceResult,
  ConvergenceCertification,
} from "./types.js"
import { evaluateDimensions, determineConvergenceDecision } from "./dimensions.js"
import { buildCertificationEvidence, buildCertificationReasoning } from "./explainability.js"

export * from "./types.js"
export * from "./dimensions.js"
export * from "./explainability.js"

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Certify whether an implemented outcome remains converged with approved intent.
 *
 * This is a pure function: the same subject and evaluation always produce the
 * same ConvergenceResult.
 */
export function certifyConvergence(
  subject: CertificationSubject,
  evaluation: EvaluationResult
): ConvergenceResult {
  const { dimensions, failureClasses } = evaluateDimensions(subject, evaluation)
  const decision = determineConvergenceDecision(dimensions)
  const evidence = buildCertificationEvidence(dimensions, failureClasses)
  const reasoning = buildCertificationReasoning(dimensions, failureClasses)

  const confidence = dimensions.reduce((sum, d) => sum + d.confidence, 0) / dimensions.length

  return {
    decision,
    confidence: Math.max(0, Math.min(1, confidence)),
    dimensions,
    failureClasses,
    evidence,
    reasoning,
    deterministic: true,
  }
}

/**
 * Build a persistent Convergence Certification record.
 *
 * This attaches identity, timestamp, and authority to a ConvergenceResult.
 */
export function buildCertificationRecord(
  subject: CertificationSubject,
  evaluation: EvaluationResult,
  alignmentContractId: string,
  certifier: { kind: string; id: string },
  certifiedAt?: number
): ConvergenceCertification {
  const result = certifyConvergence(subject, evaluation)

  return {
    id: makeId("convergence-certification"),
    missionId: subject.missionId,
    expeditionId: subject.expeditionId,
    subject,
    alignmentContractId,
    result,
    certifiedAt: certifiedAt ?? Date.now(),
    certifier,
  }
}

/**
 * Convenience helper for constructing observed feature lists from tests.
 *
 * Mirrors `buildProposal` in the Program 027 rule set. The returned feature
 * list can be passed to `evaluateProposal` to produce an EvaluationResult for
 * convergence certification.
 */
export function buildObservedFeatures(features: Record<string, boolean>): {
  kind: "feature-list"
  features: ProposalFeature[]
} {
  return {
    kind: "feature-list",
    features: Object.entries(features).map(([name, value]) => ({
      kind: "boolean" as const,
      name,
      value,
    })),
  }
}
