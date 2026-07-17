// ============================================================
// Repository Identity Tests
// ============================================================
// Regression guards for EXP-DISC-006: `synth explain identity` projects
// the repository's kind, phase, authority, expected inputs/outputs, and
// transformation direction from replayable evidence.
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

async function testRootRepositoryIdentity() {
  const { stdout, status } = runSynth(["explain", "identity"])
  assert(status === 0, "explain identity should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "status should be ok")
  assert(output.kind, "kind should be present")
  assert(output.phase, "phase should be present")
  assert(Array.isArray(output.authority) && output.authority.length > 0, "authority should be a non-empty array")
  assert(Array.isArray(output.expectedInputs), "expectedInputs should be an array")
  assert(Array.isArray(output.expectedOutputs), "expectedOutputs should be an array")
  assert(output.transformationDirection, "transformationDirection should be present")
  assert(output.evidence, "evidence should be present")
  assert(output.evidence.manifestPresent === true || output.evidence.expeditionCount > 0, "root repo should have manifest or expeditions")
  console.log(`[PASS] synth explain identity returns identity for root repository (kind=${output.kind}, phase=${output.phase})`)
}

async function testFreshProjectIdentity() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-identity-"))
  try {
    const initResult = runSynth(["init", "--name", "Identity Test Project"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, status } = runSynth(["explain", "identity"], tmpDir)
    assert(status === 0, "explain identity should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "status should be ok")
    assert(output.kind === "Identity Test Project", `kind should be project name, got ${output.kind}`)
    assert(output.phase === "discovery" || output.phase === "planning", `fresh project phase should be discovery or planning, got ${output.phase}`)
    assert(output.authority.includes("Project Manifest"), "authority should include Project Manifest")
    assert(output.expectedInputs.includes("Human intent"), "expectedInputs should include Human intent")
    assert(output.expectedOutputs.includes("Approved Mission"), "expectedOutputs should include Approved Mission")
    assert(output.transformationDirection.includes("intent"), "transformationDirection should mention intent")
    console.log("[PASS] synth explain identity returns project identity after init")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testUnknownDirectoryIdentity() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-identity-unknown-"))
  try {
    const { stdout, status } = runSynth(["explain", "identity"], tmpDir)
    assert(status === 0, "explain identity should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "status should be ok")
    assert(output.kind === "Unclassified repository", `kind should be unclassified, got ${output.kind}`)
    assert(output.phase === "discovery", `unknown dir phase should be discovery, got ${output.phase}`)
    console.log("[PASS] synth explain identity handles unclassified directory")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testRootRepositoryIdentity()
  await testFreshProjectIdentity()
  await testUnknownDirectoryIdentity()

  console.log("\n[REPOSITORY IDENTITY] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
