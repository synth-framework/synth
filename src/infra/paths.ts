// ============================================================
// INFRA: Runtime Path Resolution
// =========================================================
// Single source of truth for locating SYNTH runtime data.
//
// For governed projects (those with `.synth/manifest.json`) all runtime
// state lives under `.synth/data/`. For ungoverned directories — including
// the SYNTH source repository itself — the legacy repo-root `data/` path
// is still used so that build and test do not require a `.synth/`
// directory (EXP-ENV-013, EXP-PROGRAM-017).
// ============================================================

import { existsSync } from "node:fs"
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
 * Return the absolute path to the runtime data directory.
 *
 * Governed projects use `.synth/data/`; ungoverned directories fall back
 * to repo-root `data/`.
 */
export function getRuntimeDataDir(cwd: string): string {
  if (hasManifest(cwd)) {
    return path.join(cwd, ".synth", "data")
  }
  return getLegacyDataDir(cwd)
}

/** Return the absolute path to the runtime snapshot store directory. */
export function getRuntimeSnapshotDir(cwd: string): string {
  return path.join(getRuntimeDataDir(cwd), "snapshots")
}
