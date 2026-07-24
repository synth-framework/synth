// ============================================================
// Proposal Evaluation Capability — Interface Specification
// ============================================================
// This file defines the public contract for the Proposal Evaluation
// Capability. It is a design artifact, not an implementation.
//
// Related:
//   - docs/design/proposal-evaluation-capability.md
//   - docs/expeditions/EXP-GOVERNABILITY-002-proposal-evaluation-capability.md
// ============================================================

import type { AlignmentContract } from "../src/governance/alignment-contract.js"

// ------------------------------------------------------------------
// Proposal representation
// ------------------------------------------------------------------

/** A single boolean or categorical feature of a proposal. */
export type ProposalFeature =
  | { kind: "boolean"; name: string; value: boolean }
  | { kind: "string"; name: string; value: string }
  | { kind: "string[]"; name: string; value: string[] }
  | { kind: "number"; name: string; value: number }

/** A normalized, deterministic description of a proposal. */
export type FeatureListProposal = {
  kind: "feature-list"
  features: ProposalFeature[]
  metadata?: Record<string, unknown>
}

/** A reference to an existing artifact plus an extractor identifier. */
export type ArtifactReferenceProposal = {
  kind: "artifact-reference"
  path: string
  extractorId: string
  metadata?: Record<string, unknown>
}

export type Proposal = FeatureListProposal | ArtifactReferenceProposal

// ------------------------------------------------------------------
// Rule model
// ------------------------------------------------------------------

export type RuleSeverity = "blocking" | "warning"

export type RuleOutcome = "pass" | "fail"

/** A deterministic rule that checks proposal features against contract clauses. */
export type EvaluationRule = {
  id: string
  name: string
  description: string
  severity: RuleSeverity
  contractClauses: {
    field:
      | "requiredProperties"
      | "forbiddenProperties"
      | "requiredBehaviors"
      | "forbiddenInterpretation"
      | "forbiddenDrift"
      | "allowedInterpretation"
      | "allowedVariation"
      | "successCriteria"
    values: string[]
  }
  featureNames: string[]
  evaluate: (features: ProposalFeature[]) => RuleOutcome
}

export type RuleResult = {
  ruleId: string
  ruleName: string
  outcome: RuleOutcome
  severity: RuleSeverity
  contractClauses: EvaluationRule["contractClauses"]
  observedFeatures: ProposalFeature[]
  rationale: string
}

// ------------------------------------------------------------------
// Drift-class adapter model
// ------------------------------------------------------------------

/** An adapter that maps a known drift class to a set of evaluation rules. */
export type DriftClassAdapter = {
  driftClassId: string
  name: string
  description: string
  ruleIds: string[]
}

// ------------------------------------------------------------------
// Explainability model
// ------------------------------------------------------------------

export type EvidenceTrace = {
  summary: string
  ruleResults: RuleResult[]
  matchedDriftClasses: string[]
  violatedContractFields: string[]
  violatedIntentClauses: string[]
}

// ------------------------------------------------------------------
// Evaluation result
// ------------------------------------------------------------------

export type AlignmentDecision = "aligned" | "revision_required" | "rejected"

export type EvaluationResult = {
  decision: AlignmentDecision
  confidence: number
  matchedRules: RuleResult[]
  violatedRules: RuleResult[]
  matchedDriftClasses: string[]
  evidence: EvidenceTrace
  reasoning: string[]
  deterministic: true
}

// ------------------------------------------------------------------
// Rule set
// ------------------------------------------------------------------

export type ProposalEvaluationRuleSet = {
  id: string
  version: number
  rules: EvaluationRule[]
  driftClassAdapters: DriftClassAdapter[]
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export type EvaluateProposal = (
  proposal: Proposal,
  contract: AlignmentContract,
  ruleSet: ProposalEvaluationRuleSet
) => EvaluationResult

// ------------------------------------------------------------------
// Extractor contract
// ------------------------------------------------------------------

export type ProposalExtractor = {
  id: string
  supports: (proposal: Proposal) => boolean
  extract: (proposal: ArtifactReferenceProposal) => FeatureListProposal
}
