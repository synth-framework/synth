// ============================================================
// SYNTH Governance Lifecycle Contract Certification
// ============================================================
// Verifies that public CLI lifecycle transitions emit the events
// required by the governance contract and that replay reconstructs
// the expected statuses.
//
// This test uses only public CLI commands and documented artifacts.
// It does not depend on runtime internals.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
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
    throw new Error(`Failed to parse CLI output as JSON:\n${stdout}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function readEventLog(projectDir) {
  const eventLogPath = path.join(projectDir, ".synth", "data", "event-log.jsonl")
  const content = await fs.readFile(eventLogPath, "utf-8")
  return content
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line))
}

async function setupProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-governance-contract-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function approveMission(projectDir, subject, purpose) {
  let createResult = runSynth(["mission", "create", "--subject", subject, "--purpose", purpose], projectDir)
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  let createOutput = parseJson(createResult.stdout)
  assert(createOutput.kind === "MissionDraft", `mission create should return MissionDraft, got ${createOutput.kind}`)
  let draftId = createOutput.draftId

  // Add enough evidence to clear the approval confidence threshold (0.7).
  let evidenceIndex = 0
  while (createOutput.confidence.overall < 0.72) {
    evidenceIndex += 1
    const evidenceResult = runSynth(
      ["mission", "evidence", "add", "--draft-id", draftId, "--subject", `Contract evidence ${evidenceIndex}`, "--purpose", "Governance contract certification", "--confidence", "high"],
      projectDir,
    )
    assert(evidenceResult.status === 0, `mission evidence add must exit 0. stdout:\n${evidenceResult.stdout}\nstderr:\n${evidenceResult.stderr}`)
    createOutput = parseJson(evidenceResult.stdout)
    draftId = createOutput.draftId
  }

  // Phase 2 governance: Mission approval requires an aligned Alignment Contract.
  // The CLI operator workflow for creating this contract is not yet implemented,
  // so tests construct it directly through the governance capabilities.
  const dataDir = path.join(projectDir, ".synth", "data")
  const gateCtx = await bootstrap({
    skipGenesis: true,
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
    },
  })
  const { contractId } = await createAlignedContract(gateCtx)

  const approveResult = runSynth(
    ["mission", "approve", "--draft-id", draftId, "--alignment-contract-id", contractId],
    projectDir,
  )
  assert(approveResult.status === 0, `mission approve must exit 0:\n${approveResult.stderr}`)
  const approveOutput = parseJson(approveResult.stdout)
  assert(approveOutput.kind === "MissionApprovalDecision", `mission approve should return MissionApprovalDecision, got ${approveOutput.kind}`)
  assert(approveOutput.decision.approved === true, `mission should be approved, got ${JSON.stringify(approveOutput.decision)}`)

  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId, got ${JSON.stringify(approveOutput.runtime)}`)
  return { draftId, missionId }
}

async function testMissionLifecycleEmitsRequiredEvents(projectDir) {
  await approveMission(projectDir, "Contract Mission", "Test governance contract")

  const events = await readEventLog(projectDir)
  const types = events.map((e) => e.type)

  assert(types.includes("MISSION_CREATED"), "MISSION_CREATED must be emitted when a mission is created")
  assert(types.includes("MISSION_APPROVED"), "MISSION_APPROVED must be emitted when a mission is approved")

  const missionCreated = events.find((e) => e.type === "MISSION_CREATED")
  assert(missionCreated.payload.mission, "MISSION_CREATED payload must include mission object")
  assert(missionCreated.payload.mission.id, "MISSION_CREATED payload.mission must include id")
  assert(missionCreated.payload.mission.name === "Contract Mission", "MISSION_CREATED payload.mission.name must match subject")
  assert(missionCreated.payload.mission.status === "draft", "MISSION_CREATED payload.mission.status must be draft")

  const missionApproved = events.find((e) => e.type === "MISSION_APPROVED")
  assert(missionApproved.payload.id === missionCreated.payload.mission.id, "MISSION_APPROVED payload.id must match MISSION_CREATED payload.mission.id")
  assert(missionApproved.payload.status === "active", "MISSION_APPROVED payload.status must be active")

  console.log("[PASS] Mission lifecycle emits required governance events")
}

async function testExpeditionLifecycleEmitsRequiredEvents(projectDir) {
  const { missionId } = await approveMission(projectDir, "Expedition Host Mission", "Host expedition contract test")

  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Contract Expedition", "--goal", "Test goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const createOutput = parseJson(createResult.stdout)
  assert(createOutput.kind === "ExpeditionDraft", `expedition create should return ExpeditionDraft, got ${createOutput.kind}`)
  const draftId = createOutput.draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)

  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)

  const evidencePath = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidencePath, "contract evidence", "utf-8")
  const completeResult = runSynth(["expedition", "complete", "--id", draftId, "--evidence", evidencePath], projectDir)
  assert(completeResult.status === 0, `expedition complete must exit 0:\n${completeResult.stderr}`)

  const events = await readEventLog(projectDir)
  const expeditionEvents = events.filter((e) => e.type.startsWith("EXPEDITION_"))
  const types = expeditionEvents.map((e) => e.type)

  assert(types.includes("EXPEDITION_CREATED"), "EXPEDITION_CREATED must be emitted when an expedition is created")
  assert(types.includes("EXPEDITION_APPROVED"), "EXPEDITION_APPROVED must be emitted when an expedition is approved")
  assert(types.includes("EXPEDITION_COMMITTED"), "EXPEDITION_COMMITTED must be emitted when an expedition is committed")
  assert(types.includes("EXPEDITION_STARTED"), "EXPEDITION_STARTED must be emitted when an expedition is started")
  assert(types.includes("EXPEDITION_COMPLETED"), "EXPEDITION_COMPLETED must be emitted when an expedition is completed")

  const expeditionCreated = expeditionEvents.find((e) => e.type === "EXPEDITION_CREATED")
  assert(expeditionCreated.payload.expedition, "EXPEDITION_CREATED payload must include expedition object")
  assert(expeditionCreated.payload.expedition.id, "EXPEDITION_CREATED payload.expedition must include id")
  assert(expeditionCreated.payload.expedition.name === "Contract Expedition", "EXPEDITION_CREATED payload.expedition.name must match subject")

  const expeditionIds = expeditionEvents.filter((e) => e.type !== "EXPEDITION_CREATED").map((e) => e.payload.id)
  assert(expeditionIds.every((id) => id === draftId), "All expedition transition events must reference the same draft id")

  const statuses = {
    EXPEDITION_APPROVED: "approved",
    EXPEDITION_COMMITTED: "committed",
    EXPEDITION_STARTED: "executing",
    EXPEDITION_COMPLETED: "completed",
  }
  for (const [eventType, expectedStatus] of Object.entries(statuses)) {
    const event = expeditionEvents.find((e) => e.type === eventType)
    assert(event.payload.status === expectedStatus, `${eventType} payload.status must be ${expectedStatus}`)
  }

  console.log("[PASS] Expedition lifecycle emits required governance events")
}

async function testReplayReconstructsGovernanceStatuses(projectDir) {
  const explainResult = runSynth(["explain", "replay"], projectDir)
  assert(explainResult.status === 0, `explain replay must exit 0:\n${explainResult.stderr}`)
  const explainOutput = parseJson(explainResult.stdout)
  assert(explainOutput.status === "ok" || explainOutput.valid === true, `replay must be valid, got ${JSON.stringify(explainOutput)}`)

  console.log("[PASS] Replay reconstructs governance statuses without divergence")
}

async function main() {
  console.log("Running governance lifecycle contract certification...")
  const projectDir = await setupProject()
  try {
    await testMissionLifecycleEmitsRequiredEvents(projectDir)
    await testExpeditionLifecycleEmitsRequiredEvents(projectDir)
    await testReplayReconstructsGovernanceStatuses(projectDir)
    console.log("\nAll governance lifecycle contract certification tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
