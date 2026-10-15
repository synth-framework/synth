# EXP-CLI-003 — Windows checkout repair and timing acceptance verdict

## Operator reason and authorized scope

The operator reported that cloning on Windows fails because some filenames contain colons and explicitly asked to fix it in this expedition, adjusting scope if necessary. `git ls-files` at 38f5f44 confirmed **167 colon-bearing tracked paths**, all under `data/tasks/`. This is a filesystem checkout/distribution defect, not merely a style preference. The CLI-003 refinement in **6c7561d** records the reason, affected generators/consumers/fixtures and acceptance, while preserving the original goal. CLEAN-001's broader CLI audit and LIFE-002's lifecycle redesign remain separate.

## Implementation and preservation of identity

**70d6baf** renames the 167 paths using the shared `taskFileName` function in `src/task/task-schema.ts`. For example, task ID `test:all` now lives at `data/tasks/test%3Aall.task.json`. IDs, npm commands and dependency edges retain their colons; registry discovery still reads IDs from JSON, never from filenames. The encoding escapes uppercase/unsafe UTF-8 bytes and literal percent signs, handles reserved Windows device names, rejects invalid Unicode and overlong names, and cannot let path-like IDs escape the task directory.

Before/after comparison checked all **177 original definitions**: 176 remained byte-identical after relocation; the only intentional change was appending `npm run test:portable-paths` to the test:all command. The new guard brings the inventory to 178 definitions. No existing task or dependency edge was removed.

CLI task generation and the npm migration generator share the encoder. Framework copying selects `onboarding:` tasks by JSON ID instead of filename prefix, emits portable names and cleans obsolete generated framework filenames on incremental builds. The profiler, npm-task test, relevant fixtures and current documentation were updated. The removal manifest records each original pathname and its approved replacement; no deletion guard was weakened. Historical expedition records and hashed proof retain their historical spellings.

**fbd088f** adds a native `windows-latest` workflow for checkout, install, build, portable-path tests and task registry/npm migration tests. **14a7ad1** adds the ordered/fresh-read task metadata regression tests to that workflow and the existing task-schema-registry chain segment.

## Windows and packaging evidence

Native Windows run **38682992186**, head **14a7ad1dec5e79d953a7d00d715a0f7201719912**, completed successfully:
https://github.com/synth-framework/synth/actions/runs/38682992186

The attached GitHub result records successful steps for actions/checkout, npm ci, npm run build, tracked-path validation, portable task generation/discovery/execution, task-schema-registry, task-registry-io and npm-task-migration. Earlier run 38682662722 also passed before the I/O optimization. This is genuine Windows execution, not a claim inferred from Linux. It is focused checkout/task coverage, NOT certification that every existing CLI verb or shell script runs on Windows.

Separately, a fresh local clone of the actual session branch at 14a7ad1 with `core.protectNTFS=true` succeeded on Linux. The pathname guard passed over all **2287 tracked paths**. The actual npm tarball contains **1222 entries**, none violating the Win32 pathname/case checks, including all six encoded onboarding task files. The package was built locally, not published.

The guard checks invalid characters/control bytes, reserved device basenames, trailing dots/spaces, overlong components and case-insensitive file/directory collisions. Negative unit fixtures do not create forbidden files, so the tests themselves work on Windows. A further real-process regression demonstration added `deliberate:windows-regression.txt` to an ISOLATED temporary Git index: the guard exited **1** and named that path. Running against the untouched real index exited **0**. The temporary index was removed; no forbidden worktree file or bad commit was created. Results are attached.

The fix is on `arena/d5e4625c-synth`; a default clone of main is not repaired until this branch is integrated. Old historical commits still contain their original paths.

## Timing investigation — real improvement, target still unmet

There was no external approval or administrative blocker to doing the work. Investigation found that dirty status reads every small task JSON file through sequential asynchronous open/read/close calls. A same-process diagnostic measured ~1–3 ms for ordered synchronous reads versus ~20–61 ms for asynchronous reads of the same files on this host. An initial bounded-async-batch experiment was insufficient and was discarded, not committed.

**14a7ad1** uses ordered synchronous metadata reads inside the existing async registry API. It retains directory/file override order and first-error behavior, reads fresh data each call, and does not introduce a cache. Status overlaps its independent read-only briefing and validation projections without skipping dirty-tree validation. Tests cover overrides, refreshed definitions, earlier JSON errors versus later I/O errors and unknown dependencies. The startup measurement tool now refuses failed, killed or timed-out probes instead of timing them as successes.

A/B method: saved the pre-optimization built `status-light.js` and `task-registry.js` from the Windows-fixed build; built the candidate; then alternated those two compiled files UNDER THE SAME INSTALLATION PATH against the same dirty working tree, ledger, refs and task definitions. Both versions used the same updated timing driver. Every measured command succeeded. Full status stdout, stderr and exit code were compared without filtering and were identical. A finally block restored both candidate modules byte-for-byte; the final rebuilt manifest/load guard passes. This was not a comparison of different repository snapshots or different sessions.

Nine samples per invocation, Node v22.22.3, two reported cores:

| Same-tree pair | Control status | Candidate status | Replay control, before → after |
|---|---:|---:|---:|
| First | 214.0 ms | 175.9 ms | 109.7 → 111.3 ms |
| Repeat | 205.4 ms | 177.9 ms | 112.8 → 113.4 ms |

The repeated improvement exceeds the contemporaneous replay-control drift. It does NOT establish status <=130 ms. A subsequent clean committed checkout measured version **40.1 ms**, status **178.0 ms**, replay **117.7 ms**, with process-floor median **24.7 ms**. Thus the latest clean sample misses both status's 130 ms and replay's 110 ms limits. The earlier item-5 clean sample (27.8 / 126.5 / 87.0 ms; floor 18.0 ms) remains preserved, but it came from an earlier sandbox state/session and cannot be used as a comparable speed baseline or to erase this miss. Nor is control drift permission to silently raise acceptance limits.

The attached repeated same-session A/B and final clean reports preserve all these results. No unconditional latency pass or expedition completion is claimed.

## Validation and deliberate rebaseline

- `npm run test:all`: exit **0**, **350814 ms**, **119 literal chained command segments**. The shim emits one aggregate task result, not 119 separately captured reports.
- Portable-path suite: **5/5**; registry I/O suite: **3/3**; existing load-budget suite: **18/18**, all 15 actual invocations. Ceremony parity: **48 passes**.
- Task-schema-registry, task-npm-migration, govern-profiler, loader-entrypoint, validation-planner, operator-briefing and no-write-on-read passed. Native Windows reran the targeted task suites successfully.
- The 46 additional consumer suites were rerun: **32 green / 14 pre-existing red**, zero green-to-red regressions against retained item-5 per-file results. The existing red suites were not deleted or weakened.
- Actual runtime module counts remain: dispatcher/version/help 18, status 131, replay 51, mission list 134, expedition list 139, repo status 113. The original ordinary ceiling stays 139, not 40% of the expanded build. Doctor/checkpoint/bootstrap planning retain the existing bounded work exceptions, not new exemptions.
- Dist: **1203 files**, rootHash **9e75070ebf6fbf318eb175b856fc5399c481ca39c8cf445ac1d0f3765f8b26ed**. The file count is unchanged because task names were replaced, not duplicated; incremental old onboarding outputs were removed.
- **0822c91** deliberately rebaselines the generated certification matrix/reference index. Only three newly created untracked timestamped reports were removed; all tracked certification history was retained.
- Before this evidence attachment: verify **6/6**, doctor **12/12**, checkpoint ok, **502 actual segmented events** replayed. Artifact policy and portable-path guards pass. The evidence ceremony will add an event; final counts must be read again afterward.

## Final acceptance verdict for this revision

**PASS:** all five implementation deliverables; deterministic load budgets and deliberate-regression proof; shipped-harness parity; full chain/no new measured orphan regressions; truthful health/counts; deliberate distribution/proof rebaseline; Windows checkout/task filename extension with native execution evidence.

**NOT MET on the latest host sample:** absolute status <=130 ms and explain replay <=110 ms. The Windows issue is fixed, and measurable dirty-tree overhead was reduced, but the current literal timing acceptance is not satisfied. CLI-003 therefore stays executing; complete/deliver/seal are not falsely recorded. Integration has not occurred, so containment for sealing cannot yet be asserted. A review PR may carry the verified fix without misrepresenting expedition convergence.
