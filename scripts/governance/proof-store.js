// ============================================================
// GOVERNANCE PROOF STORE (EXP-GOVERN-003)
// ============================================================
// Persistent local store for ValidationProof artifacts. Proofs are stored in
// .synth/cache/govern/proofs.jsonl and keyed by (checkId, fingerprint).
// ============================================================

import crypto from "crypto"
import fs from "fs/promises"
import path from "path"

const DEFAULT_CACHE_DIR = path.join(process.cwd(), ".synth", "cache", "govern")
const PROOFS_FILE = "proofs.jsonl"

/**
 * @typedef {Object} ValidationProof
 * @property {string} id
 * @property {string} check
 * @property {string} fingerprint
 * @property {string[]} dependencies
 * @property {"PASS" | "FAIL"} result
 * @property {string} validatorVersion
 * @property {string} [algorithmVersion]
 * @property {string} timestamp
 * @property {string} proofHash
 */

export class ProofStore {
  /**
   * @param {Object} [options]
   * @param {string} [options.cacheDir]
   */
  constructor(options = {}) {
    this.cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR
    this.proofsPath = path.join(this.cacheDir, PROOFS_FILE)
  }

  async ensureDir() {
    await fs.mkdir(this.cacheDir, { recursive: true })
  }

  /** @returns {Promise<ValidationProof[]>} */
  async loadAll() {
    await this.ensureDir()
    try {
      const raw = await fs.readFile(this.proofsPath, "utf-8")
      const proofs = []
      for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const proof = JSON.parse(trimmed)
          if (this.isValidProof(proof)) {
            proofs.push(proof)
          }
        } catch {
          // Ignore corrupt lines.
        }
      }
      return proofs
    } catch (err) {
      if (err.code === "ENOENT") return []
      throw err
    }
  }

  /** @param {ValidationProof[]} proofs */
  async saveAll(proofs) {
    await this.ensureDir()
    const lines = proofs.map((p) => JSON.stringify(p)).join("\n") + "\n"
    await fs.writeFile(this.proofsPath, lines, "utf-8")
  }

  /**
   * @param {string} checkId
   * @param {string} fingerprint
   * @returns {Promise<ValidationProof | null>}
   */
  async get(checkId, fingerprint) {
    const proofs = await this.loadAll()
    return proofs.find((p) => p.check === checkId && p.fingerprint === fingerprint) ?? null
  }

  /** @param {Omit<ValidationProof, "id" | "proofHash" | "timestamp">} partial */
  async put(partial) {
    const timestamp = new Date().toISOString()
    const validatorVersion = partial.validatorVersion
    const algorithmVersion = partial.algorithmVersion ?? validatorVersion
    const proof = {
      ...partial,
      algorithmVersion,
      id: `${partial.check}:${partial.fingerprint}`,
      timestamp,
      proofHash: "",
    }
    proof.proofHash = this.computeProofHash(proof)

    const proofs = await this.loadAll()
    const index = proofs.findIndex((p) => p.check === proof.check && p.fingerprint === proof.fingerprint)
    if (index >= 0) {
      proofs[index] = proof
    } else {
      proofs.push(proof)
    }
    await this.saveAll(proofs)
    return proof
  }

  /**
   * Invalidate all proofs for a check.
   * @param {string} checkId
   */
  async invalidateCheck(checkId) {
    const proofs = await this.loadAll()
    const filtered = proofs.filter((p) => p.check !== checkId)
    await this.saveAll(filtered)
  }

  /**
   * Force a clean proof set.
   */
  async clear() {
    await this.ensureDir()
    await fs.writeFile(this.proofsPath, "", "utf-8")
  }

  /**
   * Merge proofs from a remote/shared backend. Existing local proofs with the
   * same (check, fingerprint) are overwritten only if the remote proof passes
   * integrity verification.
   * @param {import("./cache-backend.js").ProofCacheBackend} backend
   */
  async syncFrom(backend) {
    const remote = await backend.loadProofs()
    const local = await this.loadAll()
    const byKey = new Map(local.map((p) => [`${p.check}:${p.fingerprint}`, p]))

    for (const proof of remote) {
      if (!this.isValidProof(proof) || !this.verifyIntegrity(proof)) continue
      byKey.set(`${proof.check}:${proof.fingerprint}`, proof)
    }

    await this.saveAll([...byKey.values()])
  }

  /**
   * Push the current local proof set to a remote/shared backend.
   * @param {import("./cache-backend.js").ProofCacheBackend} backend
   */
  async syncTo(backend) {
    const proofs = await this.loadAll()
    await backend.saveProofs(proofs)
  }

  /** @param {ValidationProof} proof */
  computeProofHash(proof) {
    const canonical = JSON.stringify({
      check: proof.check,
      fingerprint: proof.fingerprint,
      dependencies: proof.dependencies,
      result: proof.result,
      validatorVersion: proof.validatorVersion,
      algorithmVersion: proof.algorithmVersion,
    })
    return crypto.createHash("sha256").update(canonical).digest("hex")
  }

  /** @param {unknown} proof */
  isValidProof(proof) {
    if (!proof || typeof proof !== "object") return false
    const p = /** @type {Record<string, unknown>} */ (proof)
    return (
      typeof p.id === "string" &&
      typeof p.check === "string" &&
      typeof p.fingerprint === "string" &&
      typeof p.result === "string" &&
      typeof p.validatorVersion === "string" &&
      typeof p.proofHash === "string"
    )
  }

  /**
   * Verify that the stored proofHash matches the recomputed hash.
   * @param {ValidationProof} proof
   */
  verifyIntegrity(proof) {
    return this.computeProofHash(proof) === proof.proofHash
  }
}
