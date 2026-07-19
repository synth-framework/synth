// ============================================================
// GOVERNANCE INCREMENTAL ENGINE (EXP-GOVERN-003)
// ============================================================
// Decides which governance checks can be skipped by reusing cached proofs,
// and which must execute because their fingerprints or dependencies changed.
// This is not scheduling; it is purely proof-based invalidation.
// ============================================================

import { ProofStore } from "./proof-store.js"
import { computeFingerprint } from "./fingerprint.js"
import { isCacheable } from "./check-registry.js"

/**
 * @typedef {Object} ExecutionDecision
 * @property {string} checkId
 * @property {"run" | "skip"} action
 * @property {string} reason
 * @property {string} fingerprint
 * @property {string[]} upstreamFingerprints
 * @property {import("./proof-store.js").ValidationProof | null} proof
 */

export class IncrementalEngine {
  /**
   * @param {Object} [options]
   * @param {ProofStore} [options.store]
   * @param {string} [options.root]
   * @param {boolean} [options.force]
   */
  constructor(options = {}) {
    this.store = options.store ?? new ProofStore()
    this.root = options.root ?? process.cwd()
    this.force = options.force ?? false
  }

  /**
   * @param {import("./check-registry.js").GovernanceCheck[]} checks
   * @returns {Promise<ExecutionDecision[]>}
   */
  async plan(checks) {
    /** @type {Map<string, string>} */
    const fingerprints = new Map()

    // Compute fingerprints for all checks up front.
    for (const check of checks) {
      const fingerprint = await computeFingerprint({
        checkId: check.id,
        inputs: check.inputs,
        validatorVersion: check.validatorVersion ?? "1.0.0",
        algorithmVersion: check.algorithmVersion,
        root: this.root,
      })
      fingerprints.set(check.id, fingerprint)
    }

    /** @type {Map<string, ExecutionDecision>} */
    const decisions = new Map()

    for (const check of checks) {
      const fingerprint = fingerprints.get(check.id)
      const upstreamIds = check.dependencies ?? []
      const upstreamFingerprints = upstreamIds.map((id) => fingerprints.get(id) ?? "")
      const decision = await this.decide(check, fingerprint, upstreamFingerprints)
      decisions.set(check.id, decision)
    }

    return checks.map((c) => decisions.get(c.id))
  }

  /**
   * @param {import("./check-registry.js").GovernanceCheck} check
   * @param {string} fingerprint
   * @param {string[]} upstreamFingerprints
   * @returns {Promise<ExecutionDecision>}
   */
  async decide(check, fingerprint, upstreamFingerprints) {
    if (this.force) {
      return {
        checkId: check.id,
        action: "run",
        reason: "manual-rebuild",
        fingerprint,
        upstreamFingerprints,
        proof: null,
      }
    }

    if (!isCacheable(check)) {
      return {
        checkId: check.id,
        action: "run",
        reason: "non-deterministic",
        fingerprint,
        upstreamFingerprints,
        proof: null,
      }
    }

    const proof = await this.store.get(check.id, fingerprint)
    if (!proof) {
      return {
        checkId: check.id,
        action: "run",
        reason: "cache-miss",
        fingerprint,
        upstreamFingerprints,
        proof: null,
      }
    }

    if (!this.store.verifyIntegrity(proof)) {
      return {
        checkId: check.id,
        action: "run",
        reason: "corrupt-proof",
        fingerprint,
        upstreamFingerprints,
        proof,
      }
    }

    const validatorVersion = check.validatorVersion ?? "1.0.0"
    const algorithmVersion = check.algorithmVersion ?? validatorVersion
    if (proof.validatorVersion !== validatorVersion || proof.algorithmVersion !== algorithmVersion) {
      return {
        checkId: check.id,
        action: "run",
        reason: "version-mismatch",
        fingerprint,
        upstreamFingerprints,
        proof,
      }
    }

    if (JSON.stringify(proof.dependencies) !== JSON.stringify(upstreamFingerprints)) {
      return {
        checkId: check.id,
        action: "run",
        reason: "dependency-invalidation",
        fingerprint,
        upstreamFingerprints,
        proof,
      }
    }

    return {
      checkId: check.id,
      action: "skip",
      reason: "cache-hit",
      fingerprint,
      upstreamFingerprints,
      proof,
    }
  }

  /**
   * Persist a proof for an executed check.
   * @param {import("./check-registry.js").GovernanceCheck} check
   * @param {string} fingerprint
   * @param {string[]} upstreamFingerprints
   * @param {"PASS" | "FAIL"} result
   */
  async record(check, fingerprint, upstreamFingerprints, result) {
    if (!isCacheable(check)) return null

    return this.store.put({
      check: check.id,
      fingerprint,
      dependencies: upstreamFingerprints,
      result,
      validatorVersion: check.validatorVersion ?? "1.0.0",
      algorithmVersion: check.algorithmVersion,
    })
  }
}
