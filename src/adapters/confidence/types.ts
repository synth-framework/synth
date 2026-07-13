// ============================================================
// ADAPTER: Confidence — Intelligence Adapter Types
// ============================================================
// Canonical types for the Confidence Adapter.
// The adapter consumes Observations and emits confidence,
// missing-evidence, ambiguity, and conflict reports.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type ConfidenceAdapterConfig = {
  /** Observations to evaluate */
  observations?: Observation[]
}

export type ConfidenceReport = {
  /** Overall confidence score (0.0 - 1.0) */
  score: number
  /** Confidence label derived from the score */
  level: string
  /** Number of observations evaluated */
  observationCount: number
  /** Missing evidence items */
  missingEvidence: string[]
  /** Ambiguities detected */
  ambiguities: string[]
  /** Conflicts detected */
  conflicts: string[]
}

export interface ConfidenceAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "intelligence"
    description: string
  }

  /** Evaluate confidence of configured observations */
  evaluate(): Promise<ObservationBatch>

  /** Convenience method to evaluate an inline observation batch */
  evaluateFrom(observations: Observation[]): Promise<ObservationBatch>
}
