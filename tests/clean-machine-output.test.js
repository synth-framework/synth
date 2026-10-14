// ============================================================
// Clean Machine Output Tests
// ============================================================
// Regression guards for EXP-DISC-004: `synth ... --json` must not
// emit diagnostic bootstrap logs on stderr.
// ============================================================

import { runSynth, withTempDir } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"

function hasDiagnosticLog(stderr) {
  return /"level"\s*:\s*"(INFO|WARN|DEBUG)"/.test(stderr)
}

async function testJsonFlagSuppressesBootstrapLogs() {
  await withTempDir("synth-clean-json-", async (tmpDir) => {
    const initResult = runSynth(["init", "--name", "Clean Output Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, stderr, status } = runSynth(["status", "--json"], tmpDir)
    assert(status === 0, "status --json should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(!hasDiagnosticLog(stderr), `stderr should not contain INFO/WARN/DEBUG logs: ${stderr}`)
  })
  console.log("[PASS] status --json suppresses bootstrap diagnostic logs")
}

async function testJsonFlagBeforeCommand() {
  await withTempDir("synth-clean-json-flag-", async (tmpDir) => {
    runSynth(["init", "--name", "Clean Output Test"], tmpDir)
    const { stdout, stderr, status } = runSynth(["--json", "status"], tmpDir)
    assert(status === 0, "--json status should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(!hasDiagnosticLog(stderr), `stderr should not contain INFO/WARN/DEBUG logs: ${stderr}`)
  })
  console.log("[PASS] --json before command suppresses bootstrap diagnostic logs")
}

async function testWithoutJsonFlagLogsRemain() {
  await withTempDir("synth-clean-logs-", async (tmpDir) => {
    runSynth(["init", "--name", "Clean Output Test"], tmpDir)
    // EXP-CLI-001: the operator decided `status` writes no diagnostic line to
    // stderr at all, so the light path (entry.js -> status-light) and the heavy
    // path (synth.js -> cmdStatus) stay byte-identical. stderr is therefore
    // clean with AND without --json. The --json suppression contract for verbs
    // that genuinely log (e.g. bootstrap) is still covered by
    // tests/bootstrap-output.test.js. SYNTH_QUIET_LOGS=0 is forced so this
    // asserts the default contract independently of the environment.
    const { stdout, stderr, status } = runSynth(["status"], tmpDir, {
      env: { ...process.env, SYNTH_QUIET_LOGS: "0" },
    })
    assert(status === 0, "status should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(!hasDiagnosticLog(stderr), `default status should emit no INFO/WARN/DEBUG logs on stderr: ${stderr}`)
  })
  console.log("[PASS] status without --json also emits no diagnostic logs")
}

async function testJsonFlagPreservesErrors() {
  await withTempDir("synth-clean-error-", async (tmpDir) => {
    // Use an unknown command to force a structured error response.
    const { stdout, stderr, status } = runSynth(["--json", "not-a-command"], tmpDir)
    assert(status !== 0, "unknown command should exit non-zero")
    const output = stdout + stderr
    assert(output.includes("error"), `output should contain error response: ${output}`)
  })
  console.log("[PASS] --json preserves error responses")
}

async function main() {
  await testJsonFlagSuppressesBootstrapLogs()
  await testJsonFlagBeforeCommand()
  await testWithoutJsonFlagLogsRemain()
  await testJsonFlagPreservesErrors()

  console.log("\n[CLEAN MACHINE OUTPUT] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
