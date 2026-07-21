// ============================================================
// SYNTH Expedition Lifecycle Tests
// ============================================================
// Verifies the Runtime Transition Contract:
// Draft → Approved → Committed → Executing → Completed
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

async function setupProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-expedition-lifecycle-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  // Bootstrap the project so expedition runtime entities can be created.
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Test Mission", "--purpose", "Test purpose"],
    projectDir,
  )
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  const draftId1 = parseJson(createResult.stdout).draftId

  const evidenceResult = runSynth(
    [
      "mission",
      "evidence",
      "add",
      "--draft-id",
      draftId1,
      "--subject",
      "Supporting evidence",
      "--purpose",
      "Raises confidence above approval threshold",
      "--confidence",
      "certain",
    ],
    projectDir,
  )
  assert(evidenceResult.status === 0, `mission evidence add must exit 0:\n${evidenceResult.stderr}`)
  const draftId2 = parseJson(evidenceResult.stdout).draftId

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
    ["mission", "approve", "--draft-id", draftId2, "--alignment-contract-id", contractId],
    projectDir,
  )
  assert(approveResult.status === 0, `mission approve must exit 0:\n${approveResult.stderr}`)
  const approveOutput = parseJson(approveResult.stdout)
  assert(approveOutput.kind === "MissionApprovalDecision", `mission approve should return MissionApprovalDecision, got ${approveOutput.kind}`)
  assert(approveOutput.decision?.approved === true, `mission should be approved, got ${JSON.stringify(approveOutput.decision)}`)
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId, got ${JSON.stringify(approveOutput.runtime)}`)
  return missionId
}

async function testLifecycleTransitions(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Test Expedition", "--goal", "Test goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const createOutput = parseJson(createResult.stdout)
  assert(createOutput.kind === "ExpeditionDraft", `expedition create should return ExpeditionDraft, got ${createOutput.kind}`)
  assert(createOutput.draftId, "expedition create should return a draftId")
  const draftId = createOutput.draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)
  const approveOutput = parseJson(approveResult.stdout)
  assert(approveOutput.kind === "ExpeditionApproved", `expedition approve should return ExpeditionApproved, got ${approveOutput.kind}`)
  assert(approveOutput.result.status === "approved", `expedition should be approved, got ${approveOutput.result.status}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)
  const commitOutput = parseJson(commitResult.stdout)
  assert(commitOutput.kind === "ExpeditionCommitted", `expedition commit should return ExpeditionCommitted, got ${commitOutput.kind}`)
  assert(commitOutput.result.status === "committed", `expedition should be committed, got ${commitOutput.result.status}`)

  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.kind === "ExpeditionStarted", `expedition start should return ExpeditionStarted, got ${startOutput.kind}`)
  assert(startOutput.result.status === "executing", `expedition should be executing, got ${startOutput.result.status}`)

  const completeResult = runSynth(["expedition", "complete", "--id", draftId, "--evidence", "/tmp/evidence.txt"], projectDir)
  assert(completeResult.status === 0, `expedition complete must exit 0:\n${completeResult.stderr}`)
  const completeOutput = parseJson(completeResult.stdout)
  assert(completeOutput.kind === "ExpeditionCompleted", `expedition complete should return ExpeditionCompleted, got ${completeOutput.kind}`)
  assert(completeOutput.result.status === "completed", `expedition should be completed, got ${completeOutput.result.status}`)

  console.log("[PASS] Draft → Approved → Committed → Executing → Completed lifecycle transitions work")
}

async function testMissingMissionRejection(projectDir) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", "nonexistent-mission", "--subject", "Orphan Expedition", "--goal", "g"],
    projectDir,
  )
  assert(createResult.status !== 0, "expedition create should fail when mission does not exist")
  const createOutput = parseJson(createResult.stdout)
  assert(createOutput.status === "error", "missing-mission failure should report error status")
  assert(createOutput.error.includes("mission_exists"), "missing-mission failure should reference the mission_exists precondition")

  console.log("[PASS] Expedition create rejects a missing mission")
}

async function testInvalidTransitions(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Invalid Expedition", "--goal", "Invalid goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  // Cannot start before commit.
  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status !== 0, "expedition start should fail before commit")
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.status === "error", "start failure should report error status")
  assert(startOutput.reason.includes("committed"), "start failure should explain that only committed expeditions can be started")
  assert(startOutput.requiredAction.includes("commit"), "start failure should suggest committing first")

  // Approve and commit, then try to approve again.
  runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)

  const reapproveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(reapproveResult.status !== 0, "expedition approve should fail when not draft")
  const reapproveOutput = parseJson(reapproveResult.stdout)
  assert(reapproveOutput.status === "error", "re-approve failure should report error status")
  assert(reapproveOutput.reason.includes("draft"), "re-approve failure should explain draft requirement")

  // Start and complete, then try to start again.
  runSynth(["expedition", "start", "--id", draftId], projectDir)
  runSynth(["expedition", "complete", "--id", draftId], projectDir)

  const restartResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(restartResult.status !== 0, "expedition start should fail after completion")
  const restartOutput = parseJson(restartResult.stdout)
  assert(restartOutput.status === "error", "restart failure should report error status")
  assert(restartOutput.reason.includes("committed"), "restart failure should explain committed requirement")

  console.log("[PASS] Invalid lifecycle transitions emit clear errors")
}

async function testLegacyExpeditionIdFlag(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Legacy Expedition", "--goal", "Legacy goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)

  const startResult = runSynth(["expedition", "start", "--expedition-id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start with --expedition-id must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.kind === "ExpeditionStarted", `legacy --expedition-id start should work, got ${startOutput.kind}`)

  console.log("[PASS] Legacy --expedition-id flag remains supported")
}

async function main() {
  console.log("Running expedition lifecycle tests...")
  const projectDir = await setupProject()
  try {
    const missionId = await createAndApproveMission(projectDir)
    await testMissingMissionRejection(projectDir)
    await testLifecycleTransitions(projectDir, missionId)
    await testInvalidTransitions(projectDir, missionId)
    await testLegacyExpeditionIdFlag(projectDir, missionId)
    console.log("\nAll expedition lifecycle tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
