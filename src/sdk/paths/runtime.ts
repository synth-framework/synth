// ============================================================
// SDK: Runtime Paths
// ============================================================
// Canonical paths for SYNTH runtime data under `.synth/data/`.
// ============================================================

import path from "node:path"
import { ensureDirectory } from "../files/index.js"
import { hasManifest, isSynthSourceRepository } from "./synth.js"

/**
 * Return the absolute path to the runtime data directory.
 *
 * Governed projects use `.synth/data/`. The legacy repo-root `data/`
 * path is retained only for the SYNTH source repository's own build/test
 * workflow.
 */
export function dataDir(root: string): string {
  if (hasManifest(root) || !isSynthSourceRepository(root)) {
    return path.join(root, ".synth", "data")
  }
  return legacyDataDir(root)
}

/**
 * Return the absolute path to the legacy repo-root data directory.
 */
export function legacyDataDir(root: string): string {
  return path.join(root, "data")
}

/**
 * Ensure the runtime data directory exists and return its absolute path.
 */
export async function ensureDataDir(root: string): Promise<string> {
  const dir = dataDir(root)
  await ensureDirectory(dir)
  return dir
}

/**
 * Return the absolute path to the event stream directory.
 */
export function eventsDir(root: string): string {
  return path.join(dataDir(root), "event-stream")
}

/**
 * Return the absolute path to the canonical state file.
 */
export function stateFile(root: string): string {
  return path.join(dataDir(root), "canonical-state.json")
}

/**
 * Return the absolute path to the event log file.
 */
export function eventLogFile(root: string): string {
  return path.join(dataDir(root), "event-log.jsonl")
}

/**
 * Return the absolute path to the snapshots directory.
 */
export function snapshotsDir(root: string): string {
  return path.join(dataDir(root), "snapshots")
}

/**
 * Return the absolute path to the checkpoints file.
 */
export function checkpointsFile(root: string): string {
  return path.join(dataDir(root), "checkpoints.json")
}

/**
 * Return the absolute path to the decisions file.
 */
export function decisionsFile(root: string): string {
  return path.join(dataDir(root), "decisions.jsonl")
}

// ============================================================
// Compatibility aliases — deprecated, will be removed in Wave 5.
// ============================================================

/** @deprecated Use `dataDir` instead. */
export function getRuntimeDataDir(cwd: string): string {
  return dataDir(cwd)
}

/** @deprecated Use `legacyDataDir` instead. */
export function getLegacyDataDir(cwd: string): string {
  return legacyDataDir(cwd)
}

/** @deprecated Use `ensureDataDir` instead. */
export async function ensureRuntimeDataDir(cwd: string): Promise<string> {
  return ensureDataDir(cwd)
}

/** @deprecated Use `snapshotsDir` instead. */
export function getRuntimeSnapshotDir(cwd: string): string {
  return snapshotsDir(cwd)
}
