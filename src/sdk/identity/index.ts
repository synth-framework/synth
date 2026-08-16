// ============================================================
// SDK: Identity
// ============================================================
// Canonical identity generation. All UUIDs and short identifiers
// should originate here so their behavior is predictable and
// AI-discoverable.
// ============================================================

import { randomUUID } from "node:crypto"
import { shortHash } from "../hashing/index.js"

export function uuid(): string {
  return randomUUID()
}

export function shortId(): string {
  return shortHash(randomUUID(), 8)
}

// EXP-IDENTITY-001: transport-layer identity capture.
export { type AgentIdentity } from "../../identity/index.js"
