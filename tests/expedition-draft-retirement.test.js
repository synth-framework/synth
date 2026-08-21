// ============================================================
// SYNTH Expedition Draft Retirement Tests (EXP d8a555db237507e5)
// ============================================================
// Draft lifecycle integrity: creation, deletion, and commitment
// must be atomic, chain-safe, and free of manual file surgery.
//
//  1. `expedition create --dry-run` writes no draft files and
//     creates no runtime entity.
//  2. `expedition commit` retires the draft json + integrity
//     record; later drafts still certify (chain stays sound).
//  3. `expedition delete` cleans up draft json + integrity files
//     in the same command as the state mutation.
//  4. Retiring a draft whose integrity record is chained to by a
//     live successor retains the record (chain-safe) until the
//     successor retires, then garbage-collects the tail.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-draft-retirement-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Retirement Mission", "--purpose", "Test purpose"],
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
  const missionId = parseJson(approveResult.stdout).runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId`)
  return missionId
}

function draftsDir(projectDir) {
  return path.join(projectDir, ".synth", "data", "drafts")
}

async function draftFiles(projectDir, draftId) {
  const dir = draftsDir(projectDir)
  return {
    json: path.join(dir, `${draftId}.json`),
    integrity: path.join(dir, `${draftId}.integrity.json`),
  }
}

async function createExpeditionDraft(projectDir, missionId, subject) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", subject, "--goal", `Goal for ${subject}`],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const output = parseJson(createResult.stdout)
  assert(output.kind === "ExpeditionDraft", `expedition create should return ExpeditionDraft, got ${output.kind}`)
  return output.draftId
}

async function testDryRunCreateWritesNothing(projectDir, missionId) {
  const dryRunResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Dry Run Probe", "--goal", "Probe goal", "--dry-run"],
    projectDir,
  )
  assert(dryRunResult.status === 0, `expedition create --dry-run must exit 0:\n${dryRunResult.stderr}`)
  const output = parseJson(dryRunResult.stdout)
  assert(output.kind === "ExpeditionDraftDryRun", `dry-run should return ExpeditionDraftDryRun, got ${output.kind}`)
  assert(output.draftId, "dry-run should surface the would-be draft id")

  const files = await draftFiles(projectDir, output.draftId)
  const jsonExists = await fs.access(files.json).then(() => true).catch(() => false)
  const integrityExists = await fs.access(files.integrity).then(() => true).catch(() => false)
  assert(!jsonExists, `dry-run must not write ${files.json}`)
  assert(!integrityExists, `dry-run must not write ${files.integrity}`)

  // Mission drafts legitimately share the drafts dir; only the probed
  // expedition's artifacts must be absent.
  const dirEntries = await fs.readdir(draftsDir(projectDir)).catch(() => [])
  assert(
    !dirEntries.some((f) => f.startsWith(output.draftId)),
    `dry-run must leave no artifacts for ${output.draftId}, got ${JSON.stringify(dirEntries)}`,
  )

  const showResult = runSynth(["expedition", "show", "--id", output.draftId], projectDir)
  assert(showResult.status !== 0, "dry-run must not create a runtime expedition entity")

  console.log("[PASS] expedition create --dry-run writes no draft files and creates no runtime entity")
}

async function testCommitRetiresDraftArtifacts(projectDir, missionId) {
  const draftId = await createExpeditionDraft(projectDir, missionId, "Commit Retirement Probe")

  let files = await draftFiles(projectDir, draftId)
  assert(await fs.access(files.json).then(() => true).catch(() => false), "create should write the draft json")
  assert(await fs.access(files.integrity).then(() => true).catch(() => false), "create should write the integrity record")

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)
  const commitOutput = parseJson(commitResult.stdout)
  assert(commitOutput.kind === "ExpeditionCommitted", `commit should return ExpeditionCommitted, got ${commitOutput.kind}`)

  files = await draftFiles(projectDir, draftId)
  const jsonExists = await fs.access(files.json).then(() => true).catch(() => false)
  const integrityExists = await fs.access(files.integrity).then(() => true).catch(() => false)
  assert(!jsonExists, `commit must retire the draft json (${files.json})`)
  assert(!integrityExists, `commit must retire the integrity record (${files.integrity})`)

  // The integrity chain must remain sound after retirement: a fresh draft
  // must still certify and approve.
  const nextDraftId = await createExpeditionDraft(projectDir, missionId, "Post Retirement Probe")
  const nextApprove = runSynth(["expedition", "approve", "--draft-id", nextDraftId], projectDir)
  assert(nextApprove.status === 0, `approve after retirement must succeed (chain sound):\n${nextApprove.stderr}`)

  console.log("[PASS] expedition commit retires draft artifacts and keeps the chain sound")
}

async function testDeleteCleansUpDraftFiles(projectDir, missionId) {
  const draftId = await createExpeditionDraft(projectDir, missionId, "Delete Cleanup Probe")

  const deleteResult = runSynth(["expedition", "delete", "--id", draftId, "--reason", "Retirement test"], projectDir)
  assert(deleteResult.status === 0, `expedition delete must exit 0:\n${deleteResult.stderr}`)
  const deleteOutput = parseJson(deleteResult.stdout)
  assert(deleteOutput.kind === "ExpeditionDeleted", `delete should return ExpeditionDeleted, got ${deleteOutput.kind}`)

  const files = await draftFiles(projectDir, draftId)
  const jsonExists = await fs.access(files.json).then(() => true).catch(() => false)
  const integrityExists = await fs.access(files.integrity).then(() => true).catch(() => false)
  assert(!jsonExists, `delete must clean up the draft json (${files.json})`)
  assert(!integrityExists, `delete must clean up the integrity record (${files.integrity})`)

  // Chain must stay sound for subsequent drafts.
  const nextDraftId = await createExpeditionDraft(projectDir, missionId, "After Delete Probe")
  const nextApprove = runSynth(["expedition", "approve", "--draft-id", nextDraftId], projectDir)
  assert(nextApprove.status === 0, `approve after delete must succeed (chain sound):\n${nextApprove.stderr}`)

  console.log("[PASS] expedition delete cleans up draft json + integrity files with the state mutation")
}

async function testMidChainRetirementPreservesLiveSuccessor(projectDir, missionId) {
  // Create order matters: the base record is chained to by the successor.
  const baseId = await createExpeditionDraft(projectDir, missionId, "Chain Base")
  const successorId = await createExpeditionDraft(projectDir, missionId, "Chain Successor")

  const deleteResult = runSynth(["expedition", "delete", "--id", baseId, "--reason", "Mid-chain retirement"], projectDir)
  assert(deleteResult.status === 0, `expedition delete must exit 0:\n${deleteResult.stderr}`)

  const baseFiles = await draftFiles(projectDir, baseId)
  const baseJsonExists = await fs.access(baseFiles.json).then(() => true).catch(() => false)
  const baseIntegrityExists = await fs.access(baseFiles.integrity).then(() => true).catch(() => false)
  assert(!baseJsonExists, `delete must remove the deleted draft's json (${baseFiles.json})`)
  assert(baseIntegrityExists, `the base integrity record must be retained while a live successor chains to it`)

  // The live successor must still certify against the intact chain.
  const approveResult = runSynth(["expedition", "approve", "--draft-id", successorId], projectDir)
  assert(approveResult.status === 0, `successor approve must succeed with retained base record:\n${approveResult.stderr}`)

  // Retiring the successor garbage-collects the retained tail.
  const commitResult = runSynth(["expedition", "commit", "--proposal-id", successorId], projectDir)
  assert(commitResult.status === 0, `successor commit must exit 0:\n${commitResult.stderr}`)

  const successorFiles = await draftFiles(projectDir, successorId)
  const successorJsonExists = await fs.access(successorFiles.json).then(() => true).catch(() => false)
  const successorIntegrityExists = await fs.access(successorFiles.integrity).then(() => true).catch(() => false)
  assert(!successorJsonExists, "successor commit must retire its json")
  assert(!successorIntegrityExists, "successor commit must retire its own record")
  assert(
    !(await fs.access(baseFiles.integrity).then(() => true).catch(() => false)),
    "retired tail record must be garbage-collected once its successor retires",
  )

  console.log("[PASS] mid-chain retirement retains the record until the successor retires, then collects the tail")
}

async function main() {
  console.log("Running expedition draft retirement tests...")

  {
    const projectDir = await setupProject()
    try {
      const missionId = await createAndApproveMission(projectDir)
      await testDryRunCreateWritesNothing(projectDir, missionId)
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true })
    }
  }

  {
    const projectDir = await setupProject()
    try {
      const missionId = await createAndApproveMission(projectDir)
      await testCommitRetiresDraftArtifacts(projectDir, missionId)
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true })
    }
  }

  {
    const projectDir = await setupProject()
    try {
      const missionId = await createAndApproveMission(projectDir)
      await testDeleteCleansUpDraftFiles(projectDir, missionId)
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true })
    }
  }

  {
    const projectDir = await setupProject()
    try {
      const missionId = await createAndApproveMission(projectDir)
      await testMidChainRetirementPreservesLiveSuccessor(projectDir, missionId)
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true })
    }
  }

  console.log("\nAll expedition draft retirement tests passed.")
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
