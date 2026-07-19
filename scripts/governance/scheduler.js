// ============================================================
// GOVERNANCE SCHEDULER (EXP-GOVERN-004)
// ============================================================
// Builds an execution plan from changed files, registered checks, and cached
// proofs. Decides which checks must run, which can skip, and why.
// ============================================================

import { computeFingerprint } from "./fingerprint.js"
import { IncrementalEngine } from "./incremental-engine.js"
import { isCacheable, resolveChecks } from "./check-registry.js"
import { mapFilesToModules } from "./module-mapper.js"

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} checkId
 * @property {"run" | "skip"} action
 * @property {string} reason
 * @property {string} fingerprint
 * @property {string[]} upstreamFingerprints
 * @property {import("./proof-store.js").ValidationProof | null} proof
 * @property {string[]} [changedInputs]
 * @property {string[]} dependencies
 */

export class Scheduler {
  /**
   * @param {Object} [options]
   * @param {string[]} [options.changedFiles]
   * @param {import("./incremental-engine.js").IncrementalEngine} [options.engine]
   * @param {string} [options.root]
   * @param {boolean} [options.full]
   */
  constructor(options = {}) {
    this.changedFiles = options.changedFiles ?? []
    this.engine = options.engine ?? new IncrementalEngine({ root: options.root })
    this.root = options.root ?? process.cwd()
    this.full = options.full ?? false
  }

  /**
   * @param {string[]} checkIds
   * @returns {Promise<ScheduleEntry[]>}
   */
  async plan(checkIds) {
    const checks = resolveChecks(checkIds)
    const changedModules = mapFilesToModules(this.changedFiles)

    // Compute fingerprints for all checks.
    const fingerprints = new Map()
    const plannedIds = new Set(checks.map((c) => c.id))
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

    // First pass: decide based on cache and explicit invalidation.
    const entries = []
    for (const check of checks) {
      const fingerprint = fingerprints.get(check.id)
      const upstreamIds = (check.dependencies ?? []).filter((id) => plannedIds.has(id))
      const upstreamFingerprints = upstreamIds.map((id) => fingerprints.get(id) ?? "")

      const dependencies = check.dependencies ?? []
      const entryBase = {
        checkId: check.id,
        fingerprint,
        upstreamFingerprints,
        dependencies,
      }

      if (this.full) {
        entries.push({
          ...entryBase,
          action: "run",
          reason: "full-run",
          proof: null,
        })
        continue
      }

      const changedInputs = this.matchChangedInputs(check.inputs)
      if (changedInputs.length > 0) {
        entries.push({
          ...entryBase,
          action: "run",
          reason: `input-changed: ${changedInputs.join(", ")}`,
          proof: null,
          changedInputs,
        })
        continue
      }

      if (changedModules.includes(check.module)) {
        entries.push({
          ...entryBase,
          action: "run",
          reason: `module-changed: ${check.module}`,
          proof: null,
        })
        continue
      }

      if (!isCacheable(check)) {
        entries.push({
          ...entryBase,
          action: "run",
          reason: "non-deterministic",
          proof: null,
        })
        continue
      }

      const decision = await this.engine.decide(check, fingerprint, upstreamFingerprints)
      entries.push({
        ...entryBase,
        action: decision.action,
        reason: decision.reason,
        proof: decision.proof,
      })
    }

    // Second pass: downstream invalidation. A check that depends on a running
    // check must also run.
    const running = new Set(entries.filter((e) => e.action === "run").map((e) => e.checkId))
    let changed = true
    while (changed) {
      changed = false
      for (const entry of entries) {
        if (entry.action === "run") continue
        const check = checks.find((c) => c.id === entry.checkId)
        const downstream = (check?.dependencies ?? []).some((dep) => running.has(dep))
        if (downstream) {
          entry.action = "run"
          entry.reason = "downstream"
          entry.proof = null
          running.add(entry.checkId)
          changed = true
        }
      }
    }

    // Third pass: upstream enforcement. If a check is scheduled to run and it
    // depends on another check, that dependency must also run. This ensures
    // build steps are not skipped while downstream tests that need their
    // outputs (e.g., dist/) are executed.
    while (changed) {
      changed = false
      for (const entry of entries) {
        if (entry.action !== "run") continue
        const check = checks.find((c) => c.id === entry.checkId)
        for (const dep of (check?.dependencies ?? []).filter((id) => plannedIds.has(id))) {
          const depEntry = entries.find((e) => e.checkId === dep)
          if (depEntry && depEntry.action !== "run") {
            depEntry.action = "run"
            depEntry.reason = "upstream"
            depEntry.proof = null
            running.add(depEntry.checkId)
            changed = true
          }
        }
      }
    }

    return entries
  }

  /**
   * @param {string[]} inputs
   * @returns {string[]}
   */
  matchChangedInputs(inputs) {
    return this.changedFiles.filter((file) =>
      inputs.some((pattern) => this.matchesPattern(file, pattern)),
    )
  }

  /**
   * @param {string} file
   * @param {string} pattern
   * @returns {boolean}
   */
  matchesPattern(file, pattern) {
    const normalized = file.replace(/\\/g, "/")
    const normalizedPattern = pattern.replace(/\\/g, "/")

    if (normalizedPattern.endsWith("/**")) {
      return normalized.startsWith(normalizedPattern.slice(0, -3))
    }
    if (normalizedPattern.endsWith("/*")) {
      const prefix = normalizedPattern.slice(0, -2)
      return normalized.startsWith(prefix + "/") && !normalized.slice(prefix.length + 1).includes("/")
    }
    if (normalizedPattern.includes("*")) {
      const regex = new RegExp("^" + normalizedPattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$")
      return regex.test(normalized)
    }
    return normalized === normalizedPattern || normalized.startsWith(normalizedPattern + "/")
  }
}
