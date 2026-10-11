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
import { spawnSync, execFileSync } from "child_process"

/** Create a temp directory under os.tmpdir() and return its path. */
export function makeTempDir(prefix) {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))
}

/** Synchronously create a temp directory under os.tmpdir(). */
export function makeTempDirSync(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

const cwdCounters = new Map()

/** Run git in cwd, throwing on failure. Shared test setup helper. */
export function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

/** Init a git repo with test identity and an empty initial commit. */
export function gitInitWithCommit(root, branch = "main") {
  execFileSync("git", ["init", "-b", branch], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["config", "user.email", "test@synth.dev"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["config", "user.name", "synth-test"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: root, stdio: "pipe" })
}

/** Create an isolated, run-scoped data directory under process.cwd(). */
export function makeCwdDataDir(prefix) {
  const n = (cwdCounters.get(prefix) ?? 0) + 1
  cwdCounters.set(prefix, n)
  return path.join(process.cwd(), prefix, `run-${n}`)
}
