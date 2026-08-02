// ============================================================
// SIGNING: Key Store
// ============================================================
// Operator-owned signing keys live outside the repository by default.
// The public key is committed to .synth/keys/ as governance config.
// ============================================================

import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import os from "os"

const DEFAULT_PRIVATE_KEY_DIR = path.join(os.homedir(), ".synth", "keys")
const DEFAULT_PRIVATE_KEY_FILE = path.join(DEFAULT_PRIVATE_KEY_DIR, "event-signing.key")
const DEFAULT_PUBLIC_KEY_DIR = ".synth"
const DEFAULT_PUBLIC_KEY_FILE = path.join(DEFAULT_PUBLIC_KEY_DIR, "keys", "event-signing.pub")

export interface SigningKeyPair {
  privateKey: string
  publicKey: string
  fingerprint: string
}

/** Derive a stable fingerprint from a public key PEM. */
export function fingerprintPublicKey(publicKeyPem: string): string {
  return crypto.createHash("sha256").update(publicKeyPem).digest("hex")
}

/** Generate a new Ed25519 signing key pair. */
export function generateSigningKeyPair(): SigningKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  })
  return {
    privateKey,
    publicKey,
    fingerprint: fingerprintPublicKey(publicKey),
  }
}

/** Load or create the operator signing key pair for a project. */
export async function loadOrCreateSigningKeyPair(
  projectRoot: string,
  opts?: {
    privateKeyPath?: string
    publicKeyPath?: string
  },
): Promise<SigningKeyPair> {
  const privateKeyPath = opts?.privateKeyPath ?? DEFAULT_PRIVATE_KEY_FILE
  const publicKeyPath = opts?.publicKeyPath
    ? opts.publicKeyPath
    : path.join(projectRoot, DEFAULT_PUBLIC_KEY_FILE)

  try {
    const privateKey = await fs.readFile(privateKeyPath, "utf-8")
    const publicKey = await fs.readFile(publicKeyPath, "utf-8")
    return { privateKey, publicKey, fingerprint: fingerprintPublicKey(publicKey) }
  } catch {
    // Either key missing — generate a new pair and persist.
    const pair = generateSigningKeyPair()
    await fs.mkdir(path.dirname(privateKeyPath), { recursive: true })
    await fs.mkdir(path.dirname(publicKeyPath), { recursive: true })
    await fs.writeFile(privateKeyPath, pair.privateKey, { mode: 0o600 })
    await fs.writeFile(publicKeyPath, pair.publicKey, { mode: 0o644 })
    return pair
  }
}

/** Load only the public key from the project if it exists. */
export async function loadPublicKey(projectRoot: string, publicKeyPath?: string): Promise<string | undefined> {
  const keyPath = publicKeyPath ? publicKeyPath : path.join(projectRoot, DEFAULT_PUBLIC_KEY_FILE)
  try {
    return await fs.readFile(keyPath, "utf-8")
  } catch {
    return undefined
  }
}

/** Return the fingerprint for a public key without loading the private key. */
export async function loadPublicKeyFingerprint(projectRoot: string, publicKeyPath?: string): Promise<string | undefined> {
  const publicKey = await loadPublicKey(projectRoot, publicKeyPath)
  if (!publicKey) return undefined
  return fingerprintPublicKey(publicKey)
}

/** Load the private key from the operator key store if it exists. */
export async function loadPrivateKey(privateKeyPath?: string): Promise<string | undefined> {
  const keyPath = privateKeyPath ?? DEFAULT_PRIVATE_KEY_FILE
  try {
    return await fs.readFile(keyPath, "utf-8")
  } catch {
    return undefined
  }
}
