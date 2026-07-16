// ============================================================
// MISSION STUDIO: Canonical JSON for integrity hashing
// ============================================================
// Single canonicalization semantics shared by every planning-
// layer integrity mechanism (draft fingerprints, decision
// records): sorted object keys, arrays in order. Changing this
// module changes every fingerprint — it is covered by the
// determinism fixtures of TRUST-002 and TRUST-004.
// ============================================================

import crypto from "crypto"

export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key])
  }
  return sorted
}

export function canonicalHash(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)))
}
