// ============================================================
// TEST HELPERS — Trust Workflow
// ============================================================
// Shared helpers for tests exercising the mission draft → evidence →
// approval trust boundary.
//
// Replaces duplicated makeWorkspace / runCli / createDraft / evidenceAdd /
// approve / readDraft / writeDraft helpers across decision-events,
// draft-integrity, evidence-path, and runtime-repair tests.
//
// Usage:
//   import {
//     makeWorkspace, cleanup, runCli, createDraft, evidenceAdd,
//     approveByCli, approveWithAlignment, readDraft, writeDraft, draftPath,
//   } from "./helpers/trust-workflow.js"
// ============================================================

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { bootstrap } from "../../dist/core/bootstrap.js"
import { createAlignedContract } from "./alignment-fixture.js"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
export const DIST_SYNTH = path.join(REPO_ROOT, "dist", "cli", "synth.js")

/** Verify the CLI binary exists. */
export function assertCliBuilt() {
  if (!fs.existsSync(DIST_SYNTH)) {
    throw new Error("dist/cli/synth.js not found; run `npm run build` first.")
  }
}

/** Create a temporary workspace initialized with `synth init`. */
export function makeWorkspace(name = "trust-workspace") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `synth-${name}-`))
  const init = runCli(dir, ["init", "--name", name])
  if (init.status !== 0) {
    throw new Error(`synth init failed in test workspace: ${init.output}`)
  }
  return dir
}

/** Remove a temporary workspace. */
export function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

/** Invoke the SYNTH CLI in a workspace and return status/output. */
export function runCli(dir, args) {
  const env = { ...process.env }
  delete env.SYNTH_GOVERN_DEPTH
  const res = spawnSync(process.execPath, [DIST_SYNTH, ...args], {
    cwd: dir,
    env,
    timeout: 30000,
    encoding: "utf8",
    killSignal: "SIGKILL",
  })
  return {
    status: res.status,
    output: `${res.stdout || ""}${res.stderr || ""}`,
    timedOut: Boolean(res.error && res.error.code === "ETIMEDOUT"),
  }
}

/** Create a mission draft and return its draftId. */
export function createDraft(dir, subject = "Fixture Mission", purpose = "Demonstrate deterministic planning.") {
  const r = runCli(dir, ["mission", "create", "--subject", subject, "--purpose", purpose])
  const match = r.output.match(/"draftId":\s*"([^"]+)"/)
  return match ? match[1] : undefined
}

/** Add evidence to a draft and return the resulting draftId. */
export function evidenceAdd(dir, draftId, subject) {
  const r = runCli(dir, ["mission", "evidence", "add", "--draft-id", draftId, "--subject", subject])
  const match = r.output.match(/"draftId":\s*"([^"]+)"/)
  return match ? match[1] : undefined
}

/** Approve a draft using the CLI only (no alignment contract). */
export function approveByCli(dir, draftId) {
  return runCli(dir, ["mission", "approve", "--draft-id", draftId])
}

/**
 * Approve a draft using an alignment contract.
 * Required for Phase 2 governance where approval is gated by an aligned
 * Alignment Contract.
 */
export async function approveWithAlignment(dir, draftId) {
  const dataDir = path.join(dir, ".synth", "data")
  const gateCtx = await bootstrap({
    skipGenesis: true,
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
    },
  })
  const { contractId } = await createAlignedContract(gateCtx)
  return runCli(dir, ["mission", "approve", "--draft-id", draftId, "--alignment-contract-id", contractId])
}

/** Path to a draft file. */
export function draftPath(dir, draftId) {
  return path.join(dir, ".synth", "data", "drafts", `${draftId}.json`)
}

/** Read a draft JSON file. */
export function readDraft(dir, draftId) {
  return JSON.parse(fs.readFileSync(draftPath(dir, draftId), "utf8"))
}

/** Write a draft JSON file. */
export function writeDraft(dir, draftId, data) {
  fs.writeFileSync(draftPath(dir, draftId), JSON.stringify(data, null, 2))
}

/** Read the decisions.jsonl append-only record. */
export function readDecisions(dir) {
  const file = path.join(dir, ".synth", "data", "decisions.jsonl")
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}
