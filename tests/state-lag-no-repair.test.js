// ============================================================
// EXP-STATE-LAG-002 — Dirty-tree completion needs no repair
// ============================================================
// Regression test for the EXP-STATE-LAG-001 fix: completing an
// expedition while the working tree has uncommitted source changes
// used to leave canonical-state.json lagging the event log, which
// forced `synth repair state --approve` before replay would report
// consistent. The fix rebuilds and re-saves canonical state after
// appending snapshot events (src/control/execution-gate.ts), so
// replay must be consistent immediately after completion with NO
// repair step.
//
// The historical force-complete test (tests/governance-complete-
// force.test.js) only proved "consistent after repair". This test
// proves the stronger invariant: consistent without any repair.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-state-lag-no-repair-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function approveMission(projectDir) {
  let createResult = runSynth(["mission", "create", "--subject", "No Repair Host", "--purpose", "Host no-repair regression test"], projectDir)
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  let createOutput = parseJson(createResult.stdout)
  assert(createOutput.kind === "MissionDraft", `mission create should return MissionDraft, got ${createOutput.kind}`)
  let draftId = createOutput.draftId

  let evidenceIndex = 0
  while (createOutput.confidence.overall < 0.72) {
    evidenceIndex += 1
    const evidenceResult = runSynth(
      ["mission", "evidence", "add", "--draft-id", draftId, "--subject", `Contract evidence ${evidenceIndex}`, "--purpose", "Governance contract certification", "--confidence", "high"],
      projectDir,
    )
    assert(evidenceResult.status === 0, `mission evidence add must exit 0:\n${evidenceResult.stdout}\n${evidenceResult.stderr}`)
    createOutput = parseJson(evidenceResult.stdout)
    draftId = createOutput.draftId
  }

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
  assert(approveOutput.decision.approved === true, `mission should be approved`)

  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId`)
  return missionId
}

async function createExecutingExpedition(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "No Repair Expedition", "--goal", "Exercise dirty-tree completion without repair"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const createOutput = parseJson(createResult.stdout)
  const draftId = createOutput.draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)

  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)

  const evidencePath = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidencePath, "no repair experiment evidence", "utf-8")
  const evidenceResult = runSynth(["expedition", "evidence", "--id", draftId, "--attach", evidencePath], projectDir)
  assert(evidenceResult.status === 0, `expedition evidence must exit 0:\n${evidenceResult.stderr}`)

  return draftId
}

/** Leave a genuine non-derived, non-governance file uncommitted in the tree. */
async function leaveUncommittedSourceChange(projectDir) {
  await fs.writeFile(path.join(projectDir, "notes.txt"), "uncommitted source note", "utf-8")
}

async function main() {
  console.log("Running state-lag no-repair regression test...")
  const projectDir = await setupProject()
  try {
    const missionId = await approveMission(projectDir)
    const expeditionId = await createExecutingExpedition(projectDir, missionId)
    await leaveUncommittedSourceChange(projectDir)

    // --force is required because the pre-completion dirty-tree gate blocks
    // while real source changes are uncommitted. That is the exact scenario
    // EXP-STATE-LAG-002 targets: completion succeeds, but the post-completion
    // git snapshot cannot anchor the dirty tree.
    const completeResult = runSynth(
      ["expedition", "complete", "--id", expeditionId, "--force", "--reason", "Intentionally leave source uncommitted to exercise the snapshot guard (EXP-STATE-LAG-002)"],
      projectDir,
    )
    assert(completeResult.status === 0, `expedition complete --force must exit 0:\n${completeResult.stdout}\n${completeResult.stderr}`)
    const completeOutput = parseJson(completeResult.stdout)
    assert(completeOutput.status === "ok", `complete should report ok, got ${completeOutput.status}`)

    // Prove the residual class was genuinely exercised: the snapshot adapter
    // must have refused to anchor the dirty tree.
    const events = await readEventLog(projectDir)
    const snapshotFailed = events.some((e) => e.type === "GOVERNANCE_SNAPSHOT_FAILED")
    assert(snapshotFailed, "expected a GOVERNANCE_SNAPSHOT_FAILED event while the tree has uncommitted source changes")

    // THE regression assertion: replay must be consistent with NO repair step.
    const explainResult = runSynth(["explain", "replay"], projectDir)
    assert(explainResult.status === 0, `explain replay must exit 0:\n${explainResult.stderr}`)
    const explainOutput = parseJson(explainResult.stdout)
    assert(explainOutput.consistent === true, `replay should be consistent WITHOUT repair, got ${JSON.stringify(explainOutput)}`)

    console.log("[PASS] dirty-tree completion leaves replay consistent with no repair needed")
    console.log("\nAll state-lag no-repair tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})