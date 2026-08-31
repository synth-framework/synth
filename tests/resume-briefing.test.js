import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// Resume Briefing Tests
// ============================================================
// Regression guards for EXP-CONT-001: `synth explain resume` returns a
// ResumeBriefing derived from replayable evidence.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { seedEventLog } from "./helpers/seed-event-log.js"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import { makeTestDir, makeManifest, makeEventLog } from "./helpers/test-fixtures.js"
import { makeApprovedMissionEvents, makeExecutingExpeditionEvents, makeBrokenDecisionRecords } from "./helpers/event-fixtures.js"

const DECISION_LOG_MODULE_PATH = path.resolve(process.cwd(), "dist", "mission-studio", "decision-log.js")

async function appendDecision(dataDir, input) {
  const mod = await import(DECISION_LOG_MODULE_PATH)
  return mod.appendDecision(dataDir, input)
}

// ------------------------------------------------------------
// Fixture: uninitialized directory
// ------------------------------------------------------------
async function testUninitialized() {
  const tmpDir = await makeTempDir("synth-resume-uninit-")
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
  const tmpDir = await makeTempDir("synth-resume-init-")
  try {
    const initResult = runSynth(["init", "--name", "Resume Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, status } = runSynth(["explain", "resume"], tmpDir)
    assert(status === 0, "explain resume should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "ResumeBriefing", "output kind should be ResumeBriefing")
    assert(output.context.phase === "initialized", `phase should be initialized, got ${output.context.phase}`)
    assert(output.whatIsNext.some((a) => a.command.includes("synth mission create")), "should suggest creating a mission")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] initialized project without mission reports initialized + create-mission action")
}

// ------------------------------------------------------------
// Fixture: approved mission with decision log
// ------------------------------------------------------------
async function testApprovedMission() {
  const tmpDir = await makeTempDir("synth-resume-approved-")
  try {
    await makeManifest(tmpDir, { projectName: "Approved Test" })
    const missionId = "M-RESUME-1"
    await makeEventLog(tmpDir, makeApprovedMissionEvents({ systemId: "resume-test", missionId }))

    const dataDir = path.join(tmpDir, ".synth", "data")
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
  const tmpDir = await makeTempDir("synth-resume-executing-")
  try {
    await makeManifest(tmpDir, { projectName: "Executing Test" })
    const missionId = "M-RESUME-2"
    const expeditionId = "E-RESUME-2"
    await makeEventLog(tmpDir, makeExecutingExpeditionEvents({ systemId: "resume-test", missionId, expeditionId }))

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
  const tmpDir = await makeTempDir("synth-resume-determinism-")
  try {
    await makeManifest(tmpDir, { projectName: "Determinism Test" })
    const missionId = "M-RESUME-3"
    await makeEventLog(tmpDir, makeApprovedMissionEvents({ systemId: "resume-test", missionId }))

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

async function testBrokenDecisionLogWarning() {
  const tmpDir = await makeTempDir("synth-resume-decision-warning-")
  try {
    await makeManifest(tmpDir, { projectName: "Decision Warning Test" })
    const dataDir = path.join(tmpDir, ".synth", "data")
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(path.join(dataDir, "decisions.jsonl"), makeBrokenDecisionRecords())

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