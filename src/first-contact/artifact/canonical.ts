// ============================================================
// FIRST CONTACT: Artifact Canonicalization
// ============================================================
// Deterministic serialization and hashing for Discovery Artifacts.
// ============================================================

import crypto from "crypto"

const VOLATILE_FIELDS = new Set(["artifactHash", "id", "timestamp", "approvedAt", "generatedAt", "startedAt", "completedAt"])

function stripVolatileFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripVolatileFields)
  }
  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (VOLATILE_FIELDS.has(key)) continue
      cleaned[key] = stripVolatileFields(val)
    }
    return cleaned
  }
  return value
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys)
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/**
 * Produce a canonical JSON string for a Discovery Artifact.
 *
 * Excludes the artifactHash field and other volatile metadata (timestamps,
 * generation timestamps) from serialization so the hash reflects semantic
 * content rather than when the artifact was produced.
 */
export function canonicalizeArtifact<T extends Record<string, unknown>>(artifact: T): string {
  const cleaned = stripVolatileFields(artifact)
  const sorted = sortKeys(cleaned)
  return JSON.stringify(sorted)
}

/** Compute the SHA-256 hash of the canonical artifact serialization. */
export function hashArtifact<T extends Record<string, unknown>>(artifact: T): string {
  return crypto.createHash("sha256").update(canonicalizeArtifact(artifact)).digest("hex")
}
