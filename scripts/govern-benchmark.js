// ============================================================
// GOVERN BENCHMARK HARNESS
// ============================================================
// Records structured benchmark data for every `npm run govern` invocation.
// Appends results to proof/govern-benchmark.jsonl so trends and bottlenecks
// can be analyzed across runs and programs.
// ============================================================

import fs from "fs/promises"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"
import { runGovernProfile } from "./govern-profiler.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")
const BENCHMARK_PATH = path.join(REPO_ROOT, "proof", "govern-benchmark.jsonl")

function parseCli(argv) {
  const full = argv.includes("--full")
  const dryRun = argv.includes("--dry-run")
  const tagIdx = argv.indexOf("--tag")
  const tag = tagIdx !== -1 && tagIdx + 1 < argv.length ? argv[tagIdx + 1] : "default"
  return { full, dryRun, tag }
}

function buildBenchmarkRecord(tag, mode, summary, graph, wallTimeMs) {
  return {
    kind: "GovernBenchmark",
    schemaVersion: "1.0.0",
    timestamp: new Date().toISOString(),
    tag,
    mode,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpuCount: os.cpus().length,
    wallTimeMs,
    totalDurationMs: summary.totalDurationMs,
    executedDurationMs: summary.executedDurationMs,
    checkCount: summary.checkCount,
    skippedCount: summary.skippedCount,
    changedFiles: summary.changedFiles,
    checks: summary.checks.map((c) => ({
      checkId: c.checkId,
      action: c.action,
      reason: c.reason,
      durationMs: c.durationMs,
      percentage: c.percentage,
      status: c.status,
      module: c.module,
      cacheability: c.cacheability,
    })),
    dependencyWarnings: graph?.warnings ?? [],
  }
}

async function appendRecord(record) {
  await fs.mkdir(path.dirname(BENCHMARK_PATH), { recursive: true })
  const line = JSON.stringify(record) + "\n"
  await fs.appendFile(BENCHMARK_PATH, line, "utf-8")
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function printSummary(record) {
  console.log("")
  console.log("═══════════════════════════════════════════════════")
  console.log("  SYNTH: Govern Benchmark")
  console.log("═══════════════════════════════════════════════════")
  console.log(`Tag:      ${record.tag}`)
  console.log(`Mode:     ${record.mode}`)
  console.log(`Wall:     ${formatDuration(record.wallTimeMs)}`)
  console.log(`Executed: ${formatDuration(record.executedDurationMs)}`)
  console.log(`Checks:   ${record.checkCount} (${record.skippedCount} skipped)`)
  console.log("")
  console.log("Slowest checks:")
  const slowest = [...record.checks].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10)
  for (const check of slowest) {
    const actionIcon = check.action === "skip" ? "○" : "✓"
    console.log(`  ${actionIcon} ${check.checkId.padEnd(40)} ${formatDuration(check.durationMs)}`)
  }
  console.log("")
  console.log(`Benchmark record appended to ${BENCHMARK_PATH}`)
}

export async function runBenchmark(options = {}) {
  const start = process.hrtime.bigint()
  const { summary, graph, failed } = await runGovernProfile({
    full: options.full ?? false,
    dryRun: options.dryRun ?? false,
    silent: true,
  })
  const end = process.hrtime.bigint()
  const wallTimeMs = Number((end - start) / BigInt(1_000_000))

  const mode = options.full ? "full" : "incremental"
  const record = buildBenchmarkRecord(options.tag ?? "default", mode, summary, graph, wallTimeMs)
  await appendRecord(record)

  if (!options.silent) {
    printSummary(record)
  }

  return { record, failed }
}

async function main() {
  const { full, dryRun, tag } = parseCli(process.argv)
  const { failed } = await runBenchmark({ full, dryRun, tag })

  if (failed) {
    console.error("[GOVERN BENCHMARK] One or more checks failed.")
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[GOVERN BENCHMARK]", err.message)
    process.exit(1)
  })
}
