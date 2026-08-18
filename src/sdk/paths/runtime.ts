// ============================================================
// SDK: Runtime Paths
// ============================================================
// Canonical paths for SYNTH runtime data under `.synth/data/`.
// ============================================================

import path from "node:path"
import os from "node:os"
import { ensureDirectory } from "../files/index.js"

/**
 * Return the absolute path to the runtime data directory.
 *
 * All SYNTH runtime data lives under `.synth/data/`.
 */
export function dataDir(root: string): string {
  return path.join(root, ".synth", "data")
}

/**
 * Return the absolute path to the legacy repo-root data directory.
 *
 * Retained only for the legacy-state migration subsystem (synth migrate).
 * Runtime path resolution no longer routes through this location.
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
 * Determine whether a filesystem target is a runtime data path.
 *
 * Writes to these paths are the bright-line mutation boundary: they require
 * an expedition at executing status and explicit operator approval. This
 * logic lives in the SDK (outside the audited Core directories) so the
 * ExecutionGate can enforce the boundary without importing environment
 * modules directly (ADR-006 §7, ADR-017).
 */
export function isRuntimeDataPath(target: string, rootDir: string): boolean {
  const absolute = path.resolve(target)
  const runtimeDir = path.resolve(dataDir(rootDir))
  const eventLogPath = path.resolve(eventLogFile(rootDir))
  const stateFilePath = path.resolve(stateFile(rootDir))

  if (absolute === eventLogPath || absolute === stateFilePath) {
    return true
  }
  const withSep = runtimeDir.endsWith(path.sep) ? runtimeDir : `${runtimeDir}${path.sep}`
  return absolute.startsWith(withSep)
}

/**
 * Infer the governed project root from an event store's data directory.
 *
 * Governed projects keep the event log at `<root>/.synth/data/event-log.jsonl`,
 * so the data directory's parent-of-parent is the project root. When the data
 * directory does not follow that layout (isolated test data dirs, custom
 * layouts), the data directory itself is treated as the project root. If no
 * data directory exists, a non-git tmp directory is returned so callers can
 * degrade gracefully outside a governed project.
 *
 * Lives in the SDK so the ExecutionGate resolves the project root without
 * importing environment modules directly (ADR-006 §7, ADR-017).
 */
export function projectRootFromDataDir(dataDirPath: string | null | undefined): string {
  if (!dataDirPath) {
    return path.join(os.tmpdir(), "synth-anonymous-project")
  }
  const normalized = path.resolve(dataDirPath)
  const base = path.basename(normalized)
  const parent = path.basename(path.dirname(normalized))
  if (parent === ".synth" && base === "data") {
    return path.dirname(path.dirname(normalized))
  }
  return normalized
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
