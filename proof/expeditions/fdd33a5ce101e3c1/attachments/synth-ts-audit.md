# synth.ts Deep Audit & Lazy-Load Decomposition Findings

**Context:** Audit requested during the chunk-event-log feature work (PR #333 / expedition `886dc15`). The question was why `src/cli/synth.ts` grew to ~7.9k lines despite an established modular + lazy-loading intent, and what lives inside it.

**Date:** 2026-08-26
**Author:** agent (under operator direction)

---

## 1. Executive summary

- `src/cli/synth.ts` = **7,913 lines**, **172 top-level declarations**, **60 `bootstrap()`/`bootstrapWithCapabilities()` call sites**, **26 `cmd*Help` functions**.
- It is a **god module**: every core command namespace is implemented inline rather than in its own module.
- The lazy-loading boundary that *was* built (`src/cli/entry.ts`) only splits **light vs heavy** — light = `version`/`help`/`status`/`explain replay|identity|resume|governance`. Everything else still loads the entire `synth.ts` graph, which internally runs the **13-step bootstrap on every command**.
- Telemetry shows **85–95% of per-command time is module-load + bootstrap**, not feature logic. This is the dominant cost behind the slow `expedition-lifecycle` test (~105 CLI commands → ~8–9 min).
- Root cause of size: features were **appended directly into `synth.ts` across 50 commits**; modular extraction was applied only ad hoc to leaf commands, never to the core.

---

## 2. What is inside (structural map)

Functional areas (line spans in `synth.ts`):

| Area | Lines | Notes |
|---|---|---|
| Shared git / derived-state / auto-commit | 286–585 | ~300 lines of cross-cutting concern embedded inline |
| Doctor / replay / event-chain checks | 602–848 | read-only diagnostics |
| Checkpoint | 848–978 | |
| Certify | 978–1020 | |
| Validate / govern / execution-plan | 1020–1403 | |
| Help renderers | 1403–1681 | 26 `cmd*Help` functions (duplicated static text) |
| Discover | 1476–1573 | |
| Intent | 1681–1936 | create/refine/submit/approve |
| Alignment | 1936–2347 | create/submit/approve/prepare (~410 lines) |
| **Expedition lifecycle** | **5211–7083** | **~1,872 lines — the single largest block** |
| Mission | 3207–3906 | ~699 lines |
| Program / Expedition listing-show-report | 3906–4827 | |
| Repair | 4827–5204 | replay / state |
| Docs / Explain / Adapter | 7083–7282 | |
| **`main()` dispatch (god function)** | **7483–7904** | 421-line switch with nested per-namespace switches |

---

## 3. Why it grew (history)

- `git log --follow` on `synth.ts` shows **50 commits**, continuous accretion. Examples:
  - `196fd4f` "Event-log query CLI" → appended `cmdLog`
  - `1d118a1` "Pre-flight dry-run for expedition lifecycle" → appended handlers
  - `04b32b2` "Human-readable --human output mode" → appended
  - `3995413` "thin entrypoint decouples synth.js via lazy-load" → created `entry.ts` (light/heavy split) **but left the implementations in `synth.ts`**
- **Inconsistent extraction:** only 7 namespaces have their own module (`adapter`, `approval`, `repo`, `migrate`, `first-contact`, `agent-guide`, `explain-observability`) — mostly leaf/newer commands. The heaviest core (`expedition` = 1,872 lines, `mission` = 699) stayed in `synth.ts`. New commands kept landing there.
- The "modular + lazy from the beginning" intent produced the **entry boundary** but never the **per-command-group modules**. So within "heavy", nothing is lazy.

---

## 4. Code-quality / logic findings

1. **God module / SRP violation.** 7,913 lines handling 20+ namespaces in one file.
2. **Per-command full bootstrap (60 call sites).** Every command re-runs the 13-step bootstrap; the dominant cold-start cost (telemetry: 85–95% per-command overhead). Should be a singleton/lazy provider, not 60 call sites.
3. **Duplicated approval flows.** `cmdMissionApprove` (3366), `cmdExpeditionApprove` (5477), `cmdIntentApprove` (1892), `cmdAlignmentApprove` (2145) — 4 parallel implementations; should collapse to one `approveEntity` helper.
4. **Duplicated listing/show/rank.** `cmdExpeditionList`/`cmdProgramList`, `cmdExpeditionShow`/`cmdProgramShow`/`cmdMissionShow`, `cmdExpeditionRank`/`cmdProgramRank` repeat the same shape across namespaces.
5. **Divergent `explain replay` duplicate (live, not dead).**
   - Light path (`src/cli/explain-replay-light.ts:35` `runExplainReplay`) used by `entry.ts` → uses `createInfra` + `paths.legacyLogPath`.
   - Heavy path (`synth.ts:7151` `cmdExplainReplay`) reached when `synth.js` is invoked directly → uses `bootstrap` + `paths.logPath`.
   - Two implementations of the same command, two store builders, two path fields. They currently converge (both path fields = `eventLogFile(projectRoot)`) but are separate sources of truth that can drift. **Recommended deletion target** for the decomposition.
6. **26 `cmd*Help` functions** — verbose duplicated static help text; should be a metadata table + single renderer.
7. **Inline cross-cutting concerns** — ~300 lines of git/derived-state/auto-commit logic embedded inline rather than in a shared module.
8. **`main()` god-function** (7483–7904) with nested switches per namespace; dispatch is O(namespace × subcommand) inline.

---

## 5. explain-replay path bug (root cause + fix)

- **Symptom:** `synth explain replay` reported `eventCount: 0` even though events existed.
- **Root cause:** `resolveExplainPaths` (`src/cli/explain-paths.ts`) defaulted `logPath` to `…/data/event-stream` (the **directory**). The partitioned store's `partitioned` heuristic keys off `basename(eventLogPath) === "event-log.jsonl"` to route to the segmented store; passing `event-stream` broke that routing, so `loadAll()` read 0 events.
- **Fix:** default `logPath` now `eventLogFile(projectRoot)` (the canonical path), letting the store route to `event-stream` internally. Verified: `governance-lifecycle-contract.test.js` now passes (exit 0, "Replay reconstructs governance statuses without divergence").
- **Principle reinforced (operator direction):** stop debugging the *file format*; ensure events are consistent, fetchable, and writable through the SDK. The partitioned store is authoritative via `event-stream`; `readAuthoritativeEventLog` (exported from `governance-resolver.ts`) reads segments + monolith fallback. Many tests still `fs.writeFile(event-log.jsonl, …)` directly — an anti-pattern to address separately.

---

## 6. Performance telemetry (from instrumented brownfield runs)

Runs used `tests/helpers/perf-runner.js` (DRY `createPerfRunner` capturing per-command elapsed + CLI `[telemetry]` spans), wired into `expedition-lifecycle`, `governance-lifecycle-contract`, `brownfield-validation`, `brownfield-certification`.

- `bootstrap` (13-step): **6–15 s**
- Each CLI command: **3.5–15 s**
- Gate spans (feature logic): **300–650 ms**
- ⇒ **Per-command cold-start/initialization dominates (~85–95%).**
- `expedition-lifecycle.test.js` spawns **105 CLI commands** → ~8–9 min of pure overhead.

---

## 7. Continuation options (presented to operator)

- **A. Land PR #333 now** — commit/push correctness fixes on `886dc15`, verify `full-govern`, merge. Leave `synth.ts` for later.
- **B. Decompose `synth.ts` (this expedition's goal)** — extract command groups into `src/cli/commands/*` and dynamic-import in `main()`; begin with deleting `cmdExplainReplay` + extracting `expedition`/`mission` groups.
- **C. Quick cold-start win** — make the 13-step `bootstrap` lazy/singleton to cut per-command overhead and unblock the CI timeout; lower risk than B.
- **D. Quality triage first** — delete the `cmdExplainReplay` duplicate, collapse the 26 help fns + 4 approval flows into shared helpers.
- **E. Plan only, no code** — write a detailed decomposition plan/ADR for approval before refactoring.

---

## 8. Recommended decomposition plan (for this expedition)

1. **Delete `cmdExplainReplay`** (synth.ts:7151) and route `main()`'s `explain replay` case to the shared light handler — removes a divergent duplicate.
2. **Extract `expedition` group** (1,872 lines) → `src/cli/commands/expedition.ts`; dynamic-import in `main()`.
3. **Extract `mission` group** (699 lines) → `src/cli/commands/mission.ts`.
4. **Collapse duplication:** one `approveEntity` helper; metadata-driven `cmd*Help`.
5. **Make bootstrap a lazy singleton** (option C) to attack the 85–95% cold-start immediately, independently of the file move.
6. Larger groups (alignment, intent, repair, program) follow the same pattern.

Biggest single win: extracting `expedition` + `mission` removes ~2,570 lines (32%) from `synth.ts` and enables true per-command lazy loading.
