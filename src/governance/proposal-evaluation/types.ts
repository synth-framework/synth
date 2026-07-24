// ============================================================
// GOVERNANCE: Proposal Evaluation — Types
// ============================================================

import type { AlignmentContract } from "../alignment-contract.js"

// ------------------------------------------------------------------
// Proposal representation
// ------------------------------------------------------------------

export type ProposalFeature =
  | { kind: "boolean"; name: string; value: boolean }
  | { kind: "string"; name: string; value: string }
  | { kind: "string[]"; name: string; value: string[] }
  | { kind: "number"; name: string; value: number }

export type FeatureListProposal = {
  kind: "feature-list"
  features: ProposalFeature[]
  metadata?: Record<string, unknown>
}

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

export type AlignmentDecision = "aligned" | "revision_required" | "rejected" | "superseded"

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
