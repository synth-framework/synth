#!/usr/bin/env node
// DERIVED load gate: built-JS AST closures + whole-process ESM load traces.
// Repository dist modules only (not Node builtins or third-party packages).
// Instrumented runs are NOT timing evidence. Use measure-cli-startup.js for it.
// Run after npm run build, from a checkout with a real nonempty ledger.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { closure, readModuleGraph, measureModules } from "./lib/module-graph.js"
import { ORIGINAL_MODULES, ORDINARY_LIMIT, ENTRY_BUDGETS, PROBES } from "./lib/cli-load-budgets.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const LOADER = fileURLToPath(new URL("./lib/cli-load-tracer.mjs", import.meta.url))
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex")
const requireThat = (condition, message) => { if (!condition) throw new Error(message) }

export function budgetFailures(label, measured, budget) {
  const failures = []
  for (const key of ["modules", "bytes"]) {
    if (budget[key] !== undefined && measured[key] > budget[key]) failures.push(`${label}: ${measured[key]} ${key} exceeds ${budget[key]}`)
  }
  return failures
}

export function checkStaticEntries(roots, graph, sources, budgets = ENTRY_BUDGETS) {
  const failures = [], entries = []
  for (const root of roots) {
    requireThat(budgets[root], `Entry has no reviewed load budget: ${root}`)
    const measured = measureModules(closure([root], graph), sources)
    entries.push({ root, budget: budgets[root], ...measured })
    failures.push(...budgetFailures(root, measured, budgets[root]))
    if (root === "dist/cli/entry.js") {
      // Even an exceptionally small handler must not become eager. Module
      // count alone would miss an 18 -> 19 regression below the 25 ceiling.
      const lazyTargets = new Set(graph.get("dist/cli/verb-registry.js")?.dynamic || [])
      const handlers = measured.files.filter((f) => lazyTargets.has(f) || (
        f !== "dist/cli/explain-flags.js" && /^dist\/cli\/(?:commands?[-/]|status-light\.js$|explain(?:[-/.])|synth\.js$)/.test(f)
      ))
      if (handlers.length) failures.push(`Dispatcher eagerly loads handlers: ${handlers.join(", ")}`)
    }
  }
  return { entries, failures }
}

export function validateProbeResult(probe, result, trace, graph, sources, entry) {
  requireThat(!result.error && !result.signal, `${probe.id}: process failed: ${result.error || result.signal}`)
  let output
  try { output = JSON.parse(result.stdout) } catch { throw new Error(`${probe.id}: missing/invalid JSON output (exit ${result.status})`) }
  const expectedExit = probe.id === "checkpoint" && output.status === "blocked" ? 1 : 0
  requireThat(result.status === expectedExit, `${probe.id}: unexpected exit ${result.status}: ${result.stderr}`)
  requireThat((probe.statuses || ["ok"]).includes(output.status), `${probe.id}: unexpected result status ${output.status}`)
  requireThat(!probe.kind || output.kind === probe.kind, `${probe.id}: wrong output kind ${output.kind}`)
  requireThat(!probe.field || Object.hasOwn(output, probe.field), `${probe.id}: missing output field ${probe.field}`)
  requireThat(trace.trim().length > 0, `${probe.id}: empty/missing load trace`)
  let files
  try { files = new Set(trace.trim().split("\n").map(JSON.parse)) } catch { throw new Error(`${probe.id}: malformed load trace`) }
  requireThat([...files].every((f) => typeof f === "string" && f.startsWith("dist/") && f.endsWith(".js")), `${probe.id}: invalid traced path`)
  const measured = measureModules(files, sources)
  // Every successfully loaded module owes all its static dependencies. This
  // catches truncated traces, not just a missing first entry record.
  for (const file of closure([entry, ...files], graph)) requireThat(files.has(file), `${probe.id}: incomplete trace, missing ${file}`)
  if (probe.exception) requireThat(files.has("dist/core/bootstrap.js"), `${probe.id}: exempted runtime path was not exercised`)
  else requireThat(!files.has("dist/core/bootstrap.js"), `${probe.id}: ordinary read unexpectedly bootstrapped the full runtime`)
  if (probe.replayPath) {
    const replay = probe.replayPath.reduce((value, key) => value?.[key], output)
    requireThat(replay?.ok && /Event log consistent \([1-9]\d* events,/.test(replay.detail), `${probe.id}: failed/skipped/empty replay is not coverage`)
  }
  if (probe.id === "replay") requireThat(output.consistent === true && output.eventCount > 0, "replay: must verify actual persisted events")
  if (probe.id === "bootstrap-plan") requireThat(output.proposals?.missionProposals?.length > 0, "bootstrap-plan: no real proposals generated")
  const budget = { modules: probe.modules ?? ORDINARY_LIMIT, ...(probe.bytes ? { bytes: probe.bytes } : {}) }
  return { id: probe.id, args: probe.args, exitCode: result.status, outputStatus: output.status, budget, exception: probe.exception, ...measured, failures: budgetFailures(probe.id, measured, budget) }
}

export function runGuard(root = ROOT) {
  const { graph, sources } = readModuleGraph(root)
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
  const declared = [...Object.values(pkg.bin || {}), pkg.main].filter(Boolean).map((f) => f.replace(/^\.\//, ""))
  const roots = [...new Set([...declared, "dist/cli/synth.js", "dist/cli/status-light.js"])]
  requireThat(pkg.bin?.synth === "dist/cli/entry.js", "Budget gate must follow the shipped dispatcher; review changed bin.synth")
  const { entries, failures } = checkStaticEntries(roots, graph, sources)
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "dist/dist-manifest.json"), "utf8"))
  requireThat(manifest.schema === "synth-dist-manifest-v1", "Invalid dist manifest; rebuild first")
  for (const [file, source] of sources) requireThat(manifest.files[file.slice(5)] === sha256(source), `Stale dist manifest: ${file}; rebuild first`)
  const report = {
    kind: "CliLoadBudget", node: process.version, originalTotalModules: ORIGINAL_MODULES,
    ordinaryLimit: ORDINARY_LIMIT, totalBuiltModules: sources.size,
    distRootHash: manifest.rootHash, distFileCount: Object.keys(manifest.files).length,
    moduleHash: sha256([...sources].map(([f, s]) => `${f}:${sha256(s)}\n`).join("")),
    entries, probes: [], failures,
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "synth-load-budget-"))
  try {
    for (const probe of PROBES) {
      const traceFile = path.join(temp, `${probe.id}.jsonl`)
      const result = spawnSync(process.execPath, ["--no-warnings", "--experimental-loader", LOADER, path.join(root, pkg.bin.synth), ...probe.args, "--json"], {
        cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, NODE_OPTIONS: "", SYNTH_QUIET_LOGS: "1", SYNTH_LOAD_TRACE_ROOT: root, SYNTH_LOAD_TRACE_FILE: traceFile },
      })
      try {
        const trace = fs.existsSync(traceFile) ? fs.readFileSync(traceFile, "utf8") : ""
        const measured = validateProbeResult(probe, result, trace, graph, sources, pkg.bin.synth)
        report.probes.push(measured)
        failures.push(...measured.failures)
      } catch (error) {
        failures.push(error.message)
        report.probes.push({ id: probe.id, args: probe.args, error: error.message, exitCode: result.status })
      }
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
  report.ok = failures.length === 0 && report.probes.length === PROBES.length
  return report
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireThat(process.argv.slice(2).every((arg) => arg === "--json"), "Usage: node scripts/check-cli-load-budget.js [--json]")
    const report = runGuard()
    if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2))
    else {
      for (const row of report.entries) console.log(`entry ${row.root}: ${row.modules} modules / ${row.bytes} bytes`)
      for (const row of report.probes) console.log(`verb ${row.id}: ${row.error || `${row.modules}/${row.budget.modules} modules / ${row.bytes} bytes`}${row.exception ? " (bounded work exception)" : ""}`)
      console.log(report.ok ? "CLI LOAD BUDGET: PASS" : `CLI LOAD BUDGET: FAIL\n${report.failures.join("\n")}`)
    }
    process.exitCode = report.ok ? 0 : 1
  } catch (error) {
    console.error(`CLI LOAD BUDGET: ERROR: ${error.message}`)
    process.exitCode = 1
  }
}
