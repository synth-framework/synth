// ============================================================
// ADAPTER: Knowledge Extraction — Intelligence Adapter Types
// ============================================================
// Canonical types for the Knowledge Extraction Adapter.
// The adapter consumes Observations and emits higher-level
// Knowledge Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type KnowledgeExtractionConfig = {
  /** Observations to extract knowledge from */
  observations?: Observation[]
}

export interface KnowledgeExtractionAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "intelligence"
    description: string
  }

  /** Extract knowledge from the configured observations */
  extract(): Promise<ObservationBatch>

  /** Convenience method to extract from an inline observation batch */
  extractFrom(observations: Observation[]): Promise<ObservationBatch>
}
