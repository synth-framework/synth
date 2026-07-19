// ============================================================
// SYNTH CLI Distribution Tests
// ============================================================
// EXP-PROGRAM-029
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

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-distribute-test-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testDistributeHelp() {
  const { stdout, status } = runSynth(["distribute", "--help"])
  assert(status === 0, "distribute --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "distribute help status should be ok")
  assert(output.namespace === "distribute", "namespace should be distribute")
  assert(Array.isArray(output.subcommands), "should list subcommands")
  assert(output.subcommands.some((s) => s.name.includes("list-targets")), "should include list-targets")
  assert(output.subcommands.some((s) => s.name.includes("project-all")), "should include project-all")
  console.log("[PASS] synth distribute --help lists subcommands")
}

async function testDistributeListTargets() {
  const { stdout, status } = runSynth(["distribute", "list-targets"])
  assert(status === 0, "distribute list-targets should exit 0")
  const output = parseJson(stdout)
  assert(output.kind === "DistributionTargets", "kind should be DistributionTargets")
  assert(Array.isArray(output.targets), "targets should be array")
  assert(output.targets.includes("chatgpt-skill"), "should include chatgpt-skill")
  assert(output.targets.includes("cursor-rules"), "should include cursor-rules")
  assert(output.targets.includes("mcp-manifest"), "should include mcp-manifest")
  console.log("[PASS] synth distribute list-targets returns targets")
}

async function testDistributeModel() {
  const { stdout, status } = runSynth(["distribute", "model"])
  assert(status === 0, "distribute model should exit 0")
  const output = parseJson(stdout)
  assert(output.kind === "AiCapabilityModel", "kind should be AiCapabilityModel")
  assert(output.schema === "synth-ai-capability-model-v1", "schema should be v1")
  assert(output.project.name === "SYNTH", "project name should be SYNTH")
  console.log("[PASS] synth distribute model emits canonical capability model")
}

async function testDistributeProject() {
  await withTempDir(async (tmpDir) => {
    const outDir = path.join(tmpDir, "dist")
    const { stdout, status } = runSynth(["distribute", "project", "--target", "chatgpt-skill", "--out-dir", outDir])
    assert(status === 0, "distribute project should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "DistributionProjection", "kind should be DistributionProjection")
    assert(output.target === "chatgpt-skill", "target should match")
    assert(output.filename === "synth-chatgpt-skill.md", "filename should match")

    const content = await fs.readFile(output.outputPath, "utf-8")
    assert(content.includes("SYNTH"), "projected content should mention SYNTH")
    console.log("[PASS] synth distribute project writes a projection file")
  })
}

async function testDistributeProjectAll() {
  await withTempDir(async (tmpDir) => {
    const outDir = path.join(tmpDir, "dist")
    const { stdout, status } = runSynth(["distribute", "project-all", "--out-dir", outDir])
    assert(status === 0, "distribute project-all should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "DistributionProjectionAll", "kind should be DistributionProjectionAll")
    assert(output.count >= 10, "should generate at least 10 projections")

    const files = await fs.readdir(outDir)
    assert(files.includes("synth-chatgpt-skill.md"), "should include chatgpt skill")
    assert(files.includes(".cursorrules"), "should include cursor rules")
    assert(files.includes("synth-mcp-manifest.json"), "should include mcp manifest")
    console.log("[PASS] synth distribute project-all generates all projections")
  })
}

async function main() {
  await testDistributeHelp()
  await testDistributeListTargets()
  await testDistributeModel()
  await testDistributeProject()
  await testDistributeProjectAll()
  console.log("\nAll distribution CLI tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
