// ============================================================
// EXP-AUTO-COMMIT-001 — Auto-commit derived SYNTH state
// ============================================================
// Verifies that lifecycle transitions automatically commit derived
// SYNTH state (.synth/data/, proof/expeditions/) and that derived
// state changes no longer block expedition completion.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd, env = {}) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
    env: { ...process.env, ...env },
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-auto-commit-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")

  runGit(["init"], tmpDir)
  runGit(["config", "user.email", "test@synth.local"], tmpDir)
  runGit(["config", "user.name", "Test Operator"], tmpDir)
  runGit(["add", "package.json"], tmpDir)
  runGit(["commit", "-m", "initial"], tmpDir)

  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)

  // Derived state is tracked in this test project so auto-commit can operate.
  runGit(["add", "-A"], tmpDir)
  runGit(["commit", "-m", "bootstrap"], tmpDir)

  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Auto-commit Test Mission", "--purpose", "Test derived state auto-commit"],
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
  assert(approveOutput.decision?.approved === true, `mission should be approved`)
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId`)
  return { missionId, contractId }
}

async function createExecutingExpedition(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Auto-commit Expedition", "--goal", "Test auto-commit"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)

  return draftId
}

async function testStartAutoCommitsDerivedState(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)

  // Leave derived state dirty by not committing after commit/approve.
  const startResult = runSynth(["expedition", "start", "--id", expeditionId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.kind === "ExpeditionStarted", `expedition start should return ExpeditionStarted, got ${startOutput.kind}`)
  assert(startOutput.autoCommit?.committed === true, `start should auto-commit derived state: ${JSON.stringify(startOutput.autoCommit)}`)
  assert(startOutput.autoCommit?.message?.includes("expedition-start"), `commit message should mention expedition-start`)

  const log = runGit(["log", "--oneline", "-1"], projectDir)
  assert(log.includes("chore(synth)"), `latest commit should be chore(synth): ${log}`)

  console.log("[PASS] expedition start auto-commits derived SYNTH state")
  return expeditionId
}

async function testEvidenceAutoCommitsProof(projectDir, expeditionId) {
  const evidenceFile = path.join(projectDir, "artifact.txt")
  await fs.writeFile(evidenceFile, "test evidence", "utf-8")

  const evidenceResult = runSynth(["expedition", "evidence", "--id", expeditionId, "--attach", evidenceFile], projectDir)
  assert(evidenceResult.status === 0, `expedition evidence must exit 0:\n${evidenceResult.stderr}`)
  const evidenceOutput = parseJson(evidenceResult.stdout)
  assert(evidenceOutput.kind === "EvidenceAttached", `evidence should attach, got ${evidenceOutput.kind}`)
  assert(evidenceOutput.autoCommit?.committed === true, `evidence should auto-commit proof artifacts: ${JSON.stringify(evidenceOutput.autoCommit)}`)
  assert(evidenceOutput.autoCommit?.files?.some((f) => f.startsWith("proof/expeditions/")), `auto-commit should include proof files`)

  // Remove the original attachment so it does not pollute later dirty checks.
  await fs.rm(evidenceFile, { force: true })

  console.log("[PASS] expedition evidence auto-commits proof artifacts")
}

async function testCompleteDoesNotBlockOnDerivedState(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)

  const startResult = runSynth(["expedition", "start", "--id", expeditionId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)

  // Attach evidence and certify so completion gates pass.
  const evidenceFile = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidenceFile, "evidence", "utf-8")
  const evidenceResult = runSynth(["expedition", "evidence", "--id", expeditionId, "--attach", evidenceFile], projectDir)
  assert(evidenceResult.status === 0, `evidence attach must exit 0:\n${evidenceResult.stderr}`)
  await fs.rm(evidenceFile, { force: true })

  const certifyResult = await gateCtx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: { hasFeature: true },
      ruleSetId: "program-027-homepage",
      artifacts: [{ path: `synth://missions/${missionId}/expeditions/${expeditionId}/implementation`, hash: "test", description: "Test" }],
      runtimeEvidence: [{ source: "test", observation: "ok", timestamp: 0 }],
      executionEvidence: [{ executionId: "test", result: "passed", outcome: "completed" }],
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert(certifyResult.status === "ok", `CertifyConvergence must succeed: ${certifyResult.error}`)

  // Simulate a mid-expedition source change that is committed; only derived
  // state should remain dirty after lifecycle transitions.
  await fs.writeFile(path.join(projectDir, "feature.txt"), "feature", "utf-8")
  runGit(["add", "feature.txt"], projectDir)
  runGit(["commit", "-m", `expedition(${expeditionId}): add feature`], projectDir)

  const completeResult = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(completeResult.status === 0, `complete must succeed with only derived state dirty:\nSTDOUT:\n${completeResult.stdout}\nSTDERR:\n${completeResult.stderr}`)
  const completeOutput = parseJson(completeResult.stdout)
  assert(completeOutput.kind === "ExpeditionCompleted", `complete should return ExpeditionCompleted, got ${completeOutput.kind}`)
  assert(completeOutput.autoCommit?.committed === true, `complete should auto-commit derived state: ${JSON.stringify(completeOutput.autoCommit)}`)

  console.log("[PASS] expedition complete ignores dirty derived state and auto-commits")
}

async function testCompleteStillBlocksOnSourceChanges(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)

  const startResult = runSynth(["expedition", "start", "--id", expeditionId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)

  // Make a source change and leave it uncommitted. Completion should block
  // because the dirty check only ignores derived state, not source changes.
  await fs.writeFile(path.join(projectDir, "uncommitted.txt"), "source change", "utf-8")

  const completeResult = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(completeResult.status !== 0, "complete should fail when source changes are uncommitted")
  const completeOutput = parseJson(completeResult.stdout)
  assert(completeOutput.status === "error", "failure should report error status")
  assert(completeOutput.code === "DirtyWorkingTreeBlocksCompletion" || completeOutput.error?.code === "DirtyWorkingTreeBlocksCompletion", `expected DirtyWorkingTreeBlocksCompletion, got ${JSON.stringify(completeOutput)}`)

  console.log("[PASS] source changes still block expedition completion")
}

async function testNoAutoCommitFlag(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)

  const beforeCommitCount = parseInt(runGit(["rev-list", "--count", "HEAD"], projectDir), 10)

  const startResult = runSynth(["expedition", "start", "--id", expeditionId, "--no-auto-commit"], projectDir)
  assert(startResult.status === 0, `start --no-auto-commit must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.kind === "ExpeditionStarted", `expedition start should return ExpeditionStarted, got ${startOutput.kind}`)
  assert(!startOutput.autoCommit, `start --no-auto-commit should not auto-commit`)

  const afterCommitCount = parseInt(runGit(["rev-list", "--count", "HEAD"], projectDir), 10)
  assert(afterCommitCount === beforeCommitCount, `commit count should not change with --no-auto-commit`)

  console.log("[PASS] --no-auto-commit disables derived state auto-commit")
}

async function testEnvDisablesAutoCommit(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)

  const beforeCommitCount = parseInt(runGit(["rev-list", "--count", "HEAD"], projectDir), 10)

  const startResult = runSynth(["expedition", "start", "--id", expeditionId], projectDir, { SYNTH_AUTO_COMMIT: "0" })
  assert(startResult.status === 0, `start with SYNTH_AUTO_COMMIT=0 must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(!startOutput.autoCommit, `start with SYNTH_AUTO_COMMIT=0 should not auto-commit`)

  const afterCommitCount = parseInt(runGit(["rev-list", "--count", "HEAD"], projectDir), 10)
  assert(afterCommitCount === beforeCommitCount, `commit count should not change when SYNTH_AUTO_COMMIT=0`)

  console.log("[PASS] SYNTH_AUTO_COMMIT=0 disables derived state auto-commit")
}

async function main() {
  console.log("Running expedition auto-commit tests...")
  const projectDir = await setupProject()
  try {
    const { missionId, contractId } = await createAndApproveMission(projectDir)
    const gateCtx = await bootstrap({
      skipGenesis: true,
      infra: {
        eventLogPath: path.join(projectDir, ".synth", "data", "event-log.jsonl"),
        statePath: path.join(projectDir, ".synth", "data", "canonical-state.json"),
      },
    })

    const expeditionId = await testStartAutoCommitsDerivedState(projectDir, missionId)
    await testEvidenceAutoCommitsProof(projectDir, expeditionId)
    await testCompleteDoesNotBlockOnDerivedState(projectDir, missionId, gateCtx, contractId)
    await testCompleteStillBlocksOnSourceChanges(projectDir, missionId)
    await testNoAutoCommitFlag(projectDir, missionId)
    await testEnvDisablesAutoCommit(projectDir, missionId)

    console.log("\nAll expedition auto-commit tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
