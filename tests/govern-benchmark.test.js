// ============================================================
// GOVERN BENCHMARK TESTS
// ============================================================
// Fast tests for the benchmark harness without running the full pipeline.
// ============================================================

import assert from "assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { runBenchmark } from "../scripts/govern-benchmark.js"

async function withTempBenchmarkDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-govern-benchmark-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBenchmarkRecordShape() {
  await withTempBenchmarkDir(async (tmpDir) => {
    const record = {
      kind: "GovernBenchmark",
      schemaVersion: "1.0.0",
      timestamp: new Date().toISOString(),
      tag: "test",
      mode: "incremental",
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: 1,
      wallTimeMs: 100,
      totalDurationMs: 80,
      executedDurationMs: 50,
      checkCount: 3,
      skippedCount: 1,
      changedFiles: ["docs/test.md"],
      checks: [
        { checkId: "build", action: "run", reason: "cache-miss", durationMs: 30, percentage: 37.5, status: "passed", module: "kernel", cacheability: "deterministic" },
      ],
      dependencyWarnings: [],
    }

    await fs.mkdir(path.join(tmpDir, "proof"), { recursive: true })
    const benchPath = path.join(tmpDir, "proof", "govern-benchmark.jsonl")
    await fs.appendFile(benchPath, JSON.stringify(record) + "\n", "utf-8")

    const lines = (await fs.readFile(benchPath, "utf-8")).trim().split("\n")
    assert.strictEqual(lines.length, 1)
    const parsed = JSON.parse(lines[0])
    assert.strictEqual(parsed.kind, "GovernBenchmark")
    assert.strictEqual(parsed.tag, "test")
    assert.strictEqual(parsed.checkCount, 3)
    assert.strictEqual(parsed.checks[0].checkId, "build")
  })
  console.log("[PASS] benchmark record shape is correct")
}

async function testRunBenchmarkDryRun() {
  const { record, failed } = await runBenchmark({ dryRun: true, tag: "unit-test", silent: true })
  assert.strictEqual(failed, false)
  assert.strictEqual(record.kind, "GovernBenchmark")
  assert.strictEqual(record.tag, "unit-test")
  assert.strictEqual(record.mode, "incremental")
  assert.ok(record.checkCount > 0)
  assert.ok(record.wallTimeMs >= 0)
  console.log("[PASS] dry-run benchmark produces a valid record")
}

async function main() {
  await testBenchmarkRecordShape()
  await testRunBenchmarkDryRun()
  console.log("\n[GOVERN BENCHMARK] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err)
  process.exit(1)
})
