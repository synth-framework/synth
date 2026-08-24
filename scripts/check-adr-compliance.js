// ============================================================
// ADR COMPLIANCE CHECK (ADR-051 / ADR-053)
// ============================================================
// Enforces the CORRECTED model: canonical-state.json is a committed,
// regenerable snapshot of the immutable event log (the sole source of
// truth). The rule is CONSISTENCY, not a blind "never touch derived files":
//   - a protected derived path may change ONLY when the event log changes
//     in the same changeset (state flows from events), and
//   - canonical-state.lastEventOffset must equal the event-log line count
//     (the derived snapshot is in sync with its source).
// This catches hand-edits (SDK / raw fs / shell / git) regardless of how
// the file was written, because it inspects the outcome, not the write call.
// ============================================================

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { execFileSync } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

const DEFAULT_ENFORCEMENT = {
  citation: "ADR-051",
  sourceOfTruth: ".synth/data/event-log.jsonl",
  protectedDerivedPaths: [".synth/data/canonical-state.json", "docs/generated/"],
}

function loadEnforcement(root) {
  const p = path.join(root, ".synth", "adr-enforcement.json")
  try {
    return { ...DEFAULT_ENFORCEMENT, ...JSON.parse(fs.readFileSync(p, "utf-8")) }
  } catch {
    return DEFAULT_ENFORCEMENT
  }
}

export function evaluate({ repoRoot, stagedFiles, canonicalState, eventLogLineCount }) {
  const enf = loadEnforcement(repoRoot)
  const violations = []
  const staged = new Set(stagedFiles)
  const src = enf.sourceOfTruth

  for (const p of enf.protectedDerivedPaths) {
    const matched = p.endsWith("/")
      ? [...staged].some((f) => f.startsWith(p))
      : staged.has(p)
    if (matched && !staged.has(src)) {
      violations.push(
        `${p} is modified without ${src} in the same changeset (${enf.citation}: derived state must equal replay of the event log)`,
      )
    }
  }

  if (canonicalState && typeof canonicalState.lastEventOffset === "number") {
    if (canonicalState.lastEventOffset !== eventLogLineCount) {
      violations.push(
        `canonical-state.lastEventOffset (${canonicalState.lastEventOffset}) != event-log events (${eventLogLineCount}) (${enf.citation}: derived snapshot out of sync with source of truth)`,
      )
    }
  }

  return { ok: violations.length === 0, violations }
}

function getStagedFiles(root) {
  try {
    const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
      cwd: root,
      encoding: "utf-8",
    })
    return out.split("\n").map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function main() {
  const root = REPO_ROOT
  const enf = loadEnforcement(root)
  const staged = getStagedFiles(root)

  let canonicalState = null
  let eventLogLineCount = 0
  try {
    canonicalState = JSON.parse(fs.readFileSync(path.join(root, ".synth/data/canonical-state.json"), "utf-8"))
  } catch {
    // missing canonical-state is not our concern here
  }
  try {
    const raw = fs.readFileSync(path.join(root, enf.sourceOfTruth), "utf-8")
    eventLogLineCount = raw.split("\n").filter(Boolean).length
  } catch {
    // missing event log is not our concern here
  }

  const { ok, violations } = evaluate({ repoRoot: root, stagedFiles: staged, canonicalState, eventLogLineCount })

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
