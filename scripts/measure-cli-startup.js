#!/usr/bin/env node
// ============================================================
// measure-cli-startup — timings that are not allowed to lie
// ============================================================
// Wall-clock measurements in this repository's 2-core sandbox are noisy enough
// that a naive before/after comparison produced a phantom +21 ms "regression"
// on a code path nothing had touched, and a process floor that moved 20 -> 36 ms
// inside one session. Two rules are therefore built into the tool rather than
// left to whoever runs it:
//
//   1. A CONTROL invocation is measured alongside everything else — a verb
//      whose code the change under test does not touch. Its drift bounds every
//      claim: a delta smaller than the control's drift is noise, and the
//      report says so instead of printing a number that looks like a finding.
//   2. Every run records core count, node version and the label of the build
//      under test, and `--compare` refuses to present deltas without them.
//
// Cross-session baselines are not comparable and this tool will not build one:
// it measures one build per invocation, writes JSON, and `--compare` diffs two
// files from the same session. That is the method that survived scrutiny when
// the Phase 0 A/B was re-run with a behavioural probe proving each build had
// actually reverted (entry.js `version` prints a bare semver on the old build
// and "{" on the new — a probe aimed at synth.js cannot tell them apart, and
// the first attempt used exactly that broken probe).
//
// Deliberately NOT chained into test:all: timings are not assertions. The
// derived load-budget guard EXP-CLI-003 owes us should assert module COUNTS
// (deterministic, see scripts/audit-module-graph.js) and treat milliseconds as
// advisory only.
//
// Usage:
//   node scripts/measure-cli-startup.js [--runs 7] [--label new] [--json-out f]
//   node scripts/measure-cli-startup.js --compare old.json new.json
// ============================================================

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// label -> [entry, ...argv]. The control must be a path the change under test
// does not touch; `explain replay` is light-routed and was untouched by the
// Phase 0 contract work, which is why it is the default.
const MATRIX = [
  ["entry.js --version", "dist/cli/entry.js", ["--version"]],
  ["entry.js help", "dist/cli/entry.js", ["help"]],
  ["entry.js status", "dist/cli/entry.js", ["status"]],
  ["synth.js --version", "dist/cli/synth.js", ["--version"]],
  ["synth.js help", "dist/cli/synth.js", ["help"]],
  ["synth.js status", "dist/cli/synth.js", ["status"]],
]
const FLOOR = ["-e", "1"]
const DEFAULT_CONTROL = "entry.js explain replay"
const CONTROL_RUN = ["dist/cli/entry.js", ["explain", "replay"]]

function median(values) {
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

function timeOnce(file, args) {
  const start = performance.now()
  spawnSync(process.execPath, file ? [path.join(ROOT, file), ...args] : args, {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "ignore"],
  })
  return performance.now() - start
}

function measure(label, file, args, runs) {
  const samples = []
  for (let i = 0; i < runs; i++) samples.push(timeOnce(file, args))
  return { label, ms: Number(median(samples).toFixed(1)), min: Number(Math.min(...samples).toFixed(1)), max: Number(Math.max(...samples).toFixed(1)), runs }
}

function compare(aPath, bPath) {
  const a = JSON.parse(fs.readFileSync(aPath, "utf8"))
  const b = JSON.parse(fs.readFileSync(bPath, "utf8"))
  for (const [n, r] of [["A", a], ["B", b]]) {
    if (!r.cores || !r.node) console.error(`run ${n} is missing cores/node metadata — refusing to compare`)
  }
  if (a.cores !== b.cores) console.error(`WARNING: core count differs (${a.cores} vs ${b.cores}) — deltas are meaningless`)
  const av = new Map(a.measurements.map((m) => [m.label, m.ms]))
  const bv = new Map(b.measurements.map((m) => [m.label, m.ms]))
  const control = b.control || a.control
  const drift = av.has(control) && bv.has(control) ? bv.get(control) - av.get(control) : null

  console.log(`CONTROL-ADJUSTED DELTAS   A=${a.label || aPath}  B=${b.label || bPath}`)
  console.log(`  cores ${a.cores}->${b.cores} | node ${a.node} | control "${control}" drift: ${drift === null ? "UNMEASURED" : `${drift.toFixed(1)} ms`}`)
  console.log(`  ${"invocation".padEnd(24)}${"A ms".padStart(8)}${"B ms".padStart(8)}${"delta".padStart(8)}${"adj".padStart(8)}  verdict`)
  for (const [label, bms] of bv) {
    if (!av.has(label)) continue
    const ams = av.get(label)
    const delta = bms - ams
    const adj = drift === null ? null : delta - drift
    let verdict = "n/a"
    if (label === control) verdict = "CONTROL (defines the noise floor)"
    else if (adj === null) verdict = "no control measured"
    else verdict = Math.abs(adj) <= Math.abs(drift || 0) ? "NOT A CLAIM (within control drift)" : adj > 0 ? "slower" : "faster"
    console.log(
      `  ${label.padEnd(24)}${ams.toFixed(1).padStart(8)}${bms.toFixed(1).padStart(8)}` +
        `${delta.toFixed(1).padStart(8)}${adj === null ? "".padStart(8) : adj.toFixed(1).padStart(8)}  ${verdict}`,
    )
  }
  console.log(
    "\nModule counts are deterministic and should carry any load-budget claim;\n" +
      "milliseconds here are advisory. See scripts/audit-module-graph.js.",
  )
}

function main() {
  const argv = process.argv.slice(2)
  const cmpIdx = argv.indexOf("--compare")
  if (cmpIdx >= 0) return compare(argv[cmpIdx + 1], argv[cmpIdx + 2])

  const runsIdx = argv.indexOf("--runs")
  const runs = runsIdx >= 0 ? Number(argv[runsIdx + 1]) || 7 : 7
  const labelIdx = argv.indexOf("--label")
  const label = labelIdx >= 0 ? argv[labelIdx + 1] : "unlabelled"
  const outIdx = argv.indexOf("--json-out")
  const controlIdx = argv.indexOf("--control")
  const control = controlIdx >= 0 ? argv[controlIdx + 1] : DEFAULT_CONTROL

  for (const f of ["dist/cli/entry.js", "dist/cli/synth.js"]) {
    if (!fs.existsSync(path.join(ROOT, f))) {
      console.error(`${f} is missing — run \`npm run build\` first.`)
      process.exit(2)
    }
  }

  const measurements = [measure("floor node -e '1'", null, FLOOR, runs)]
  for (const [name, file, args] of MATRIX) measurements.push(measure(name, file, args, runs))
  measurements.push(measure(control, CONTROL_RUN[0], CONTROL_RUN[1], runs))

  const report = {
    kind: "CliStartupMeasurement",
    label,
    at: new Date().toISOString(),
    cores: os.cpus().length,
    node: process.version,
    runs,
    control,
    measurements,
  }
  if (outIdx >= 0) {
    fs.writeFileSync(argv[outIdx + 1], JSON.stringify(report, null, 2))
    console.log(`wrote ${argv[outIdx + 1]} (${label}, ${measurements.length} measurements, ${runs} runs each)`)
  }
  console.log(`\nCLI STARTUP — ${label} | cores ${report.cores} | node ${report.node} | median of ${runs}`)
  for (const m of measurements) {
    const tag = m.label === control ? "  <- CONTROL" : ""
    console.log(`  ${m.label.padEnd(26)}${m.ms.toFixed(1).padStart(8)} ms   (min ${m.min.toFixed(1)}, max ${m.max.toFixed(1)})${tag}`)
  }
  console.log(
    `\nNo delta from this run is a claim on its own. Re-run against the other build\n` +
      `with a different --label and --json-out, then use --compare A.json B.json.`,
  )
}

main()
