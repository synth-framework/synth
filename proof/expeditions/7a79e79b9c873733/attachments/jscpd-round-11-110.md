# Round 11/110 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 11 -k 110`
Before: 8 clones. After: 0 (one identity-creation pair needed a second pass).

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `project-mission:89` ↔ `alignment-fixture:70` (15l, contract input) | Known (pre-existing home) | `alignment-fixture.js:createAlignmentContract` accepts `overrides.objectiveCoverage` passthrough; project-mission delegates (keeps coverage mapping + report orchestration, ~10 lines). Also migrated its `lastEvent` → fixture export |
| 2 | `installer-engine:110` ↔ `installer-upgrade:117` (22l, runInstaller) | F8-adjacent installer | New `tests/helpers/installer.js`: `INSTALLER_PATH` + `runInstaller(args, env, timeout, {baseUrl})` + `runEngineInstaller` alias (unroutable base URL). All 4 files migrated (`contract`, `environment` direct; `engine`, `upgrade` via alias). `createFakeNpm` variants differ (attempts/synthVersion knobs) — deferred to its floor |
| 3 | `installer-contract:10` ↔ `installer-environment:9` (19l) | Same as #2 | Same helper |
| 4 | `identity-resolver:26` ↔ `reference-resolver:27` (11l/201t, makeEvent envelope) | Known F5 (3-arg flavor) | `kernel-event-fixtures.js:makeIdentityEvent` + `identityCreationEvents()` pair; aliased imports keep call sites. Residual creation-array pair (2nd pass) → `identityCreationEvents()` |
| 5 | `first-operator-experience:14` ↔ `runtime-repair:9` (22l, cert header) | Leftover header-base | New `tests/helpers/cert-test-base.js:createCertHarness(prefix)` → `{assert, makeWorkspace, cleanup, finish}` (exact console/exit semantics); both headers migrated, endings → `finish()` |
| 6 | `explain-status-actionable` self `163`↔`139` (17l, tampered canonicalState) | NEW intra-file | In-file `makeTamperedState(events, offset)` |
| 7 | `discovery-replay-contract:124` ↔ `discovery-replay:190` (22l, contextual adapter) | NEW discovery | `discovery-fixtures.js:makeContextualAdapter({sourceState})` + `discoverWithContextualAdapter({sourceState})`; both call sites migrated, asserts stay local |
| 8 | `convergence:42` ↔ `lifecycle-replay:44` (15l, wrap + lastEvent) | Known F3-adjacent | `context.js:withoutLifecycleContinuation(ctx)` + exported `alignment-fixture.js:lastEvent`; both files migrated |

## Verification (post-edit `node --test`)

PASS: contract, environment, engine, upgrade (installer 4/4 after two fixes below), reference-resolver 4/4, findings/rules/model/replay-mission/verifier/explain-actionable/discovery pair/homepage/audit (batch), project-mission, convergence + lifecycle-replay 2/2.
Pre-existing (pristine-identical): identity-resolver import failure (`getCanonicalId` missing from dist) — syntax-checked only.

## Incidents (both caught by tests, both fixed)

- Helper initially forced `SYNTH_INSTALLER_BASE_URL` always → broke contract's default-URL assertion. Scoped to opt-in `{baseUrl}` + `runEngineInstaller` alias.
- Deleted `INSTALLER_PATH` const still referenced at `installer-contract:92` → re-exported from helper (`INSTALLER_PATH` import).
- project-mission wrapper called non-imported `createAlignmentContract` (vs imported `createAlignedContract`) → added to fixture import.
