// ============================================================
// Adapter Introspection Tests
// ============================================================
// Regression guards for EXP-DISC-003: `synth adapter info <name>`
// exposes adapter metadata, state, and health without source reading.
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

async function testAdapterInfoRepository() {
  const { stdout, status } = runSynth(["adapter", "info", "repository"])
  assert(status === 0, "adapter info repository should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "status should be ok")
  assert(output.name === "repository", `name should be repository, got ${output.name}`)
  assert(output.metadata, "metadata should be present")
  assert(output.metadata.name === "repository", "metadata.name should be repository")
  assert(typeof output.metadata.version === "string", "metadata.version should be a string")
  assert(typeof output.metadata.kind === "string", "metadata.kind should be a string")
  assert(typeof output.metadata.category === "string", "metadata.category should be a string")
  assert(typeof output.metadata.description === "string", "metadata.description should be a string")
  assert(output.state, "state should be present")
  assert(output.health, "health should be present")
  console.log("[PASS] synth adapter info repository returns metadata, state, and health")
}

async function testAdapterInfoFilesystem() {
  const { stdout, status } = runSynth(["adapter", "info", "filesystem"])
  assert(status === 0, "adapter info filesystem should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "status should be ok")
  assert(output.name === "filesystem", `name should be filesystem, got ${output.name}`)
  assert(output.metadata.name === "filesystem", "metadata.name should be filesystem")
  console.log("[PASS] synth adapter info filesystem returns metadata")
}

async function testAdapterInfoUnknown() {
  const { stdout, status } = runSynth(["adapter", "info", "does-not-exist"])
  assert(status !== 0, "adapter info unknown should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error" || output.error, "output should contain an error")
  console.log("[PASS] synth adapter info unknown fails prescriptively")
}

async function testAdapterInfoDefaultRepository() {
  const { stdout, status } = runSynth(["adapter", "info"])
  assert(status === 0, "adapter info without name should default to repository and exit 0")
  const output = parseJson(stdout)
  assert(output.name === "repository", `default name should be repository, got ${output.name}`)
  console.log("[PASS] synth adapter info defaults to repository")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testAdapterInfoRepository()
  await testAdapterInfoFilesystem()
  await testAdapterInfoUnknown()
  await testAdapterInfoDefaultRepository()

  console.log("\n[ADAPTER INTROSPECTION] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
