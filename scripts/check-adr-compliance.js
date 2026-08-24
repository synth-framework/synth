// ============================================================
// ADR COMPLIANCE CHECK (ADR-051 / ADR-053)
// ============================================================
// canonical-state.json is a committed, regenerable snapshot of the
// immutable event log (the sole source of truth). The enforcement rule
// is a single, safe CONSISTENCY invariant:
//     canonical-state.lastEventOffset === event-log line count
// This catches hand-edits / desyncs without ever false-positiving on a
// legitimate SYNTH regeneration (which keeps the two in sync). It does
// NOT require canonical-state and event-log to change in the same commit,
// because regeneration commonly rewrites canonical-state alone.
// ============================================================

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

const DEFAULT_ENFORCEMENT = {
  citation: "ADR-051",
  sourceOfTruth: ".synth/data/event-log.jsonl",
  invariant: "canonical-state.lastEventOffset === event-log line count",
}

function loadEnforcement(root) {
  const p = path.join(root, ".synth", "adr-enforcement.json")
  try {
    return { ...DEFAULT_ENFORCEMENT, ...JSON.parse(fs.readFileSync(p, "utf-8")) }
  } catch {
    return DEFAULT_ENFORCEMENT
  }
}

export function evaluate({ repoRoot, canonicalState, eventLogLineCount }) {
  const enf = loadEnforcement(repoRoot)
  const violations = []
  if (canonicalState && typeof canonicalState.lastEventOffset === "number") {
    if (canonicalState.lastEventOffset !== eventLogLineCount) {
      violations.push(
        `canonical-state.lastEventOffset (${canonicalState.lastEventOffset}) != event-log events (${eventLogLineCount}) (${enf.citation}: derived snapshot out of sync with source of truth)`,
      )
    }
  }
  return { ok: violations.length === 0, violations }
}

function readCanonicalState(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, ".synth/data/canonical-state.json"), "utf-8"))
  } catch {
    return null
  }
}

function readEventLogLineCount(root, enf) {
  try {
    const raw = fs.readFileSync(path.join(root, enf.sourceOfTruth), "utf-8")
    return raw.split("\n").filter(Boolean).length
  } catch {
    return 0
  }
}

function main() {
  const root = REPO_ROOT
  const enf = loadEnforcement(root)
  const canonicalState = readCanonicalState(root)
  const eventLogLineCount = readEventLogLineCount(root, enf)

  const { ok, violations } = evaluate({ repoRoot: root, canonicalState, eventLogLineCount })

  if (!ok) {
    console.error("[ADR-COMPLIANCE] Violations found:")
    for (const v of violations) console.error("  - " + v)
    if (process.env.ADR_ENFORCE === "skip") {
      console.error("[ADR-COMPLIANCE] Override requested via ADR_ENFORCE=skip; proceeding (override is logged).")
      process.exit(0)
    }
    console.error("\nSet ADR_ENFORCE=skip to override (logs an override).")
    process.exit(1)
  }
  console.log("[ADR-COMPLIANCE] OK: derived state is consistent with the event log.")
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
