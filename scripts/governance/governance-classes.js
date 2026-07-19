// ============================================================
// GOVERNANCE CLASSES (EXP-GOV-004)
// ============================================================
// Defines the canonical classes of repository knowledge that governance
// validates. Every capability and artifact maps to at least one class.
// Classes are stable, versioned, and used by the orchestrator to decide
// which validators must run for a given change set.
// ============================================================

/** @typedef {"documentation" | "knowledge" | "runtime" | "kernel" | "compiler" | "release" | "design" | "tests"} GovernanceClass */

/** Current version of the governance class taxonomy. */
export const GOVERNANCE_CLASSES_VERSION = "1.0.0"

/** Canonical governance classes. */
export const GOVERNANCE_CLASSES = [
  "documentation",
  "knowledge",
  "runtime",
  "kernel",
  "compiler",
  "release",
  "design",
  "tests",
]

/**
 * Maps a capability name from the capability-validation map to its primary
 * governance class. Capabilities can belong to additional classes through
 * their scope or module, but this mapping provides the canonical primary
 * class for planning.
 *
 * @param {string} capability
 * @returns {GovernanceClass}
 */
export function getGovernanceClass(capability) {
  if (typeof capability !== "string") return "tests"

  const normalized = capability.toLowerCase()

  // Documentation surface
  if (
    normalized.includes("documentation") ||
    normalized.includes("website") ||
    normalized === "examples"
  ) {
    return "documentation"
  }

  // Knowledge and semantic modeling
  if (
    normalized.includes("knowledge") ||
    normalized.includes("domain") ||
    normalized.includes("genesis") ||
    normalized.includes("mission") ||
    normalized.includes("expedition") ||
    normalized.includes("planning") ||
    normalized.includes("objective") ||
    normalized.includes("wizard")
  ) {
    return "knowledge"
  }

  // Runtime and execution
  if (
    normalized.includes("runtime") ||
    normalized.includes("replay") ||
    normalized.includes("event") ||
    normalized.includes("execution") ||
    normalized.includes("command") ||
    normalized.includes("core")
  ) {
    return "runtime"
  }

  // Kernel and foundational infrastructure
  if (
    normalized.includes("kernel") ||
    normalized.includes("capability") ||
    normalized.includes("policy") ||
    normalized.includes("observability") ||
    normalized.includes("control")
  ) {
    return "kernel"
  }

  // Compiler and build system
  if (
    normalized.includes("compiler") ||
    normalized.includes("adapter") && !normalized.includes("github")
  ) {
    return "compiler"
  }

  // Release, repository, and forge governance
  if (
    normalized.includes("release") ||
    normalized.includes("github") ||
    normalized.includes("repository") ||
    normalized.includes("installer") ||
    normalized.includes("versioning")
  ) {
    return "release"
  }

  // Design and user experience
  if (
    normalized.includes("studio") ||
    normalized.includes("design") ||
    normalized.includes("workspace")
  ) {
    return "design"
  }

  return "tests"
}

/**
 * Returns all governance classes applicable to a set of capabilities.
 *
 * @param {string[]} capabilities
 * @returns {GovernanceClass[]}
 */
export function getGovernanceClasses(capabilities) {
  const classes = new Set(capabilities.map(getGovernanceClass))
  return GOVERNANCE_CLASSES.filter((c) => classes.has(c))
}

/**
 * Maps a file path to its governance class using path conventions.
 *
 * @param {string} filePath
 * @returns {GovernanceClass}
 */
export function getFileGovernanceClass(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase()

  if (normalized.startsWith("docs/") || normalized.startsWith("website/")) {
    return "documentation"
  }
  if (normalized.startsWith("src/genesis/") || normalized.startsWith("src/mission-studio/")) {
    return "knowledge"
  }
  if (normalized.startsWith("src/runtime/") || normalized.startsWith("src/core/")) {
    return "runtime"
  }
  if (normalized.startsWith("src/compiler/")) {
    return "compiler"
  }
  if (normalized.startsWith("src/cli/") || normalized.startsWith("src/control/")) {
    return "kernel"
  }
  if (normalized.startsWith("src/adapters/")) {
    return "compiler"
  }
  if (normalized.startsWith("src/") || normalized.startsWith("scripts/")) {
    return "kernel"
  }
  if (normalized.startsWith(".github/")) {
    return "release"
  }
  return "tests"
}
