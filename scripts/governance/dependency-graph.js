// ============================================================
// GOVERNANCE DEPENDENCY GRAPH (EXP-GOVERN-002)
// ============================================================
// Builds a directed acyclic graph from registered governance checks, detects
// cycles, overlapping inputs, and global checks, and emits a deterministic
// GovernanceDependencyGraph artifact.
// ============================================================

import { resolveChecks, GOVERNANCE_MODULES } from "./check-registry.js"

/**
 * @typedef {Object} GovernanceDependencyGraph
 * @property {"GovernanceDependencyGraph"} kind
 * @property {string} schemaVersion
 * @property {string[]} modules
 * @property {import("./check-registry.js").GovernanceCheck[]} checks
 * @property {Array<{from: string, to: string}>} edges
 * @property {string[]} warnings
 */

/** @param {import("./check-registry.js").GovernanceCheck[]} checks */
function detectCycles(checks) {
  const adjacency = new Map()
  for (const check of checks) {
    adjacency.set(check.id, new Set(check.dependencies ?? []))
  }

  const visiting = new Set()
  const visited = new Set()
  const cycles = []

  function visit(node, path) {
    if (visited.has(node)) return
    if (visiting.has(node)) {
      const cycleStart = path.indexOf(node)
      const cycle = path.slice(cycleStart).concat(node)
      cycles.push(`Cycle detected: ${cycle.join(" → ")}`)
      return
    }

    visiting.add(node)
    path.push(node)
    for (const neighbor of adjacency.get(node) ?? []) {
      visit(neighbor, path)
    }
    path.pop()
    visiting.delete(node)
    visited.add(node)
  }

  for (const check of checks) {
    visit(check.id, [])
  }

  return cycles
}

/** @param {import("./check-registry.js").GovernanceCheck[]} checks */
function detectOverlaps(checks) {
  const warnings = []
  for (let i = 0; i < checks.length; i++) {
    for (let j = i + 1; j < checks.length; j++) {
      const a = checks[i]
      const b = checks[j]
      const overlap = a.inputs.filter((input) => b.inputs.includes(input))
      if (overlap.length > 0) {
        warnings.push(`Checks '${a.id}' and '${b.id}' share inputs: ${overlap.join(", ")}`)
      }
    }
  }
  return warnings
}

/** @param {import("./check-registry.js").GovernanceCheck[]} checks */
function detectGlobals(checks) {
  return checks
    .filter((c) => c.inputs.length === 0)
    .map((c) => `Check '${c.id}' has no inputs and will run on every invocation.`)
}

/** @param {import("./check-registry.js").GovernanceCheck[]} checks */
function detectModuleCoverage(checks) {
  const warnings = []
  for (const mod of GOVERNANCE_MODULES) {
    if (!checks.some((c) => c.module === mod)) {
      warnings.push(`Module '${mod}' has no registered checks.`)
    }
  }
  return warnings
}

/** @param {string[]} checkIds */
export function buildDependencyGraph(checkIds) {
  const checks = resolveChecks(checkIds)
  const edges = []

  for (const check of checks) {
    for (const dep of check.dependencies ?? []) {
      if (checks.some((c) => c.id === dep)) {
        edges.push({ from: dep, to: check.id })
      }
    }
  }

  const warnings = [
    ...detectCycles(checks),
    ...detectOverlaps(checks),
    ...detectGlobals(checks),
    ...detectModuleCoverage(checks),
  ]

  return {
    kind: "GovernanceDependencyGraph",
    schemaVersion: "1.0.0",
    modules: [...GOVERNANCE_MODULES],
    checks,
    edges,
    warnings,
  }
}
