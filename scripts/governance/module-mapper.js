// ============================================================
// MODULE MAPPER (EXP-GOVERN-004)
// ============================================================
// Maps changed file paths to canonical governance modules. The mapping is
// convention-based and deterministic.
// ============================================================

import { GOVERNANCE_MODULES } from "./check-registry.js"

/**
 * @param {string} filePath
 * @returns {string}
 */
export function mapFileToModule(filePath) {
  const normalized = filePath.replace(/\\/g, "/")

  if (normalized.startsWith("src/runtime/")) return "runtime"
  if (normalized.startsWith("src/mission-studio/")) return "missions"
  if (normalized.startsWith("src/core/")) return "kernel"
  if (normalized.startsWith("src/cli/")) return "cli"
  if (normalized.startsWith("src/")) return "kernel"
  if (normalized.startsWith("docs/")) return "documentation"
  if (normalized.startsWith("website/")) return "website"
  if (normalized.startsWith("tests/")) return "tests"
  if (normalized.startsWith("scripts/governance/")) return "governance"

  return "tests"
}

/**
 * @param {string[]} filePaths
 * @returns {string[]}
 */
export function mapFilesToModules(filePaths) {
  const modules = new Set(filePaths.map(mapFileToModule))
  return [...modules].filter((m) => GOVERNANCE_MODULES.includes(m))
}
