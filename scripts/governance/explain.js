// ============================================================
// VALIDATION EXPLANATION (EXP-GOV-010)
// ============================================================
// Formats deterministic, human-readable reasons for validation decisions.
// Every skipped validator must have a reason derived from its fingerprint,
// dependencies, class membership, or profile rules.
// ============================================================

/**
 * @typedef {Object} ExplanationEntry
 * @property {string} checkId
 * @property {"run" | "skip"} action
 * @property {string} reason
 * @property {string} [detail]
 */

/**
 * Build a short, deterministic reason for a validator decision.
 *
 * @param {Object} params
 * @param {string} params.checkId
 * @param {"run" | "skip"} params.action
 * @param {string} [params.reason]
 * @param {string[]} [params.changedInputs]
 * @param {string} [params.module]
 * @param {string[]} [params.classes]
 * @param {string} [params.profile]
 * @returns {string}
 */
export function explainReason(params) {
  const { action, reason, changedInputs, module, classes, profile } = params

  if (action === "run") {
    if (reason?.startsWith("input-changed")) {
      return `Inputs changed${changedInputs ? `: ${changedInputs.join(", ")}` : ""}.`
    }
    if (reason?.startsWith("module-changed")) {
      return `Module '${module}' changed.`
    }
    if (reason === "downstream") {
      return "Upstream validator executed; downstream revalidation required."
    }
    if (reason === "non-deterministic") {
      return "Validator is non-deterministic and must run every time."
    }
    if (reason === "full-run" || reason === "manual-rebuild") {
      return "Full validation requested."
    }
    if (reason === "cache-miss") {
      return "No reusable proof found."
    }
    if (reason === "corrupt-proof") {
      return "Stored proof failed integrity verification."
    }
    if (reason === "version-mismatch") {
      return "Validator or algorithm version changed."
    }
    if (reason === "dependency-invalidation") {
      return "Upstream dependency fingerprint changed."
    }
    if (reason === "profile-required") {
      return `Required by certification profile '${profile}'.`
    }
    if (reason?.startsWith("class-required")) {
      return `Governance class '${classes?.join(", ")}' affected.`
    }
    return reason || "Scheduled for execution."
  }

  // Skip reasons
  if (reason === "cache-hit") {
    return "Fingerprint and dependencies unchanged; reusable proof exists."
  }
  if (reason === "no-class-impact") {
    return `No affected governance class (${classes?.join(", ") || "none"}); validator not required.`
  }
  if (reason === "profile-excluded") {
    return `Excluded by certification profile '${profile}'.`
  }
  if (reason === "not-in-validation-map") {
    return "Capability has no mapped validators."
  }
  if (reason === "no-changed-inputs") {
    return "No changed inputs affect this validator."
  }
  return reason || "Skipped by validation plan."
}

/**
 * Format a full explanation report from a validation plan and results.
 *
 * @param {Object} params
 * @param {string} params.mode
 * @param {string} [params.profile]
 * @param {string[]} params.changedFiles
 * @param {string[]} params.affectedCapabilities
 * @param {import("./governance-classes.js").GovernanceClass[]} params.affectedClasses
 * @param {ExplanationEntry[]} params.entries
 * @returns {Object}
 */
export function buildExplanationReport(params) {
  const { mode, profile, changedFiles, affectedCapabilities, affectedClasses, entries } = params

  const run = entries.filter((e) => e.action === "run")
  const skipped = entries.filter((e) => e.action === "skip")

  return {
    kind: "GovernanceExplanation",
    schemaVersion: "1.0.0",
    mode,
    profile: profile ?? "pull-request",
    changedFiles,
    affectedCapabilities,
    affectedClasses,
    summary: {
      total: entries.length,
      run: run.length,
      skipped: skipped.length,
    },
    run: run.map((e) => ({
      checkId: e.checkId,
      reason: e.reason,
      ...(e.detail ? { detail: e.detail } : {}),
    })),
    skipped: skipped.map((e) => ({
      checkId: e.checkId,
      reason: e.reason,
      ...(e.detail ? { detail: e.detail } : {}),
    })),
  }
}
