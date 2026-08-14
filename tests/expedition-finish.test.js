// ============================================================
// SYNTH Expedition Finish Tests
// ============================================================
// Verifies the atomic `synth expedition finish` command, which combines
// evidence capture, convergence certification, and completion in one step.
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

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-expedition-finish-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")

  // Initialize git so finish can capture git-diff evidence.
  runGit(["init"], tmpDir)
  runGit(["config", "user.email", "test@synth.local"], tmpDir)
  runGit(["config", "user.name", "Test Operator"], tmpDir)
  runGit(["add", "package.json"], tmpDir)
  runGit(["commit", "-m", "initial"], tmpDir)

  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)

  // Commit bootstrap artifacts so the working tree is clean for finish.
  runGit(["add", "-A"], tmpDir)
  runGit(["commit", "-m", "bootstrap"], tmpDir)

  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Finish Test Mission", "--purpose", "Test atomic finish"],
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
  assert(approveOutput.decision?.approved === true, `mission should be approved, got ${JSON.stringify(approveOutput.decision)}`)
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId, got ${JSON.stringify(approveOutput.runtime)}`)
  return { missionId, contractId }
}

async function testFinishCommand(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Finish Test Expedition", "--goal", "Test atomic finish flow"],
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

  // Make and commit a source change after starting so finish has a diff to capture.
  await fs.writeFile(path.join(projectDir, "feature.txt"), "new capability", "utf-8")
  runGit(["add", "feature.txt"], projectDir)
  runGit(["commit", "-m", `expedition(${draftId}): add feature`], projectDir)

  const finishResult = runSynth(["expedition", "finish", "--id", draftId], projectDir)
  assert(finishResult.status === 0, `expedition finish must exit 0:\n${finishResult.stderr}`)
  const finishOutput = parseJson(finishResult.stdout)
  assert(finishOutput.kind === "ExpeditionFinished", `expedition finish should return ExpeditionFinished, got ${finishOutput.kind}`)
  assert(finishOutput.status === "ok", `expedition finish should report ok, got ${finishOutput.status}`)
  assert(Array.isArray(finishOutput.attachments) && finishOutput.attachments.length > 0, `finish should attach evidence, got ${JSON.stringify(finishOutput.attachments)}`)
  assert(finishOutput.attachments.some((a) => a.kind === "git-diff"), `finish should attach a git-diff`)
  assert(Array.isArray(finishOutput.steps) && finishOutput.steps.length === 3, `finish should report 3 steps, got ${JSON.stringify(finishOutput.steps)}`)
  assert(finishOutput.certificationId, `finish should return a certificationId`)

  // Verify the expedition is actually completed in state.
  const statusResult = runSynth(["expedition", "show", "--id", draftId], projectDir)
  assert(statusResult.status === 0, `expedition show must exit 0:\n${statusResult.stderr}`)
  const statusOutput = parseJson(statusResult.stdout)
  assert(statusOutput.expedition?.status === "completed", `expedition should be completed, got ${statusOutput.expedition?.status}`)

  console.log("[PASS] Atomic finish command attaches git-diff evidence, certifies convergence, and completes the expedition")
}

async function testFinishRequiresExecuting(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Finish Before Start", "--goal", "Test finish guard"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  const finishResult = runSynth(["expedition", "finish", "--id", draftId], projectDir)
  assert(finishResult.status !== 0, "expedition finish should fail before start")
  const finishOutput = parseJson(finishResult.stdout)
  assert(finishOutput.status === "error", "finish failure should report error status")

  console.log("[PASS] Finish is rejected for non-executing expeditions")
}

async function main() {
  console.log("Running expedition finish tests...")
  const projectDir = await setupProject()
  try {
    const { missionId } = await createAndApproveMission(projectDir)
    await testFinishCommand(projectDir, missionId)
    const { missionId: missionId2 } = await createAndApproveMission(projectDir)
    await testFinishRequiresExecuting(projectDir, missionId2)
    console.log("\nAll expedition finish tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
