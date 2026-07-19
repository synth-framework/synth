// ============================================================
// GOVERNANCE PROFILER (EXP-GOVERN-001 / EXP-GOVERN-002 / EXP-GOVERN-003)
// ============================================================
// Instruments the SYNTH governance pipeline and produces:
//  - a structured GovernSummary with per-check timing and cache decisions
//  - a GovernanceDependencyGraph artifact
//  - a persisted baseline under proof/govern-baseline.json
// ============================================================

import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { resolveChecks } from "./governance/check-registry.js"
import { buildDependencyGraph } from "./governance/dependency-graph.js"
import { IncrementalEngine } from "./governance/incremental-engine.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_ROOT = path.resolve(__dirname, "..")
const BASELINE_PATH = path.join(REPO_ROOT, "proof", "govern-baseline.json")
const GRAPH_PATH = path.join(REPO_ROOT, "proof", "govern-dependency-graph.json")

/** Parse package.json scripts into a check list matching the old `npm run govern` pipeline. */
export async function loadGovernChecks(pkgPath = path.join(REPO_ROOT, "package.json")) {
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"))
  const testAll = pkg.scripts["test:all"]
  if (!testAll) {
    throw new Error("package.json is missing the test:all script")
  }

  const checks = []

  // Build is the first stage.
  checks.push({ checkId: "build", command: "npm", args: ["run", "build"] })

  // Decompose test:all into individual npm run <script> invocations.
  const testScripts = testAll
    .split("&&")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("npm run "))
    .map((s) => s.replace(/^npm run\s+/, "").trim())

  for (const script of testScripts) {
    checks.push({ checkId: script, command: "npm", args: ["run", script] })
  }

  // Proof is the final stage.
  checks.push({ checkId: "proof", command: "npm", args: ["run", "proof"] })

  return checks
}

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const startIso = new Date(startTime).toISOString()
    const child = spawn(command, args, { cwd, stdio: "inherit" })

    child.on("close", (code) => {
      const endTime = Date.now()
      resolve({
        status: code === 0 ? "passed" : "failed",
        exitCode: code ?? -1,
        startTime: startIso,
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
      })
    })

    child.on("error", (err) => {
      const endTime = Date.now()
      resolve({
        status: "failed",
        exitCode: -1,
        startTime: startIso,
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        error: err.message,
      })
    })
  })
}

async function ensureProofDir() {
  await fs.mkdir(path.join(REPO_ROOT, "proof"), { recursive: true })
}

function buildSummary(results) {
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0)
  const executedDurationMs = results
    .filter((r) => r.action === "run")
    .reduce((sum, r) => sum + r.durationMs, 0)
  const skippedCount = results.filter((r) => r.action === "skip").length

  return {
    kind: "GovernSummary",
    schemaVersion: "1.0.0",
    totalDurationMs,
    executedDurationMs,
    checkCount: results.length,
    skippedCount,
    checks: results.map((r) => ({
      checkId: r.checkId,
      status: r.status,
      action: r.action,
      reason: r.reason,
      durationMs: r.durationMs,
      percentage: totalDurationMs > 0 ? Math.round((r.durationMs / totalDurationMs) * 1000) / 10 : 0,
      startTime: r.startTime,
      endTime: r.endTime,
      module: r.module,
      inputs: r.inputs,
      outputs: r.outputs,
      filesTouched: r.filesTouched,
      dependencies: r.dependencies,
      cacheability: r.cacheability,
      protectedAssets: r.protectedAssets,
      fingerprint: r.fingerprint,
    })),
  }
}

export async function runGovernProfile(options = {}) {
  const checks = await loadGovernChecks(options.packageJsonPath)
  const metadata = resolveChecks(checks.map((c) => c.checkId))
  const metadataById = new Map(metadata.map((m) => [m.id, m]))

  const engine = options.engine ?? new IncrementalEngine({ root: REPO_ROOT, force: options.force ?? false })
  const decisions = options.dryRun
    ? metadata.map((m) => ({
        checkId: m.id,
        action: "run",
        reason: "dry-run",
        fingerprint: "dry-run",
        upstreamFingerprints: [],
        proof: null,
      }))
    : await engine.plan(metadata)

  const decisionById = new Map(decisions.map((d) => [d.checkId, d]))
  const results = []
  let failed = false

  for (const { checkId, command, args } of checks) {
    const meta = metadataById.get(checkId)
    const decision = decisionById.get(checkId)

    let result
    if (options.dryRun) {
      const now = Date.now()
      result = {
        status: "passed",
        exitCode: 0,
        startTime: new Date(now).toISOString(),
        endTime: new Date(now + 1).toISOString(),
        durationMs: 1,
      }
    } else if (decision.action === "skip" && decision.proof) {
      const now = Date.now()
      result = {
        status: decision.proof.result === "PASS" ? "passed" : "failed",
        exitCode: decision.proof.result === "PASS" ? 0 : 1,
        startTime: new Date(now).toISOString(),
        endTime: new Date(now).toISOString(),
        durationMs: 0,
      }
    } else {
      result = await runCommand(command, args, REPO_ROOT)
      if (!options.dryRun) {
        await engine.record(
          meta,
          decision.fingerprint,
          decision.upstreamFingerprints,
          result.status === "passed" ? "PASS" : "FAIL",
        )
      }
    }

    results.push({
      checkId,
      action: decision.action,
      reason: decision.reason,
      fingerprint: decision.fingerprint,
      ...result,
      module: meta.module,
      inputs: meta.inputs,
      outputs: meta.outputs,
      filesTouched: [],
      dependencies: meta.dependencies ?? [],
      cacheability: meta.determinism ?? meta.cacheability ?? "unknown",
      protectedAssets: meta.protectedAssets,
    })

    if (result.status !== "passed") {
      failed = true
    }
  }

  const summary = buildSummary(results)
  const graph = buildDependencyGraph(checks.map((c) => c.checkId))

  if (!options.silent) {
    console.log("")
    console.log("═══════════════════════════════════════════════════")
    console.log("  SYNTH: Govern Summary")
    console.log("═══════════════════════════════════════════════════")
    console.log("")
    console.log(`Total duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s across ${results.length} checks`)
    console.log(`Executed: ${(summary.executedDurationMs / 1000).toFixed(1)}s, Skipped: ${summary.skippedCount} checks`)
    console.log("")
    for (const check of summary.checks) {
      const actionIcon = check.action === "skip" ? "○" : check.status === "passed" ? "✓" : "✗"
      const pad = " ".repeat(Math.max(0, 35 - check.checkId.length))
      const reasonTag = check.action === "skip" ? `[${check.reason}]` : ""
      console.log(`  ${actionIcon} ${check.checkId}${pad}${(check.durationMs / 1000).toFixed(1)}s (${check.percentage}%) ${reasonTag}`)
    }

    if (graph.warnings.length > 0) {
      console.log("")
      console.log("Governance dependency warnings:")
      for (const warning of graph.warnings) {
        console.log(`  ⚠ ${warning}`)
      }
    }
    console.log("")
  }

  if (!options.dryRun) {
    await ensureProofDir()
    await fs.writeFile(BASELINE_PATH, JSON.stringify(summary, null, 2) + "\n", "utf-8")
    await fs.writeFile(GRAPH_PATH, JSON.stringify(graph, null, 2) + "\n", "utf-8")
  }

  if (!options.silent) {
    if (!options.dryRun) {
      console.log(`GovernSummary written to ${BASELINE_PATH}`)
      console.log(`GovernanceDependencyGraph written to ${GRAPH_PATH}`)
      console.log("")
    }
    console.log(JSON.stringify(summary, null, 2))
  }

  return { summary, graph, failed }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const force = process.argv.includes("--force")
  const { summary, graph, failed } = await runGovernProfile({ dryRun, force })

  if (graph.warnings.some((w) => w.startsWith("Cycle detected"))) {
    console.error("")
    console.error("[GOVERN] Fatal dependency cycle detected in governance checks.")
    process.exit(1)
  }

  if (failed) {
    console.error("")
    console.error("[GOVERN] One or more checks failed.")
    process.exit(1)
  }

  return summary
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[GOVERN PROFILER]", err.message)
    process.exit(1)
  })
}
