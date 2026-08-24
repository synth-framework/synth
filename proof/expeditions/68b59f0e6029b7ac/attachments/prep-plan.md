# Preparation Plan — Execute 68b59f0e Without DRY / No-Op Regressions

Goal: deliver the verb-consolidation + context-inference + gate work **without**
reintroducing the two failure modes we have hit before:
- **DRY violations** — duplicate logic / handlers (seen as: expedition handling
  duplicated at `src/cli/synth.ts:7263` & `:7638`; duplicate *expeditions*
  `70a5c5ed` ≈ `68b59f0e` ≈ `e5fdf756`).
- **No-op changes** — edits that compile but never wire through (dead flags,
  unreferenced helpers, "fixes" that don't move a test from red→green).

## P1 — Lock the architecture (single source of truth)
- `resolveContext()` is the **only** place that infers draft-id / alignment-contract-id / mission / expedition from branch-or-session. No per-command ad-hoc inference.
- `guard()` is the **only** place that renders E / G / F gate messages + escape hatches.
- The top-level command list in `synth.ts` stays the single verb registry. Removals/folds edit it in **one** place; add a `// VERB REGISTRY` anchor + comment mapping each verb → handler so future edits can't silently duplicate.

## P2 — Target mapping table (mechanical transform, not exploration)
Produce a table: current verb → target (keep / fold-to / remove) with the exact
new invocation. Implementation becomes a lookup, not a redesign.
Example rows: `report`→`status --global`; `verify`→`validate verify`;
`bootstrap`→`init --brownfield`; `discover`→`init --analyze`;
`first-contact`→`init --greenfield`; `genesis`→(removed, alias);
`intent`→(removed); `migrate`→(removed); `project AGENTS.md`→`docs agents`;
`capabilities`→`status capabilities`; `adapter`→`status adapters`;
`doctor`→`status health`; `snapshot`→`repo snapshot`; `explain status`→`status`.

## P3 — Type-first for the versioning expedition (separate)
- Define `schemaVersion: number` on the base event interface **before** touching replay.
- Define `MigrationRegistry` interface + `migrate(event, from, to)` before any event-shape edit.
- Enumerate every event type currently emitted; no stub migrations (a missing migration = hard error, not silent skip).

## P4 — TDD gate: every item maps to a red→green test
- Each friction pattern (A–K) and each verb fold gets a **specific** test that
  must go red→green. No change is "done" unless its test passes.
  - A: `synth` / `synth help` lists verbs.
  - B: `synth explain` (no sub) ⇒ replay.
  - C: `expedition approve` with one draft infers it.
  - D: `mission approve` infers latest `alignment prepare`.
  - H: `expedition new` on a mission branch infers mission.
  - E: `mission approve --complete-first` closes same-mission expedition.
  - G: read-only cmd during discovery succeeds; mutating blocked w/ hatch.
  - F: derived `.synth` paths ignored; `git status` clean.
  - Verb folds: old invocation errors with "use X"; new invocation works.

## P5 — Leverage existing guardrails (don't rebuild them)
- Expedition `71ce984c` "DRY/SDK compliance certification" is the CI gate that
  **catches** DRY/no-op — run it per phase, not just at the end.
- Meta-redundancy audit (Phase 4) reuses the framework's duplicate-detection;
  also scan `src/cli/synth.ts` for duplicate handler sites before/after.

## P6 — Phased execution w/ per-phase definition-of-done
| Phase | DoD | Verify |
|---|---|---|
| 0 | help + explain default + gitignore/contract | `synth help` works; `synth explain`⇒replay; `git status` clean |
| 1 | resolveContext + expedition new | C/D/H tests green; echoes resolution |
| 2 | E/G messages + hatches | E/G tests green; dependsOn hard gate still enforced |
| 3 | verb folds | all fold tests green; no orphan handlers in registry |
| 4 | retire 70a5c5ed; complete 68b59f0e | duplicate audit clean; `synth explain replay` consistent |

## Risks & mitigations
- **status flag-soup** → sub-queries, not flat flags (ratified).
- **Weakening dependsOn** → gate enforcement stays hard; inference is advisory only (ratified).
- **Silent wrong-target inference** → every resolution echoed; `SYNTH_STRICT_CONTEXT=1` for CI.
- **No-op** → P4 TDD gate; `71ce984c` cert per phase.

## Out of scope (deferred)
- Governance cluster (`expedition`/`approval`/`certify` consolidation) — held.
- Versioning schema fix — separate expedition.
