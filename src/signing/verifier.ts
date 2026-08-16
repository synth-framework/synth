// ============================================================
// SIGNING: Verifier
// ============================================================
// Verify event signatures and Merkle roots against the public key
// committed in the project. Reports VALID, UNSIGNED, INVALID, or
// KEY_UNKNOWN.
// ============================================================

import crypto from "crypto"
import type { SynthEvent } from "../types/index.js"
import { stableStringify } from "../sdk/json/index.js"
import { loadPublicKey, fingerprintPublicKey } from "./key-store.js"
import { computeMerkleRoot, type MerkleRoot } from "./signer.js"

export type SignatureVerificationStatus = "VALID" | "UNSIGNED" | "INVALID" | "KEY_UNKNOWN"

export interface EventSignatureResult {
  eventId: string
  offset: number
  status: SignatureVerificationStatus
  fingerprint?: string
  reason?: string
}

export interface SignatureVerificationReport {
  status: SignatureVerificationStatus
  checked: number
  valid: number
  unsigned: number
  invalid: number
  keyUnknown: number
  events: EventSignatureResult[]
  merkleRoots?: MerkleRootVerificationResult[]
}

export interface MerkleRootVerificationResult {
  startOffset: number
  endOffset: number
  status: SignatureVerificationStatus
  fingerprint?: string
  reason?: string
}

/** Extract identity metadata from an event payload if present. */
function extractIdentityFromPayload(payload: unknown): Record<string, unknown> | undefined {
  const record = payload as Record<string, unknown> | undefined
  const metadata = record?.metadata as Record<string, unknown> | undefined
  return metadata?.identity as Record<string, unknown> | undefined
}

/** Verify an Ed25519 signature over the canonical event signature payload. */
function verifyEventSignature(
  event: SynthEvent,
  publicKeyPem: string,
): { status: "VALID" | "INVALID"; reason?: string } {
  if (!event.signature || !event.signingKeyFingerprint) {
    return { status: "INVALID", reason: "event is missing signature or fingerprint" }
  }

  const identity = extractIdentityFromPayload(event.payload)
  const payload = {
    eventHash: event.eventHash,
    timestamp: event.timestamp,
    identity,
  }
  const message = Buffer.from(stableStringify(payload), "utf-8")
  const signature = Buffer.from(event.signature, "base64")
  const ok = crypto.verify(null, message, publicKeyPem, signature)
  if (ok) return { status: "VALID" }
  return { status: "INVALID", reason: "signature does not verify" }
}

/** Verify a Merkle root against the public key and underlying event hashes. */
function verifyMerkleRoot(
  root: MerkleRoot,
  signature: string,
  fingerprint: string,
  publicKeyPem: string,
): { status: "VALID" | "INVALID"; reason?: string } {
  const recomputed = computeMerkleRoot(root.eventHashes)
  if (recomputed !== root.root) {
    return { status: "INVALID", reason: "Merkle root does not match event hashes" }
  }
  const message = Buffer.from(stableStringify(root), "utf-8")
  const sig = Buffer.from(signature, "base64")
  const ok = crypto.verify(null, message, publicKeyPem, sig)
  if (ok) return { status: "VALID" }
  return { status: "INVALID", reason: "Merkle root signature does not verify" }
}

/**
 * Verify signatures for all events in the log.
 * - UNSIGNED: no signature present (only counted when no key is configured or event is unsigned).
 * - VALID: signature verifies against the project public key.
 * - INVALID: signature exists but does not verify.
 * - KEY_UNKNOWN: signature references a fingerprint not present in the project.
 */
export interface VerifySignaturesOptions {
  projectRoot?: string
  publicKeyPath?: string
}

export async function verifyEventLogSignatures(
  events: SynthEvent[],
  opts: VerifySignaturesOptions = {},
): Promise<SignatureVerificationReport> {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const publicKey = await loadPublicKey(projectRoot, opts.publicKeyPath)
  const results: EventSignatureResult[] = []
  let valid = 0
  let unsigned = 0
  let invalid = 0
  let keyUnknown = 0

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (!event.signature) {
      unsigned++
      results.push({ eventId: event.id, offset: i, status: "UNSIGNED" })
      continue
    }

    if (!publicKey) {
      keyUnknown++
      results.push({
        eventId: event.id,
        offset: i,
        status: "KEY_UNKNOWN",
        fingerprint: event.signingKeyFingerprint,
        reason: "project has no committed public key",
      })
      continue
    }

    const expectedFingerprint = fingerprintPublicKey(publicKey)
    if (event.signingKeyFingerprint && event.signingKeyFingerprint !== expectedFingerprint) {
      keyUnknown++
      results.push({
        eventId: event.id,
        offset: i,
        status: "KEY_UNKNOWN",
        fingerprint: event.signingKeyFingerprint,
        reason: `expected fingerprint ${expectedFingerprint}`,
      })
      continue
    }

    const verification = verifyEventSignature(event, publicKey)
    if (verification.status === "VALID") {
      valid++
      results.push({
        eventId: event.id,
        offset: i,
        status: "VALID",
        fingerprint: event.signingKeyFingerprint,
      })
    } else {
      invalid++
      results.push({
        eventId: event.id,
        offset: i,
        status: "INVALID",
        fingerprint: event.signingKeyFingerprint,
        reason: verification.reason,
      })
    }
  }

  const status: SignatureVerificationStatus =
    invalid > 0 ? "INVALID" : keyUnknown > 0 ? "KEY_UNKNOWN" : valid > 0 ? "VALID" : "UNSIGNED"

  return {
    status,
    checked: events.length,
    valid,
    unsigned,
    invalid,
    keyUnknown,
    events: results,
  }
}
