// ============================================================
// SEMANTIC MODELING: Intent Model Types
// ============================================================
// Shared types for the Intent Modeling Engine (EXP-SEMANTIC-001).
// The Intent Model is a canonical, implementation-independent
// representation of operator intent derived from an approved Genesis
// artifact.
// ============================================================

import type { IntentExtractionResult } from "../../first-contact/extract/types.js"

export type ConfidenceScore = number

export type IntentNodeType =
  | "problem"
  | "goal"
  | "stakeholder"
  | "outcome"
  | "success-criterion"
  | "assumption"
  | "unknown"
  | "constraint"

export type AmbiguityClass =
  | "MISSING_REQUIRED"
  | "LOW_CONFIDENCE"
  | "CONFLICTING"
  | "NEEDS_DISAMBIGUATION"

export interface IntentNodeBase {
  id: string
  type: IntentNodeType
  label: string
  confidence: ConfidenceScore
  evidence: string[]
  source: string
}

export interface ProblemNode extends IntentNodeBase {
  type: "problem"
}

export interface GoalNode extends IntentNodeBase {
  type: "goal"
}

export interface StakeholderNode extends IntentNodeBase {
  type: "stakeholder"
  kind: "primary" | "secondary"
}

export interface OutcomeNode extends IntentNodeBase {
  type: "outcome"
}

export interface SuccessCriterionNode extends IntentNodeBase {
  type: "success-criterion"
}

export interface AssumptionNode extends IntentNodeBase {
  type: "assumption"
}

export interface UnknownNode extends IntentNodeBase {
  type: "unknown"
  accepted: boolean
}

export interface ConstraintNode extends IntentNodeBase {
  type: "constraint"
  kind: "functional" | "non-functional"
}

export type IntentNode =
  | ProblemNode
  | GoalNode
  | StakeholderNode
  | OutcomeNode
  | SuccessCriterionNode
  | AssumptionNode
  | UnknownNode
  | ConstraintNode

export type IntentEdgeType =
  | "derives"
  | "requires"
  | "produces"
  | "validated-by"
  | "affects"
  | "owns"

export interface IntentEdge {
  id: string
  source: string
  target: string
  type: IntentEdgeType
}

export interface IntentGraph {
  nodes: IntentNode[]
  edges: IntentEdge[]
}

export interface Ambiguity {
  id: string
  class: AmbiguityClass
  field: string
  message: string
  nodeIds: string[]
  blocking: boolean
}

export interface IntentModel {
  schema: "synth-intent-model-v1"
  version: string
  derivedFrom: {
    discoveryArtifactId?: string
    adapterId: string
    adapterVersion: string
  }
  graph: IntentGraph
  aggregateConfidence: ConfidenceScore
  ambiguities: Ambiguity[]
  generatedAt: string
}

export interface IntentModelingOptions {
  artifact: IntentExtractionResult
}

/**
 * Adapter contract for intent modeling strategies.
 *
 * Implementations must be deterministic: the same approved Genesis artifact
 * and adapter version produce the same IntentModel.
 */
export interface IntentModelingAdapter {
  readonly id: string
  readonly version: string
  model(options: IntentModelingOptions): IntentModel
}
