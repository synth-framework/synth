// ============================================================
// SYNTH CLI Contract Tests
// ============================================================
// Verifies the public operator protocol: deterministic JSON output,
// unified error taxonomy, discovery safety, and stable exit codes.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd = process.cwd(), options = {}) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: options.timeout ?? 30000,
    env: options.env,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-contract-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testErrorTaxonomy() {
  const { stdout, status } = runSynth(["unknown-command-that-does-not-exist"])
  assert(status !== 0, "unknown command should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error", "error output should have status 'error'")
  assert(typeof output.error === "string" && output.error.length > 0, "error output should have a message")
  assert(typeof output.kind === "string" && output.kind.length > 0, "error output should have a kind discriminator")
  console.log("[PASS] unknown command emits structured error with status, kind, and error")
}

async function testMissingFlagError() {
  const { stdout, status } = runSynth(["mission", "approve"])
  assert(status !== 0, "missing --draft-id should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error", "error output should have status 'error'")
  assert(typeof output.error === "string", "error output should have a message")
  assert(typeof output.kind === "string", "error output should have a kind discriminator")
  console.log("[PASS] missing required flag emits structured error")
}

async function testDiscoverySafetyBlocksMutating() {
  await withTempDir(async (tmpDir) => {
    const { stdout, status } = runSynth(["--discovery-mode", "init", "--name", "Blocked"], tmpDir)
    assert(status !== 0, "init should be blocked in discovery mode")
    const output = parseJson(stdout)
    assert(output.status === "error", "blocked command should return status 'error'")
    assert(typeof output.error === "string", "blocked command should return an error message")
  })
  console.log("[PASS] discovery mode blocks mutating init command")
}

async function testDiscoverySafetyBlocksValidateFull() {
  const { stdout, status } = runSynth(["--discovery-mode", "validate", "--full", "--dry-run"])
  assert(status !== 0, "validate --full should be blocked in discovery mode")
  const output = parseJson(stdout)
  assert(output.status === "error", "validate --full should return status 'error' in discovery mode")
  console.log("[PASS] discovery mode blocks validate --full")
}

async function testDiscoverySafetyAllowsReadOnly() {
  const { stdout, status } = runSynth(["--discovery-mode", "doctor"])
  assert(status === 0, "doctor should be allowed in discovery mode")
  const output = parseJson(stdout)
  assert(output.status === "ok" || output.status === "warning", "doctor should return ok or warning")
  console.log("[PASS] discovery mode allows read-only doctor command")
}

async function testValidateHelp() {
  const { stdout, status } = runSynth(["validate", "--help"])
  assert(status === 0, "validate --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "validate --help status should be ok")
  assert(output.namespace === "validate", "validate --help should report namespace")
  assert(Array.isArray(output.subcommands), "validate --help should list subcommands")
  assert(output.subcommands.some((c) => c.name.includes("--full")), "validate --help should include --full")
  console.log("[PASS] synth validate --help returns structured help")
}

async function testExplainHelp() {
  const { stdout, status } = runSynth(["explain", "--help"])
  assert(status === 0, "explain --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "explain --help status should be ok")
  assert(output.namespace === "explain", "explain --help should report namespace")
  assert(Array.isArray(output.subcommands), "explain --help should list subcommands")
  console.log("[PASS] synth explain --help returns structured help")
}

async function testAdapterJsonOutput() {
  const { stdout, status } = runSynth(["adapter", "list"])
  assert(status === 0, "adapter list should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "adapter list status should be ok")
  assert(output.kind === "AdapterList", "adapter list should report AdapterList kind")
  assert(Array.isArray(output.adapters), "adapter list should return adapters array")
  console.log("[PASS] synth adapter list emits structured JSON")
}

async function testSingleChannelErrorOutput() {
  const commands = [
    ["unknown-command"],
    ["mission", "approve"],
    ["--discovery-mode", "init"],
  ]
  for (const args of commands) {
    const { stdout, stderr, status } = runSynth(args)
    assert(status !== 0, `command 'synth ${args.join(" ")}' should exit non-zero`)
    assert(stdout.trim().startsWith("{"), `command 'synth ${args.join(" ")}' should emit JSON error to stdout`)
    // Errors must not leak unstructured text to stderr.
    assert(!stderr.includes("Error: "), `command 'synth ${args.join(" ")}' should not emit unstructured stderr`)
    parseJson(stdout)
  }
  console.log("[PASS] error commands emit single JSON object to stdout without unstructured stderr")
}

async function testValidateFullIsMutatingInPlan() {
  const { stdout, status } = runSynth(["validate", "--full", "--dry-run"])
  assert(status === 0, "validate --full --dry-run should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "validate --full --dry-run status should be ok")
  assert(output.kind === "ValidationPlan", "validate --full --dry-run should return ValidationPlan")
  assert(output.run.includes("govern"), "full plan should run govern")
  assert(output.protectedAssetsTouched === true, "full plan should flag protected assets touched")
  assert(output.risk === "high", "full plan should report high risk")
  console.log("[PASS] validate --full --dry-run reports mutating governance plan")
}

async function testProjectHelpRendersNamespaceHelp() {
  const { stdout, status } = runSynth(["project", "--help"])
  assert(status === 0, "project --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "project --help status should be ok")
  assert(output.namespace === "project", "project --help should report namespace 'project'")
  assert(Array.isArray(output.subcommands), "project --help should list subcommands")
  assert(output.subcommands.some((c) => c.name.includes("AGENTS.md")), "project --help should include AGENTS.md")
  console.log("[PASS] synth project --help returns structured namespace help")
}

async function testMissionHelpIncludesVerifyCharter() {
  const { stdout, status } = runSynth(["mission", "--help"])
  assert(status === 0, "mission --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "mission --help status should be ok")
  assert(output.namespace === "mission", "mission --help should report namespace 'mission'")
  assert(
    output.subcommands.some((c) => c.name.includes("verify-charter")),
    "mission --help should include verify-charter subcommand",
  )
  console.log("[PASS] synth mission --help includes verify-charter")
}

async function testExpeditionHelpAdvertisesDryRun() {
  const { stdout, status } = runSynth(["expedition", "--help"])
  assert(status === 0, "expedition --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "expedition --help status should be ok")
  assert(output.namespace === "expedition", "expedition --help should report namespace 'expedition'")
  const mutatingCommands = [
    "create",
    "approve",
    "commit",
    "start",
    "complete",
    "finish",
    "cancel",
    "archive",
    "evidence",
    "refine",
    "certify",
  ]
  for (const sub of mutatingCommands) {
    const entry = output.subcommands.find((c) => c.name.startsWith(`synth expedition ${sub}`))
    assert(entry, `expedition --help should include ${sub} subcommand`)
    assert(entry.name.includes("[--dry-run]"), `expedition ${sub} should advertise --dry-run`)
  }
  console.log("[PASS] synth expedition --help advertises --dry-run on all mutating subcommands")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testErrorTaxonomy()
  await testMissingFlagError()
  await testDiscoverySafetyBlocksMutating()
  await testDiscoverySafetyBlocksValidateFull()
  await testDiscoverySafetyAllowsReadOnly()
  await testValidateHelp()
  await testExplainHelp()
  await testAdapterJsonOutput()
  await testSingleChannelErrorOutput()
  await testValidateFullIsMutatingInPlan()
  await testProjectHelpRendersNamespaceHelp()
  await testMissionHelpIncludesVerifyCharter()
  await testExpeditionHelpAdvertisesDryRun()

  console.log("\n[SYNTH CLI Contract] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
