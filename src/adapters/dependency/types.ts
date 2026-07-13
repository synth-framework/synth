// ============================================================
// ADAPTER: Dependency — Intelligence Adapter Types
// ============================================================
// Canonical types for the Dependency Adapter.
// The adapter consumes Observations and emits graph
// Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type DependencyAdapterConfig = {
  /** Observations to build graphs from */
  observations?: Observation[]
}

export type GraphNode = {
  id: string
  label: string
  category: string
}

export type GraphEdge = {
  source: string
  target: string
  relation: string
}

export type Graph = {
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface DependencyAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "intelligence"
    description: string
  }

  /** Build graphs from configured observations */
  build(): Promise<ObservationBatch>

  /** Convenience method to build graphs from inline observations */
  buildFrom(observations: Observation[]): Promise<ObservationBatch>
}
