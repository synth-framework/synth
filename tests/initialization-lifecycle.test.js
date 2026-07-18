// ============================================================
// Initialization Lifecycle Tests
// ============================================================
// Regression guards for EXP-GOV-008: project initialization is a
// replayable governance transition, not just a filesystem mutation.
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

async function readEventLog(dataDir) {
  const logPath = path.join(dataDir, "event-log.jsonl")
  try {
    const raw = await fs.readFile(logPath, "utf-8")
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// Fixture: synth init emits PROJECT_INITIALIZED event
// ------------------------------------------------------------
async function testInitEmitsProjectInitializedEvent() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-event-"))
  try {
    const initResult = runSynth(["init", "--name", "Lifecycle Test"], tmpDir)
    assert(initResult.status === 0, `init should succeed: ${initResult.stderr}`)

    const dataDir = path.join(tmpDir, ".synth", "data")
    const events = await readEventLog(dataDir)
    assert(events.length === 1, `expected exactly one event, got ${events.length}`)
    assert(events[0].type === "PROJECT_INITIALIZED", `expected PROJECT_INITIALIZED, got ${events[0].type}`)
    assert(events[0].capability === "InitializeProject", `expected InitializeProject capability, got ${events[0].capability}`)
    assert(typeof events[0].payload.projectId === "string", "event should carry projectId")
    assert(events[0].payload.name === "Lifecycle Test", "event should carry project name")
    assert(typeof events[0].payload.governanceVersion === "string", "event should carry governanceVersion")

    const state = JSON.parse(await fs.readFile(path.join(dataDir, "canonical-state.json"), "utf-8"))
    assert(state.lifecycle === "initialized", `state lifecycle should be initialized, got ${state.lifecycle}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] synth init emits PROJECT_INITIALIZED and records initialized lifecycle")
}

// ------------------------------------------------------------
// Fixture: synth init is idempotent
// ------------------------------------------------------------
async function testInitIsIdempotent() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-idempotent-"))
  try {
    const first = runSynth(["init", "--name", "Idempotent Test"], tmpDir)
    assert(first.status === 0, "first init should succeed")

    const second = runSynth(["init", "--name", "Idempotent Test"], tmpDir)
    assert(second.status === 0, "second init should succeed")

    const dataDir = path.join(tmpDir, ".synth", "data")
    const events = await readEventLog(dataDir)
    assert(events.length === 1, `expected exactly one initialization event after idempotent init, got ${events.length}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] synth init is idempotent")
}

// ------------------------------------------------------------
// Fixture: manifest includes governanceVersion
// ------------------------------------------------------------
async function testManifestIncludesGovernanceVersion() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-manifest-"))
  try {
    const initResult = runSynth(["init", "--name", "Manifest Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const output = parseJson(initResult.stdout)
    assert(output.governanceVersion === "2.1", `init output should report governanceVersion 2.1, got ${output.governanceVersion}`)

    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, ".synth", "manifest.json"), "utf-8"))
    assert(manifest.governanceVersion === "2.1", `manifest should include governanceVersion 2.1, got ${manifest.governanceVersion}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] manifest includes governanceVersion")
}

// ------------------------------------------------------------
// Fixture: resolver reports initialized phase
// ------------------------------------------------------------
async function testResolverReportsInitializedPhase() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-phase-"))
  try {
    const initResult = runSynth(["init", "--name", "Phase Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    const output = parseJson(stdout)
    assert(output.phase === "initialized", `phase should be initialized, got ${output.phase}`)
    assert(output.summary.includes("initialized"), `summary should mention initialized: ${output.summary}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] resolver reports initialized phase after synth init")
}

// ------------------------------------------------------------
// Fixture: synth bootstrap --approve emits PROJECT_INITIALIZED event
// ------------------------------------------------------------
async function testBootstrapApproveEmitsProjectInitializedEvent() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-event-"))
  try {
    // Create a minimal package.json so bootstrap can run govern if needed.
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "bootstrap-test", version: "1.0.0", scripts: {} }, null, 2),
      "utf-8",
    )

    const result = runSynth(["bootstrap", "--approve", "--name", "Bootstrap Test"], tmpDir)
    assert(result.status === 0, `bootstrap --approve should succeed: ${result.stderr}`)

    const dataDir = path.join(tmpDir, ".synth", "data")
    const events = await readEventLog(dataDir)
    const initEvents = events.filter((e) => e.type === "PROJECT_INITIALIZED")
    assert(initEvents.length === 1, `expected exactly one PROJECT_INITIALIZED event, got ${initEvents.length}`)
    assert(initEvents[0].payload.name === "Bootstrap Test", "event should carry bootstrap project name")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] synth bootstrap --approve emits PROJECT_INITIALIZED event")
}

async function main() {
  await testInitEmitsProjectInitializedEvent()
  await testInitIsIdempotent()
  await testManifestIncludesGovernanceVersion()
  await testResolverReportsInitializedPhase()
  await testBootstrapApproveEmitsProjectInitializedEvent()
  console.log("\n[INITIALIZATION LIFECYCLE] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
