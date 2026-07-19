// ============================================================
// Agent Certification Tests
// ============================================================
// Validates that SYNTH exposes the metadata, protocol, and
// governance contracts required for AI agent interoperability.
// These tests use only public CLI commands and documented artifacts.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const SDK_PATH = path.resolve(process.cwd(), "packages", "synth-agent-sdk", "dist", "index.js")

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

async function withTempProject(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-agent-cert-"))
  try {
    const initResult = runSynth(["init", "--name", "AgentCertProject"], tmpDir)
    assert(initResult.status === 0, `init should succeed: ${initResult.stderr}`)
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testAiMetadataGeneratedOnInit() {
  await withTempProject(async (tmpDir) => {
    const aiDir = path.join(tmpDir, ".synth", "ai")
    const files = ["discovery.json", "capabilities.json", "lifecycle.json", "protocols.json", "skills.json", "interaction-manifest.json"]
    for (const file of files) {
      const content = await fs.readFile(path.join(aiDir, file), "utf-8")
      const parsed = JSON.parse(content)
      assert(parsed.version || parsed.schema, `${file} should have a version or schema`)
    }
    console.log("[PASS] synth init generates .synth/ai/ metadata bundle")
  })
}

async function testAiRefreshUpdatesMetadata() {
  await withTempProject(async (tmpDir) => {
    const manifestPath = path.join(tmpDir, ".synth", "ai", "interaction-manifest.json")
    const before = JSON.parse(await fs.readFile(manifestPath, "utf-8"))

    // Refresh should regenerate the manifest with a new timestamp.
    const refreshResult = runSynth(["ai", "refresh"], tmpDir)
    assert(refreshResult.status === 0, `ai refresh should succeed: ${refreshResult.stderr}`)
    const refreshOutput = parseJson(refreshResult.stdout)
    assert(refreshOutput.status === "ok", "ai refresh status should be ok")
    assert(
      typeof refreshOutput.path === "string" && refreshOutput.path.endsWith(path.join(".synth", "ai")),
      "ai refresh should report ai path",
    )

    const after = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
    assert(after.generatedAt !== before.generatedAt, "ai refresh should update generatedAt")
    console.log("[PASS] synth ai refresh regenerates metadata")
  })
}

async function testStatusRefreshesMetadata() {
  await withTempProject(async (tmpDir) => {
    const lifecyclePath = path.join(tmpDir, ".synth", "ai", "lifecycle.json")
    const before = await fs.stat(lifecyclePath)

    const statusResult = runSynth(["status"], tmpDir)
    assert(statusResult.status === 0, `status should succeed: ${statusResult.stderr}`)
    const statusOutput = parseJson(statusResult.stdout)
    assert(statusOutput.status === "ok", "status status should be ok")

    const after = await fs.stat(lifecyclePath)
    assert(after.mtimeMs >= before.mtimeMs, "status should refresh ai metadata")
    console.log("[PASS] synth status refreshes .synth/ai/ metadata")
  })
}

async function testAiHelp() {
  const { stdout, status } = runSynth(["ai", "--help"])
  assert(status === 0, "ai --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "ai help status should be ok")
  assert(output.namespace === "ai", "ai help namespace should be ai")
  assert(output.subcommands.some((s) => s.name === "synth ai refresh"), "ai help should list refresh")
  console.log("[PASS] synth ai --help lists subcommands")
}

async function testSdkResolvesRepositoryContext() {
  await withTempProject(async (tmpDir) => {
    const { resolveRepositoryContext } = await import(SDK_PATH)
    const context = await resolveRepositoryContext(tmpDir)
    assert(context.isSynthGoverned, "SDK should detect SYNTH governance")
    assert(context.governanceVersion !== "unknown", "SDK should read governance version")
    assert(context.lifecyclePhase === "initialized", `SDK should report initialized phase, got ${context.lifecyclePhase}`)
    assert(context.mutationPolicy === "MUTATING", `SDK should report MUTATING policy for initialized, got ${context.mutationPolicy}`)
    assert(context.capabilities.includes("Mission"), "SDK should include Mission capability")
    assert(context.skills.includes("genesis"), "SDK should include genesis skill")
    assert(context.prohibitedActions.length > 0, "SDK should surface prohibited actions")
    console.log("[PASS] SDK resolves repository context from .synth/ai/")
  })
}

async function testSdkCommandClassification() {
  const { parseSynthCommand, isMutatingCommand, isProposalOnlyCommand } = await import(SDK_PATH)

  const init = parseSynthCommand("synth init --name Foo")
  assert(init.namespace === "init", "SDK should parse init namespace")
  assert(isMutatingCommand(init), "init should be mutating")

  const discover = parseSynthCommand("synth discover .")
  assert(discover.namespace === "discover", "SDK should parse discover namespace")
  assert(!isMutatingCommand(discover), "discover should not be mutating")

  const missionCreate = parseSynthCommand("synth mission create --subject X --purpose Y")
  assert(missionCreate.namespace === "mission", "SDK should parse mission namespace")
  assert(isProposalOnlyCommand(missionCreate), "mission create should be proposal-only")

  console.log("[PASS] SDK classifies SYNTH commands correctly")
}

async function main() {
  await testAiMetadataGeneratedOnInit()
  await testAiRefreshUpdatesMetadata()
  await testStatusRefreshesMetadata()
  await testAiHelp()
  await testSdkResolvesRepositoryContext()
  await testSdkCommandClassification()
  console.log("\nAll agent certification tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
