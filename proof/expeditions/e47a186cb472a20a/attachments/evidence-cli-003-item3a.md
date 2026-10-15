# EXP-CLI-003 item 3, first step — the four helper clusters extracted once

**Expedition:** `e47a186cb472a20a` (executing) · **Branch:** `arena/d5e4625c-synth`
**Source:** `655bb42` (extraction) + `eae1883` (governance) + rebaseline · **Baseline:** `eabbb47`
**dist-manifest:** 1050 → **1062** files, rootHash `850e7aa08f79bbec` → **`76191d7beaa888d1`**

## Why this step comes first

Item 3 asks for a verb → loader registry with per-namespace dynamic imports, and says explicitly:
*"Extract the helper clusters ONCE into modules of their own so handlers move without duplicating
them — duplication is exactly how entry.ts and synth.ts drifted apart in the first place."* Moving
handlers first would have meant either copying these helpers into each namespace module or importing
them back from `synth.ts`, which keeps the monolith heavy and creates a cycle.

## What moved

One contiguous 524-line region of `synth.ts` (lines 172–695) containing **no `cmd*` handler**, split
on the four clusters the goal names:

| Module | Lines | Contents |
| --- | --- | --- |
| `src/cli/cli-args.ts` | 76 | `setAgentTelemetryFromFlags`, `parseArgs` |
| `src/cli/auto-commit-ceremony.ts` | 140 | `bootstrapWithCapabilities`, `markCeremony`, `installExitFlush`, `flushPendingCeremony`, `wrapHandleIntentWithCeremony`, `LedgerCommitInfo`, and the state `pendingCeremony` / `exitFlushInstalled` |
| `src/cli/gate-reporting.ts` | 41 | `gateDecision`, `printGateBlock` |
| `src/cli/working-tree.ts` | 364 | the eleven git/working-tree helpers the goal names, plus `collectDerivedStateFilesRecursive`, `listIgnoredPaths`, `isAutoCommitScoped`, `stageAutoCommitPaths`, `AutoCommitResult` |

`synth.ts`: **9121 → 8609 lines**. All 20 goal-named helpers accounted for. Module-scope state moved
with the code that reads it, so no cluster reaches into another's variables.

## Method: imports resolved by the compiler, then pruned

Rather than hand-writing imports for 531 moved lines, each new module was given `synth.ts`'s own
77-statement import block verbatim — safe because all four sit in `src/cli/`, so every relative
specifier is identical — and `tsc` then enumerated what was unresolved (78 errors, 24 distinct
names). Each module was pruned to the statements it actually references: **1, 5, 3 and 5** kept
respectively, so none inherits the monolith's graph. Two type declarations (`LedgerCommitInfo`,
`AutoCommitResult`) had travelled without being exported, since the extraction script exported
functions only; `tsc` named them and they were exported and imported back. Final: **0 errors**.

**No cycles.** `working-tree` imports none of the four; `auto-commit-ceremony` imports `working-tree`
for `isAutoCommitEnabled`; `cli-args` and `gate-reporting` import only `print`. A DAG.

## One real API change

`autoCommitDisabledByFlag` was a private `let` in `synth.ts` that `main()` assigned (line 8219) and
`isAutoCommitEnabled` read — one variable, two clusters reaching into it. It now lives in
`working-tree.ts` beside its only reader, and the dispatcher sets it through an exported
`setAutoCommitDisabledByFlag()`. One authority for the flag.

## What this does NOT claim

No eager graph shrank, and none was expected to: `synth.js` goes 298 → **302** modules (the four new
files), `entry.js` stays **60 / 273 KB**, `status-light.js` stays **33 / 151 KB**, `main.js` 171 / 1103.
This step builds the shared homes; the dispatcher budget (≤25 modules / ≤150 KB) is closed by the
registry and handler moves that follow.

## Verification

`npm run test:all` **rc=0** in 298.7 s. One precision point: the task shim reports the chain as a
single task (`results: 1, status 0`), not 116 — but `test:all`'s command is a literal `&&` chain of
116 `npm run <segment>` calls, so rc=0 proves every segment exited 0. Targeted battery also green:
loader-entrypoint (nine byte-identity guards), synth.test.js (125 assertions), ambient-root-resolution
(6), verify-engine (10), artifact-policy (8), governance-orchestration (12), impact-analyzer (11),
auto-commit-ignored-paths (2), ledger-ceremony (7), expedition-auto-commit (6), execution-commit (4),
no-write-on-read.

The four source-path guards the goal names — `verify-engine`, `artifact-policy`,
`governance-orchestration`, `impact-analyzer` — reference `src/cli/synth.ts` **by path** and all pass:
the file was emptied of four clusters, not renamed or split.

## A red guard found while doing this, and the correction

`tests/artifact-policy.test.js` was **already failing on this branch before item 3 touched anything**,
and it took this step to surface it because artifact-policy had not been in the item-2 battery.
`check-artifact-policy` reported `.synth/data/drafts/e47a186cb472a20a.json` as tracked on
`origin/main` but untracked here with no manifest entry. Verified pre-existing rather than assumed:
the file is absent from `337a72f`, `550a581` and `eabbb47` alike, and was removed by `1423d53`, the
ceremony-consolidation commit from the branch recovery — the `expedition commit` ceremony had already
retired the draft, as ADR-055 §2 requires. The removal is intended, so it is recorded as entry #5 in
`docs/artifact-removals.json` (`eae1883`) rather than reverted; `check-artifact-policy` now PASSes on
2204 tracked paths. Consequence adopted: the four source-path guards go into every battery from now on.

The three timestamped `proof/certifications/certification-report-*.json` files the chain drops were
removed rather than committed — regenerable byproducts of one run, with 12 already tracked from
earlier runs. Growing that set is the artifact leak EXP-CLEAN-001 tracks as D6.

## Remaining in item 3

The verb → loader registry itself: per-namespace dynamic imports (mission, expedition, ledger
deliver/seal, explain, first-contact, task, repo, adapter, doctor/checkpoint, log, validate,
governance) replacing the `switch (namespace)` at `synth.ts:8412`, with the 97 `cmd*` handlers moving
into namespace modules that import these four clusters. Then item 4 (repoint
`tests/helpers/cli-harness.js:24`, after proving the ceremony verbs equivalent — mission 427 and
expedition 394 invocations are 52% of all calls) and item 5 (the derived load-budget guard, proven
with a deliberate temporary regression).
