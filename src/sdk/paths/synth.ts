// ============================================================
// SDK: Synth Paths
// ============================================================
// Canonical paths for SYNTH project metadata.
// ============================================================

import path from "node:path"
import { existsSync, readFileSync } from "../files/index.js"

/**
 * Return the absolute path to the `.synth` directory for a workspace.
 */
export function synthDir(root: string): string {
  return path.join(root, ".synth")
}

/**
 * Return the absolute path to the SYNTH manifest file.
 */
export function manifestPath(root: string): string {
  return path.join(synthDir(root), "manifest.json")
}

/**
 * Synchronous check for the presence of a SYNTH project manifest.
 */
export function hasManifest(root: string): boolean {
  return existsSync(manifestPath(root))
}

/**
 * Detect whether `root` is the SYNTH source repository itself.
 *
 * The source repository is ungoverned but still needs a runtime data
 * directory for its own build/test workflow.
 */
export function isSynthSourceRepository(root: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json")))
    return pkg.name === "@synth-framework/synth"
  } catch {
    return false
  }
}

// ============================================================
// Compatibility aliases — deprecated, will be removed in Wave 5.
// ============================================================

/** @deprecated Use `manifestPath` instead. */
export function getManifestPath(cwd: string): string {
  return manifestPath(cwd)
}
