// ============================================================
// ADAPTER: Wizard — Planning Adapter Types
// ============================================================
// Canonical types for the Wizard Adapter.
// The adapter consumes Observations and emits wizard Observations
// that represent interactive approve/reject/merge/split/refine
// steps for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type WizardAction = "approve" | "reject" | "merge" | "split" | "refine"

export type WizardConfig = {
  /** Observations to build wizard steps from */
  observations?: Observation[]

  /** Actions exposed for each wizard step */
  actions?: WizardAction[]
}

export interface WizardAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "planning"
    description: string
  }

  /** Build wizard observations from configured observations */
  build(): Promise<ObservationBatch>

  /** Convenience method to build from inline observations */
  buildFrom(observations: Observation[]): Promise<ObservationBatch>
}
