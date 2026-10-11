// ============================================================
// TEST HELPERS — Mission / Expedition lifecycle
// ============================================================
// Shared lifecycle flows for certification tests that exercise the full
// mission → approval → expedition pipeline against the built CLI. These
// flows were duplicated (with minor subject/purpose variations) across
// many certification test files; this module is their single home
// (dedupe-plan.md, findings F2/F3 — drive shared flows through one place).
//
// Every function uses the shared cli-harness runSynth, so CLI invocation,
// JSON parsing, and workspace conventions stay consistent.
//
// Usage:
//   import {
//     bootstrapProject, createAndApproveMission, createExecutingExpedition,
//   } from "./helpers/mission-lifecycle.js"
// ============================================================

import fs from "fs/promises"
import path from "path"
import { bootstrap } from "../../dist/core/bootstrap.js"
import { createAlignedContract } from "./alignment-fixture.js"
import { runSynth, parseJson } from "./cli-harness.js"
import { runGit, makeTempDir } from "./workspace.js"

/** Bootstrap a governed project in tmpDir and return the dir. */
export async function bootstrapProject(tmpDir, { name = "Synth Test Project" } = {}) {
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test", version: "1.0.0" }),
    "utf-8",
  )
  const result = runSynth(["bootstrap", tmpDir, "--approve", "--name", name], process.cwd())
  if (result.status !== 0) {
    throw new Error(`bootstrap --approve must exit 0:\n${result.stderr}`)
  }
  return tmpDir
}

/** Make + bootstrap a project (plain bootstrap, no --name). Shared setup. */
export async function setupBasicProject(prefix) {
  const tmpDir = await makeTempDir(prefix)
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  if (bootstrapResult.status !== 0) {
    throw new Error(`bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  }
  return tmpDir
}

/**
 * Set up a git-backed governed project: package.json + git init/config/
 * initial commit + approved bootstrap + bootstrap commit. Shared setup for
 * auto-commit style tests.
 */
export async function setupGitBackedProject(prefix) {
  const tmpDir = await makeTempDir(prefix)
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")

  runGit(["init"], tmpDir)
  runGit(["config", "user.email", "test@synth.local"], tmpDir)
  runGit(["config", "user.name", "Test Operator"], tmpDir)
  runGit(["add", "package.json"], tmpDir)
  runGit(["commit", "-m", "initial"], tmpDir)

  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  if (bootstrapResult.status !== 0) {
    throw new Error(`bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  }

  // Derived state is tracked in this test project so auto-commit can operate.
  runGit(["add", "-A"], tmpDir)
  runGit(["commit", "-m", "bootstrap"], tmpDir)

  return tmpDir
}

/**
 * Create a mission, raise its confidence with evidence until it clears
 * `confidenceThreshold`, then approve it (via an alignment contract).
 * Returns the runtime missionId, or { missionId, gateCtx, contractId } if
 * `returnGateContext` is true.
 */
export async function createAndApproveMission(
  projectDir,
  { subject, purpose, confidenceThreshold = 0.72, returnGateContext = false },
) {
  const createResult = runSynth(["mission", "create", "--subject", subject, "--purpose", purpose], projectDir)
  if (createResult.status !== 0) {
    throw new Error(`mission create must exit 0:\n${createResult.stderr}`)
  }
  let draft = parseJson(createResult.stdout)
  let draftId = draft.draftId

  let evidenceIndex = 0
  while (draft.confidence?.overall < confidenceThreshold) {
    evidenceIndex += 1
    const evidenceResult = runSynth(
      [
        "mission",
        "evidence",
        "add",
        "--draft-id",
        draftId,
        "--subject",
        `Contract evidence ${evidenceIndex}`,
        "--purpose",
        "Governance contract certification",
        "--confidence",
        "high",
      ],
      projectDir,
    )
    if (evidenceResult.status !== 0) {
      throw new Error(`mission evidence add must exit 0:\n${evidenceResult.stdout}\n${evidenceResult.stderr}`)
    }
    draft = parseJson(evidenceResult.stdout)
    draftId = draft.draftId
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
  if (approveResult.status !== 0) {
    throw new Error(`mission approve must exit 0:\n${approveResult.stderr}`)
  }
  const approveOutput = parseJson(approveResult.stdout)
  const missionId = approveOutput.runtime?.missionId
  if (!missionId) {
    throw new Error(`mission approve should return a runtime missionId (got ${JSON.stringify(approveOutput)})`)
  }
  if (returnGateContext) {
    return { missionId, gateCtx, contractId }
  }
  return missionId
}

/**
 * Create, approve, commit, and start an expedition under `missionId`, then
 * optionally attach evidence. Returns the expedition id. Pass
 * `{ start: false }` when the caller needs the pre-start draft id, or
 * `{ verifyStart: true }` to assert the started response shape.
 */
export async function createExecutingExpedition(
  projectDir,
  missionId,
  { subject, goal, attachEvidence = false, start = true, verifyStart = false } = {},
) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", subject, "--goal", goal],
    projectDir,
  )
  if (createResult.status !== 0) {
    throw new Error(`expedition create must exit 0:\n${createResult.stderr}`)
  }
  const createOutput = parseJson(createResult.stdout)
  const draftId = createOutput.draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  if (approveResult.status !== 0) {
    throw new Error(`expedition approve must exit 0:\n${approveResult.stderr}`)
  }

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  if (commitResult.status !== 0) {
    throw new Error(`expedition commit must exit 0:\n${commitResult.stderr}`)
  }

  if (start) {
    const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
    if (startResult.status !== 0) {
      throw new Error(`expedition start must exit 0:\n${startResult.stderr}`)
    }
    if (verifyStart) {
      const startOutput = parseJson(startResult.stdout)
      if (startOutput.kind !== "ExpeditionStarted") {
        throw new Error(`expedition start should return ExpeditionStarted, got ${startOutput.kind}`)
      }
      if (startOutput.result.status !== "executing") {
        throw new Error(`expedition should be executing, got ${startOutput.result.status}`)
      }
    }
  }

  if (attachEvidence) {
    const evidencePath = path.join(projectDir, "evidence.txt")
    await fs.writeFile(evidencePath, "experiment evidence", "utf-8")
    const evidenceResult = runSynth(["expedition", "evidence", "--id", draftId, "--attach", evidencePath], projectDir)
    if (evidenceResult.status !== 0) {
      throw new Error(`expedition evidence must exit 0:\n${evidenceResult.stderr}`)
    }
  }

  return draftId
}
