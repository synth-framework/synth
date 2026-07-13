// ============================================================
// CORE: Deterministic Hash Utilities
// ============================================================
// Stable SHA-256 hashing for event chain integrity and command IDs.
// Keys are sorted to ensure JSON-equivalent inputs produce identical hashes.
// ============================================================

import crypto from "crypto"

/** Recursively sort object keys for stable serialization. */
export function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/** Stable JSON stringify with sorted keys. */
export function stableStringify(obj: unknown): string {
  return JSON.stringify(sortKeys(obj))
}

/** SHA-256 hex digest of a stable-serialized value. */
export function sha256(obj: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(obj)).digest("hex")
}

/** Canonical event content used for eventHash computation.
 *  Excludes the eventHash field itself; includes previousHash so the
 *  chain is cryptographic.
 */
export function eventContentForHash(event: {
  id: string
  type: string
  timestamp: number
  transactionId: string
  capability: string
  actor: string
  payload: unknown
  previousHash: string
}): Record<string, unknown> {
  return {
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    transactionId: event.transactionId,
    capability: event.capability,
    actor: event.actor,
    payload: event.payload,
    previousHash: event.previousHash,
  }
}

/** Compute the event hash for a canonical event. */
export function computeEventHash(event: {
  id: string
  type: string
  timestamp: number
  transactionId: string
  capability: string
  actor: string
  payload: unknown
  previousHash: string
}): string {
  return sha256(eventContentForHash(event))
}
