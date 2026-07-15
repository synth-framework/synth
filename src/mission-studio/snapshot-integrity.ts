// ============================================================
// MISSION STUDIO: Snapshot Integrity
// ============================================================
// Schema versioning, content signatures, and certification for
// ApprovedMissionModelSnapshots.
//
// A snapshot's signature is SHA-256 over a deterministic
// canonical serialization of its planning content. When the
// snapshot has a lineage parent, the parent's signature is part
// of the signature input, so a tampered ancestor invalidates
// every descendant.
// ============================================================

import crypto from "crypto"
import type { ApprovedMissionModelSnapshot, StoredSnapshot } from "./types.js"
import { validateProposalGraph } from "./proposal-graph-validator.js"

/** Current snapshot schema version. Only this version exists today. */
export const SNAPSHOT_SCHEMA_VERSION = "1.0.0"

// ============================================================
// Canonical Serialization
// ============================================================

/**
 * Deterministic serialization of a snapshot value. Object keys are
 * sorted, Maps are encoded as tagged entry lists sorted by key, and
 * undefined values are dropped (matching JSON storage semantics).
 */
export function canonicalizeSnapshot(value: unknown): string {
  return JSON.stringify(canonicalValue(value))
}

function canonicalValue(value: unknown): unknown {
  if (value instanceof Map) {
    const entries = Array.from(value.entries())
      .map(([key, entryValue]) => [String(key), canonicalValue(entryValue)] as [string, unknown])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return { __type: "Map", value: entries }
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalValue(entry))
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const entry = (value as Record<string, unknown>)[key]
      if (entry === undefined) continue
      out[key] = canonicalValue(entry)
    }
    return out
  }
  return value
}

// ============================================================
// Signatures
// ============================================================

/**
 * Compute the content signature of a snapshot.
 *
 * The signature input is the snapshot's deterministic planning
 * content: identity, schema version, session binding, world model,
 * proposals, and the structural lineage fields (version, parentId,
 * approvedBy). Wall-clock approval metadata (timestamp, lineage
 * approvedAt, and the lineageId derived from them) is excluded so
 * that approving the same session twice yields the same signature.
 *
 * Lineage chaining: when the snapshot has a lineage parent, the
 * parent's signature must be supplied and is mixed into the
 * signature input, so a tampered ancestor invalidates descendants.
 */
export function signSnapshot(
  snapshot: ApprovedMissionModelSnapshot,
  parentSignature?: string,
): string {
  const input = canonicalizeSnapshot({
    id: snapshot.id,
    version: snapshot.version,
    sessionId: snapshot.sessionId,
    worldModel: snapshot.worldModel,
    proposals: snapshot.proposals,
    lineage: snapshot.lineage
      ? {
          version: snapshot.lineage.version,
          parentId: snapshot.lineage.parentId,
          approvedBy: snapshot.lineage.approvedBy,
        }
      : undefined,
    parentSignature,
  })
  return crypto.createHash("sha256").update(input).digest("hex")
}

// ============================================================
// Certification
// ============================================================

/**
 * Certify a stored snapshot. Returns a list of violations;
 * an empty list means the snapshot is certified.
 *
 * Checks:
 *   - known schema version
 *   - required fields present and well-formed
 *   - stored session bound to the snapshot
 *   - proposal graph validity (EXP-HARDEN-001)
 *   - lineage structure consistent with the parent (when provided)
 *   - signature recomputation match (with lineage chaining)
 *
 * A snapshot with a lineage parent can only be certified when the
 * parent snapshot is supplied: the chain input is unverifiable
 * without it.
 */
export function certifySnapshot(
  stored: StoredSnapshot,
  parent?: ApprovedMissionModelSnapshot,
): string[] {
  const violations: string[] = []

  if (!stored || typeof stored !== "object") {
    return ["Stored snapshot is not an object"]
  }
  const snapshot = stored.snapshot
  const session = stored.session

  if (!snapshot || typeof snapshot !== "object") {
    return ["Stored snapshot has no snapshot record"]
  }
  if (!session || typeof session !== "object") {
    violations.push("Stored snapshot has no planning session")
  }

  if (snapshot.version !== SNAPSHOT_SCHEMA_VERSION) {
    violations.push(`Unknown snapshot schema version: ${String(snapshot.version)}`)
  }
  if (typeof snapshot.id !== "string" || snapshot.id.length === 0) {
    violations.push("Snapshot id is missing or not a string")
  }
  if (typeof snapshot.sessionId !== "string" || snapshot.sessionId.length === 0) {
    violations.push("Snapshot sessionId is missing or not a string")
  }
  if (typeof snapshot.signature !== "string" || !/^[0-9a-f]{64}$/.test(snapshot.signature)) {
    violations.push("Snapshot signature is missing or not a SHA-256 hex digest")
  }
  if (typeof snapshot.timestamp !== "number" || !Number.isFinite(snapshot.timestamp)) {
    violations.push("Snapshot timestamp is missing or not a finite number")
  }
  if (!snapshot.worldModel || typeof snapshot.worldModel !== "object") {
    violations.push("Snapshot worldModel is missing or not an object")
  }
  if (!Array.isArray(snapshot.proposals)) {
    violations.push("Snapshot proposals is missing or not an array")
  }

  if (session && typeof session === "object" && typeof snapshot.sessionId === "string") {
    if ((session as { id?: unknown }).id !== snapshot.sessionId) {
      violations.push("Stored session id does not match snapshot sessionId")
    }
  }

  if (Array.isArray(snapshot.proposals)) {
    violations.push(...validateProposalGraph(snapshot.proposals))
  }

  const lineage = snapshot.lineage
  if (lineage !== undefined) {
    if (!lineage || typeof lineage !== "object") {
      violations.push("Snapshot lineage is not an object")
    } else {
      if (!Number.isInteger(lineage.version) || lineage.version < 1) {
        violations.push("Snapshot lineage version is not a positive integer")
      }
      if (lineage.parentId !== undefined && typeof lineage.parentId !== "string") {
        violations.push("Snapshot lineage parentId is not a string")
      }
      if (parent) {
        if (lineage.parentId !== parent.id) {
          violations.push(
            `Snapshot lineage parentId ${String(lineage.parentId)} does not match parent snapshot ${parent.id}`,
          )
        }
        if (parent.lineage) {
          if (lineage.lineageId !== parent.lineage.lineageId) {
            violations.push("Snapshot lineageId does not match parent lineageId")
          }
          if (lineage.version !== parent.lineage.version + 1) {
            violations.push("Snapshot lineage version does not follow parent version")
          }
        }
      }
    }
  }

  // Signature recomputation is only meaningful when the fields it
  // covers are well-formed enough to serialize.
  if (
    typeof snapshot.signature === "string" &&
    snapshot.worldModel &&
    typeof snapshot.worldModel === "object" &&
    Array.isArray(snapshot.proposals)
  ) {
    const expected = signSnapshot(snapshot, parent?.signature)
    if (expected !== snapshot.signature) {
      violations.push("Snapshot signature does not match its content or ancestry")
    }
  }

  return violations
}

// ============================================================
// Schema Versioning / Migration
// ============================================================

/**
 * Load a stored snapshot record at a known schema version.
 *
 * Only version "1.0.0" exists today, so loading is the identity.
 * When a future version is introduced, this is the seam where
 * conversions from older versions are applied. Unknown or future
 * versions are rejected loudly.
 */
export function migrateStoredSnapshot(raw: StoredSnapshot): StoredSnapshot {
  const version = raw?.snapshot?.version
  if (version === SNAPSHOT_SCHEMA_VERSION) {
    return raw
  }
  throw new Error(`unsupported snapshot schema version: ${String(version)}`)
}
