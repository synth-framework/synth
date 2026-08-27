// ============================================================
// Shared performance / telemetry runner for CLI integration tests
// ============================================================
// DRY replacement for the duplicated `runSynth` timing block that
// was copy-pasted into every CLI integration test. Captures:
//   - per-command wall-clock elapsed time (PERFCMD ...)
//   - the CLI's own [telemetry] spans (phase breakdowns)
// to a perf log file (one per test suite).
//
// Usage:
//   import { createPerfRunner } from "./helpers/perf-runner.js"
//   const { runSynth } = createPerfRunner({ cliPath: CLI_PATH })
//   const r = runSynth(["expedition", "commit", ...], cwd)
//
// The log path defaults to /tmp/synth-perf-<suite>.log but can be
// overridden with the SYNTH_PERF_LOG env var (useful for aggregated runs).

import fsSync from "fs"
import { spawnSync } from "child_process"

export function createPerfRunner({ cliPath, logPath, timeout = 60000 }) {
  const perfLogPath = logPath || process.env.SYNTH_PERF_LOG || "/tmp/synth-perf.log"
  fsSync.writeFileSync(perfLogPath, "")
  function perfLog(line) {
    fsSync.appendFileSync(perfLogPath, line + "\n")
  }
  function runSynth(args, cwd) {
    const t0 = Date.now()
    const result = spawnSync("node", [cliPath, ...args], {
      cwd,
      encoding: "utf-8",
      timeout,
    })
    const elapsed = Date.now() - t0
    const key = (args[0] || "") + " " + (args[1] || "")
    perfLog(`PERFCMD ${key} elapsedMs=${elapsed} status=${result.status}`)
    const tel = (result.stderr || "")
      .split("\n")
      .filter((l) => l.includes("[telemetry]"))
      .map((l) => "  " + l.trim())
      .join("\n")
    if (tel) perfLog(tel)
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      status: result.status,
    }
  }
  return { runSynth, perfLog, perfLogPath }
}
