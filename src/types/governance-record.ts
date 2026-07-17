// ============================================================
// SYNTH v2 — Governance Record Types (EXP-GOV-002)
// ============================================================
// A GovernanceRecord is a deterministic projection of a governance
// transition from the replayable event log. It unifies initialization,
// bootstrap, approvals, updates, verifications, and reconciliations into
// a single ordered lineage.
//
// Records are never authored directly. They are derived from events so
// that the Governance Record remains a replayable, verifiable history.
// ============================================================

export type GovernanceRecordType =
  | "initialization"
  | "governance_update"
  | "bootstrap"
  | "approval"
  | "verification"
  | "reconciliation"

export type GovernanceRecord = {
  /** Stable record identifier, derived from the source event. */
  id: string

  /** Record kind. */
  type: GovernanceRecordType

  /** Human-readable summary of the transition. */
  summary: string

  /** Event that produced this record. */
  eventId: string

  /** Event timestamp. */
  timestamp: number

  /** Event transaction id. */
  transactionId: string

  /** Event capability/actor that produced the transition. */
  actor: string

  /** Optional aggregate id the record concerns (mission, expedition, etc.). */
  subjectId?: string

  /** Optional subject name or title. */
  subjectName?: string

  /** Additional record-specific metadata. */
  metadata?: Record<string, unknown>
}

export type GovernanceRecordLineage = {
  status: "ok"
  kind: "GovernanceRecordLineage"
  recordCount: number
  records: GovernanceRecord[]
}
