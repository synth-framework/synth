# Round 10/100 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 10 -k 100`
Before: 14 clones. After: 0.

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `lifecycle-enforcement` self `145`↔`122` (10l, mission+expedition setup) | Known (in-memory) | In-file `setupExecutingExpedition(ctx)` (exact payloads incl. purposeless CreateMission). Other shape-variants in file left (below floor) |
| 2 | `installer-engine:18` ↔ `installer-upgrade:17` (33l, fake-npm head) | F8 factory | `installer.js:createFakeNpm({prefix, synthVersion, maxFail, permanentFail, trackAttempts→always, viewVersion, versionFromTarget})`. Verified rendered bash: `bash -n` clean ×3 modes; retry/logout behavior probed. Upgrade sites use 2-line adapter (`viewVersion 2.0.0` + `versionFromTarget`) |
| 3 | `initialization-evidence` self `102`↔`59` (10l, init-event asserts) | Known | Deleted legacy `readEventLog(dataDir)` → cli-harness import (call sites `dataDir`→`tmpDir`); in-file `readSingleInitEvent(tmpDir)`. Fixed follow-on `dataDir` ref at old line 100 |
| 4 | `identity-in-events:6` ↔ `synth-log-identity-filters:6` (23l, legacy readEventLog) | Known (predicted leftover) | Both → cli-harness `readEventLog` import (superset: partitioned+legacy); dropped now-unused fs/path imports |
| 5 | `governance-lifecycle-replay:114` ↔ `refine-009:112` (15l, divergence-gate opener) | Known | `alignment-fixture.js:openDivergenceGate` (additive); Evaluate-variants keep their bodies; fixed 2 orphaned `result` declarations |
| 6 | `first-contact-recommendation` self `211`↔`186` (11l, start/clarify/approve) | NEW (3rd copy found) | In-file `setupApprovedFirstContact(tmpDir)`; all 3 sites migrated |
| 7 | `expedition-evidence:41` ↔ `lifecycle-dry-run:46` (24l, seed arrays) | Known (scenario seeds) | `kernel-event-fixtures.js:seedEvent` (tx-N/ts-N envelope convention); payloads preserved byte-identically incl. conditionals (`baselineCommit`, `expeditionStatus`, evt-6/7/8 pushes). Same for `derived-state-guard` (21l pair) |
| 8 | `auto-commit:32` ↔ `reuse-templates:44` (10l, git setup) | Known F4-adjacent | `mission-lifecycle.js:setupGitBackedProject(prefix)` (throws like bootstrapProject; drops assert-style differences); `workspace.js:runGit` extracted (finish.test.js variant returns raw result — left for its floor) |
| 9-12 | execution singles `projection` self ×2, `commit:70`, `branch:20↔commit:12` (14l) | Known | `execution-fixtures.js:synthesizeSingleObjectiveIntents()`; 9 sites across 3 files |
| 13 | `branch:91` ↔ `commit:98` (17l, no-handler tests) | Same as 9-12 | Same helper (handlers blocks already below floor) |
| 14 | `derived-state-guard:70` ↔ `dry-run:60` (21l) | Same as 7 | seedEvent (with `scope` conditional preserved) |

## Verification

PASS: reuse-templates, derived-guard 10/10, commit+projection+branch 12/12, engine+upgrade+verify installer 3/3 (final), contract+env installer 2/2, lifecycle-replay+refine 2/2, init-evidence, identity pair migrated (see pre-existing notes).
Pre-existing (pristine-identical): dry-run 0/4 + evidence 0/6 (legacy `event-log.jsonl` seeds ignored by partitioned CLI — direct CLI probe: `synth log` errors "No event log found"); identity pair blocked by same `synth log` src bug (my migration strictly improves: test 1 now passes); lifecycle-enforcement 3 identical dist-drift FAILs; gate-012/review-gate/force/auto-commit as before. src/ fixes out of scope (charter defers src/).

## Incidents

- 3 destructive edits (dropped function bodies via oldString/newString mismatch) — all caught by immediate re-read + repaired + import-verified. Rule adopted: anchor insertions on unique single lines, never include keepable code in oldString.
- Installer helper needed 3 iterations: forced base-URL broke default-URL test → opt-in; upgrade's install-gated stub + `view 2.0.0` → `versionFromTarget`/`viewVersion`; baked stub text (env-form would print empty in engine tests).
- `__pristine-ev.test.js` baseline copy polluted a rescan (153-line self-clone) — keep pristine copies out of tests/ during scans.
