// ============================================================
// GOVERNANCE PROFILER (EXP-GOVERN-001 → EXP-GOVERN-004)
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
import { resolveChecks, isCacheable } from "./governance/check-registry.js"
import { buildDependencyGraph } from "./governance/dependency-graph.js"
import { Scheduler } from "./governance/scheduler.js"
import { detectChangedFiles } from "./governance/change-detector.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_ROOT = path.resolve(__dirname, "..")

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

export function runCommand(command, args, cwd) {
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

async function ensureProofDir(root) {
  await fs.mkdir(path.join(root, "proof"), { recursive: true })
}

function buildSummary(results, mode, changedFiles) {
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0)
  const executedDurationMs = results
    .filter((r) => r.action === "run")
    .reduce((sum, r) => sum + r.durationMs, 0)
  const skippedCount = results.filter((r) => r.action === "skip").length

  return {
    kind: "GovernSummary",
    schemaVersion: "1.0.0",
    mode,
    changedFiles: changedFiles ?? [],
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
  const root = options.root ?? REPO_ROOT
  const pkgPath = options.packageJsonPath ?? path.join(root, "package.json")
  const checks = await loadGovernChecks(pkgPath)
  const metadata = resolveChecks(checks.map((c) => c.checkId))
  const metadataById = new Map(metadata.map((m) => [m.id, m]))

  const full = options.full ?? false
  let changedFiles = options.changedFiles
  if (!full && changedFiles === undefined && !options.scheduler) {
    changedFiles = detectChangedFiles({ cwd: root, explicit: options.explicitChanges })
  }

  const scheduler =
    options.scheduler ??
    new Scheduler({
      changedFiles: changedFiles ?? [],
      root,
      full,
    })

  const decisions = options.dryRun
    ? metadata.map((m) => ({
        checkId: m.id,
        action: "run",
        reason: "dry-run",
        fingerprint: "dry-run",
        upstreamFingerprints: [],
        proof: null,
      }))
    : await scheduler.plan(checks.map((c) => c.checkId))

  const decisionById = new Map(decisions.map((d) => [d.checkId, d]))
  const results = []
  let failed = false

  for (const { checkId, command, args } of checks) {
    const meta = metadataById.get(checkId)
    const decision = decisionById.get(checkId)

    if (!decision) {
      throw new Error(`No scheduling decision for check ${checkId}`)
    }

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
      const executor = options.executor ?? runCommand
      result = await executor(command, args, root)
      if (decision.action === "run" && isCacheable(meta)) {
        await scheduler.engine.record(
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

  const mode = full ? "full" : "incremental"
  const summary = buildSummary(results, mode, changedFiles)
  const graph = buildDependencyGraph(checks.map((c) => c.checkId))

  if (!options.silent) {
    console.log("")
    console.log("═══════════════════════════════════════════════════")
    console.log("  SYNTH: Govern Summary")
    console.log("═══════════════════════════════════════════════════")
    console.log("")
    console.log(`Mode: ${mode}`)
    if (changedFiles && changedFiles.length > 0) {
      console.log(`Changed files: ${changedFiles.join(", ")}`)
    }
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
    await ensureProofDir(root)
    const baselinePath = path.join(root, "proof", "govern-baseline.json")
    const graphPath = path.join(root, "proof", "govern-dependency-graph.json")
    await fs.writeFile(baselinePath, JSON.stringify(summary, null, 2) + "\n", "utf-8")
    await fs.writeFile(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf-8")

    if (!options.silent) {
      console.log(`GovernSummary written to ${baselinePath}`)
      console.log(`GovernanceDependencyGraph written to ${graphPath}`)
      console.log("")
    }
  }

  if (!options.silent) {
    console.log(JSON.stringify(summary, null, 2))
  }

  return { summary, graph, failed }
}

function parseCli(argv) {
  const dryRun = argv.includes("--dry-run")
  // --force is retired; treat it as a full run for backward compatibility.
  const full = argv.includes("--full") || argv.includes("--force")
  let changedFiles
  const changesIdx = argv.indexOf("--changes")
  if (changesIdx !== -1 && changesIdx + 1 < argv.length) {
    changedFiles = argv[changesIdx + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return { dryRun, full, changedFiles }
}

async function main() {
  const { dryRun, full, changedFiles } = parseCli(process.argv)
  const { summary, graph, failed } = await runGovernProfile({ dryRun, full, changedFiles })

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
