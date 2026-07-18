// ============================================================
// Resume Briefing Tests
// ============================================================
// Regression guards for EXP-CONT-001: `synth explain resume` returns a
// ResumeBriefing derived from replayable evidence.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")
const DECISION_LOG_MODULE_PATH = path.resolve(process.cwd(), "dist", "mission-studio", "decision-log.js")

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

async function loadComputeEventHash() {
  const mod = await import(HASH_MODULE_PATH)
  return mod.computeEventHash
}

async function appendDecision(dataDir, input) {
  const mod = await import(DECISION_LOG_MODULE_PATH)
  return mod.appendDecision(dataDir, input)
}

async function writeEventLog(dir, rawEvents) {
  const computeEventHash = await loadComputeEventHash()
  const events = []
  let previousHash = "genesis"
  for (const raw of rawEvents) {
    const event = { ...raw, eventHash: "", previousHash }
    event.eventHash = computeEventHash(event)
    previousHash = event.eventHash
    events.push(event)
  }
  const dataDir = path.join(dir, "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n")
}

async function writeManifest(dir, projectName = "Resume Briefing Test") {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.0.0",
    projectName,
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [{ name: "resume", description: "Resume briefing" }],
    capabilities: [],
    layout: { data: ".synth/data/" },
    publicVocabulary: ["Mission", "Expedition", "Replay"],
  }
  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2))
}

// ------------------------------------------------------------
// Fixture: uninitialized directory
// ------------------------------------------------------------
async function testUninitialized() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-resume-uninit-"))
  try {
    const { stdout, status } = runSynth(["explain", "resume"], tmpDir)
    assert(status === 0, "explain resume should exit 0 in uninitialized dir")
    const output = parseJson(stdout)
    assert(output.status === "ok", "status should be ok")
    assert(output.kind === "ResumeBriefing", `output kind should be ResumeBriefing, got ${output.kind}`)
    assert(output.context.phase === "uninitialized", `phase should be uninitialized, got ${output.context.phase}`)
    assert(output.whatHappened.length === 0, "timeline should be empty")
    assert(output.whatWasDecided.length === 0, "decisions should be empty")
    assert(output.whatIsNext.length >= 1, "should have a next action")
    assert(output.whatIsNext[0].command.includes("synth init"), "first action should be init")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] uninitialized directory reports phase uninitialized and suggests init")
}

// ------------------------------------------------------------
// Fixture: initialized, no mission yet
// ------------------------------------------------------------
async function testInitializedNoMission() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-resume-init-"))
  try {
    const initResult = runSynth(["init", "--name", "Resume Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, status } = runSynth(["explain", "resume"], tmpDir)
    assert(status === 0, "explain resume should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "ResumeBriefing", "output kind should be ResumeBriefing")
    assert(output.context.phase === "planning", `phase should be planning, got ${output.context.phase}`)
    assert(output.whatIsNext.some((a) => a.command.includes("synth mission create")), "should suggest creating a mission")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] initialized project without mission reports planning + create-mission action")
}

// ------------------------------------------------------------
// Fixture: approved mission with decision log
// ------------------------------------------------------------
async function testApprovedMission() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-resume-approved-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-RESUME-1"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Approved Test", systemId: "resume-test", partitions: 1 },
      },
      {
        id: "E-MISSION-1",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Approved Mission",
            purpose: "Test approved phase",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE-1",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
    ])

    const dataDir = path.join(tmpDir, "data")
    await appendDecision(dataDir, {
      type: "MISSION_APPROVAL_APPROVED",
      draftId: "DRAFT-RESUME-1",
      reason: "Confidence sufficient",
      confidence: 0.85,
    })

    const { stdout, status } = runSynth(["explain", "resume"], tmpDir)
    assert(status === 0, "explain resume should exit 0")
    const output = parseJson(stdout)
    assert(output.context.phase === "approved", `phase should be approved, got ${output.context.phase}`)
    assert(
      output.whatHappened.some((e) => e.type === "MISSION_APPROVED"),
      "timeline should include mission approval",
    )
    assert(
      output.whatWasDecided.some((d) => d.type === "MISSION_APPROVAL_APPROVED"),
      "decisions should include approval",
    )
    assert(
      output.whatIsNext.some((a) => a.command.includes("synth expedition create")),
      "should suggest creating expedition",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] approved mission reports approval, timeline, and next expedition")
}

// ------------------------------------------------------------
// Fixture: executing expedition
// ------------------------------------------------------------
async function testExecutingExpedition() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-resume-executing-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-RESUME-2"
    const expeditionId = "E-RESUME-2"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Executing Test", systemId: "resume-test", partitions: 1 },
      },
      {
        id: "E-MISSION-2",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Executing Mission",
            purpose: "Test executing phase",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE-2",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
      {
        id: "E-EXP-2",
        type: "EXPEDITION_CREATED",
        timestamp: now + 3,
        transactionId: "tx-3",
        capability: "CreateExpedition",
        actor: "system",
        payload: {
          expedition: {
            id: expeditionId,
            missionId,
            name: "Executing Expedition",
            goal: "Test execution",
            status: "approved",
            objectives: [],
            discoveries: [],
            decisions: [],
            metadata: {},
            createdAt: now + 3,
            updatedAt: now + 3,
          },
        },
      },
      {
        id: "E-START-2",
        type: "EXPEDITION_STARTED",
        timestamp: now + 4,
        transactionId: "tx-4",
        capability: "StartExpedition",
        actor: "system",
        payload: { id: expeditionId, status: "executing" },
      },
    ])

    const { stdout, status } = runSynth(["explain", "resume"], tmpDir)
    assert(status === 0, "explain resume should exit 0")
    const output = parseJson(stdout)
    assert(output.context.phase === "executing", `phase should be executing, got ${output.context.phase}`)
    assert(
      output.whatHappened.some((e) => e.type === "EXPEDITION_STARTED"),
      "timeline should include expedition start",
    )
    assert(
      output.whatIsNext.some((a) => a.command.includes("synth explain status")),
      "should suggest explain status",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] executing expedition reports execution and next status check")
}

// ------------------------------------------------------------
// Fixture: determinism
// ------------------------------------------------------------
async function testDeterminism() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-resume-determinism-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-RESUME-3"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Determinism Test", systemId: "resume-test", partitions: 1 },
      },
      {
        id: "E-MISSION-3",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Determinism Mission",
            purpose: "Test determinism",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE-3",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
    ])

    const first = parseJson(runSynth(["explain", "resume"], tmpDir).stdout)
    const second = parseJson(runSynth(["explain", "resume"], tmpDir).stdout)
    assert(first.context.eventCount === second.context.eventCount, "event counts should match")
    assert(first.whatHappened.length === second.whatHappened.length, "timeline lengths should match")
    assert(first.whatIsNext.length === second.whatIsNext.length, "next action lengths should match")
    assert(JSON.stringify(first.whatHappened) === JSON.stringify(second.whatHappened), "timeline should be identical")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] resume briefing is deterministic across repeated invocations")
}

// ------------------------------------------------------------
// Fixture: broken decision log emits warning
// ------------------------------------------------------------
async function testBrokenDecisionLogWarning() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-resume-decision-warning-"))
  try {
    await writeManifest(tmpDir, "Decision Warning Test")
    const dataDir = path.join(tmpDir, "data")
    await fs.mkdir(dataDir, { recursive: true })
    // Write a decision log with two genesis records, which breaks the chain.
    await fs.writeFile(
      path.join(dataDir, "decisions.jsonl"),
      JSON.stringify({
        schema: "synth-decision-v1",
        id: "d1",
        type: "MISSION_APPROVAL_APPROVED",
        draftId: "DRAFT-WARN-1",
        previousHash: "genesis",
        timestamp: Date.now(),
      }) +
        "\n" +
        JSON.stringify({
          schema: "synth-decision-v1",
          id: "d2",
          type: "MISSION_APPROVAL_REJECTED",
          draftId: "DRAFT-WARN-2",
          previousHash: "genesis",
          timestamp: Date.now() + 1,
        }) +
        "\n",
    )

    const { stdout, status } = runSynth(["explain", "resume"], tmpDir)
    assert(status === 0, "explain resume should exit 0 even with broken decision log")
    const output = parseJson(stdout)
    assert(
      output.warnings.some((w) => w.kind === "decision-chain-broken"),
      "should warn about broken decision chain",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] broken decision log emits continuity warning")
}

// ------------------------------------------------------------
async function main() {
  await testUninitialized()
  await testInitializedNoMission()
  await testApprovedMission()
  await testExecutingExpedition()
  await testDeterminism()
  await testBrokenDecisionLogWarning()
  console.log("\nAll resume briefing tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
