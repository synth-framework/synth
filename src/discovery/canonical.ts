// ============================================================
// DISCOVERY: Canonicalization Infrastructure
// ============================================================
// Compiler primitives for canonical serialization and hashing.
//
// These functions are the foundation of determinism for the Discovery
// compiler. They recursively normalize object shape, produce stable byte
// representations, and generate cryptographic digests. All pipeline stage
// hashes and session identity depend on these primitives.
//
//   canonicalize(value)     -> normalized JSON value
//   serializeCanonical(value) -> stable JSON string
//   hashCanonical(value)    -> SHA-256 hex digest
// ============================================================

import { createHash } from "crypto"

/**
 * Recursively normalize a value into a canonical form.
 *
 * Object keys are sorted lexicographically. Arrays are preserved but their
 * elements are canonicalized. Primitives are returned unchanged.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key])
  }
  return sorted
}

/**
 * Produce a stable JSON string from a canonicalized value.
 *
 * The output is suitable for hashing, comparison, or persistence. It does
 * not depend on insertion order or runtime object layout.
 */
export function serializeCanonical(value: unknown, space?: string | number): string {
  return JSON.stringify(canonicalize(value), null, space)
}

/**
 * Produce a deterministic SHA-256 hex digest of a canonical JSON value.
 */
export function hashCanonical(value: unknown): string {
  return createHash("sha256").update(serializeCanonical(value)).digest("hex")
}
