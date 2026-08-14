// ============================================================
// EXP-BATCH-001 — Batch expedition lifecycle operations
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-batch-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Batch Mission", "--purpose", "Test batch operations"],
    projectDir,
  )
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  const draftId1 = parseJson(createResult.stdout).draftId

  const evidenceResult = runSynth(
    ["mission", "evidence", "add", "--draft-id", draftId1, "--subject", "Evidence", "--confidence", "certain"],
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
  assert(approveOutput.kind === "MissionApprovalDecision", `expected MissionApprovalDecision, got ${approveOutput.kind}`)
  assert(approveOutput.decision?.approved === true, "mission should be approved")
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, "mission approve should return a runtime missionId")
  return { missionId, contractId }
}

async function createDraftExpeditions(projectDir, missionId, count) {
  const ids = []
  for (let i = 0; i < count; i++) {
    const result = runSynth(
      ["expedition", "create", "--mission", missionId, "--subject", `Batch Expedition ${i}`, "--goal", "Test batch"],
      projectDir,
    )
    assert(result.status === 0, `expedition create must exit 0:\n${result.stderr}`)
    const output = parseJson(result.stdout)
    assert(output.kind === "ExpeditionDraft", `expected ExpeditionDraft, got ${output.kind}`)
    ids.push(output.draftId)
  }
  return ids
}

async function testBatchApprove(projectDir, missionId) {
  const draftIds = await createDraftExpeditions(projectDir, missionId, 3)

  const dryRun = runSynth(["expedition", "approve", "--all-drafts", "--mission", missionId, "--dry-run"], projectDir)
  assert(dryRun.status === 0, `batch approve dry-run must exit 0:\n${dryRun.stderr}`)
  const dryRunOutput = parseJson(dryRun.stdout)
  assert(dryRunOutput.kind === "ExpeditionBatchApproveDryRun", `expected dry-run kind, got ${dryRunOutput.kind}`)
  assert(dryRunOutput.wouldApprove.length === 3, `expected 3 drafts in dry-run, got ${dryRunOutput.wouldApprove.length}`)

  const result = runSynth(["expedition", "approve", "--all-drafts", "--mission", missionId], projectDir)
  assert(result.status === 0, `batch approve must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "ExpeditionBatchApproved", `expected ExpeditionBatchApproved, got ${output.kind}`)
  assert(output.processed === 3, `expected 3 approved, got ${output.processed}`)
  assert(output.failed === 0, `expected 0 failures, got ${output.failed}`)
  assert(output.results.length === 3, `expected 3 results, got ${output.results.length}`)
  for (const id of draftIds) {
    const found = output.results.find((r) => r.draftId === id)
    assert(found && found.status === "ok", `draft ${id} should be approved successfully`)
  }

  console.log("[PASS] Batch approve approves all draft expeditions")
  return draftIds
}

async function testBatchCommit(projectDir, missionId, draftIds) {
  const dryRun = runSynth(["expedition", "commit", "--all-approved", "--mission", missionId, "--dry-run"], projectDir)
  assert(dryRun.status === 0, `batch commit dry-run must exit 0:\n${dryRun.stderr}`)
  const dryRunOutput = parseJson(dryRun.stdout)
  assert(dryRunOutput.kind === "ExpeditionBatchCommitDryRun", `expected dry-run kind, got ${dryRunOutput.kind}`)
  assert(dryRunOutput.wouldCommit.length === 3, `expected 3 approved in dry-run, got ${dryRunOutput.wouldCommit.length}`)

  const result = runSynth(["expedition", "commit", "--all-approved", "--mission", missionId], projectDir)
  assert(result.status === 0, `batch commit must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "ExpeditionBatchCommitted", `expected ExpeditionBatchCommitted, got ${output.kind}`)
  assert(output.processed === 3, `expected 3 committed, got ${output.processed}`)
  assert(output.failed === 0, `expected 0 failures, got ${output.failed}`)

  console.log("[PASS] Batch commit commits all approved expeditions")
}

async function testBatchStart(projectDir, missionId) {
  const dryRun = runSynth(["expedition", "start", "--all-committed", "--mission", missionId, "--dry-run"], projectDir)
  assert(dryRun.status === 0, `batch start dry-run must exit 0:\n${dryRun.stderr}`)
  const dryRunOutput = parseJson(dryRun.stdout)
  assert(dryRunOutput.kind === "ExpeditionBatchStartDryRun", `expected dry-run kind, got ${dryRunOutput.kind}`)
  assert(dryRunOutput.wouldStart.length === 3, `expected 3 committed in dry-run, got ${dryRunOutput.wouldStart.length}`)

  const result = runSynth(["expedition", "start", "--all-committed", "--mission", missionId], projectDir)
  assert(result.status === 0, `batch start must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "ExpeditionBatchStarted", `expected ExpeditionBatchStarted, got ${output.kind}`)
  assert(output.processed === 3, `expected 3 started, got ${output.processed}`)
  assert(output.failed === 0, `expected 0 failures, got ${output.failed}`)

  console.log("[PASS] Batch start starts all committed expeditions")
}

async function testBatchRequiresMission(projectDir) {
  const result = runSynth(["expedition", "approve", "--all-drafts"], projectDir)
  assert(result.status !== 0, "batch approve without --mission should fail")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "error should report error status")
  console.log("[PASS] Batch approve requires --mission")
}

async function main() {
  console.log("Running expedition batch operation tests...")
  const projectDir = await setupProject()
  try {
    const { missionId } = await createAndApproveMission(projectDir)
    await testBatchRequiresMission(projectDir)
    const draftIds = await testBatchApprove(projectDir, missionId)
    await testBatchCommit(projectDir, missionId, draftIds)
    await testBatchStart(projectDir, missionId)
    console.log("\n[EXP-BATCH-001] All tests passed")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
