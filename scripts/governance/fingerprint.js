// ============================================================
// GOVERNANCE FINGERPRINT ENGINE (EXP-GOVERN-003)
// ============================================================
// Produces deterministic fingerprints for governance checks. The default
// strategy uses content hashes, but the strategy is swappable so future
// expeditions can introduce AST-based or semantic fingerprints without
// changing the proof model.
// ============================================================

import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import { glob } from "./glob.js"

/**
 * @typedef {(inputs: string[], root: string) => Promise<string>} FingerprintStrategy
 */

/**
 * Default strategy: SHA-256 over sorted, canonical file content hashes.
 * @type {FingerprintStrategy}
 */
async function contentHashStrategy(inputs, root) {
  const files = new Set()
  for (const pattern of inputs) {
    const matches = await glob(pattern, root)
    for (const match of matches) {
      files.add(match)
    }
  }

  const sorted = Array.from(files).sort()
  const hashes = []
  for (const file of sorted) {
    try {
      const content = await fs.readFile(path.join(root, file))
      const hash = crypto.createHash("sha256").update(content).digest("hex")
      hashes.push(`${file}:${hash}`)
    } catch {
      // Missing files are included with an empty hash so the fingerprint
      // changes if a missing file later appears.
      hashes.push(`${file}:`)
    }
  }

  const canonical = JSON.stringify({ inputs: hashes })
  return crypto.createHash("sha256").update(canonical).digest("hex")
}

/** @type {FingerprintStrategy} */
let activeStrategy = contentHashStrategy

export function setFingerprintStrategy(strategy) {
  activeStrategy = strategy
}

export function getFingerprintStrategy() {
  return activeStrategy
}

/**
 * Compute a fingerprint for a check.
 * @param {Object} params
 * @param {string} params.checkId
 * @param {string[]} params.inputs
 * @param {string} params.validatorVersion
 * @param {string} [params.algorithmVersion]
 * @param {string} [params.root]
 */
export async function computeFingerprint({ checkId, inputs, validatorVersion, algorithmVersion, root = process.cwd() }) {
  const inputFingerprint = await activeStrategy(inputs, root)
  const canonical = JSON.stringify({
    checkId,
    inputFingerprint,
  })
  return crypto.createHash("sha256").update(canonical).digest("hex")
}
