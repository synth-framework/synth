// ============================================================
// SYNTH CLI Tests
// ============================================================
// Verifies the AI-native operator CLI.
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

async function testVersion() {
  const { stdout, status } = runSynth(["--version"])
  assert(status === 0, "version command should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "version status should be ok")
  assert(output.name === "synth", "version name should be synth")
  assert(output.version === "2.0.0", `version should be 2.0.0, got ${output.version}`)
  assert(output.schema === "synth-cli-v1", "version schema should be synth-cli-v1")
  console.log("[PASS] synth --version returns structured version")
}

async function testHelp() {
  const { stdout, status } = runSynth(["--help"])
  assert(status === 0, "help command should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "help status should be ok")
  assert(Array.isArray(output.commands), "help should list commands")
  assert(output.commands.some((c) => c.name === "init"), "help should include init command")
  assert(output.commands.some((c) => c.name === "doctor"), "help should include doctor command")
  assert(output.commands.some((c) => c.name === "govern"), "help should include govern command")
  assert(Array.isArray(output.vocabulary), "help should list public vocabulary")
  assert(output.vocabulary.includes("Mission"), "vocabulary should include Mission")
  console.log("[PASS] synth --help returns commands and vocabulary")
}

async function testDoctor() {
  const { stdout, status } = runSynth(["doctor"])
  assert(status === 0, "doctor command should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok" || output.status === "warning", "doctor status should be ok or warning")
  assert(output.healthy !== undefined, "doctor should report healthy flag")
  assert(output.checks && output.checks.node, "doctor should include node check")
  assert(output.checks && output.checks.version, "doctor should include version check")
  assert(output.checks && output.checks.binary, "doctor should include binary check")
  assert(output.checks && output.checks.manifest, "doctor should include manifest check")
  console.log("[PASS] synth doctor reports installation health")
}

async function testInit() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-test-"))
  try {
    const { stdout, status } = runSynth(["init", "--name", "CLI Test Project"], tmpDir)
    assert(status === 0, "init command should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "init status should be ok")
    assert(output.projectName === "CLI Test Project", "init should use provided project name")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
    assert(manifest.schema === "synth-bootstrap-manifest-v1", "manifest schema should be v1")
    assert(manifest.projectName === "CLI Test Project", "manifest projectName should match")
    assert(Array.isArray(manifest.commands), "manifest should list commands")
    assert(Array.isArray(manifest.capabilities), "manifest should list capabilities")
    assert(Array.isArray(manifest.publicVocabulary), "manifest should list public vocabulary")
    assert(manifest.publicVocabulary.includes("Replay"), "vocabulary should include Replay")
    console.log("[PASS] synth init creates a valid bootstrap manifest")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testAdapterDelegation() {
  const { stdout, status } = runSynth(["adapter", "list"])
  assert(status === 0, "adapter list should exit 0")
  assert(stdout.includes("repository"), "adapter list should include repository adapter")
  console.log("[PASS] synth adapter list delegates to adapter CLI")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testVersion()
  await testHelp()
  await testDoctor()
  await testInit()
  await testAdapterDelegation()

  console.log("\n[SYNTH CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
