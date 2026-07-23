// ============================================================
// SDK: Artifact Paths
// ============================================================
// Canonical paths for SYNTH evidence and artifact directories.
// ============================================================

import path from "node:path"
import { dataDir, synthDir } from "./index.js"

/**
 * Return the absolute path to the discovery artifacts directory.
 */
export function discoveryDir(root: string): string {
  return path.join(synthDir(root), "discovery")
}

/**
 * Return the absolute path to the first-contact artifacts directory.
 */
export function firstContactDir(root: string): string {
  return path.join(synthDir(root), "first-contact")
}

/**
 * Return the absolute path to the proposals directory.
 */
export function proposalsDir(root: string): string {
  return path.join(synthDir(root), "proposals")
}

/**
 * Return the absolute path to the initialization evidence directory.
 */
export function initializationEvidenceDir(root: string): string {
  return path.join(dataDir(root), "evidence", "initialization")
}
