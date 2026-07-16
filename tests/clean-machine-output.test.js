// ============================================================
// Clean Machine Output Tests
// ============================================================
// Regression guards for EXP-DISC-004: `synth ... --json` must not
// emit diagnostic bootstrap logs on stderr.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function hasDiagnosticLog(stderr) {
  return /"level"\s*:\s*"(INFO|WARN|DEBUG)"/.test(stderr)
}

async function testJsonFlagSuppressesBootstrapLogs() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-clean-json-"))
  try {
    const initResult = runSynth(["init", "--name", "Clean Output Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, stderr, status } = runSynth(["status", "--json"], tmpDir)
    assert(status === 0, "status --json should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(!hasDiagnosticLog(stderr), `stderr should not contain INFO/WARN/DEBUG logs: ${stderr}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] status --json suppresses bootstrap diagnostic logs")
}

async function testJsonFlagBeforeCommand() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-clean-json-flag-"))
  try {
    runSynth(["init", "--name", "Clean Output Test"], tmpDir)
    const { stdout, stderr, status } = runSynth(["--json", "status"], tmpDir)
    assert(status === 0, "--json status should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(!hasDiagnosticLog(stderr), `stderr should not contain INFO/WARN/DEBUG logs: ${stderr}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] --json before command suppresses bootstrap diagnostic logs")
}

async function testWithoutJsonFlagLogsRemain() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-clean-logs-"))
  try {
    runSynth(["init", "--name", "Clean Output Test"], tmpDir)
    const { stdout, stderr, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    assert(stdout.trim().startsWith("{"), "stdout should be JSON object")
    assert(hasDiagnosticLog(stderr), `stderr should still contain INFO/WARN/DEBUG logs without --json: ${stderr}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] status without --json still emits diagnostic logs")
}

async function testJsonFlagPreservesErrors() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-clean-error-"))
  try {
    // Use an unknown command to force a structured error response.
    const { stdout, stderr, status } = runSynth(["--json", "not-a-command"], tmpDir)
    assert(status !== 0, "unknown command should exit non-zero")
    const output = stdout + stderr
    assert(output.includes("error"), `output should contain error response: ${output}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] --json preserves error responses")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

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
