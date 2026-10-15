# EXP-CLI-003 item 5 — derived load-budget gate

## Scope and verdict

Item 5's deterministic load guard is implemented, registered, chained, tested, and regression-demonstrated. This is NOT a claim that every CLI argument combination has been traced, that all tests in the repository are green, or that status always meets its latency target. The clean-checkout timing sample meets the three absolute median targets; the dirty-checkout sample does not meet the status target. Both samples are retained below and attached. EXP-CLI-003 remains executing; this evidence does not complete/deliver/seal it or authorize downstream LIFE-002 work.

Starting evidence commit: `8e84ed0e43a31369194c541531a8b42d2f4d9b81` (item 4).
Implementation and validation commits, each pushed immediately after committing:

- `cb426ac`: defer mission/expedition mutation lifecycle helpers to their consumers.
- `11cedfa`: replay imports EXPEDITION_STATUSES from its defining module rather than the type barrel; mutation gates and convergence evaluation load only when needed.
- `719e774`: compiled AST graph, runtime tracing, reviewed budgets, fail-closed guard tests and test:all registration; repository status uses the existing infra factory and RuntimeEngine.getState without building a mutation plane.
- `16616e3`: deliberate certification projection rebaseline after the full chain.

## What is derived and what is fixed

`node scripts/check-cli-load-budget.js --json` reads the current built JavaScript, not a saved measurement table. `scripts/lib/module-graph.js` uses the TypeScript parser for static imports/reexports, side-effect imports and literal dynamic imports. Missing roots/relative JS edges and parse errors fail loudly. Computed dynamic imports are not guessed by static analysis; actual probe loads cover the exercised branches. Node builtins and third-party packages are outside these repository-dist module counts.

The original denominator is permanently 348. The ordinary whole-invocation ceiling remains floor(348 * 0.40) = **139**. The current 399-module build cannot inflate it. Reviewed static entry budgets cover package.json bin/main plus compatibility synth.js and status-light.js; a newly declared unbudgeted entry fails. Dispatcher limits remain 25 modules / 150 KiB, with a separate prohibition on eager handler imports even when they fit below the count limit.

Every default guard run launches 15 fresh shipped CLI processes with the load hook. Synchronous JSONL tracing records successfully loaded repository dist JS files; counts are deduplicated and bytes measured exactly. The guard rejects failed/timed-out/killed processes, wrong/missing/error output, empty/malformed/out-of-build traces and missing static dependencies from any traced module. It does not turn instrumentation duration into startup evidence. Unknown flags cannot disable probes or select a green subset.

`npm run test:cli-load-budget` rebuilds first and runs 18 tests, including the entire real probe matrix. It is the final segment of test:all. `scripts/audit-module-graph.js` now shares the AST implementation; its obsolete claim that the shared harness targets synth.js was corrected. Compatibility consumers still exist, and the old --no-harness-root flag spelling remains supported.

## Measured results

Final dist: **1203 files**, rootHash **b93b49e19cc03d6700daa312c7dff9378bbb8700e49eba94e0cb9aa8dbc96681**. Current build has 399 JS modules; this is informational only, not the acceptance denominator.

| Static entry | Modules | Bytes |
|---|---:|---:|
| shipped cli/entry.js | 18 | 51,627 |
| compatibility cli/synth.js | 40 | 181,191 |
| main.js | 171 | 1,129,809 |
| distribution/mcp-server.js | 1 | 10,057 |
| cli/status-light.js | 33 | 154,405 |

All invocations below use the actual repository and shipped entry, with --json. Final measurements succeeded. The runtime trace includes transitive dynamic loads, not merely the namespace's eager closure.

| Invocation | Initial modules | Final modules | Final bytes | Limit |
|---|---:|---:|---:|---:|
| --version | 18 | 18 | 51,627 | 25 |
| help | 18 | 18 | 51,627 | 25 |
| status | 140 | 131 | 963,357 | 139 |
| explain replay | 51 | 51 | 189,269 | 139 |
| mission list | 162 | 134 | 1,016,779 | 139 |
| expedition list | 167 | 139 | 1,111,788 | 139 |
| first-contact --dry-run | 113 | 104 | 613,521 | 139 |
| task list | 94 | 85 | 543,581 | 139 |
| repo status | 195 | 113 | 647,319 | 139 |
| adapter list | 42 | 42 | 187,802 | 139 |
| log --limit 1 | 42 | 42 | 196,017 | 139 |
| validate --diff "" | 116 | 116 | 675,623 | 139 |
| doctor | 192 | 192 | 1,282,626 | 192 exception |
| checkpoint | 205 | 205 | 1,366,149 | 205 exception |
| bootstrap . --dry-run | 219 | 219 | 1,454,376 | 219 exception |

Initial overages were not relabeled as acceptable. Mission/expedition list were pulling mutation-only lifecycle/gate helpers; replay was pulling type-barrel modules for one runtime constant. Repo status was building policies, planning adapters, capabilities and an ExecutionGate to call RuntimeEngine.getState. It now uses the same createInfra factory and RuntimeEngine replay, not a duplicate state interpreter or stale snapshot. The new test compares full-bootstrap replay against this projection for empty and initialized repositories and verifies unchanged durable files. Mutation commands still use their original bootstrap path. Repository status no longer emits the unused full-bootstrap startup diagnostics; its JSON projection contract is retained.

Three work-specific exceptions are explicit and bounded in scripts/lib/cli-load-budgets.js, not inferred from the new graph size:

- Doctor verifies actual persisted state against event replay using configured runtime infrastructure, as well as dist/chain/ledger health. The guard requires a successful nonempty replay, not the no-log skip path.
- Checkpoint composes operator briefing, real replay verification, and repository-adapter branch validation. A lifecycle/branch refusal is a valid completed measurement only with the expected structured blocked response and successful nonempty replay; an arbitrary failed process is rejected.
- Bootstrap dry-run performs repository analysis and real mission/expedition proposal generation through the in-memory planning engine. The guard requires generated mission proposals, not just a successful help envelope. It does not apply those proposals.

The three exception traces must actually load the runtime; ordinary reads must not. These bounds constrain the current implementation and do not assert that further optimization of those subsystems is impossible. Repo status has NO exception.

## Deliberate regression, observed failure, exact restoration

A temporary real source edit added `import "./commands-expedition.js"` to src/cli/entry.ts. A complete build generated a valid changed dist manifest, so failure was not merely a stale-manifest refusal. The full guard exited **1**: the dispatcher expanded to **56 modules / 353,328 bytes**, exceeded its numeric limits, and reported eager handler loading. Runtime probe failures were also preserved in the attached report.

A finally block restored the original source bytes exactly and rebuilt. The full guard then exited **0**, with the dispatcher back at **18 modules / 51,627 bytes**. The injected import is absent from committed source and the final build. `item5-regression-demonstration.json` records both outcomes, exact-source restoration and final dist identity; the rejected full report is attached separately. No regression branch or bad implementation commit was created.

## Validation, with real counts

- Guard suite: **18/18** tests passed, including parser edge cases, missing imports/roots, cycles, byte accounting, original denominator, tiny eager handler rejection, bad process/output/trace handling, skipped replay refusal, repository replay equivalence, and all 15 actual invocations.
- Registered npm task: exit 0. Full test:all: exit **0**, **275096 ms**, **118 literal chained segments**. The task shim emits one aggregate result; that is not 118 individually captured task reports.
- Existing ceremony parity: **48 passes** (43 paired cases + three scenario parents + two guards), unchanged.
- Four source-path guards remain and pass: verify-engine, artifact-policy, governance-orchestration, impact-analyzer. No spawn call sites or harness targets changed in this item.
- Replay verifier, replay-graph-integrity, runtime-integrity, operator-briefing, mission/expedition rank, auto-commit, evidence and no-write-on-read checks passed.
- The 46 additional consumer suites from item 4 were rerun against item 5: **32 green / 14 pre-existing red**, unchanged; **zero green-to-red regressions**. This is comparison to retained item-4 results, not a newly claimed simultaneous old/new A/B run. Attached per-file results retain every nonzero result.
- Generated certification matrix/reference index were deliberately rebaselined. Only the three newly created untracked certification-report files were removed; tracked certification history was retained.
- Pre-attachment health: verify **6/6**, doctor **12/12**, with **499 actual segmented events** replayed and chained. Doctor --fix repointed the anchor after source/rebaseline commits; no canonical ledger records were hand-edited. The evidence attachment itself adds an event, so post-attachment counts must be read again.

## Timing — preserve the miss, not just the passing sample

Nine-run samples on Node v22.22.3, two sandbox cores, measured without the tracing loader:

| Shipped invocation | Targets | Dirty certification outputs | Clean committed checkout |
|---|---:|---:|---:|
| --version | <=45 ms | 29.1 ms | 27.8 ms |
| status | <=130 ms | **164.3 ms (miss)** | 126.5 ms |
| explain replay (control) | <=110 ms | 87.4 ms | 87.0 ms |

Clean status range: 121.4–131.4 ms; dirty status range: 149.9–217.5 ms. Clean process-floor median: 18.0 ms; dirty: 19.3 ms. The samples bracket the deliberate certification projection commit/removal of new untracked reports, not an identical-state code A/B. Status performs extra validation planning when the tree is dirty. These measurements do NOT establish a general speedup or an unconditional <=130 ms status guarantee. The dirty-state miss is outstanding acceptance context, not erased by the clean sample. Both timing JSON files are attached.

The deterministic load-budget item is complete; broader expedition closure must acknowledge this timing limitation rather than treating a passing count guard as proof of every performance claim.
