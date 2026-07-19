// ============================================================
// GOVERNANCE PROFILER TESTS (EXP-GOVERN-001)
// ============================================================
// Fast tests for the GovernSummary producer. Avoids running the full pipeline;
// verifies parsing, summary shape, and dry-run behavior.
// ============================================================

import assert from "assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { loadGovernChecks, runGovernProfile } from "../scripts/govern-profiler.js"

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
  const { summary, failed } = await runGovernProfile({ dryRun: true, silent: true })
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
    assert.ok(Array.isArray(check.inputs))
    assert.ok(Array.isArray(check.outputs))
    assert.ok(Array.isArray(check.filesTouched))
    assert.ok(Array.isArray(check.dependencies))
    assert.strictEqual(check.cacheability, "unknown")
  }

  console.log("[PASS] dry-run produces a valid GovernSummary")
}

async function testPercentagesSumToOneHundred() {
  const { summary } = await runGovernProfile({ dryRun: true, silent: true })
  const total = summary.checks.reduce((sum, c) => sum + c.percentage, 0)
  // Rounding errors can leave us at 99.9 or 100.1; accept within one tenth.
  assert.ok(total >= 99.0 && total <= 100.1, `percentages sum to ${total}`)
  console.log("[PASS] percentages sum to approximately 100")
}

async function main() {
  await testLoadGovernChecksDecomposesTestAll()
  await testLoadGovernChecksIgnoresNonNpmRun()
  await testDryRunProducesSummary()
  await testPercentagesSumToOneHundred()
  console.log("\n[GOVERN PROFILER] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
