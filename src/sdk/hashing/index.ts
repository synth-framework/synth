// ============================================================
// SDK: Hashing
// ============================================================
// Canonical hashing primitives. Replaces duplicated sha256 slices and
// local `stableId` implementations across adapters.
// ============================================================

import { createHash } from "node:crypto"

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex")
}

export function shortHash(input: string | Buffer, length = 12): string {
  return sha256(input).slice(0, length)
}

export function stableId(...parts: string[]): string {
  const normalized = parts.map((p) => p.toLowerCase().trim()).join("|")
  return sha256(normalized).slice(0, 16)
}
