// ============================================================
// INFRA: Runtime Path Resolution
// =========================================================
// Single source of truth for locating SYNTH runtime data.
//
// For governed projects (those with `.synth/manifest.json`) all runtime
// state lives under `.synth/data/`. The legacy repo-root `data/` path is
// retained only for the SYNTH source repository's own build and test
// workflow, which does not require a `.synth/` directory. User projects
// are always governed and must use `.synth/data/` (EXP-ENV-013,
// EXP-PROGRAM-017).
//
// New projects should always be governed; the legacy `data/` fallback is
// deprecated and exists only for the SYNTH source repository.
// ============================================================

import { existsSync, readFileSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"

/** Return the absolute path to the project manifest. */
export function getManifestPath(cwd: string): string {
  return path.join(cwd, ".synth", "manifest.json")
}

/** Synchronous check for the presence of a SYNTH project manifest. */
export function hasManifest(cwd: string): boolean {
  return existsSync(getManifestPath(cwd))
}

/** Return the absolute path to the legacy repo-root data directory. */
export function getLegacyDataDir(cwd: string): string {
  return path.join(cwd, "data")
}

/**
 * Detect whether `cwd` is the SYNTH source repository itself.
 *
 * The source repository is ungoverned (it has no `.synth/manifest.json`) but
 * still needs a runtime data directory for its own build/test workflow. We
 * recognize it by package name so that the legacy repo-root `data/` path is
 * used only there, never for user projects.
 */
function isSynthSourceRepository(cwd: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf-8"))
    return pkg.name === "@synth-framework/synth"
  } catch {
    return false
  }
}

/**
 * Return the absolute path to the runtime data directory.
 *
 * Governed projects use `.synth/data/`. Ungoverned directories also resolve
 * to `.synth/data/` because user projects are expected to be governed; if a
 * manifest is missing, runtime operations will fail naturally when they cannot
 * find the directory. The legacy repo-root `data/` path is used only by the
 * SYNTH source repository itself for its own build/test workflow.
 */
export function getRuntimeDataDir(cwd: string): string {
  if (hasManifest(cwd)) {
    return path.join(cwd, ".synth", "data")
  }
  if (isSynthSourceRepository(cwd)) {
    return getLegacyDataDir(cwd)
  }
  return path.join(cwd, ".synth", "data")
}

/**
 * Ensure the runtime data directory exists and return its absolute path.
 *
 * This is a thin wrapper around `getRuntimeDataDir` that creates the
 * directory when absent. It does not perform legacy migration; user projects
 * are expected to be governed and use `.synth/data/` from the start.
 */
export async function ensureRuntimeDataDir(cwd: string): Promise<string> {
  const dir = getRuntimeDataDir(cwd)
  await mkdir(dir, { recursive: true })
  return dir
}

/** Return the absolute path to the runtime snapshot store directory. */
export function getRuntimeSnapshotDir(cwd: string): string {
  return path.join(getRuntimeDataDir(cwd), "snapshots")
}
