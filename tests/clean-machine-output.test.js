// ============================================================
// Clean Machine Output Tests
// ============================================================
// Regression guards for EXP-DISC-004: `synth ... --json` must not
// emit diagnostic bootstrap logs on stderr.
// ============================================================

import { runSynth, withTempDir } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

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
    const { stdout, stderr, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(hasDiagnosticLog(stderr), `stderr should still contain INFO/WARN/DEBUG logs without --json: ${stderr}`)
  })
  console.log("[PASS] status without --json still emits diagnostic logs")
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
