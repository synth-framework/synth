// ============================================================
// FIRST CONTACT: Artifact Canonicalization
// ============================================================
// Deterministic serialization and hashing for Discovery Artifacts.
// ============================================================

import crypto from "crypto"

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
 * Excludes the artifactHash field from serialization so the hash can be
 * verified independently.
 */
export function canonicalizeArtifact<T extends Record<string, unknown>>(artifact: T): string {
  const { artifactHash: _, ...rest } = artifact
  const sorted = sortKeys(rest)
  return JSON.stringify(sorted)
}

/** Compute the SHA-256 hash of the canonical artifact serialization. */
export function hashArtifact<T extends Record<string, unknown>>(artifact: T): string {
  return crypto.createHash("sha256").update(canonicalizeArtifact(artifact)).digest("hex")
}
