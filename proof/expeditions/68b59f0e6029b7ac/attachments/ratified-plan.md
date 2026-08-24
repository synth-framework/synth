# Ratified CLI Consolidation Plan — Expedition 68b59f0e

Canonical record of all operator-approved decisions for the verb-consolidation work under Mission "Framework Maturation v2". Supersedes prior drafts.

## Ratified decisions
- **E (mission-approval-while-executing gate): a + b.** Keep the hard gate. Improve message to name the blocking expedition + status + next step. Add explicit `mission approve --complete-first` that closes the *same-mission* executing expedition, then approves. No silent relax.
- **G (discovery-phase gate): recommendation a + b + c.** Phase-aware message (state phase + allowed commands). Allow read-only introspection through during discovery (`status`/`explain`/`log`/`help`/`capabilities`/`doctor`). Add `--discovery-ok` hatch to force past for mutating commands.
- **F (.synth audit): 3-part resolution.**
  1. `.gitignore`: ignore `.synth/data/cli-errors.jsonl`, `.synth/data/drafts/`, `*.integrity.json`, `.synth/ai/`, `.synth/context.json`, `.synth/discovery/`, `.synth/AGENT_CONTRACT.md` — with negated exceptions keeping `event-log.jsonl` + `canonical-state.json` tracked (they are the durable replay source).
  2. Reconcile contract (AGENTS.md / SYNTH block): event-log + canonical-state are the **committed durable replay source**, not "derived."
  3. **Versioning fix (deeper, separate expedition):** add `schemaVersion` to every event + a migration registry; version canonical-state by schema.
- **Verb floor: ~11 (stretch fold accepted).** `capabilities`→`status capabilities`, `adapter`→`status adapters`/`status adapter <name>`, `doctor`→`status health`, `snapshot`→`repo snapshot`.
- **Mitigation for status flag-soup: accepted.** Use **sub-queries** (`status capabilities`/`adapters`/`health`), not flat `--flags`; `status --help` self-documents. `explain` stays analysis hub; `repo` owns git-tagged snapshots. Nothing deleted — re-homed.
- **Handler: unified `resolveContext()` + `guard()` middleware + top-level dispatcher (help / explain-default).** Matches dependsOn model (gate enforcement hard, inference advisory).

## Implementation phases (overview)
- **Phase 0 (zero-risk):** `help` (B) + `explain` default (A) + F mechanical (gitignore/contract).
- **Phase 1:** `resolveContext()` + `expedition new` (C/D/H context inference).
- **Phase 2:** E & G gate message + escape hatches (no silent relax).
- **Phase 3:** verb folds (explain status→status, report→status, verify→validate, project→docs, init unification, remove genesis/intent/migrate).
- **Phase 4:** meta-redundancy housekeeping — retire `70a5c5ed` as superseded → `expedition complete 68b59f0e`.
- **Separate expedition:** event-schema versioning + migration registry (F.3).

## F taxonomy (tracked vs derived)
- **Tracked (source of truth):** `.synth/manifest.json`, `.synth/config.yaml`, `.synth/data/event-log.jsonl`, `.synth/data/canonical-state.json`.
- **Derived / ignore:** `.synth/data/cli-errors.jsonl`, `.synth/data/drafts/`, `*.integrity.json`, `.synth/ai/`, `.synth/context.json`, `.synth/discovery/`, `.synth/AGENT_CONTRACT.md`, `.synth/cache/`.
