// ============================================================
// EXP-QUIET-001 — Quiet and Summary Output Modes
// ============================================================
// Verifies that --quiet suppresses bootstrap diagnostic logs and
// --summary emits a condensed status/ID/next-step summary.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { runSynth, CLI_PATH } from "./helpers/cli-harness.js"
import { setupBasicProject } from "./helpers/mission-lifecycle.js"
import { assert } from "./helpers/assert.js"

async function setupProject() {
  return setupBasicProject("synth-quiet-output-")
}

async function main() {
  console.log("Running quiet/summary output tests...")
  const projectDir = await setupProject()
  try {
    // Default status emits JSON on stdout and no diagnostic chatter on stderr.
    // EXP-CLI-001: the operator decided `status` must not write an INFO line to
    // stderr, so the light path (entry.js -> status-light) and the heavy path
    // (synth.js -> cmdStatus) stay byte-identical. SYNTH_QUIET_LOGS=0 is still
    // forced so this asserts the contract independently of the environment.
    const defaultResult = runSynth(["status"], projectDir, {
      env: { ...process.env, SYNTH_QUIET_LOGS: "0" },
    })
    assert(defaultResult.status === 0, `default status must exit 0: ${defaultResult.stderr}`)
    assert(defaultResult.stdout.trim().startsWith("{"), "default status should emit JSON to stdout")
    assert(!defaultResult.stderr.includes('"level":"INFO"'), "default status should not emit INFO logs to stderr")

    // --quiet suppresses diagnostic INFO logs to stderr.
    const quietResult = runSynth(["status", "--quiet"], projectDir)
    assert(quietResult.status === 0, `quiet status must exit 0: ${quietResult.stderr}`)
    assert(quietResult.stdout.trim().startsWith("{"), "quiet status should still emit JSON to stdout")
    assert(!quietResult.stderr.includes('"level":"INFO"'), "quiet status should suppress INFO logs to stderr")

    // --no-bootstrap-logs is an alias for --quiet and suppresses INFO logs.
    const noBootstrapResult = runSynth(["status", "--no-bootstrap-logs"], projectDir)
    assert(noBootstrapResult.status === 0, `no-bootstrap-logs status must exit 0: ${noBootstrapResult.stderr}`)
    assert(noBootstrapResult.stdout.trim().startsWith("{"), "no-bootstrap-logs status should still emit JSON to stdout")
    assert(!noBootstrapResult.stderr.includes('"level":"INFO"'), "no-bootstrap-logs status should suppress INFO logs to stderr")

    // --summary emits a condensed summary.
    const summaryResult = runSynth(["status", "--summary"], projectDir)
    assert(summaryResult.status === 0, `summary status must exit 0: ${summaryResult.stderr}`)
    assert(!summaryResult.stdout.trim().startsWith("{"), "summary status should not emit JSON to stdout")
    assert(summaryResult.stdout.includes("status:"), "summary status should include status line")
    assert(summaryResult.stdout.includes("kind:"), "summary status should include kind line")

    // --quiet --summary together suppress logs and emit summary.
    const combinedResult = runSynth(["status", "--quiet", "--summary"], projectDir)
    assert(combinedResult.status === 0, `quiet+summary status must exit 0: ${combinedResult.stderr}`)
    assert(!combinedResult.stderr.includes('"level":"INFO"'), "quiet+summary should suppress INFO logs")
    assert(combinedResult.stdout.includes("status:"), "quiet+summary should include status line")

    console.log("[PASS] default status emits JSON and no INFO chatter on stderr")
    console.log("[PASS] --quiet suppresses INFO logs")
    console.log("[PASS] --no-bootstrap-logs suppresses INFO logs")
    console.log("[PASS] --summary emits condensed summary")
    console.log("[PASS] --quiet --summary work together")
    console.log("\nAll quiet/summary output tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
