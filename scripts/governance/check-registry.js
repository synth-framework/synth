// ============================================================
// GOVERNANCE CHECK REGISTRY (EXP-GOVERN-002)
// ============================================================
// Declarative contract for every governance check. Each check describes its
// inputs, outputs, module membership, scope, and protected-asset coverage so
// the dependency graph can be derived deterministically.
// ============================================================

/** @typedef {"governance" | "product" | "runtime" | "documentation" | "tests"} GovernanceScope */

/** @typedef {"deterministic" | "contextual" | "non-deterministic"} DeterminismClass */

/**
 * @typedef {Object} GovernanceCheck
 * @property {string} id - Stable check identifier. Usually matches the npm script name.
 * @property {string} module - Governance module this check belongs to.
 * @property {string[]} inputs - Input globs, event types, or conceptual dependencies.
 * @property {string[]} outputs - Artifacts or proofs produced by the check.
 * @property {GovernanceScope} scope - Classification of the check.
 * @property {string[]} protectedAssets - Protected assets this check validates, if any.
 * @property {string[]} [dependencies] - Explicit upstream check dependencies (check ids).
 * @property {DeterminismClass} [determinism] - Whether the check result is cacheable.
 * @property {string} [validatorVersion] - Version of the validator implementation.
 * @property {string} [algorithmVersion] - Version of the underlying algorithm.
 * @property {string} [cacheability] - Legacy alias for determinism.
 */

/** Canonical governance modules. */
export const GOVERNANCE_MODULES = [
  "contracts",
  "documentation",
  "cli",
  "kernel",
  "runtime",
  "governance",
  "missions",
  "expeditions",
  "website",
  "tests",
]

/** @type {GovernanceCheck[]} */
const EXPLICIT_CHECKS = [
  {
    id: "build",
    module: "kernel",
    inputs: ["src/**", "tsconfig.json"],
    outputs: ["dist/**"],
    scope: "governance",
    protectedAssets: [],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
  {
    id: "test:replay",
    module: "runtime",
    inputs: ["data/event-log.jsonl", "src/runtime/**", "src/core/**"],
    outputs: [],
    scope: "governance",
    protectedAssets: ["Replay"],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
  {
    id: "test:graph-integrity",
    module: "runtime",
    inputs: ["data/event-log.jsonl", "src/runtime/**", "tests/graph-integrity.test.js"],
    outputs: [],
    scope: "governance",
    protectedAssets: ["Replay"],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
  {
    id: "test:determinism",
    module: "runtime",
    inputs: ["src/runtime/**", "src/core/**", "scripts/verify-determinism.js"],
    outputs: [],
    scope: "governance",
    protectedAssets: ["Replay"],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
  {
    id: "test:adversarial",
    module: "governance",
    inputs: ["src/**", "scripts/audit-adversarial.js"],
    outputs: [],
    scope: "governance",
    protectedAssets: ["ExecutionGate", "Replay"],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
  {
    id: "test:mission-studio",
    module: "missions",
    inputs: ["src/mission-studio/**", "tests/mission-studio.test.js"],
    outputs: [],
    scope: "governance",
    protectedAssets: ["Mission Studio"],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
  {
    id: "proof",
    module: "governance",
    inputs: ["dist/**", "data/event-log.jsonl", "src/**"],
    outputs: ["proof/proof-*.json"],
    scope: "governance",
    protectedAssets: ["Genesis", "Replay"],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
  },
]

/** Return the explicit check definition, or a sensible default. */
export function resolveCheck(id) {
  const explicit = EXPLICIT_CHECKS.find((c) => c.id === id)
  if (explicit) return explicit

  return {
    id,
    module: "tests",
    inputs: ["src/**", "tests/**", "scripts/**", "docs/**"],
    outputs: [],
    scope: "tests",
    protectedAssets: [],
    determinism: "deterministic",
    validatorVersion: "1.0.0",
    algorithmVersion: "1.0.0",
    dependencies: ["build"],
  }
}

/** Return true if a check is safe to cache. */
export function isCacheable(check) {
  return (check.determinism ?? check.cacheability) !== "non-deterministic"
}

/** Register or override a check definition. */
export function registerCheck(check) {
  const existingIndex = EXPLICIT_CHECKS.findIndex((c) => c.id === check.id)
  if (existingIndex >= 0) {
    EXPLICIT_CHECKS[existingIndex] = check
  } else {
    EXPLICIT_CHECKS.push(check)
  }
}

/** Resolve metadata for a list of check ids. */
export function resolveChecks(ids) {
  return ids.map(resolveCheck)
}
