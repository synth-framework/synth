# Round 8/80 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 8 -k 80`
Before: 31 clones. After: 0 (two second passes needed).

## Triage → fix (by family)

- **makeObservation overrides-form (7 files)** → `adapter.js:makePlanningObservation` (verified byte-identical via normalized compare); 5 files alias-import (zero call-site churn). Variants left: simple-form (canonical home exists), overrides-only/per-file shapes (draft/mapper/explain/operator/architecture/confidence/dependency — lower floors).
- **adapter fixture dirs (filesystem + specification)** → `adapter-fixtures.js:cleanFixtures/writeFixture(dir, ...)`; call sites pass `FIXTURES_DIR`. document variant differs (no mkdir) — left.
- **approveMission wrappers (convergence + replay, 20 call sites)** → collapsed to 1-line arrow consts with file-meaningful names (`approveConvergenceMission`/`approveEvalMission`); force/schema single-site wrappers inlined at call sites.
- **approveDependencyMission** → same pattern (4 sites renamed).
- **makeIdentityEvent family** → `missionMEvent(id, name, ts)` + `expeditionEEvent(id, missionId?)` + `identityCreationEvents(missionId, expeditionId, {expeditionMissionId})`; migrated identity/reference/aliases (duplicate-mission test kept explicit — event-id structure is assertion substance; verified by re-read after a bad splice).
- **certifyConvergence parameterized variant** → `governance-intent.js:certifyConvergenceWithFeatures` (evidence source/timestamp params); convergence + replay migrated.
- **makeRefinedIntentInput (gate-decision + review-gates, byte-identical)** → `domain-runner.js`; gate-012/review-gate-engine shorter variants left.
- **findJsonObject (agent-guide + release)** → `assert.js`; release's distinct runGit left.
- **EXAMPLES/BROWNFIELD_EXAMPLES** → `example-projects.js:EXAMPLE_PROJECTS` with aliased imports.
- **execution singles (9 sites)** → `synthesizeSingleObjectiveIntents()`; pairs already covered.
- **first-contact turns** → `first-contact-fixtures.js:evidenceTurns(stateBefore)`; fc-cert double-run → in-file `getApprovedArtifact`.
- **contextual adapters** → `discovery-fixtures.js:makeContextualAdapter/discoverWithContextualAdapter/makeFilesystemEngine(files, options)`.
- **seedGenesisEvents / missionWithExecutingExpeditionEvents / seedEvent / missionMEvent** → kernel-event-fixtures (scenario payloads preserved exactly).
- **vocabulary audit loop** → `vocabulary-audit.js:auditFiles` (per-file findViolations stay).
- **approveAlignmentContract/openDivergenceGate/lastEvent** → alignment-fixture exports (also self-deduped alignDivergenceGate onto openDivergenceGate); withoutLifecycleContinuation → context.js.
- **cert harness (4 files)** → `cert-test-base.js` (exact console/exit semantics; richer runCli/parseResponse variants stay local).
- **installer runInstaller/createFakeNpm** → `installer.js` (superset factory; verified rendered bash + retry/version behavior; install-gated stub + view versions preserved per mode).
- **CLI mission/expedition flows** → mission-lifecycle (`start`/`verifyStart`/`attachEvidence` options) + `setupGitBackedProject`; in-memory flows → governance-intent (goal/start options).
- **misc in-file builders**: setupConditionalGate, executionPrefixEvents({branch}), setupInstallTest, initGitIdentity, readSingleInitEvent, makeTamperedState, makeSession, setupExecuting/CommittedExpedition (lifecycle-enforcement), registerCrmObserverPair, discoverExample-level (left), approveEvalMission etc.

## Verification

PASS (spot-list): 111-file batch (adapter/mission-studio/api/genesis), 28-file batch (execution/identity/guide/release/brownfield/consumers/dependency/record), 14/14 discovery pair, resolver/record/operator-briefing, reference+aliases 9/9, convergence 10/10, replay 1/1, decision+evidence solo, reuse, guard 10/10, installer trio+pair 5/5, project-mission, eval-enforcement, lifecycle-replay+refine.
Pre-existing (all pristine-identical): gate-012, review-gate ×2, review-gates (dist import), gate-decision (dist import), identity-resolver (dist import), force, auto-commit, dry-run 0/4, evidence 0/6, branch-gate ENOENT, lifecycle-enforcement ×3, first-contact 3rd-test ENOENT, fcexp runner, `synth log` src bug (blocks identity/log-filter CLIs).

## Incidents

- 6 destructive oldString/newString slips (dropped bodies/signatures) — every one caught by immediate re-read/`--check`/import-assert before tests ran. Permanent rule: anchor on single unique lines; verify after every structural edit.
- Installer factory took 4 iterations (forced base-URL, install-gated stub, view versions, baked-vs-env stub text) — each caught by suite runs or rendered-script inspection.
- Baseline `__pristine-*` copies must live outside tests/ during scans (one polluted rescan).
- Parallel test batches flake (setup timeouts) — solo re-runs are the source of truth.
