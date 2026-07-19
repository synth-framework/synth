// ============================================================
// PROOF CACHE BACKEND (EXP-GOVERN-005)
// ============================================================
// Abstracts where ValidationProof artifacts are stored. The default local
// backend keeps proofs in a .jsonl file; the CI artifact backend reads/writes
// a single cache artifact that CI systems can upload and download.
// ============================================================

import fs from "fs/promises"
import path from "path"

/**
 * @typedef {import("./proof-store.js").ValidationProof} ValidationProof
 */

export class ProofCacheBackend {
  /**
   * @returns {Promise<ValidationProof[]>}
   */
  async loadProofs() {
    throw new Error("ProofCacheBackend.loadProofs() must be implemented by subclass")
  }

  /**
   * @param {ValidationProof[]} proofs
   */
  async saveProofs(proofs) {
    throw new Error("ProofCacheBackend.saveProofs() must be implemented by subclass")
  }
}

/**
 * Local file backend: stores proofs in a newline-delimited JSON file.
 */
export class LocalFileProofCacheBackend extends ProofCacheBackend {
  /**
   * @param {string} filePath
   */
  constructor(filePath) {
    super()
    this.filePath = filePath
  }

  async loadProofs() {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8")
      const proofs = []
      for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          proofs.push(JSON.parse(trimmed))
        } catch {
          // Ignore malformed lines.
        }
      }
      return proofs
    } catch (err) {
      if (err.code === "ENOENT") return []
      throw err
    }
  }

  async saveProofs(proofs) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const lines = proofs.map((p) => JSON.stringify(p)).join("\n") + (proofs.length > 0 ? "\n" : "")
    await fs.writeFile(this.filePath, lines, "utf-8")
  }
}

/**
 * CI artifact backend: reads/writes proofs to a single artifact file in a
 * directory that CI systems treat as a cache. This is intentionally simple;
 * more sophisticated backends (S3, etc.) can be added later without changing
 * the proof model.
 */
export class CiArtifactProofCacheBackend extends ProofCacheBackend {
  /**
   * @param {string} artifactDir
   */
  constructor(artifactDir) {
    super()
    this.artifactDir = artifactDir
    this.artifactPath = path.join(artifactDir, "govern-proofs.jsonl")
  }

  async loadProofs() {
    const backend = new LocalFileProofCacheBackend(this.artifactPath)
    return backend.loadProofs()
  }

  async saveProofs(proofs) {
    await fs.mkdir(this.artifactDir, { recursive: true })
    const backend = new LocalFileProofCacheBackend(this.artifactPath)
    return backend.saveProofs(proofs)
  }
}
