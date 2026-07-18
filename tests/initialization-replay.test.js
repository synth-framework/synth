// ============================================================
// Initialization Replay Tests
// ============================================================
// Validates EXP-INIT-002: the enriched PROJECT_INITIALIZED event
// replays deterministically to the same canonical state.
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

// ------------------------------------------------------------
// Fixture: replay from event log matches persisted canonical state
// ------------------------------------------------------------
async function testReplayMatchesCanonicalState() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-replay-"))
  try {
    const knowledgeDir = path.join(tmpDir, "knowledge")
    await fs.mkdir(knowledgeDir, { recursive: true })
    await fs.writeFile(path.join(knowledgeDir, "intent.md"), "# Intent\n\nBuild a thing.\n", "utf-8")

    const initResult = runSynth(
      [
        "init",
        "--name",
        "Replay Test",
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
    assert(events[0].type === "PROJECT_INITIALIZED", `expected PROJECT_INITIALIZED, got ${events[0].type}`)

    const statePath = path.join(dataDir, "canonical-state.json")
    const persistedState = JSON.parse(await fs.readFile(statePath, "utf-8"))

    const { rebuildState } = await import("../dist/runtime/replay.js")
    const replayedState = rebuildState(events)

    assert(replayedState.lifecycle === "initialized", `replayed lifecycle should be initialized, got ${replayedState.lifecycle}`)
    assert(
      replayedState.stateHash === persistedState.stateHash,
      `replayed state hash ${replayedState.stateHash} should match persisted state hash ${persistedState.stateHash}`,
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] replay from event log matches persisted canonical state")
}

// ------------------------------------------------------------
// Fixture: replay is stable across repeated runs
// ------------------------------------------------------------
async function testReplayIsStable() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-init-replay-stable-"))
  try {
    const docsDir = path.join(tmpDir, "docs")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(path.join(docsDir, "README.md"), "# Project\n", "utf-8")

    const initResult = runSynth(["init", "--name", "Replay Stable Test"], tmpDir)
    assert(initResult.status === 0, `init should succeed: ${initResult.stderr}`)

    const events = await readEventLog(path.join(tmpDir, ".synth", "data"))
    const { rebuildState } = await import("../dist/runtime/replay.js")
    const first = rebuildState(events)
    const second = rebuildState(events)

    assert(first.stateHash === second.stateHash, "repeated replay should produce identical state hash")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] replay is stable across repeated runs")
}

async function main() {
  await testReplayMatchesCanonicalState()
  await testReplayIsStable()
  console.log("\n[INITIALIZATION REPLAY] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
