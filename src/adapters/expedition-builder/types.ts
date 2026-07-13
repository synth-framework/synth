// ============================================================
// ADAPTER: Expedition Builder — Planning Adapter Types
// ============================================================
// Canonical types for the Expedition Builder Adapter.
// The adapter consumes Observations and emits expedition
// Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type ExpeditionBuilderConfig = {
  /** Observations to build expeditions from */
  observations?: Observation[]
}

export interface ExpeditionBuilderAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "planning"
    description: string
  }

  /** Build expeditions from configured observations */
  build(): Promise<ObservationBatch>

  /** Convenience method to build from inline observations */
  buildFrom(observations: Observation[]): Promise<ObservationBatch>
}
