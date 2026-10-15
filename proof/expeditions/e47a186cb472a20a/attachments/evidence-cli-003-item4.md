# EXP-CLI-003 — item 4: exercise the shipped dispatcher

**Item 4 is implemented and verified. CLI-003 remains executing, not complete.** Item 5's DERIVED load guard and deliberate-regression proof remain outstanding, as does final whole-invocation load acceptance.

## Commits and order

1. `301a39d` — add and chain the differential ceremony proof **before** changing the harness. Pushed immediately.
2. `41555f0` — change tests/helpers/cli-harness.js from synth.js to entry.js, tie it to package.json bin.synth with an assertion, and fix the shipped error boundary exposed by the first full run. Pushed immediately after the corrected full chain passed.
3. `fca4a30` — fix the four additional green-to-red regressions found outside the resolved chain: shared telemetry on fast paths and installation-relative recursive CLI resolution. Pushed after the four affected tests, parity suite and source-path guards passed.
4. `574df31` — deliberately rebaseline certification matrix and repository-authority index after the final full chain.

The session branch remains arena/d5e4625c-synth. No existing test spawn call-sites were rewritten to make the switch pass. The one shared CLI_PATH changed; the affected contract/orphan tests remained unchanged. Other explicit legacy callers, including the separate task test harness, intentionally remain unchanged under the expedition's scope restriction.

## Ceremony equivalence: effects, not only output

New committed test: `tests/cli-ceremony-parity.test.js`.
New committed fixture-input preload: `tests/helpers/cli-parity-inputs.js`.
Reproduce with `npm run test:cli-ceremony-parity` or `node tests/cli-ceremony-parity.test.js`.

Before switching the harness, **37 paired invocations** passed. Final coverage is **43 paired invocations**, plus three scenario parents and two standalone guards: **48 node:test passes, zero failures/skips**.

For each pair, the test:

- Runs legacy synth.js, then restores the exact pre-command fixture directory at the same absolute path and runs package.json's shipped bin.
- Supplies identical wall-clock, UUID, Math.random, identity, and Git author/committer date inputs. These are explicitly controlled **test inputs**, not timing/performance evidence. The preload is guarded against accidental non-test use and is propagated through real onboarding/task children.
- Compares complete stdout, stderr, and actual exit status. No event IDs, hashes, UUIDs, or timestamps are removed from results to make comparisons pass.
- Hashes every project file outside Git internals and disposable anchor/worktree/cache directories, including canonical state, event-stream segments, drafts, manifests and proof files.
- Separately compares actual Git HEAD, refs, tree hash, working-tree status and history.
- Asserts exactly one commit with the normative message for each selected lifecycle ceremony, a clean ledger after those commits, no writes for read-only cases, no branch advance with --no-auto-commit, and no commit for a refused operation.

Covered flows: init and repeated init; first-contact start/clarify/status; all twelve explain subcommands; status; task list/graph; bootstrap apply; alignment prepare; mission draft/evidence/approve; expedition draft/approve/commit/start/evidence/pause/cancel/show; no-auto-commit and rejection; discovery-safety preflight rejection; telemetry on status/replay/identity; approved first-contact through real task subprocesses in an empty external directory. Resolver guards cover both entry points, a symlink, a missing launcher, and an unrelated file also named entry.js.

The prerequisite fixture initially lacked fixed process identity and Math.random inputs. Its early mismatches were fixture nondeterminism, not certified product regressions; those inputs were made explicit before 301a39d and before the harness switch. The existing broad suites continue to run without this deterministic preload.

## The full chain exposed a real boundary mismatch

The first full run after changing the harness failed in the unchanged cli-contract.test.js. `--discovery-mode init` throws from preflight. When synth.js was run directly, its boundary called printError and emitted the established JSON error envelope. entry.js instead wrote an unstructured stack to stderr, leaving stdout empty.

The fix reuses the same existing printError renderer in entry.js. It does not introduce a new error schema or weaken the original assertion. Two preflight-rejection cases were added to parity coverage. The corrected full chain passed in **260506 ms** at 41555f0.

That pass was NOT treated as sufficient proof that all previously green consumers remained green.

## Additional consumer A/B: four regressions caught and fixed

The literal relative-import graph through tests/helpers identified 78 test consumers of the changed cli-harness. Of these, 32 were named directly by resolved test:all task commands; the remaining **46** were run against both targets. This is the changed harness's immediate blast radius, not a substitute for EXP-TEST-005's complete orphan inventory.

For the compatibility control, tests/helpers/cli-harness.js was temporarily restored from **301a39d**. The control block ran with that helper, then the shipped block ran with the committed target; a finally block restored the committed shipped helper when the A/B battery ended. No test body, call-site, expected result or fixture was altered. The final shipped rerun was performed after the fixes.

| Population | Compatibility control | Initial shipped target | Final shipped target |
|---|---:|---:|---:|
| Baseline-green suites | 32 | 28 green, **4 red** | **32 green, 0 red** |
| Baseline-red suites | 14 red | 14 red | 14 red |

The attached `cli003-item4-consumers.json` lists every filename and all three exit codes. No baseline-red suite is counted as passing.

Four regressions:

- **first-contact-experiment**: fast status skipped setAgentTelemetryFromFlags, losing agentSession/agentReasoningState. entry.ts now uses the already-shared cli-args parser and telemetry helper on fast status/explain paths, without copying their implementations.
- **first-contact-adapter-surface**, **identity-in-events**, **synth-log-identity-filters**: real approved onboarding failed because child task invocations looked for dist/cli/synth.js under the target project's cwd. Two duplicate resolvers (first-contact.ts and task-runner.ts) accepted only a launcher ending in synth.js; the actual shipped entry.js fell through to the cwd guess.

Both resolver copies were replaced with `src/distribution/cli-path.ts`. It recognizes this installation's actual shipped/compatibility paths (including symlinks), preserves a recognized caller, and otherwise falls back to this installation's shipped dispatcher using import.meta.url. It never guesses a CLI beneath the operator's project. Existing spawn expressions were left untouched.

The unchanged affected tests all pass after the fix. The final complete 46-consumer rerun reports **zero green-to-red regressions**. The 14 red controls are preserved in the table rather than mislabeled as successes or repaired outside scope.

## Final verification and deliberate rebaseline

- `npm run test:all` **rc=0, 263733 ms** after all executable changes. The command contains **117 literal && segments**; the shim reports one aggregate task, not 117 separate results.
- Final parity suite: **48/48**.
- Explicit four-guard battery: verify-engine, artifact-policy, governance-orchestration, impact-analyzer all rc=0. Loader-entrypoint and ledger-capability-commits also green.
- New test registered through scripts/task-adapter-shim.js and data/tasks/test:cli-ceremony-parity.task.json; task-npm-adapter passed. It is appended to test:all, not left orphaned.
- Final dispatcher eager graph **18 modules / 50 KB** (was 17/47). The one extra module is the shared cli-args helper needed for telemetry correctness. Still below <=25 modules / <=150 KB.
- Compatibility synth.js remains 40/177, status-light remains 33/151, main.js remains 171/1103, MCP remains 1/10.

**Before item 4:** 1200 dist files, rootHash **267cb1342a16e0b6**.
**Final:** **1203 dist files**, rootHash **3fdf3593aded5adf**.
The three additional outputs are JS/declaration/source-map for the shared recursive-CLI resolver. The intermediate error-boundary build was 1200 files / 3c1de756116f192c. dist remains untracked.

Certification matrix and repository-authority baseline were committed deliberately in 574df31. Six newly generated timestamped certification reports from the successful full runs were removed; the previously tracked reports were retained. No canonical ledger state was hand-edited.

Before this evidence ceremony: verify **6/6**, doctor **12/12**, checkpoint ok, and log/replay/chain all report **498 actual segmented events**. doctor --fix repointed the stale anchor after source commits; it did not commit test byproducts as ledger repairs. Attaching this evidence will add a real event.

## Timing qualification

Committed tool: `node scripts/measure-cli-startup.js --runs 9 --label cli003-item4 --json-out <file>`.
Current absolute medians, two cores / Node v22.22.3:

| Invocation | Median | Requested target |
|---|---:|---:|
| Shipped --version | 28.7 ms | <=45 ms |
| Shipped status | 123.2 ms | <=130 ms |
| Shipped explain replay | 80.8 ms | <=110 ms |

All three medians meet their targets in this sample. Status samples range 118.8–136.7 ms. The previous item-3 sample was 141.1 ms and remains recorded; this is **not** a controlled before/after speedup claim. The node process floor is 17.1 ms here versus 20.3 ms in that earlier sample. No inference that the harness migration accelerated status is justified by these measurements.

## Remaining work

Item 5: a DERIVED load-budget guard recomputing static graphs and representative runtime loading, with a deliberate temporary regression that demonstrably fails and is then removed. Final whole-invocation 40% exceptions must be supported by actual work, not by namespace static graphs alone. CLI-003 must not be completed solely because the harness and static dispatcher budget are now correct. LIFE-002 and CLEAN-001 remain downstream.
