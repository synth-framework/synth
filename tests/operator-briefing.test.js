import { makeTempDir } from "./helpers/workspace.js"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import { makeManifest, makeEventLog } from "./helpers/test-fixtures.js"
import { makeApprovedMissionEvents, makeExecutingExpeditionEvents, makeBrokenDecisionRecords } from "./helpers/event-fixtures.js"
import fs from "fs/promises"
import path from "path"

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
    await makeManifest(tmpDir)
    const missionId = "M-STATUS-1"
    await makeEventLog(tmpDir, makeApprovedMissionEvents({ systemId: "status-test", missionId }))

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
    await makeManifest(tmpDir)
    const missionId = "M-STATUS-2"
    const expeditionId = "E-STATUS-2"
    await makeEventLog(tmpDir, makeExecutingExpeditionEvents({ systemId: "status-test", missionId, expeditionId }))

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
    await makeManifest(tmpDir)
    const missionId = "M-STATUS-3"
    await makeEventLog(tmpDir, makeApprovedMissionEvents({ systemId: "status-test", missionId }))

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
    await makeManifest(tmpDir, { projectName: "Decision Warning Test" })
    const dataDir = path.join(tmpDir, ".synth", "data")
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(path.join(dataDir, "decisions.jsonl"), makeBrokenDecisionRecords())

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