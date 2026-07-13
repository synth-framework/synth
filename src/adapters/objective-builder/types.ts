// ============================================================
// ADAPTER: Objective Builder — Planning Adapter Types
// ============================================================
// Canonical types for the Objective Builder Adapter.
// The adapter consumes Observations and emits objective
// Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type ObjectiveBuilderConfig = {
  /** Observations to build objectives from */
  observations?: Observation[]
}

export interface ObjectiveBuilderAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "planning"
    description: string
  }

  /** Build objectives from configured observations */
  build(): Promise<ObservationBatch>

  /** Convenience method to build from inline observations */
  buildFrom(observations: Observation[]): Promise<ObservationBatch>
}
