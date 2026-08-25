// ADR-compliance regression test (ADR-051 / ADR-053).
// Validates the consistency invariant without depending on git state.

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { evaluate } from "../scripts/check-adr-compliance.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

let failures = 0
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg)
    failures += 1
  } else {
    console.log("PASS:", msg)
  }
}

const cs = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".synth/data/canonical-state.json"), "utf-8"))
const ev = fs
  .readFileSync(path.join(REPO_ROOT, ".synth/data/event-log.jsonl"), "utf-8")
  .split("\n")
  .filter(Boolean).length

// 1. Clean tree with consistent derived state passes.
assert(
  evaluate({ repoRoot: REPO_ROOT, canonicalState: cs, eventLogLineCount: ev }).ok,
  "clean tree with consistent derived state passes",
)

// 2. A standalone canonical-state regeneration (offset still in sync) must NOT
//    false-positive. This guards against blocking legitimate SYNTH regeneration
//    during normal development.
assert(
  evaluate({
    repoRoot: REPO_ROOT,
    stagedFiles: [".synth/data/canonical-state.json"],
    canonicalState: cs,
    eventLogLineCount: ev,
  }).ok,
  "canonical-state staged alone with consistent offset does not false-positive",
)

// 3. lastEventOffset mismatch fails (derived out of sync with source).
assert(
  !evaluate({
    repoRoot: REPO_ROOT,
    canonicalState: { ...cs, lastEventOffset: cs.lastEventOffset + 1 },
    eventLogLineCount: ev,
  }).ok,
  "lastEventOffset mismatch fails",
)

// 4. Unrelated file changes never trigger the check.
assert(
  evaluate({ repoRoot: REPO_ROOT, stagedFiles: ["src/foo.ts"], canonicalState: cs, eventLogLineCount: ev }).ok,
  "unrelated changes pass",
)

console.log(failures === 0 ? "All ADR-compliance tests passed." : `${failures} ADR-compliance test(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
