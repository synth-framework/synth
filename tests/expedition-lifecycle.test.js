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
  return { missionId, gateCtx, contractId }
}

async function certifyConvergence(gateCtx, missionId, expeditionId, contractId) {
  const result = await gateCtx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: {
        hasPersistentHeader: true,
        hasPersistentSidebar: true,
        hasScrollDrivenPhases: true,
      },
      ruleSetId: "program-027-homepage",
      artifacts: [
        {
          path: `synth://missions/${missionId}/expeditions/${expeditionId}/implementation`,
          hash: `test-${missionId}-${expeditionId}`,
          description: "Test implementation reference",
        },
      ],
      runtimeEvidence: [
        {
          source: `synth://missions/${missionId}/expeditions/${expeditionId}/runtime`,
          observation: "Runtime behavior observed",
          timestamp: 0,
        },
      ],
      executionEvidence: [
        {
          executionId: `test-execution-${expeditionId}`,
          result: "passed",
          outcome: "completed",
        },
      ],
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert(result.status === "ok", `CertifyConvergence must succeed: ${result.error}`)
  assert(result.result?.decision === "converged", `Convergence certification must converge, got ${result.result?.decision}`)
}

async function testLifecycleTransitions(projectDir, missionId, gateCtx, contractId) {
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

  await certifyConvergence(gateCtx, missionId, draftId, contractId)

  const evidenceFile = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidenceFile, "test evidence", "utf-8")
  const evidenceResult = runSynth(["expedition", "evidence", "--id", draftId, "--attach", evidenceFile], projectDir)
  assert(evidenceResult.status === 0, `expedition evidence must exit 0:\n${evidenceResult.stderr}`)

  const completeResult = runSynth(["expedition", "complete", "--id", draftId], projectDir)
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

async function testInvalidTransitions(projectDir, missionId, gateCtx, contractId) {
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
  assert(startOutput.error && startOutput.error.includes("committed"), `start failure should explain that only committed expeditions can be started, got ${JSON.stringify(startOutput)}`)
  assert(startOutput.requiredAction && startOutput.requiredAction.includes("commit"), `start failure should suggest committing first, got ${JSON.stringify(startOutput)}`)

  // Approve and commit, then try to approve again.
  runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)

  const reapproveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(reapproveResult.status !== 0, "expedition approve should fail when not draft")
  const reapproveOutput = parseJson(reapproveResult.stdout)
  assert(reapproveOutput.status === "error", "re-approve failure should report error status")
  assert(reapproveOutput.error && reapproveOutput.error.includes("draft"), `re-approve failure should explain draft requirement, got ${JSON.stringify(reapproveOutput)}`)

  // Start and complete, then try to start again.
  runSynth(["expedition", "start", "--id", draftId], projectDir)
  await certifyConvergence(gateCtx, missionId, draftId, contractId)

  const evidenceFile2 = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidenceFile2, "test evidence", "utf-8")
  runSynth(["expedition", "evidence", "--id", draftId, "--attach", evidenceFile2], projectDir)

  runSynth(["expedition", "complete", "--id", draftId], projectDir)

  const restartResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(restartResult.status !== 0, "expedition start should fail after completion")
  const restartOutput = parseJson(restartResult.stdout)
  assert(restartOutput.status === "error", "restart failure should report error status")
  assert(restartOutput.error && restartOutput.error.includes("committed"), `restart failure should explain committed requirement, got ${JSON.stringify(restartOutput)}`)

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

  // Clean up the executing expedition so subsequent mission planning is not blocked.
  const archiveResult = runSynth(["expedition", "archive", "--id", draftId, "--reason", "Test cleanup"], projectDir)
  assert(archiveResult.status === 0, `expedition archive cleanup must exit 0:\n${archiveResult.stderr}`)

  console.log("[PASS] Legacy --expedition-id flag remains supported")
}

async function createStartedExpedition(projectDir, missionId, subject) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", subject, "--goal", "Test goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)

  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.kind === "ExpeditionStarted", `expedition start should return ExpeditionStarted, got ${startOutput.kind}`)
  assert(startOutput.result.status === "executing", `expedition should be executing, got ${startOutput.result.status}`)

  return draftId
}

async function testArchiveSetsArchivedStatus(projectDir, missionId) {
  const draftId = await createStartedExpedition(projectDir, missionId, "Archive Test")

  const archiveResult = runSynth(["expedition", "archive", "--id", draftId, "--reason", "Testing archive semantics"], projectDir)
  assert(archiveResult.status === 0, `expedition archive must exit 0:\n${archiveResult.stderr}`)
  const archiveOutput = parseJson(archiveResult.stdout)
  assert(archiveOutput.kind === "ExpeditionArchived", `expedition archive should return ExpeditionArchived, got ${archiveOutput.kind}`)
  assert(archiveOutput.result.status === "archived", `expedition should be archived, got ${archiveOutput.result.status}`)

  console.log("[PASS] Archive sets expedition status to archived")
}

async function testStartFromArchivedAndPaused(projectDir, missionId) {
  const draftId = await createStartedExpedition(projectDir, missionId, "Resume Test")

  // Pause an executing expedition.
  const pauseResult = runSynth(["expedition", "pause", "--id", draftId], projectDir)
  assert(pauseResult.status === 0, `expedition pause must exit 0:\n${pauseResult.stderr}`)
  const pauseOutput = parseJson(pauseResult.stdout)
  assert(pauseOutput.kind === "ExpeditionPaused", `expedition pause should return ExpeditionPaused, got ${pauseOutput.kind}`)
  assert(pauseOutput.result.status === "paused", `expedition should be paused, got ${pauseOutput.result.status}`)

  // Start from paused.
  const resumeResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(resumeResult.status === 0, `expedition start from paused must exit 0:\n${resumeResult.stderr}`)
  const resumeOutput = parseJson(resumeResult.stdout)
  assert(resumeOutput.kind === "ExpeditionStarted", `expedition start from paused should return ExpeditionStarted, got ${resumeOutput.kind}`)
  assert(resumeOutput.result.status === "executing", `expedition should be executing after resume, got ${resumeOutput.result.status}`)

  // Archive and restart from archived.
  const archiveResult = runSynth(["expedition", "archive", "--id", draftId, "--reason", "Testing restart from archived"], projectDir)
  assert(archiveResult.status === 0, `expedition archive must exit 0:\n${archiveResult.stderr}`)

  const restartResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(restartResult.status === 0, `expedition start from archived must exit 0:\n${restartResult.stderr}`)
  const restartOutput = parseJson(restartResult.stdout)
  assert(restartOutput.kind === "ExpeditionStarted", `expedition start from archived should return ExpeditionStarted, got ${restartOutput.kind}`)
  assert(restartOutput.result.status === "executing", `expedition should be executing after restart from archived, got ${restartOutput.result.status}`)

  // Clean up the executing expedition so subsequent mission planning is not blocked.
  const cleanupArchiveResult = runSynth(["expedition", "archive", "--id", draftId, "--reason", "Test cleanup"], projectDir)
  assert(cleanupArchiveResult.status === 0, `expedition archive cleanup must exit 0:\n${cleanupArchiveResult.stderr}`)

  console.log("[PASS] Start works from paused and archived statuses")
}

async function testPauseRequiresExecuting(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Pause Invalid Test", "--goal", "Test goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  const pauseResult = runSynth(["expedition", "pause", "--id", draftId], projectDir)
  assert(pauseResult.status !== 0, "expedition pause should fail when not executing")
  const pauseOutput = parseJson(pauseResult.stdout)
  assert(pauseOutput.status === "error", "pause failure should report error status")
  assert(pauseOutput.error && pauseOutput.error.includes("executing"), `pause failure should explain executing requirement, got ${JSON.stringify(pauseOutput)}`)

  console.log("[PASS] Pause is rejected for non-executing expeditions")
}

async function testCancelSetsCancelledStatus(projectDir, missionId) {
  const draftId = await createStartedExpedition(projectDir, missionId, "Cancel Test")

  const cancelResult = runSynth(["expedition", "cancel", "--id", draftId, "--reason", "Testing cancel semantics"], projectDir)
  assert(cancelResult.status === 0, `expedition cancel must exit 0:\n${cancelResult.stderr}`)
  const cancelOutput = parseJson(cancelResult.stdout)
  assert(cancelOutput.kind === "ExpeditionCancelled", `expedition cancel should return ExpeditionCancelled, got ${cancelOutput.kind}`)
  assert(cancelOutput.result.status === "cancelled", `expedition should be cancelled, got ${cancelOutput.result.status}`)

  console.log("[PASS] Cancel sets expedition status to cancelled")
}

async function testStartFromCancelled(projectDir, missionId) {
  const draftId = await createStartedExpedition(projectDir, missionId, "Restart From Cancelled")

  const cancelResult = runSynth(["expedition", "cancel", "--id", draftId, "--reason", "Testing restart from cancelled"], projectDir)
  assert(cancelResult.status === 0, `expedition cancel must exit 0:\n${cancelResult.stderr}`)

  const restartResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(restartResult.status === 0, `expedition start from cancelled must exit 0:\n${restartResult.stderr}`)
  const restartOutput = parseJson(restartResult.stdout)
  assert(restartOutput.kind === "ExpeditionStarted", `expedition start from cancelled should return ExpeditionStarted, got ${restartOutput.kind}`)
  assert(restartOutput.result.status === "executing", `expedition should be executing after restart from cancelled, got ${restartOutput.result.status}`)

  // Clean up the executing expedition so subsequent mission planning is not blocked.
  const cleanupArchiveResult = runSynth(["expedition", "archive", "--id", draftId, "--reason", "Test cleanup"], projectDir)
  assert(cleanupArchiveResult.status === 0, `expedition archive cleanup must exit 0:\n${cleanupArchiveResult.stderr}`)

  console.log("[PASS] Start works from cancelled status")
}

async function testCliErrorLog(projectDir) {
  // Trigger a deterministic CLI validation error and verify it is appended
  // to the local structured error log.
  const badResult = runSynth(["expedition", "cancel"], projectDir)
  assert(badResult.status !== 0, "expedition cancel without --id should fail")

  const errorLogPath = path.join(projectDir, ".synth", "data", "cli-errors.jsonl")
  const logContent = await fs.readFile(errorLogPath, "utf-8")
  const lines = logContent.trim().split("\n").filter(Boolean)
  assert(lines.length > 0, `cli-errors.jsonl should contain at least one error entry, got: ${logContent}`)
  const lastEntry = JSON.parse(lines[lines.length - 1])
  assert(lastEntry.kind === "CLIError" || lastEntry.error?.includes("--id is required"), `last log entry should record the missing --id error, got ${JSON.stringify(lastEntry)}`)
  assert(typeof lastEntry.timestamp === "string", `log entry should include an ISO timestamp, got ${JSON.stringify(lastEntry)}`)

  console.log("[PASS] CLI errors are appended to structured local error log")
}

async function testRefineCommand(projectDir, missionId, gateCtx, contractId) {
  const draftId = await createStartedExpedition(projectDir, missionId, "Refine Test")

  const refineResult = runSynth(
    ["expedition", "refine", "--id", draftId, "--note", "Narrowed scope to repository adapter contract"],
    projectDir,
  )
  assert(refineResult.status === 0, `expedition refine must exit 0:\n${refineResult.stderr}`)
  const refineOutput = parseJson(refineResult.stdout)
  assert(refineOutput.kind === "ExpeditionRefined", `expedition refine should return ExpeditionRefined, got ${refineOutput.kind}`)
  assert(refineOutput.note === "Narrowed scope to repository adapter contract", `refine note should match, got ${refineOutput.note}`)
  assert(typeof refineOutput.refinementId === "string" && refineOutput.refinementId.length > 0, `refinementId should be a non-empty string, got ${refineOutput.refinementId}`)
  assert(refineOutput.result.status === "executing", `refine should keep expedition executing, got ${refineOutput.result.status}`)
  assert(
    refineOutput.result.metadata.refinementNote === "Narrowed scope to repository adapter contract",
    `metadata should record refinement note, got ${JSON.stringify(refineOutput.result.metadata)}`,
  )

  // Refining a completed expedition should fail.
  await certifyConvergence(gateCtx, missionId, draftId, contractId)
  const evidenceFile = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidenceFile, "test evidence", "utf-8")
  runSynth(["expedition", "evidence", "--id", draftId, "--attach", evidenceFile], projectDir)
  runSynth(["expedition", "complete", "--id", draftId], projectDir)

  const refineAfterCompleteResult = runSynth(
    ["expedition", "refine", "--id", draftId, "--note", "Should fail"],
    projectDir,
  )
  assert(refineAfterCompleteResult.status !== 0, "expedition refine should fail after completion")
  const refineAfterCompleteOutput = parseJson(refineAfterCompleteResult.stdout)
  assert(refineAfterCompleteOutput.status === "error", "refine after completion should report error status")
  assert(refineAfterCompleteOutput.error && refineAfterCompleteOutput.error.includes("terminal"), `refine failure should explain terminal requirement, got ${JSON.stringify(refineAfterCompleteOutput)}`)

  console.log("[PASS] Refine records charter note without changing status, and is rejected for terminal expeditions")
}

async function testCreateWhileAnotherExecuting(projectDir, missionId) {
  const executingId = await createStartedExpedition(projectDir, missionId, "Executing Expedition")

  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Queued Expedition", "--goal", "Test goal"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0 while another expedition is executing:\n${createResult.stderr}`)
  const createOutput = parseJson(createResult.stdout)
  assert(createOutput.kind === "ExpeditionDraft", `expedition create should return ExpeditionDraft, got ${createOutput.kind}`)
  const queuedId = createOutput.draftId

  // Starting the queued expedition should be blocked while the first is executing.
  runSynth(["expedition", "approve", "--draft-id", queuedId], projectDir)
  runSynth(["expedition", "commit", "--proposal-id", queuedId], projectDir)

  const startResult = runSynth(["expedition", "start", "--id", queuedId], projectDir)
  assert(startResult.status !== 0, "expedition start should fail while another is executing")
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.status === "error", "start failure should report error status")
  assert(startOutput.error && startOutput.error.includes(executingId), `start failure should name the executing expedition, got ${JSON.stringify(startOutput)}`)

  // Clean up the executing expedition so subsequent mission planning is not blocked.
  const archiveResult = runSynth(["expedition", "archive", "--id", executingId, "--reason", "Test cleanup"], projectDir)
  assert(archiveResult.status === 0, `expedition archive cleanup must exit 0:\n${archiveResult.stderr}`)

  console.log("[PASS] Expedition create is allowed while another is executing; starting a second is still blocked")
}

async function main() {
  console.log("Running expedition lifecycle tests...")
  const projectDir = await setupProject()
  try {
    const { missionId, gateCtx, contractId } = await createAndApproveMission(projectDir)
    await testMissingMissionRejection(projectDir)
    await testLifecycleTransitions(projectDir, missionId, gateCtx, contractId)
    // Convergence certification auto-chains mission completion, so the remaining
    // transition tests need fresh active missions.
    const { missionId: missionId2, gateCtx: gateCtx2, contractId: contractId2 } = await createAndApproveMission(projectDir)
    await testInvalidTransitions(projectDir, missionId2, gateCtx2, contractId2)
    const { missionId: missionId3 } = await createAndApproveMission(projectDir)
    await testLegacyExpeditionIdFlag(projectDir, missionId3)
    const { missionId: missionId4 } = await createAndApproveMission(projectDir)
    await testArchiveSetsArchivedStatus(projectDir, missionId4)
    const { missionId: missionId5 } = await createAndApproveMission(projectDir)
    await testStartFromArchivedAndPaused(projectDir, missionId5)
    const { missionId: missionId6 } = await createAndApproveMission(projectDir)
    await testPauseRequiresExecuting(projectDir, missionId6)
    const { missionId: missionId7 } = await createAndApproveMission(projectDir)
    await testCreateWhileAnotherExecuting(projectDir, missionId7)
    const { missionId: missionId8 } = await createAndApproveMission(projectDir)
    await testCancelSetsCancelledStatus(projectDir, missionId8)
    const { missionId: missionId9 } = await createAndApproveMission(projectDir)
    await testStartFromCancelled(projectDir, missionId9)
    const { missionId: missionId10, gateCtx: gateCtx10, contractId: contractId10 } = await createAndApproveMission(projectDir)
    await testRefineCommand(projectDir, missionId10, gateCtx10, contractId10)
    await testCliErrorLog(projectDir)
    console.log("\nAll expedition lifecycle tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
