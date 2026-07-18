// ============================================================
// VERIFICATION ENGINE: Context Builder
// ============================================================
// Assembles the replayable evidence needed by every verification check.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { EventStore } from "../infra/event-store.js"
import { StateStore } from "../infra/state-store.js"
import { CheckpointStore } from "../infra/checkpoint-store.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { createFileSystemSnapshotStore } from "../mission-studio/snapshot-store.js"
import { listDecisions } from "../mission-studio/decision-log.js"
import { getRuntimeDataDir } from "../infra/paths.js"
import { ensureRuntimeDataDir } from "../infra/migrate-data-dir.js"
import type { VerificationContext, DecisionRecord } from "./types.js"

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function listDraftIds(draftsDir: string): Promise<string[]> {
  if (!(await pathExists(draftsDir))) return []
  const entries = await fs.readdir(draftsDir)
  return entries
    .filter((f) => f.endsWith(".json") && !f.endsWith(".integrity.json"))
    .map((f) => path.basename(f, ".json"))
}

export async function buildVerificationContext(cwd: string): Promise<VerificationContext> {
  await ensureRuntimeDataDir(cwd)
  const dataDir = getRuntimeDataDir(cwd)
  const eventLogPath = path.join(dataDir, "event-log.jsonl")
  const statePath = path.join(dataDir, "canonical-state.json")
  const checkpointPath = path.join(dataDir, "checkpoints.json")
  const snapshotsDir = path.join(dataDir, "snapshots")
  const draftsDir = path.join(dataDir, "drafts")
  const manifestPath = path.join(cwd, ".synth", "manifest.json")

  const hasManifest = await pathExists(manifestPath)
  const hasEventLog = await pathExists(eventLogPath)

  const eventStore = new EventStore(eventLogPath)
  const stateStore = new StateStore(statePath)
  const checkpointStore = new CheckpointStore(checkpointPath)
  await checkpointStore.initialize()

  const verifier = createReplayVerifier(eventStore, stateStore)

  const decisionsRead = await listDecisions(dataDir)
  const decisions: { records: DecisionRecord[]; chainValid: boolean } = {
    records: decisionsRead.records.map((r) => ({
      type: r.type,
      draftId: r.draftId,
      timestamp: r.timestamp,
      reason: r.reason,
      confidence: r.confidence,
      snapshotId: r.snapshotId,
    })),
    chainValid: decisionsRead.chainValid,
  }

  let snapshotIds: string[] = []
  let snapshotError: string | undefined
  try {
    const snapshotStore = createFileSystemSnapshotStore(snapshotsDir)
    const stored = await snapshotStore.list()
    snapshotIds = stored.map((s) => s.snapshot.id)
  } catch (err) {
    snapshotError = err instanceof Error ? err.message : String(err)
  }

  const draftIds = await listDraftIds(draftsDir)

  return {
    cwd,
    dataDir,
    hasManifest,
    hasEventLog,
    eventStore,
    stateStore,
    checkpointStore,
    verifier,
    decisions,
    snapshotIds,
    snapshotError,
    draftIds,
  }
}
