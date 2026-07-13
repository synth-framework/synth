// ============================================================
// ADAPTER: Architecture — Intelligence Adapter Types
// ============================================================
// Canonical types for the Architecture Adapter.
// The adapter consumes Observations and infers architectural
// style Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type ArchitectureStyle =
  | "hexagonal"
  | "ddd"
  | "mvc"
  | "layered"
  | "microservices"
  | "unknown"

export type ArchitectureAdapterConfig = {
  /** Observations to infer architecture from */
  observations?: Observation[]
}

export interface ArchitectureAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "intelligence"
    description: string
  }

  /** Infer architecture from configured observations */
  infer(): Promise<ObservationBatch>

  /** Convenience method to infer from inline observations */
  inferFrom(observations: Observation[]): Promise<ObservationBatch>
}
