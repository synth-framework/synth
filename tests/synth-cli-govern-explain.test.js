// ============================================================
// SYNTH CLI GOVERN EXPLAIN TESTS (EXP-GOV-010)
// ============================================================
// Verifies that `synth validate --explain` and `synth validate --profile`
// produce deterministic, structured output with explanations.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"

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

async function testValidateExplainDryRun() {
  const { stdout, status } = runSynth([
    "validate",
    "--dry-run",
    "--explain",
    "--diff",
    "docs/getting-started/README.md",
  ])
  assert(status === 0, `validate --explain --dry-run should exit 0, got ${status}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", "status should be ok")
  assert(output.kind === "ValidationPlan", "kind should be ValidationPlan")
  assert(typeof output.explanations === "object", "output should include explanations")
  assert(Object.keys(output.explanations).length > 0, "explanations should not be empty")
  console.log("[PASS] validate --explain --dry-run includes explanations")
}

async function testValidateProfileDocumentationOnly() {
  const { stdout, status } = runSynth([
    "validate",
    "--dry-run",
    "--profile",
    "pull-request",
    "--diff",
    "docs/getting-started/README.md",
  ])
  assert(status === 0, `validate --profile pull-request should exit 0, got ${status}`)
  const output = parseJson(stdout)
  assert(output.profile === "pull-request", "profile should be pull-request")
  assert(output.governanceClasses.includes("documentation"), "should include documentation class")
  console.log("[PASS] validate --profile pull-request filters by class")
}

async function testValidateFullProfile() {
  const { stdout, status } = runSynth([
    "validate",
    "--dry-run",
    "--profile",
    "main-branch",
    "--diff",
    "docs/getting-started/README.md",
  ])
  assert(status === 0, `validate --profile main-branch should exit 0, got ${status}`)
  const output = parseJson(stdout)
  assert(output.profile === "main-branch", "profile should be main-branch")
  assert(output.run.length > 0, "main-branch should have validators to run")
  console.log("[PASS] validate --profile main-branch requires validators")
}

async function testGovernHelpIsAccessible() {
  const { stdout, status } = runSynth(["--help"])
  assert(status === 0, "--help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "help status should be ok")
  assert(Array.isArray(output.commands), "help should list commands")
  assert(output.commands.some((c) => c.name === "govern"), "help should include govern command")
  console.log("[PASS] govern help is accessible")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testValidateExplainDryRun()
  await testValidateProfileDocumentationOnly()
  await testValidateFullProfile()
  await testGovernHelpIsAccessible()

  console.log("\n[SYNTH CLI GOVERN EXPLAIN] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
