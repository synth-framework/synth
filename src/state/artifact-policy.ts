// ============================================================
// STATE: Artifact policy — one classification for SYNTH artifacts
// ============================================================
// SYNTH keeps five kinds of artifact in a repository, and every mechanism
// (.gitignore, the auto-commit file list, the completion gate, CI) used to
// encode its own guess about which is which. They disagreed: 28 files were
// tracked *and* ignored, auto-commit aborted on ignored paths, and read-only
// commands rewrote tracked projections (audit D1–D8).
//
// This module is the single table. Everything else derives from it:
//   - `src/cli/synth.ts` auto-commit scope + completion-gate exclusion
//   - `scripts/check-artifact-policy.js` (CI guard: index ↔ policy ↔ .gitignore)
//
// Classes:
//   durable  authoritative replay/evidence state — committed, never regenerated
//   input    load-bearing planning inputs (drafts) — committed before use
//   derived  regenerable projections — never committed
//   cache    machine-local, disposable — never committed
//   legacy   superseded artifacts, readable but inert — never committed
// ============================================================

export type ArtifactClass = "durable" | "input" | "derived" | "cache" | "legacy"

export type ArtifactRule = {
  /** Repo-relative path or directory (trailing slash = directory subtree). */
  pattern: string
  class: ArtifactClass
  /** Human note, surfaced by the guard script when a rule is violated. */
  note: string
  /** Optional explicit probe path for the CI guard (when the ignore rule is globbed). */
  probe?: string
}

export const ARTIFACT_RULES: ArtifactRule[] = [
  // durable — the governance record itself
  { pattern: ".synth/data/event-stream/", class: "durable", note: "partitioned event log (source of truth)" },
  { pattern: ".synth/data/canonical-state.json", class: "durable", note: "replay-derived state" },
  { pattern: ".synth/data/expeditions/", class: "durable", note: "expedition records" },
  { pattern: ".synth/data/missions/", class: "durable", note: "mission records" },
  { pattern: ".synth/data/snapshots/", class: "durable", note: "certified mission snapshots" },
  { pattern: ".synth/data/referenceEvidence/", class: "durable", note: "evidence references" },
  { pattern: ".synth/data/decisions.jsonl", class: "durable", note: "hash-chained decision record" },
  { pattern: "proof/expeditions/", class: "durable", note: "expedition proof artifacts" },
  { pattern: "AGENTS.md", class: "durable", note: "generated operator contract" },

  // input — planning artifacts that are read before a transition is recorded
  { pattern: ".synth/data/drafts/", class: "input", note: "mission/expedition drafts (approve reads these)" },

  // derived — projections, regenerated on demand (`synth ai refresh`, bootstrap)
  { pattern: ".synth/ai/", class: "derived", note: "agent metadata projections" },
  { pattern: ".synth/context.json", class: "derived", note: "workspace context projection" },
  { pattern: "docs/generated/.gitkeep", class: "durable", note: "directory placeholder (rules are first-match-wins)" },
  { pattern: "docs/generated/", class: "derived", probe: "docs/generated/probe.md", note: "generated documentation projections" },
  { pattern: ".synth/discovery/", class: "derived", note: "discovery baselines" },

  // cache — never committed, content-addressed, safely deletable
  { pattern: ".synth/cache/", class: "cache", note: "content-keyed caches" },
  { pattern: ".synth/data/dependency-records-cache.json", class: "cache", note: "legacy mtime cache (superseded)" },
  { pattern: ".synth/anchor/", class: "cache", note: "ledger anchor worktree (ADR-055)" },
  { pattern: ".synth/worktrees/", class: "cache", note: "expedition worktrees (ADR-055 P3)" },

  // legacy — superseded by the partitioned event stream, kept readable only
  { pattern: ".synth/data/event-log.jsonl", class: "legacy", note: "stale monolithic event log (262 events)" },
  { pattern: ".synth/data/cli-errors.jsonl", class: "legacy", note: "debug log; the event log is the audit trail" },
]

const COMMITTABLE: ArtifactClass[] = ["durable", "input"]

function matches(pattern: string, relPath: string): boolean {
  if (pattern.endsWith("/")) return relPath === pattern.slice(0, -1) || relPath.startsWith(pattern)
  return relPath === pattern
}

/** Class of a repo-relative path, or undefined when the path is not a governed artifact. */
export function classifyArtifact(relPath: string): ArtifactClass | undefined {
  const normalized = relPath.replace(/^\.\//, "").replace(/\\/g, "/")
  for (const rule of ARTIFACT_RULES) {
    if (matches(rule.pattern, normalized)) return rule.class
  }
  return undefined
}

export function isGovernedArtifact(relPath: string): boolean {
  return classifyArtifact(relPath) !== undefined
}

export function isCommittableArtifact(relPath: string): boolean {
  const klass = classifyArtifact(relPath)
  return klass !== undefined && COMMITTABLE.includes(klass)
}

/** True for artifacts whose churn must never block completion. */
export function isExcludedFromCompletionGate(relPath: string): boolean {
  return isGovernedArtifact(relPath)
}

// ------------------------------------------------------------
// Auto-commit scope
// ------------------------------------------------------------
// Directory pathspecs (not file lists): `git add -A -- <dir>` stages
// additions, modifications and deletions, and never fails on ignored content
// the way an explicit file list does (audit D1).

export const AUTO_COMMIT_INCLUDE_ROOTS = [".synth/data", "proof/expeditions", "AGENTS.md"]

/** Repo-relative committable paths that live under the include roots. */
export function committableArtifactsUnderIncludeRoots(): ArtifactRule[] {
  return ARTIFACT_RULES.filter(
    (rule) =>
      COMMITTABLE.includes(rule.class) &&
      AUTO_COMMIT_INCLUDE_ROOTS.some((root) => matches(root, rule.pattern) || matches(rule.pattern, root)),
  )
}

/**
 * Pathspec exclusions for the auto-commit `git add`: every non-committable
 * artifact that lives inside an include root (e.g. the stale monolith, the
 * debug log and the legacy cache inside `.synth/data/`).
 */
export function autoCommitExcludePathspecs(): string[] {
  return ARTIFACT_RULES.filter(
    (rule) => !COMMITTABLE.includes(rule.class) && AUTO_COMMIT_INCLUDE_ROOTS.some((root) => matches(root, rule.pattern)),
  ).map((rule) => `:(exclude)${rule.pattern.replace(/\/$/, "")}`)
}
