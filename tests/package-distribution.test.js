// ============================================================
// SYNTH Package Distribution Tests (EXP-DIST-004)
// ============================================================
// Verifies that SYNTH packages are publish-ready: metadata is
// complete, npm pack produces no warnings, and the MCP server is
// exposed through the main package binary.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"

const PROJECT_ROOT = process.cwd()
const MAIN_PACKAGE = path.resolve(PROJECT_ROOT, "package.json")
const AGENT_SDK_DIR = path.resolve(PROJECT_ROOT, "packages", "synth-agent-sdk")
const AGENT_SDK_PACKAGE = path.resolve(AGENT_SDK_DIR, "package.json")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function runNpm(args, cwd = PROJECT_ROOT) {
  const result = spawnSync("npm", args, {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
    env: process.env,
  })
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  }
}

async function testMainPackageHasMcpBinary() {
  const content = await fs.readFile(MAIN_PACKAGE, "utf-8")
  const pkg = JSON.parse(content)
  assert(pkg.bin && pkg.bin["synth-mcp"] === "dist/distribution/mcp-server.js", "Main package must expose synth-mcp binary")
  assert(pkg.files.includes("distribution/"), "Main package files must include distribution/")
  console.log("[PASS] Main package exposes synth-mcp binary and includes distribution/")
}

async function testAgentSdkPackageMetadata() {
  const content = await fs.readFile(AGENT_SDK_PACKAGE, "utf-8")
  const pkg = JSON.parse(content)
  assert(typeof pkg.name === "string", "agent-sdk must have a name")
  assert(pkg.name === "@synth-framework/agent-sdk", "agent-sdk name must be @synth-framework/agent-sdk")
  assert(typeof pkg.version === "string", "agent-sdk must have a version")
  assert(typeof pkg.description === "string", "agent-sdk must have a description")
  assert(typeof pkg.homepage === "string", "agent-sdk must have a homepage")
  assert(pkg.repository && typeof pkg.repository.url === "string", "agent-sdk must have a repository URL")
  assert(Array.isArray(pkg.keywords), "agent-sdk must have keywords")
  assert(pkg.keywords.includes("synth"), "agent-sdk keywords must include synth")
  assert(pkg.publishConfig && pkg.publishConfig.access === "public", "agent-sdk must be configured for public publish")
  assert(pkg.engines && pkg.engines.node === ">=20.0.0", "agent-sdk must declare Node >=20 engine")
  assert(pkg.license === "Apache-2.0", "agent-sdk license must match main package")
  console.log("[PASS] Agent SDK package metadata is complete")
}

async function testAgentSdkNpmPackDryRun() {
  const result = runNpm(["pack", "--dry-run"], AGENT_SDK_DIR)
  assert(result.status === 0, `npm pack --dry-run must succeed:\n${result.stdout}\n${result.stderr}`)
  assert(!result.stderr.includes("warning"), `npm pack --dry-run should produce no warnings:\n${result.stderr}`)
  console.log("[PASS] Agent SDK npm pack --dry-run succeeds without warnings")
}

async function testMainPackageNpmPackDryRun() {
  const result = runNpm(["pack", "--dry-run"], PROJECT_ROOT)
  assert(result.status === 0, `npm pack --dry-run must succeed:\n${result.stdout}\n${result.stderr}`)
  assert(!result.stderr.includes("warning"), `npm pack --dry-run should produce no warnings:\n${result.stderr}`)
  console.log("[PASS] Main package npm pack --dry-run succeeds without warnings")
}

async function main() {
  console.log("Running package distribution tests...")
  await testMainPackageHasMcpBinary()
  await testAgentSdkPackageMetadata()
  await testAgentSdkNpmPackDryRun()
  await testMainPackageNpmPackDryRun()
  console.log("\nAll package distribution tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
