// ============================================================
// ADAPTER: Mission Builder — Planning Adapter Types
// ============================================================
// Canonical types for the Mission Builder Adapter.
// The adapter consumes Observations and emits mission
// Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type MissionBuilderConfig = {
  /** Observations to build missions from */
  observations?: Observation[]
}

export interface MissionBuilderAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "planning"
    description: string
  }

  /** Build missions from configured observations */
  build(): Promise<ObservationBatch>

  /** Convenience method to build from inline observations */
  buildFrom(observations: Observation[]): Promise<ObservationBatch>
}
