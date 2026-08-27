// ============================================================
// TEST HELPERS — Workspace / Temp-dir lifecycle
// ============================================================
// Centralizes duplicated temp-dir and test-data-dir creation that was
// inlined across the test suite. Behavior-preserving: makeTempDir /
// makeTempDirSync wrap fs.mkdtemp; makeCwdDataDir mirrors the
// `path.join(process.cwd(), "<prefix>", "run-<n>")` convention.
//
// Usage:
//   import { makeTempDir, makeTempDirSync, makeCwdDataDir } from "./helpers/workspace.js"
// ============================================================

import fs from "fs"
import os from "os"
import path from "path"

/** Create a temp directory under os.tmpdir() and return its path. */
export function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

/** Synchronously create a temp directory under os.tmpdir(). */
export function makeTempDirSync(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

const cwdCounters = new Map()

/** Create an isolated, run-scoped data directory under process.cwd(). */
export function makeCwdDataDir(prefix) {
  const n = (cwdCounters.get(prefix) ?? 0) + 1
  cwdCounters.set(prefix, n)
  return path.join(process.cwd(), prefix, `run-${n}`)
}
