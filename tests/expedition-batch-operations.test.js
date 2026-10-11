// ============================================================
// EXP-BATCH-001 — Batch expedition lifecycle operations
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { createAndApproveMission as createAndApproveMissionIntent, setupBasicProject } from "./helpers/mission-lifecycle.js"
import { assert } from "./helpers/assert.js"

async function setupProject() {
  return setupBasicProject("synth-batch-")
}

async function createAndApproveMission(projectDir) {
  return createAndApproveMissionIntent(projectDir, {
    subject: "Batch Mission",
    purpose: "Test batch operations",
    returnGateContext: true,
  })
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
