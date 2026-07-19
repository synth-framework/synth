// ============================================================
// GOVERNANCE PROFILER (EXP-GOVERN-001 → EXP-GOVERN-005, EXP-PROGRAM-030)
// ============================================================
// Instruments the SYNTH governance pipeline and produces:
//  - a structured GovernSummary with per-check timing and cache decisions
//  - a GovernanceDependencyGraph artifact
//  - a persisted baseline under proof/govern-baseline.json
//  - governance class, profile, and explanation output
// ============================================================

import { spawn } from "child_process"
import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { resolveChecks, isCacheable } from "./governance/check-registry.js"
import { buildDependencyGraph } from "./governance/dependency-graph.js"
import { Scheduler } from "./governance/scheduler.js"
import { detectChangedFiles } from "./governance/change-detector.js"
import { ParallelRunner } from "./governance/parallel-runner.js"
import { runGovernanceOrchestrator } from "./governance/orchestrator.js"
import { explainReason, buildExplanationReport } from "./governance/explain.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_ROOT = path.resolve(__dirname, "..")

/** Parse package.json scripts into a check list matching the old `npm run govern` pipeline. */
export async function loadGovernChecks(pkgPath = path.join(REPO_ROOT, "package.json")) {
  const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"))
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

export function runCommand(command, args, cwd, timeoutMs = 0) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const startIso = new Date(startTime).toISOString()
    const child = spawn(command, args, { cwd, stdio: "inherit" })
    let timedOut = false

    if (timeoutMs > 0) {
      setTimeout(() => {
        timedOut = true
        child.kill("SIGTERM")
      }, timeoutMs)
    }

    child.on("close", (code) => {
      const endTime = Date.now()
      resolve({
        status: timedOut ? "failed" : code === 0 ? "passed" : "failed",
        exitCode: timedOut ? 1 : code ?? -1,
        startTime: startIso,
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        error: timedOut ? `timed out after ${timeoutMs}ms` : undefined,
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
  await fsp.mkdir(path.join(root, "proof"), { recursive: true })
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
  const commandById = new Map(checks.map((c) => [c.checkId, { command: c.command, args: c.args }]))

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
        dependencies: m.dependencies ?? [],
        proof: null,
      }))
    : await scheduler.plan(checks.map((c) => c.checkId))

  const executor = options.executor ?? ((command, args, cwd) => runCommand(command, args, cwd, options.timeoutMs))

  const buildResult = async (decision, result) => {
    const meta = metadataById.get(decision.checkId)
    return {
      checkId: decision.checkId,
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
    }
  }

  const executeDecision = async (decision) => {
    if (options.dryRun) {
      const now = Date.now()
      return buildResult(decision, {
        status: "passed",
        exitCode: 0,
        startTime: new Date(now).toISOString(),
        endTime: new Date(now + 1).toISOString(),
        durationMs: 1,
      })
    }

    if (decision.action === "skip" && decision.proof) {
      const now = Date.now()
      return buildResult(decision, {
        status: decision.proof.result === "PASS" ? "passed" : "failed",
        exitCode: decision.proof.result === "PASS" ? 0 : 1,
        startTime: new Date(now).toISOString(),
        endTime: new Date(now).toISOString(),
        durationMs: 0,
      })
    }

    const { command, args } = commandById.get(decision.checkId)
    const result = await executor(command, args, root)

    if (decision.action === "run" && isCacheable(metadataById.get(decision.checkId))) {
      await scheduler.engine.record(
        metadataById.get(decision.checkId),
        decision.fingerprint,
        decision.upstreamFingerprints,
        result.status === "passed" ? "PASS" : "FAIL",
      )
    }

    return buildResult(decision, result)
  }

  let results
  let failed

  if ((options.maxConcurrency ?? 1) > 1) {
    const runner = new ParallelRunner({ concurrency: options.maxConcurrency, timeoutMs: options.timeoutMs })
    const { results: parallelResults, failed: parallelFailed } = await runner.run(decisions, executeDecision)
    results = parallelResults.map((pr) => pr.result)
    failed = parallelFailed
  } else {
    results = []
    failed = false
    for (const decision of decisions) {
      const item = await executeDecision(decision)
      results.push(item)
      if (item.status !== "passed") {
        failed = true
      }
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
    await fsp.writeFile(baselinePath, JSON.stringify(summary, null, 2) + "\n", "utf-8")
    await fsp.writeFile(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf-8")

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

export async function watchGovern(options = {}) {
  const ignored = /(node_modules|\.git|\.synth\/cache|proof\/|dist\/)/
  let running = false
  let pending = false
  let timer = null

  const run = async () => {
    if (running) {
      pending = true
      return
    }
    running = true
    pending = false
    console.log("\n[GOVERN WATCH] Running incremental govern...")
    try {
      await runGovernProfile({ ...options, silent: false })
    } catch (err) {
      console.error("[GOVERN WATCH]", err.message)
    }
    running = false
    if (pending) {
      await run()
    }
  }

  await run()

  const watcher = fs.watch(REPO_ROOT, { recursive: true }, (eventType, filename) => {
    if (!filename || ignored.test(filename)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      pending = true
      run()
    }, 500)
  })

  console.log("[GOVERN WATCH] Watching for changes. Press Ctrl+C to stop.")

  process.on("SIGINT", () => {
    watcher.close()
    process.exit(0)
  })

  return new Promise(() => {})
}

function parseNumberArg(argv, flag) {
  const idx = argv.indexOf(flag)
  if (idx !== -1 && idx + 1 < argv.length) {
    const value = Number(argv[idx + 1])
    if (!Number.isNaN(value)) return value
  }
  return undefined
}

function parseCli(argv) {
  const dryRun = argv.includes("--dry-run")
  // --force is retired; treat it as a full run for backward compatibility.
  const full = argv.includes("--full") || argv.includes("--force")
  const watch = argv.includes("--watch")
  const explain = argv.includes("--explain")
  let changedFiles
  const changesIdx = argv.indexOf("--changes")
  if (changesIdx !== -1 && changesIdx + 1 < argv.length) {
    changedFiles = argv[changesIdx + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  let profile
  const profileIdx = argv.indexOf("--profile")
  if (profileIdx !== -1 && profileIdx + 1 < argv.length) {
    profile = argv[profileIdx + 1]
  }
  const maxConcurrency = parseNumberArg(argv, "--max-concurrency")
  const timeoutMs = parseNumberArg(argv, "--timeout-per-check")
  return { dryRun, full, watch, explain, profile, changedFiles, maxConcurrency, timeoutMs }
}

async function runOrchestratorPath(options) {
  const orchestrator = await runGovernanceOrchestrator({
    root: REPO_ROOT,
    changedFiles: options.changedFiles ?? detectChangedFiles({ cwd: REPO_ROOT, explicit: options.explicitChanges }),
    full: options.full,
    dryRun: options.dryRun,
    explain: options.explain,
    profile: options.profile,
  })

  if (options.dryRun) {
    const output = {
      ...orchestrator.summary,
      ...(orchestrator.explanation ? { explanation: orchestrator.explanation } : {}),
      graph: orchestrator.graph,
    }
    console.log(JSON.stringify(output, null, 2))
    return { summary: orchestrator.summary, graph: orchestrator.graph, failed: false }
  }

  // Execute the orchestrator's planned validators.
  const commandById = new Map(orchestrator.plan.run.map((id) => [id, { command: "npm", args: ["run", id] }]))
  const executor = (command, args, cwd) => runCommand(command, args, cwd, options.timeoutMs)
  const results = []
  let failed = false

  for (const checkId of orchestrator.plan.run) {
    const { command, args } = commandById.get(checkId)
    const result = await executor(command, args, REPO_ROOT)
    results.push({ checkId, ...result, action: "run" })
    if (result.status === "failed") {
      failed = true
    }
  }

  for (const checkId of orchestrator.plan.skip) {
    results.push({ checkId, action: "skip", reason: "no-class-impact", status: "passed", durationMs: 0 })
  }

  const summary = buildSummary(results, orchestrator.summary.mode, orchestrator.summary.changedFiles)
  const graph = orchestrator.graph

  if (!options.silent) {
    console.log("")
    console.log("═══════════════════════════════════════════════════")
    console.log("  SYNTH: Govern Summary")
    console.log("═══════════════════════════════════════════════════")
    console.log("")
    console.log(`Mode: ${summary.mode}`)
    console.log(`Profile: ${orchestrator.summary.profile}`)
    if (summary.changedFiles && summary.changedFiles.length > 0) {
      console.log(`Changed files: ${summary.changedFiles.join(", ")}`)
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

    if (orchestrator.explanation) {
      console.log("")
      console.log("Explanation:")
      for (const entry of orchestrator.explanation.skipped) {
        console.log(`  ○ ${entry.checkId}: ${entry.reason}`)
      }
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
    await ensureProofDir(REPO_ROOT)
    const baselinePath = path.join(REPO_ROOT, "proof", "govern-baseline.json")
    const graphPath = path.join(REPO_ROOT, "proof", "govern-dependency-graph.json")
    await fsp.writeFile(baselinePath, JSON.stringify(summary, null, 2) + "\n", "utf-8")
    await fsp.writeFile(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf-8")

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

async function main() {
  const options = parseCli(process.argv)
  if (options.watch) {
    await watchGovern(options)
    return
  }

  let result
  if (options.explain || options.profile) {
    result = await runOrchestratorPath(options)
  } else {
    result = await runGovernProfile(options)
  }

  const { graph, failed } = result

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

  return result.summary
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[GOVERN PROFILER]", err.message)
    process.exit(1)
  })
}
