// ADR-compliance regression test (ADR-051 / ADR-053).
// Validates the consistency rule without depending on git state.

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
{
  const r = evaluate({ repoRoot: REPO_ROOT, stagedFiles: [], canonicalState: cs, eventLogLineCount: ev })
  assert(r.ok, "clean tree with consistent derived state passes")
}

// 2. canonical-state staged without event-log in the same changeset fails.
{
  const r = evaluate({
    repoRoot: REPO_ROOT,
    stagedFiles: [".synth/data/canonical-state.json"],
    canonicalState: cs,
    eventLogLineCount: ev,
  })
  assert(!r.ok, "canonical-state staged without event-log fails")
}

// 3. lastEventOffset mismatch fails (derived out of sync with source).
{
  const bad = { ...cs, lastEventOffset: cs.lastEventOffset + 1 }
  const r = evaluate({ repoRoot: REPO_ROOT, stagedFiles: [], canonicalState: bad, eventLogLineCount: ev })
  assert(!r.ok, "lastEventOffset mismatch fails")
}

// 4. canonical-state AND event-log changed together passes.
{
  const r = evaluate({
    repoRoot: REPO_ROOT,
    stagedFiles: [".synth/data/canonical-state.json", ".synth/data/event-log.jsonl"],
    canonicalState: cs,
    eventLogLineCount: ev,
  })
  assert(r.ok, "canonical-state + event-log together passes")
}

console.log(failures === 0 ? "All ADR-compliance tests passed." : `${failures} ADR-compliance test(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
