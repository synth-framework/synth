// ============================================================
// ADAPTER: Specification — Evidence Adapter Types
// ============================================================
// Canonical types for the Specification Adapter.
// The adapter reads machine-readable specifications and emits
// Observations for Mission Studio.
// ============================================================

import type { ObservationBatch } from "../../types/index.js"

export type SpecificationFormat =
  | "openapi"
  | "asyncapi"
  | "graphql"
  | "protobuf"
  | "jsonschema"
  | "unknown"

export type SpecificationConfig = {
  /** Directory to scan for specifications */
  specificationsDirectory?: string
  /** Explicit file list; takes precedence over directory scan */
  files?: string[]
  /** Maximum snippet length in characters */
  maxSnippetLength?: number
}

export interface SpecificationAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "integration"
    description: string
  }

  /** Scan configured specifications and emit observations */
  observe(): Promise<ObservationBatch>
}
