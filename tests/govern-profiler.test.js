// ============================================================
// GOVERNANCE PROFILER TESTS (EXP-GOVERN-001 / EXP-GOVERN-002)
// ============================================================
// Fast tests for the GovernSummary producer and dependency graph builder.
// Avoids running the full pipeline; verifies parsing, summary shape, and
// graph construction.
// ============================================================

import assert from "assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { loadGovernChecks, runGovernProfile } from "../scripts/govern-profiler.js"
import { buildDependencyGraph } from "../scripts/governance/dependency-graph.js"
import { registerCheck, resolveCheck, GOVERNANCE_MODULES } from "../scripts/governance/check-registry.js"

async function withTempPackage(testAll, fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-govern-profiler-"))
  const pkgPath = path.join(tmpDir, "package.json")
  await fs.writeFile(
    pkgPath,
    JSON.stringify({ name: "test", scripts: { "test:all": testAll } }) + "\n",
    "utf-8",
  )
  try {
    return await fn(pkgPath)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testLoadGovernChecksDecomposesTestAll() {
  await withTempPackage("npm run test && npm run test:skr", async (pkgPath) => {
    const checks = await loadGovernChecks(pkgPath)
    assert.strictEqual(checks[0].checkId, "build")
    assert.strictEqual(checks[1].checkId, "test")
    assert.strictEqual(checks[2].checkId, "test:skr")
    assert.strictEqual(checks[3].checkId, "proof")
    assert.strictEqual(checks.length, 4)
  })
  console.log("[PASS] loadGovernChecks decomposes test:all into ordered checks")
}

async function testLoadGovernChecksIgnoresNonNpmRun() {
  await withTempPackage("npm run test && node scripts/something.js && npm run proof", async (pkgPath) => {
    const checks = await loadGovernChecks(pkgPath)
    assert.ok(checks.some((c) => c.checkId === "test"))
    assert.ok(!checks.some((c) => c.checkId === "node scripts/something.js"))
  })
  console.log("[PASS] loadGovernChecks ignores non-npm-run steps")
}

async function testDryRunProducesSummary() {
  const { summary, graph, failed } = await runGovernProfile({ dryRun: true, silent: true })
  assert.strictEqual(failed, false)
  assert.strictEqual(summary.kind, "GovernSummary")
  assert.strictEqual(summary.schemaVersion, "1.0.0")
  assert.ok(Array.isArray(summary.checks))
  assert.ok(summary.checks.length > 0)
  assert.ok(summary.totalDurationMs > 0)

  for (const check of summary.checks) {
    assert.strictEqual(check.status, "passed")
    assert.ok(typeof check.checkId === "string")
    assert.ok(typeof check.durationMs === "number")
    assert.ok(typeof check.percentage === "number")
    assert.ok(typeof check.module === "string")
    assert.ok(Array.isArray(check.inputs))
    assert.ok(Array.isArray(check.outputs))
    assert.ok(Array.isArray(check.filesTouched))
    assert.ok(Array.isArray(check.dependencies))
    assert.ok(Array.isArray(check.protectedAssets))
    assert.ok(typeof check.cacheability === "string")
  }

  assert.strictEqual(graph.kind, "GovernanceDependencyGraph")
  assert.ok(Array.isArray(graph.modules))
  assert.ok(Array.isArray(graph.checks))
  assert.ok(Array.isArray(graph.edges))
  assert.ok(Array.isArray(graph.warnings))

  console.log("[PASS] dry-run produces a valid GovernSummary and GovernanceDependencyGraph")
}

async function testPercentagesSumToOneHundred() {
  const { summary } = await runGovernProfile({ dryRun: true, silent: true })
  const total = summary.checks.reduce((sum, c) => sum + c.percentage, 0)
  // Rounding errors can leave us slightly below 100; accept within one percent.
  assert.ok(total >= 99.0 && total <= 100.1, `percentages sum to ${total}`)
  console.log("[PASS] percentages sum to approximately 100")
}

async function testDependencyGraphDetectsCycles() {
  registerCheck({
    id: "cycle-a",
    module: "tests",
    inputs: [],
    outputs: [],
    scope: "tests",
    protectedAssets: [],
    dependencies: ["cycle-b"],
  })
  registerCheck({
    id: "cycle-b",
    module: "tests",
    inputs: [],
    outputs: [],
    scope: "tests",
    protectedAssets: [],
    dependencies: ["cycle-a"],
  })

  const graph = buildDependencyGraph(["cycle-a", "cycle-b"])
  assert.ok(graph.warnings.some((w) => w.includes("Cycle detected")))
  console.log("[PASS] dependency graph detects cycles")
}

async function testDependencyGraphReportsGlobals() {
  registerCheck({
    id: "global-check",
    module: "tests",
    inputs: [],
    outputs: [],
    scope: "tests",
    protectedAssets: [],
  })

  const graph = buildDependencyGraph(["global-check"])
  assert.ok(graph.warnings.some((w) => w.includes("has no inputs")))
  console.log("[PASS] dependency graph reports global checks")
}

async function testResolveCheckUsesDefaults() {
  const check = resolveCheck("unknown-check")
  assert.strictEqual(check.id, "unknown-check")
  assert.strictEqual(check.module, "tests")
  assert.ok(check.inputs.length > 0)
  console.log("[PASS] resolveCheck returns sensible defaults for unregistered checks")
}

async function testModulesAreCanonical() {
  assert.ok(GOVERNANCE_MODULES.includes("runtime"))
  assert.ok(GOVERNANCE_MODULES.includes("missions"))
  assert.ok(GOVERNANCE_MODULES.includes("governance"))
  console.log("[PASS] canonical governance modules are defined")
}

async function main() {
  await testLoadGovernChecksDecomposesTestAll()
  await testLoadGovernChecksIgnoresNonNpmRun()
  await testDryRunProducesSummary()
  await testPercentagesSumToOneHundred()
  await testDependencyGraphDetectsCycles()
  await testDependencyGraphReportsGlobals()
  await testResolveCheckUsesDefaults()
  await testModulesAreCanonical()
  console.log("\n[GOVERN PROFILER] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
