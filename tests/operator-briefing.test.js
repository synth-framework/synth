import { makeTempDir } from "./helpers/workspace.js"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import fs from "fs/promises"
import path from "path"

const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")

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
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), events.map(e => JSON.stringify(e)).join("\n"), "utf-8")
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

async function testUninitialized() {
  const tmpDir = await makeTempDir("synth-status-uninit-")
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

async function testInitializedNoMission() {
  const tmpDir = await makeTempDir("synth-status-init-")
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

async function testPlanningDraftBelowThreshold() {
  const tmpDir = await makeTempDir("synth-status-planning-")
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
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] draft below threshold reports planning + evidence-add action")
}

async function testApprovedNoExpeditions() {
  const tmpDir = await makeTempDir("synth-status-approved-")
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

async function testExecuting() {
  const tmpDir = await makeTempDir("synth-status-executing-")
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
    assert(
      output.nextActions.some((e) => e.command.includes("synth explain status")),
      "should suggest explain status",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] executing expedition reports execution and next status check")
}

async function testDeterminism() {
  const tmpDir = await makeTempDir("synth-status-determinism-")
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-STATUS-3"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Determinism Test", systemId: "status-test", partitions: 1 },
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

    const first = parseJson(runSynth(["status"], tmpDir).stdout)
    const second = parseJson(runSynth(["status"], tmpDir).stdout)
    assert(first.eventCount === second.eventCount, "event counts should match")
    assert(first.status === second.status, "status should be deterministic")
    assert(first.phase === second.phase, "phase should be deterministic")
    assert(JSON.stringify(first.nextActions) === JSON.stringify(second.nextActions), "nextActions should be identical")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] resume briefing is deterministic across repeated invocations")
}

async function testBrokenDecisionLogWarning() {
  const tmpDir = await makeTempDir("synth-status-decision-warning-")
  try {
    await writeManifest(tmpDir, "Decision Warning Test")
    const dataDir = path.join(tmpDir, ".synth", "data")
    await fs.mkdir(dataDir, { recursive: true })
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

    const { stdout, status } = runSynth(["status"], tmpDir)
    assert(status === 0, "status should exit 0 even with broken decision log")
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

async function main() {
  await testUninitialized()
  await testInitializedNoMission()
  await testPlanningDraftBelowThreshold()
  await testApprovedNoExpeditions()
  await testExecuting()
  await testDeterminism()
  await testBrokenDecisionLogWarning()
  console.log("\nAll operator briefing tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})