# Round 13/130 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 13 -k 130`
Before: 5 clones. After: 0 (one execution arrange pair needed a second pass).

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `governance-complete-force:46` ↔ `governance-evaluation-schema:35` (16l, CLI expedition create→approve→commit→start) | Known F2 | `mission-lifecycle.js:createExecutingExpedition` (force: `attachEvidence:true` — evidence content differs "force test evidence" vs helper "experiment evidence" but only exit-status asserted; schema: no attach). `auto-commit:101` variant intentionally left (needs pre-start draftId — will `// keep` or revisit at its floor) |
| 2+3 | `execution-commit:48` ↔ `execution-projection:57` (16l) + self `91`↔`12` (18l, versioning handlers) | NEW execution | `execution-fixtures.js:makeVersioningHandler({onSwitchRevision, onCreateRevision})` — plain default; test-specific asserts/capture/failure stay at call sites. Preemptive: `execution-branch` inline handler (same family). Residual r1/r2 arrange pair (2nd pass) → `synthesizeTwoObjectiveIntents()` |
| 4 | `docs-provenance:31` ↔ `event-log-query:73` (27l, execSync run/runAllowError) | NEW cli-exec | New `tests/helpers/cli-exec.js:createExecRunner({synth, projectDir})` (throwing execSync + `SYNTH_QUIET_LOGS=1` semantics — deliberately distinct from spawnSync-based `runSynth`); `const { run, runAllowError }` destructure, zero call-site churn |
| 5 | `decision-events:43` ↔ `evidence-path:41` (22l, runCli + createDraft) | Known F2 (trust flavor) | `tests/helpers/trust-workflow.js:runCli` (byte-identical shape incl. `SYNTH_GOVERN_DEPTH` delete); `createDraft` locals kept (evidence-path returns richer `{draftId, confidence, result}` — below floor) |

## Verification (post-edit `node --test`)

PASS: commit, projection, branch (12/12 with repair check), docs-provenance, event-log-query, decision-events, evidence-path, schema. Force: same pre-existing assertion as pristine HEAD (`expedition complete without convergence should fail`).

## Incidents

- `execution-fixtures.js` was left syntactically broken by a bad edit (deleted `EXEC_OPTIONS` body); caught by immediate re-read, repaired, verified via dynamic import + 12/12 green. Lesson reinforced: re-read helper files after every structural edit before running tests.
