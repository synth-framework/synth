// ============================================================
// SYNTH v2 — Repository Identity Projection (EXP-DISC-006)
// ============================================================
// Computes the canonical identity of the repository from replayable
// evidence: manifest, state, event log, drafts, snapshots, and
// expedition charters. The projection is read-only and never depends
// on hand-authored metadata.
//
// Usage:
//   synth explain identity [--json]
// ============================================================

import fs from "fs/promises"
import path from "path"
import { getRuntimeDataDir } from "../infra/paths.js"

export type RepositoryIdentity = {
  status: "ok"
  kind: string
  phase: string
  authority: string[]
  expectedInputs: string[]
  expectedOutputs: string[]
  transformationDirection: string
  evidence: {
    manifestPresent: boolean
    eventCount: number
    missionCount: number
    completedMissionCount: number
    expeditionCount: number
    draftCount: number
    snapshotCount: number
    recordedJourney: boolean
  }
}

function printJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2))
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function readJsonMaybe(target: string): Promise<Record<string, any> | undefined> {
  try {
    return JSON.parse(await fs.readFile(target, "utf-8"))
  } catch {
    return undefined
  }
}

async function listMaybe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

async function countEventLog(eventLogPath: string): Promise<number> {
  try {
    const text = await fs.readFile(eventLogPath, "utf-8")
    const trimmed = text.trim()
    if (!trimmed) return 0
    return trimmed.split("\n").length
  } catch {
    return 0
  }
}

/**
 * Build the deterministic Repository Identity projection for a directory.
 *
 * The identity is never stored; it is recomputed from the repository's
 * evidence every time the command runs.
 */
export async function buildRepositoryIdentity(cwd: string): Promise<RepositoryIdentity> {
  const dataDir = getRuntimeDataDir(cwd)
  const manifest = await readJsonMaybe(path.join(cwd, ".synth", "manifest.json"))
  const state = await readJsonMaybe(path.join(dataDir, "canonical-state.json"))
  const eventCount = await countEventLog(path.join(dataDir, "event-log.jsonl"))

  const drafts = (await listMaybe(path.join(dataDir, "drafts"))).filter((f) => f.endsWith(".json"))
  const snapshots = (await listMaybe(path.join(dataDir, "snapshots"))).filter((f) => f.endsWith(".json"))
  const expeditionFiles = (await listMaybe(path.join(cwd, "docs", "expeditions"))).filter(
    (f) => f.startsWith("EXP-") && f.endsWith(".md"),
  )
  const recordedJourney = await pathExists(path.join(cwd, "recorded-journey"))

  const missions = state?.missions ?? {}
  const missionCount = Object.keys(missions).length
  const completedMissionCount = Object.values(missions).filter((m: any) => m?.status === "completed").length
  const expeditionCount = state?.expeditions ? Object.keys(state.expeditions).length : expeditionFiles.length

  // --- Kind -----------------------------------------------------------
  let kind: string
  if (recordedJourney) {
    kind = manifest?.projectName ? `${manifest.projectName} example` : "SYNTH First Contact example"
  } else if (manifest?.schema === "synth-bootstrap-manifest-v1") {
    kind = manifest.projectName || "SYNTH project"
  } else if (expeditionFiles.length > 0 && (await pathExists(path.join(cwd, "src")))) {
    kind = "SYNTH source repository"
  } else if (await pathExists(path.join(cwd, ".synth", "manifest.json"))) {
    kind = "SYNTH project directory"
  } else {
    kind = "Unclassified repository"
  }

  // --- Phase ----------------------------------------------------------
  const lifecycle = state?.lifecycle ?? "uninitialized"
  const activeMission = Object.values(missions).some((m: any) => m?.status === "active")
  const executingExpedition = Object.values(state?.expeditions ?? {}).some(
    (e: any) => e?.status === "executing",
  )

  let phase: string
  if (completedMissionCount > 0 && !activeMission && !executingExpedition) {
    phase = "operational"
  } else if (activeMission || executingExpedition) {
    phase = "executing"
  } else if (lifecycle === "initialized") {
    phase = "planning"
  } else if (drafts.length > 0 || snapshots.length > 0) {
    phase = "planning"
  } else if (expeditionFiles.length > 0) {
    phase = "specification"
  } else {
    phase = "discovery"
  }

  // --- Authority ------------------------------------------------------
  const authority = ["SYNTH Constitution", "Event Log", "Replay"]
  if (manifest) {
    authority.unshift("Project Manifest")
  }
  if (snapshots.length > 0) {
    authority.push("Approved Mission Model Snapshot")
  }
  if (expeditionFiles.length > 0) {
    authority.push("Expedition Charters")
  }

  // --- Inputs / Outputs / Direction -----------------------------------
  let expectedInputs: string[]
  let expectedOutputs: string[]
  let transformationDirection: string

  if (recordedJourney) {
    expectedInputs = ["Canonical First Contact specification"]
    expectedOutputs = ["Recorded journey archive", "Generated projections", "Proof artifacts"]
    transformationDirection = "specification → recorded evidence → public projection"
  } else if (manifest) {
    expectedInputs = ["Human intent", "Evidence"]
    expectedOutputs = ["Approved Mission", "Executed Expedition", "Replay proof"]
    transformationDirection = "intent → plan → execution → replay"
  } else if (expeditionFiles.length > 0) {
    expectedInputs = ["Repository analysis", "Evidence"]
    expectedOutputs = ["Documentation projections", "Governance proof"]
    transformationDirection = "knowledge → specification → implementation"
  } else {
    expectedInputs = ["Observation"]
    expectedOutputs = ["Understanding"]
    transformationDirection = "observation → understanding"
  }

  return {
    status: "ok",
    kind,
    phase,
    authority,
    expectedInputs,
    expectedOutputs,
    transformationDirection,
    evidence: {
      manifestPresent: !!manifest,
      eventCount,
      missionCount,
      completedMissionCount,
      expeditionCount,
      draftCount: drafts.length,
      snapshotCount: snapshots.length,
      recordedJourney,
    },
  }
}

/**
 * CLI handler for `synth explain identity`.
 */
export async function cmdExplainIdentity(_flags: Record<string, string | boolean>): Promise<void> {
  const cwd = process.cwd()
  const identity = await buildRepositoryIdentity(cwd)
  printJson(identity)
}
