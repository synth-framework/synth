// ============================================================
// SYNTH v2 — OBSERVATION TYPES (CONSTITUTIONAL PRIMITIVE)
// ============================================================
// Observations are the canonical unit of knowledge fed into Mission Studio.
// They are produced by adapters, consumed by knowledge extraction, and never
// mutated by Mission Studio itself.
//
// Constitutional invariant:
//   Mission Studio SHALL NOT read external systems directly.
//   Mission Studio SHALL consume only Observation[] emitted by adapters.
// ============================================================

/** Source of an observation — identifies which adapter produced it */
export type ObservationSource = {
  /** Adapter name, e.g. "repository", "document", "conversation" */
  adapter: string

  /** Optional adapter-specific source locator (file path, URL, message id, etc.) */
  locator?: string

  /** Optional version of the producing adapter */
  adapterVersion?: string
}

/** Category of observation — what kind of knowledge it carries */
export type ObservationCategory =
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

/** Confidence level for an observation */
export type ObservationConfidence =
  | "certain"
  | "high"
  | "medium"
  | "low"
  | "unknown"

/** Evidence reference backing an observation */
export type ObservationEvidence = {
  /** Description of the evidence (e.g. "package.json dependency list") */
  description: string

  /** Optional raw snippet or summary */
  snippet?: string

  /** Optional checksum or fingerprint of the source material */
  fingerprint?: string
}

/** Observation — the only data structure Mission Studio accepts from adapters */
export type Observation = {
  /** Stable unique identifier */
  id: string

  /** Source adapter that produced the observation */
  source: ObservationSource

  /** Category of knowledge */
  category: ObservationCategory

  /** Subject of the observation (e.g. "TypeScript", "User", "CRM") */
  subject: string

  /** Evidence backing the observation */
  evidence: ObservationEvidence[]

  /** Confidence in the observation */
  confidence: ObservationConfidence

  /** Timestamp (ms since epoch) when the observation was produced */
  timestamp: number

  /** Adapter-specific metadata, must be serializable */
  metadata?: Record<string, unknown>
}

/** Collection of observations produced by an adapter */
export type ObservationBatch = {
  observations: Observation[]
  errors?: string[]
}

/** Interface for adapters that can observe external systems */
export interface Observable {
  /** Return observations without mutating any state */
  observe(): Promise<ObservationBatch>
}
