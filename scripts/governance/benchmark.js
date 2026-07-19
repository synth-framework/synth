// ============================================================
// PERFORMANCE BENCHMARKING (EXP-GOV-011)
// ============================================================
// Captures validation timing and compares it against target budgets.
// Benchmark results are advisory: missing a target does not fail governance.
// ============================================================

/** Target budgets in milliseconds by change class. */
export const BENCHMARK_TARGETS_MS = {
  documentation: 15_000,
  knowledge: 30_000,
  runtime: 120_000,
  kernel: 300_000,
  compiler: 600_000,
  release: 600_000,
  design: 30_000,
  tests: 30_000,
  full: 600_000,
}

/**
 * @typedef {Object} BenchmarkResult
 * @property {number} totalDurationMs
 * @property {number} executedDurationMs
 * @property {number} skippedCount
 * @property {number} checkCount
 * @property {Array<{checkId: string, durationMs: number, action: string}>} checks
 * @property {Record<string, number>} byClass
 * @property {Array<{class: string, durationMs: number, targetMs: number, withinTarget: boolean}>} classTargets
 * @property {boolean} allWithinTarget
 */

/**
 * Build a benchmark result from execution entries and class assignments.
 *
 * @param {Array<{checkId: string, action: "run" | "skip", durationMs: number}>} entries
 * @param {Object} [options]
 * @param {Record<string, import("./governance-classes.js").GovernanceClass>} [options.checkClasses]
 * @param {Record<string, number>} [options.targetsMs]
 * @returns {BenchmarkResult}
 */
export function buildBenchmark(entries, options = {}) {
  const checkClasses = options.checkClasses ?? {}
  const targetsMs = options.targetsMs ?? BENCHMARK_TARGETS_MS

  const totalDurationMs = entries.reduce((sum, e) => sum + e.durationMs, 0)
  const executed = entries.filter((e) => e.action === "run")
  const executedDurationMs = executed.reduce((sum, e) => sum + e.durationMs, 0)
  const skippedCount = entries.filter((e) => e.action === "skip").length

  /** @type {Record<string, number>} */
  const byClass = {}
  for (const entry of entries) {
    if (entry.action !== "run") continue
    const cls = checkClasses[entry.checkId] ?? "tests"
    byClass[cls] = (byClass[cls] ?? 0) + entry.durationMs
  }

  const classTargets = Object.entries(byClass).map(([cls, durationMs]) => {
    const targetMs = targetsMs[cls] ?? targetsMs.full
    return {
      class: cls,
      durationMs,
      targetMs,
      withinTarget: durationMs <= targetMs,
    }
  })

  return {
    totalDurationMs,
    executedDurationMs,
    skippedCount,
    checkCount: entries.length,
    checks: entries.map((e) => ({
      checkId: e.checkId,
      durationMs: e.durationMs,
      action: e.action,
    })),
    byClass,
    classTargets,
    allWithinTarget: classTargets.every((t) => t.withinTarget),
  }
}

/**
 * Format benchmark output for console reporting.
 *
 * @param {BenchmarkResult} result
 * @returns {string[]}
 */
export function formatBenchmarkLines(result) {
  const lines = []
  lines.push(`Benchmark: ${(result.executedDurationMs / 1000).toFixed(1)}s executed across ${result.checkCount} checks (${result.skippedCount} skipped)`)
  if (result.classTargets.length > 0) {
    lines.push("Class targets:")
    for (const t of result.classTargets) {
      const icon = t.withinTarget ? "✓" : "⚠"
      lines.push(`  ${icon} ${t.class}: ${(t.durationMs / 1000).toFixed(1)}s / ${(t.targetMs / 1000).toFixed(1)}s`)
    }
  }
  return lines
}
