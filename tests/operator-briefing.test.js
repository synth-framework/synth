// ============================================================
// Operator Briefing Tests
// ============================================================
// Regression guards for EXP-DISC-001: `synth status` returns an
// OperatorBriefing derived from replayable evidence.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")

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

async function writeManifest(dir, projectName = "Operator Briefing Test") {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.0.0",
    projectName,
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [{ name: "status", description: "Report state" }],
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-status-uninit-"))
  try {
    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0 in uninitialized dir")
    const output = parseJson(stdout)
    assert(output.status === "ok", "status should be ok")
    assert(output.kind === "OperatorBriefing", "output kind should be OperatorBriefing")
    assert(output.phase === "uninitialized", `phase should be uninitialized, got ${output.phase}`)
    assert(output.summary.includes("No SYNTH project"), `summary should mention no project: ${output.summary}`)
    assert(output.nextActions.length >= 1, "should have a next action")
    assert(output.nextActions[0].command.includes("synth init"), "first action should be init")
    assert(output.nextActions[0].priority === 1, "init action should be priority 1")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] uninitialized directory reports phase uninitialized")
}

// ------------------------------------------------------------
// Fixture: initialized, no mission yet
// ------------------------------------------------------------
async function testInitializedNoMission() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-status-init-"))
  try {
    const initResult = runSynth(["init", "--name", "Briefing Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "OperatorBriefing", "output kind should be OperatorBriefing")
    assert(output.phase === "initialized", `phase should be initialized, got ${output.phase}`)
    assert(output.blockers.some((b) => b.kind === "no-mission"), "should report no-mission blocker")
    assert(output.nextActions.some((a) => a.command.includes("synth mission create")), "should suggest creating a mission")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] initialized project without mission reports initialized + create-mission action")
}

// ------------------------------------------------------------
// Fixture: mission draft below approval threshold
// ------------------------------------------------------------
async function testPlanningDraftBelowThreshold() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-status-planning-"))
  try {
    runSynth(["init", "--name", "Planning Test"], tmpDir)
    const createResult = runSynth(
      ["mission", "create", "--subject", "Status Briefing Mission", "--purpose", "Test planning phase"],
      tmpDir,
    )
    assert(createResult.status === 0, "mission create should succeed")
    const draft = parseJson(createResult.stdout)
    assert(draft.kind === "MissionDraft", "should produce a MissionDraft")

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    const output = parseJson(stdout)
    assert(output.phase === "planning", `phase should be planning, got ${output.phase}`)
    assert(output.missions.length === 0, "draft missions should not yet appear in canonical state")
    assert(output.blockers.some((b) => b.kind === "low-confidence"), "should report low-confidence blocker")
    const evidenceAction = output.nextActions.find((a) => a.command.includes("synth mission evidence add"))
    assert(evidenceAction, "should suggest adding evidence")
    assert(evidenceAction.priority === 1, "evidence add should be priority 1")
    assert(evidenceAction.command.includes(`--draft-id ${draft.draftId}`), "action should reference the draft id")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] draft below threshold reports planning + evidence-add action")
}

// ------------------------------------------------------------
// Fixture: approved mission, no expeditions (seeded event log)
// ------------------------------------------------------------
async function testApprovedNoExpeditions() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-status-approved-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-STATUS-1"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Approved Test", systemId: "status-test", partitions: 1 },
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

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    const output = parseJson(stdout)
    assert(output.phase === "approved", `phase should be approved, got ${output.phase}`)
    assert(output.missions.some((m) => m.id === missionId && m.status === "active"), "should list active mission")
    assert(output.activeExpeditions.length === 0, "should have no active expeditions")
    assert(output.nextActions.some((a) => a.command.includes("synth expedition create")), "should suggest creating expedition")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] approved mission with no expeditions reports approved + create-expedition action")
}

// ------------------------------------------------------------
// Fixture: executing expedition (seeded event log)
// ------------------------------------------------------------
async function testExecuting() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-status-executing-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-STATUS-2"
    const expeditionId = "E-STATUS-2"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Executing Test", systemId: "status-test", partitions: 1 },
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

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    const output = parseJson(stdout)
    assert(output.phase === "executing", `phase should be executing, got ${output.phase}`)
    assert(output.activeExpeditions.some((e) => e.id === expeditionId && e.status === "executing"), "should list executing expedition")
    assert(output.nextActions.some((a) => a.command.includes("synth explain status")), "should suggest explain status")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] executing expedition reports executing + explain actions")
}

// ------------------------------------------------------------
// Fixture: blocked work item (seeded event log)
// ------------------------------------------------------------
async function testBlocked() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-status-blocked-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-STATUS-3"
    const expeditionId = "E-STATUS-3"
    const workItemId = "W-STATUS-3"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Blocked Test", systemId: "status-test", partitions: 1 },
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
            name: "Blocked Mission",
            purpose: "Test blocked phase",
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
      {
        id: "E-EXP-3",
        type: "EXPEDITION_CREATED",
        timestamp: now + 3,
        transactionId: "tx-3",
        capability: "CreateExpedition",
        actor: "system",
        payload: {
          expedition: {
            id: expeditionId,
            missionId,
            name: "Blocked Expedition",
            goal: "Test blocker",
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
        id: "E-WI-3",
        type: "WORK_ITEM_CREATED",
        timestamp: now + 4,
        transactionId: "tx-4",
        capability: "CreateWorkItem",
        actor: "system",
        payload: {
          workItem: {
            id: workItemId,
            name: "Blocked Work",
            status: "blocked",
            dependencies: [],
            metadata: {},
            createdAt: now + 4,
            updatedAt: now + 4,
          },
        },
      },
    ])

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0")
    const output = parseJson(stdout)
    assert(output.phase === "blocked", `phase should be blocked, got ${output.phase}`)
    assert(output.blockers.some((b) => b.kind === "blocked-work-item"), "should report blocked-work-item blocker")
    assert(output.nextActions[0].command.includes("synth explain diagnostics"), "first action should be diagnostics")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] blocked work item reports blocked + diagnostics action")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testUninitialized()
  await testInitializedNoMission()
  await testPlanningDraftBelowThreshold()
  await testApprovedNoExpeditions()
  await testExecuting()
  await testBlocked()

  console.log("\n[OPERATOR BRIEFING] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
