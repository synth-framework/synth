// ============================================================
// PLANNING: Canonical Observation
// ============================================================
// The planning-layer canonical Observation type consumed by
// Mission Studio. Adapters produce system observations; Mission
// Intake normalizes them into this form before Mission Studio
// sees them.
//
// This mirrors how SynthEvent is the canonical execution type.
// ============================================================

export type PlanningObservationType =
  | "intent"
  | "language"
  | "framework"
  | "dependency"
  | "component"
  | "architecture"
  | "constraint"
  | "risk"
  | "assumption"
  | "unknown"
  | "evidence"
  | "actor"
  | "capability"
  | "test"
  | "coverage"
  | "mission"
  | "expedition"
  | "objective"
  | "wizard"
  | "custom"

export type PlanningObservationConfidence =
  | "certain"
  | "high"
  | "medium"
  | "low"
  | "unknown"

export type PlanningObservation = {
  /** Stable unique identifier */
  id: string

  /** Adapter that produced the observation */
  sourceAdapter: string

  /** Category of knowledge */
  type: PlanningObservationType

  /** Structured observation content */
  payload: Record<string, unknown>

  /** Reference to immutable evidence backing this observation */
  evidenceReference: string

  /** Confidence in the observation */
  confidence: PlanningObservationConfidence

  /** Timestamp when the observation was produced (ms since epoch) */
  timestamp: number
}
