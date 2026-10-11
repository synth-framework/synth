// ============================================================
// TEST HELPERS — execSync CLI runner
// ============================================================
// Shared execSync-based CLI runner for tests that assert on combined
// stdout+stderr output with quiet logs (docs-provenance, event-log-query).
// Single home for the identical run/runAllowError blocks
// (expedition 7a79e79b, round 13/130). Distinct from cli-harness runSynth
// (spawnSync, split streams) — these tests need throwing execSync +
// SYNTH_QUIET_LOGS=1 semantics.
//
// Usage:
//   const { run, runAllowError } = createExecRunner({ synth, projectDir })
// ============================================================

import { execSync } from "child_process"

/** Create { run, runAllowError } bound to a CLI entrypoint and project dir. */
export function createExecRunner({ synth, projectDir }) {
  function run(args, cwd = projectDir) {
    return execSync(`node ${synth} ${args}`, {
      cwd,
      env: { ...process.env, SYNTH_QUIET_LOGS: "1" },
      encoding: "utf-8",
    })
  }

  function runAllowError(args, cwd = projectDir) {
    try {
      return { exitCode: 0, stdout: run(args, cwd) }
    } catch (err) {
      return { exitCode: err.status, stdout: err.stdout }
    }
  }

  return { run, runAllowError }
}
