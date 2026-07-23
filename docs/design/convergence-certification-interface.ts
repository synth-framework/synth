// ============================================================
// Convergence Certification — Interface Specification
// ============================================================
// This file defines the public contract for Convergence Certification.
// It is a design artifact, not an implementation.
//
// Related:
//   - docs/design/convergence-certification.md
//   - docs/governance/program-027/convergence-certification-model.md
//   - docs/governance/program-027/convergence-certification-criteria.md
// ============================================================

import type { AlignmentContract } from "../src/governance/alignment-contract.js"
import type { EvaluationResult, EvidenceTrace } from "../src/governance/proposal-evaluation/types.js"

// ------------------------------------------------------------------
// Certification subject
// ------------------------------------------------------------------

/** A reference to an implemented artifact that can be observed. */
export type ImplementedArtifact = {
  kind: "artifact"
  id: string
  path: string
  mimeType?: string
  description: string
}

/** Observed runtime behavior that can be compared to intent. */
export type ObservedRuntimeEvidence = {
  kind: "runtime"
  id: string
  source: string
  observation: string
  timestamp: number
}

/** Execution evidence produced during the expedition. */
export type ExecutionEvidence = {
  kind: "execution"
  id: string
  eventIds: string[]
  summary: string
}

/** The complete mission outcome that Convergence Certification evaluates. */
export type CertificationSubject = {
  missionId: string
  expeditionId: string
  artifacts: ImplementedArtifact[]
  runtimeEvidence: ObservedRuntimeEvidence[]
  executionEvidence: ExecutionEvidence[]
}

// ------------------------------------------------------------------
// Certification dimensions
// ------------------------------------------------------------------

export type CertificationDimension =
  | "intent_fidelity"
  | "contract_fidelity"
  | "evidence_fidelity"
  | "drift_absence"

export type DimensionOutcome = "pass" | "fail" | "insufficient_evidence"

export type DimensionResult = {
  dimension: CertificationDimension
  outcome: DimensionOutcome
  confidence: number
  rationale: string
  evidence: EvidenceTrace
}

// ------------------------------------------------------------------
// Failure classification
// ------------------------------------------------------------------

export type FailureClass =
  | "contract_drift"
  | "implementation_drift"
  | "outcome_drift"
  | "insufficient_evidence"

// ------------------------------------------------------------------
// Certification result
// ------------------------------------------------------------------

export type ConvergenceDecision = "converged" | "diverged" | "insufficient_evidence"

export type ConvergenceResult = {
  decision: ConvergenceDecision
  confidence: number
  dimensions: DimensionResult[]
  failureClasses: FailureClass[]
  evidence: EvidenceTrace
  reasoning: string[]
  deterministic: true
}

// ------------------------------------------------------------------
// Certification record
// ------------------------------------------------------------------

export type ConvergenceCertification = {
  id: string
  missionId: string
  expeditionId: string
  subject: CertificationSubject
  alignmentContractId: string
  result: ConvergenceResult
  certifiedAt: number
  certifier: { kind: string; id: string }
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export type CertifyConvergence = (
  subject: CertificationSubject,
  contract: AlignmentContract,
  baselineEvaluation: EvaluationResult
) => ConvergenceResult

// ------------------------------------------------------------------
// Lifecycle authority
// ------------------------------------------------------------------

/**
 * Convergence Certification is a record with lifecycle authority.
 *
 * The certification does not directly mutate mission state. Instead, the
 * mission completion capability checks for a valid certification before
 * allowing completion.
 */
export type ConvergenceCertificationAuthority = {
  hasValidCertification: (missionId: string) => boolean
  getCertification: (missionId: string) => ConvergenceCertification | undefined
}
