// ============================================================
// SIGNING: Signer
// ============================================================
// Sign individual events and compute periodic Merkle roots.
// Signing is opt-in: when no private key is configured, events are
// emitted unsigned and verification reports UNSIGNED.
// ============================================================

import crypto from "crypto"
import type { SynthEvent } from "../types/index.js"
import { stableStringify } from "../sdk/json/index.js"
import { loadOrCreateSigningKeyPair, loadPrivateKey, fingerprintPublicKey } from "./key-store.js"

/** Data covered by an event signature. */
export interface EventSignaturePayload {
  eventHash: string
  timestamp: number
  identity?: Record<string, unknown>
}

/** A published Merkle root over a batch of events. */
export interface MerkleRoot {
  root: string
  startOffset: number
  endOffset: number
  eventHashes: string[]
}

/** Canonicalize the input to a signature. */
function canonicalSignaturePayload(payload: EventSignaturePayload): string {
  return stableStringify(payload)
}

/** Extract identity metadata from an event payload if present. */
function extractIdentityFromPayload(payload: unknown): Record<string, unknown> | undefined {
  const record = payload as Record<string, unknown> | undefined
  const metadata = record?.metadata as Record<string, unknown> | undefined
  return metadata?.identity as Record<string, unknown> | undefined
}

/** Sign an event with the configured Ed25519 private key. */
export function signEvent(event: SynthEvent, privateKeyPem: string, fingerprint: string): SynthEvent {
  const identity = extractIdentityFromPayload(event.payload)
  const payload: EventSignaturePayload = {
    eventHash: event.eventHash,
    timestamp: event.timestamp,
    identity,
  }
  const message = Buffer.from(canonicalSignaturePayload(payload), "utf-8")
  // Ed25519 signs the message directly; no digest algorithm is used.
  const signature = crypto.sign(null, message, privateKeyPem).toString("base64")
  return {
    ...event,
    signature,
    signingKeyFingerprint: fingerprint,
  }
}

/** Compute a Merkle root over an ordered list of event hashes. */
export function computeMerkleRoot(eventHashes: string[]): string {
  if (eventHashes.length === 0) return ""
  if (eventHashes.length === 1) return eventHashes[0]

  let layer = [...eventHashes]
  while (layer.length > 1) {
    const next: string[] = []
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]
      const right = layer[i + 1] ?? left
      next.push(crypto.createHash("sha256").update(left + right).digest("hex"))
    }
    layer = next
  }
  return layer[0]
}

/** Build a Merkle root payload over a range of events. */
export function buildMerkleRoot(events: SynthEvent[], startOffset: number, endOffset: number): MerkleRoot {
  const hashes = events.map((e) => e.eventHash)
  return {
    root: computeMerkleRoot(hashes),
    startOffset,
    endOffset,
    eventHashes: hashes,
  }
}

/** Sign a Merkle root payload. */
export function signMerkleRoot(root: MerkleRoot, privateKeyPem: string): string {
  const message = Buffer.from(stableStringify(root), "utf-8")
  return crypto.sign(null, message, privateKeyPem).toString("base64")
}

/**
 * Load the operator signing key and sign an event if configured.
 * Returns the event unchanged if no private key is available.
 */
export async function maybeSignEvent(
  event: SynthEvent,
  opts: SignEventBatchOptions = {},
): Promise<SynthEvent> {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const privateKey = await loadPrivateKey(opts.privateKeyPath)
  if (!privateKey) return event

  const pair = await loadOrCreateSigningKeyPair(projectRoot, {
    privateKeyPath: opts.privateKeyPath,
    publicKeyPath: opts.publicKeyPath,
  })
  return signEvent(event, pair.privateKey, pair.fingerprint)
}

export interface SignEventBatchOptions {
  projectRoot?: string
  privateKeyPath?: string
  publicKeyPath?: string
}

/**
 * Sign a batch of events with the configured key.
 * Events without a private key configured are returned unchanged.
 */
export async function signEventBatch(
  events: SynthEvent[],
  opts: SignEventBatchOptions = {},
): Promise<SynthEvent[]> {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const privateKey = await loadPrivateKey(opts.privateKeyPath)
  if (!privateKey) return events

  const pair = await loadOrCreateSigningKeyPair(projectRoot, {
    privateKeyPath: opts.privateKeyPath,
    publicKeyPath: opts.publicKeyPath,
  })
  return events.map((event) => signEvent(event, pair.privateKey, pair.fingerprint))
}
