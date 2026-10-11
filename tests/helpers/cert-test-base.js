// ============================================================
// TEST HELPERS — Certification test base
// ============================================================
// Shared harness for CLI certification scripts (first-operator-experience,
// runtime-repair, decision-events, evidence-path): counting assert,
// temp workspace, cleanup, and pass/fail summary. Single home for the
// identical header blocks (expedition 7a79e79b, round 11/110).
//
// These files run as scripts (not node:test); the harness preserves their
// exact console output and exit semantics. Richer per-file variants
// (custom runCli, parseResponse) stay local.
//
// Usage:
//   const { assert, makeWorkspace, cleanup, finish } = createCertHarness("synth-xyz-")
//   ...
//   finish()
// ============================================================

import fs from "node:fs"
import { makeTempDirSync } from "./workspace.js"

/** Create a certification harness bound to a workspace name prefix. */
export function createCertHarness(prefix) {
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      passed++
      console.log(`✓ ${message}`)
    } else {
      failed++
      console.error(`✗ ${message}`)
    }
  }

  function makeWorkspace() {
    return makeTempDirSync(prefix)
  }

  function cleanup(dir) {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  function finish() {
    console.log(`\n${passed} passed, ${failed} failed`)
    if (failed > 0) process.exit(1)
  }

  return { assert, makeWorkspace, cleanup, finish }
}
