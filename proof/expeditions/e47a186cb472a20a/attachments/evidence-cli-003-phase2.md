# EXP-CLI-003 Phase 2 — ambient root resolution

**Expedition:** `e47a186cb472a20a` (executing) · **Branch:** `arena/d5e4625c-synth`
**Source commit:** `3b12147` · **Baseline:** `2a7296c` · **Date:** 2026-10-14
**Build rootHash:** `3a59324b21f9be0f` → `85a97f1c872cdb7c`

## What was wrong

Five module-scope captures froze the ambient working directory at import time and then served
it as a constructor default forever after:

| Site | Constant | Resolved to |
| --- | --- | --- |
| `src/infra/checkpoint-store.ts:11` | `CHECKPOINT_FILE` | `<dataDir(cwd at import)>/checkpoints.json` |
| `src/infra/event-store.ts:13` | `EVENT_LOG_FILE` | `<dataDir(cwd at import)>/event-log.jsonl` |
| `src/infra/event-store.ts:14` | `EVENT_STREAM_DIR` | `<dataDir(cwd at import)>/event-stream` |
| `src/infra/state-store.ts:12` | `STATE_FILE` | `<dataDir(cwd at import)>/canonical-state.json` |
| `src/infra/state-store.ts:13` | `SNAPSHOTS_DIR` | `<dataDir(cwd at import)>/snapshots` |

A store built after a `process.chdir()`, or by a caller inspecting another project or a fixture,
pointed at whichever directory happened to be current when the module was **first loaded** — a
fact decided by import order, not by the caller. `event-store.ts:33` already carried a comment
admitting this ("the `EVENT_LOG_FILE` / `EVENT_STREAM_DIR` constants above are bound to
`process.cwd()` at module load") while `locateEventLog` twelve lines below it took the root
explicitly. The fix follows that existing precedent rather than inventing one.

This is also the precondition for the remaining phases: a verb loader cannot be pointed at an
explicit root while the stores underneath it decide their own root at import time.

## What changed

Each constant became an exported resolver taking `root: string = process.cwd()`, so the default
is evaluated **at call time** and a caller that knows its root can pass it:

```ts
export function stateFile(root: string = process.cwd()): string {
  return path.join(dataDir(root), "canonical-state.json")
}
```

Constructors take an optional path and resolve with `?? resolver()` — the shape `EventStore`
already used (`this.filePath = filePath ?? EVENT_LOG_FILE`), now applied to `CheckpointStore`,
`StateStore`, `PartitionStore` and `SegmentStore` too.

**One deliberate behaviour change.** `StateStore.snapshot()` and `loadSnapshot()` used the
cwd-bound `SNAPSHOTS_DIR` even when the store was constructed against an explicit path, so a
temp-rooted or fixture-rooted store wrote snapshots **into the operator's checkout**
(`.synth/data/snapshots`). Snapshots now co-locate with the store's own state file via
`path.dirname(this.filePath)`. Identical for a default-constructed store; correct for every other
one; the same class of artifact leak EXP-CLEAN-001 tracks as D6. No test asserted the old
behaviour (`grep -rn "\.snapshot(\|loadSnapshot(" tests` → no matches).

**Paths became observable.** `getFilePath()` on `StateStore` and `CheckpointStore`, `getBaseDir()`
on `PartitionStore` and `SegmentStore`, mirroring the accessor `EventStore` already had. Callers
and tests can verify which root a store resolved to without reaching into private state.

## Guard

`tests/ambient-root-resolution.test.js` — new, 6 tests, 52–72 ms. Registered as task
`test:ambient-root-resolution` (`data/tasks/test:ambient-root-resolution.task.json`), npm script
delegating through `scripts/task-adapter-shim.js` as `tests/task-npm-adapter.test.js` requires, and
appended to the `test:all` chain (**115 → 116 segments**).

It holds the fix three ways:

1. **Static scan** — asserts no `^(const|let|var) … process.cwd()` binding exists anywhere in
   `src/**/*.ts`, and likewise no module-scope `process.env` / `process.on()`. The failure message
   names the offending file and line, so a regression says where it happened. This is the part that
   makes the fix permanent rather than merely current.
2. **Behavioural** — imports the modules under one working directory, then `chdir`s to a second and
   a third, constructing all five stores after each move and asserting the resolved paths follow the
   directory at construction time. A store built after the move must not contain the earlier path.
3. **Equivalence** — asserts default-constructed paths are byte-identical to
   `path.join(dataDir(cwd), …)`, i.e. to what the old constants produced.

Plus an explicit-root test and the snapshot co-location test (a temp-rooted store writes one
snapshot beside its own state file, reads it back, and the checkout's snapshot directory is
byte-identical before and after).

## Measured

Deterministic, from `node scripts/audit-module-graph.js`:

| Entry | Phase 1 baseline | Phase 2 | Δ |
| --- | --- | --- | --- |
| `dist/cli/entry.js` | 147 modules / 972 KB | **147 / 976** | +0 modules, +4 KB |
| `dist/main.js` | 171 / 1099 KB | **171 / 1103** | +0 modules, +4 KB |
| `dist/cli/synth.js` | 298 / 2278 KB | **298 / 2282** | +0 modules, +4 KB |
| unreachable | 44 of 348 modules / 2855 lines | **44 of 348 / 2855** | unchanged |

No new dependency, no new module, no new load. The 4 KB is the five resolvers and their doc
comments. `node scripts/audit-unused-exports.js` lists none of the nine new names as candidates —
every one is imported by the guard test.

**No timing claim is made from this phase.** Labelled runs on both builds, compared with the
script's own control-adjusted method (`--label`/`--json-out`/`--compare`), gave:

```
CONTROL-ADJUSTED DELTAS   A=phase1  B=phase2
  control "entry.js explain replay" drift: -1.8 ms
  floor node -e '1'           25.2    28.2     3.0     4.8  slower
  entry.js --version          96.3   112.8    16.5    18.3  slower
  entry.js help              103.7   104.8     1.1     2.9  slower
  entry.js status            186.7   224.1    37.4    39.2  slower
  synth.js --version         182.8   166.1   -16.7   -14.9  faster
  synth.js help              188.1   165.0   -23.1   -21.3  faster
  synth.js status            258.2   276.6    18.4    20.2  slower
```

The bare-process floor moved by 4.8 ms control-adjusted on a 2-core box, and the two `synth.js`
rows moved *faster* by more than the two `entry.js` rows moved slower — the spread is machine
noise, not a signal. The script says so itself: "Module counts are deterministic and should carry
any load-budget claim; milliseconds here are advisory." The load budgets (`--version` ≤ 45 ms,
`status` ≤ 130 ms, `explain replay` ≤ 110 ms, dispatcher ≤ 25 modules / 150 KB) remain **unmet**
and belong to Phases 3–4, which change what gets loaded rather than when a path is joined.

## Blast radius

Every test that constructs these stores, run directly:

| Test | Result |
| --- | --- |
| `tests/synth.test.js` | rc=0, 125 assertions pass |
| `tests/replay-graph-integrity.test.js` | rc=0, 18 pass |
| `tests/graph-integrity.test.js` | rc=0, 15 pass |
| `tests/replay-verifier-status.test.js` | rc=0, 3 pass |
| `tests/first-contact-replay.test.js` | **rc=1 — pre-existing** |
| `tests/governance/execution-gate-regression.test.js` | **rc=1 — pre-existing** |

The two failures are **not** caused by this change, and that was verified rather than assumed: the
Phase-2 work was stashed, the pre-change source rebuilt (rootHash returned to `3a59324b21f9be0f`,
matching the Phase-1 baseline exactly), and both tests re-run — `rc=1` on both, with the same
messages:

- `first-contact-replay.test.js`: `ASSERTION FAILED: replay should be consistent: State divergence
  detected (5 differences); first: stateHash, missions.mission-…, expeditions.expedition-…`. The
  mission and expedition ids differ between runs because the test materializes a fresh project each
  time; the failure mode is identical. Consistent with the already-drafted findings that
  `materialize()` returns an `eventLogPath` it never creates and `createFromFile` builds over
  `os.tmpdir()` (draft `03f9134a5ecbde03`).
- `execution-gate-regression.test.js`: `ERR_MODULE_NOT_FOUND: Cannot find module
  '/home/user/synth/tests/governance/helpers/workspace.js'` — a missing helper file, unrelated to
  any store.

A first attempt at this comparison printed `rc=0` for both because the `printf` expanded
`$(basename …)` before `$?`, reporting `basename`'s exit status instead of the test's. The
measurement was redone with `rc=$?` captured immediately after each run; the numbers above are from
the corrected pass.

## Remaining in this expedition

- **Phase 3** — slim `status-light` off its 134-module / 916 KB eager graph; a verb→loader registry
  so the dispatcher stops importing 97 `cmd*` handlers through one 9121-line `synth.ts`; repoint
  `scripts/cli-harness.js:24` at the thin entry.
- **Phase 4** — a load-budget guard derived from `audit:module-graph`, so the budgets above become
  enforced numbers instead of prose. Note the audit currently reports through the task shim without
  surfacing its counts in the task report (`durationMs 82`, no graph in the JSON envelope), which
  the guard will have to address.
