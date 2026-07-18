// ============================================================
// Initialization Evidence Tests
// ============================================================
// Validates EXP-INIT-002: synth init collects adapter evidence,
// persists an evidence artifact, and emits an enriched
// PROJECT_INITIALIZED event that references it.
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

async function listEvidenceArtifacts(evidenceDir) {
  try {
    return await fs.readdir(evidenceDir)
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// Fixture: synth init with explicit source produces evidence
// ------------------------------------------------------------
async function testExplicitSourceProducesEvidenceArtifact() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-evidence-"))
  try {
    const knowledgeDir = path.join(tmpDir, "knowledge")
    await fs.mkdir(knowledgeDir, { recursive: true })
    await fs.writeFile(path.join(knowledgeDir, "overview.md"), "# Overview\n\nProject intent.\n", "utf-8")

    const initResult = runSynth(
      [
        "init",
        "--name",
        "Evidence Test",
        "--source",
        "filesystem",
        "--source-location",
        "./knowledge",
      ],
      tmpDir,
    )
    assert(initResult.status === 0, `init should succeed: ${initResult.stderr}`)

    const dataDir = path.join(tmpDir, ".synth", "data")
    const events = await readEventLog(dataDir)
    assert(events.length === 1, `expected exactly one event, got ${events.length}`)

    const event = events[0]
    assert(event.type === "PROJECT_INITIALIZED", `expected PROJECT_INITIALIZED, got ${event.type}`)
    assert(event.payload.sourceType === "filesystem", `expected sourceType filesystem, got ${event.payload.sourceType}`)
    assert(event.payload.sourceLocation === "./knowledge", `expected sourceLocation ./knowledge, got ${event.payload.sourceLocation}`)
    assert(event.payload.adapterId === "filesystem", `expected adapterId filesystem, got ${event.payload.adapterId}`)
    assert(typeof event.payload.adapterVersion === "string", "adapterVersion should be a string")
    assert(
      typeof event.payload.evidenceReference === "string" &&
        event.payload.evidenceReference.startsWith(".synth/data/evidence/initialization/"),
      `expected evidenceReference under .synth/data/evidence/initialization/, got ${event.payload.evidenceReference}`,
    )
    assert(typeof event.payload.projectModel === "object" && event.payload.projectModel !== null, "projectModel should be an object")
    assert(event.payload.projectModel.lifecycleStage === "specification", `expected lifecycleStage specification, got ${event.payload.projectModel.lifecycleStage}`)

    const artifactPath = path.join(tmpDir, event.payload.evidenceReference)
    const artifactRaw = await fs.readFile(artifactPath, "utf-8")
    const artifact = JSON.parse(artifactRaw)
    assert(artifact.schemaVersion === "1.0.0", `expected artifact schemaVersion 1.0.0, got ${artifact.schemaVersion}`)
    assert(artifact.projectName === "Evidence Test", `expected projectName Evidence Test, got ${artifact.projectName}`)
    assert(artifact.evidence.adapterId === "filesystem", `expected evidence adapterId filesystem, got ${artifact.evidence.adapterId}`)
    assert(typeof artifact.model === "object" && artifact.model !== null, "artifact model should be an object")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] explicit source produces evidence artifact and enriched event")
}

// ------------------------------------------------------------
// Fixture: default synth init uses filesystem adapter and evidence
// ------------------------------------------------------------
async function testDefaultInitUsesFilesystemAdapter() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-default-evidence-"))
  try {
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test" }), "utf-8")

    const initResult = runSynth(["init", "--name", "Default Evidence Test"], tmpDir)
    assert(initResult.status === 0, `init should succeed: ${initResult.stderr}`)

    const dataDir = path.join(tmpDir, ".synth", "data")
    const events = await readEventLog(dataDir)
    assert(events.length === 1, `expected exactly one event, got ${events.length}`)

    const event = events[0]
    assert(event.type === "PROJECT_INITIALIZED", `expected PROJECT_INITIALIZED, got ${event.type}`)
    assert(event.payload.sourceType === "filesystem", `expected sourceType filesystem, got ${event.payload.sourceType}`)
    assert(event.payload.adapterId === "filesystem", `expected adapterId filesystem, got ${event.payload.adapterId}`)
    assert(typeof event.payload.evidenceReference === "string", "evidenceReference should be a string")
    assert(event.payload.projectModel.lifecycleStage === "implementation", `expected lifecycleStage implementation, got ${event.payload.projectModel.lifecycleStage}`)

    const evidenceDir = path.join(dataDir, "evidence", "initialization")
    const artifacts = await listEvidenceArtifacts(evidenceDir)
    assert(artifacts.length === 1, `expected exactly one evidence artifact, got ${artifacts.length}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] default init uses filesystem adapter and persists evidence")
}

// ------------------------------------------------------------
// Fixture: unknown source type fails with a clear diagnostic
// ------------------------------------------------------------
async function testUnknownSourceTypeFails() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-unknown-source-"))
  try {
    const initResult = runSynth(
      ["init", "--name", "Unknown Source Test", "--source", "nonexistent"],
      tmpDir,
    )
    assert(initResult.status !== 0, "init should fail for unknown source type")
    const errorOutput = initResult.stdout || initResult.stderr
    assert(
      errorOutput.includes("No adapter available"),
      `output should mention missing adapter: ${errorOutput}`,
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] unknown source type fails with clear diagnostic")
}

async function main() {
  await testExplicitSourceProducesEvidenceArtifact()
  await testDefaultInitUsesFilesystemAdapter()
  await testUnknownSourceTypeFails()
  console.log("\n[INITIALIZATION EVIDENCE] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
