import { runGit } from "./helpers/workspace.js"
// ============================================================
// EXP-AUTO-COMMIT-001 — Auto-commit derived SYNTH state
// ============================================================
// Verifies that lifecycle transitions automatically commit derived
// SYNTH state (.synth/data/, proof/expeditions/) and that derived
// state changes no longer block expedition completion.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrap } from "../dist/core/bootstrap.js"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { createAndApproveMission as createAndApproveMissionIntent, setupGitBackedProject, createExecutingExpedition as createExecutingExpeditionIntent } from "./helpers/mission-lifecycle.js"
import { certifyConvergence as certifyConvergenceIntent } from "./helpers/governance-intent.js"
import { assert } from "./helpers/assert.js"

async function setupProject() {
  return setupGitBackedProject("synth-auto-commit-")
}

async function createAndApproveMission(projectDir) {
  return createAndApproveMissionIntent(projectDir, {
    subject: "Auto-commit Test Mission",
    purpose: "Test derived state auto-commit",
    returnGateContext: true,
  })
}

async function createExecutingExpedition(projectDir, missionId) {
  return createExecutingExpeditionIntent(projectDir, missionId, {
    subject: "Auto-commit Expedition",
    goal: "Test auto-commit",
    start: false,
  })
}

async function testStartAutoCommitsDerivedState(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)

  // Leave derived state dirty by not committing after commit/approve.
  const startResult = runSynth(["expedition", "start", "--id", expeditionId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.kind === "ExpeditionStarted", `expedition start should return ExpeditionStarted, got ${startOutput.kind}`)
  assert(startOutput.autoCommit?.committed === true, `start should auto-commit derived state: ${JSON.stringify(startOutput.autoCommit)}`)
  assert(
    startOutput.autoCommit?.message === `chore(synth): EXPEDITION_STARTED expedition ${expeditionId.slice(0, 8)}`,
    `commit message should follow ADR-055 rev 2 §R2.1: ${JSON.stringify(startOutput.autoCommit)}`,
  )

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

  await certifyConvergenceIntent(gateCtx, missionId, expeditionId, contractId, {
    // program-027-homepage checks the persistent-workspace behaviors; a
    // converging certification has to observe all three.
    observedFeatures: { hasPersistentHeader: true, hasPersistentSidebar: true, hasScrollDrivenPhases: true },
    artifacts: [{ path: `synth://missions/${missionId}/expeditions/${expeditionId}/implementation`, hash: "test", description: "Test" }],
    runtimeEvidence: [{ source: "test", observation: "ok", timestamp: 0 }],
  })

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

  const startResult = runSynth(["expedition", "start", "--id", expeditionId], projectDir, {
    env: { ...process.env, SYNTH_AUTO_COMMIT: "0" },
  })
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
