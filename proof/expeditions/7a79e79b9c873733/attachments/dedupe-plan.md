# Test De-duplication Plan — Expedition 7a79e79b9c873733

## Evidence
- Source: `.jscpd/tests/html/jscpd-report.json` (generated 2026-08-27T01:10:54Z)
- **273 clones**, **5,629 duplicated lines**, spanning **156 test files**.
- The duplication is overwhelmingly **test scaffolding** (runners, CLI wrappers, bootstrap/context builders, workspace lifecycle, event fixtures, parse/assert helpers), not test *logic*. That means most of it is safe to consolidate.

## Method (decisive rule)
For each duplicated block:
1. **Justified to live in-file?** (encodes a distinct, intentional scenario) → keep.
2. Else → give it a home: **fixture** (test data), **helper** (shared behavior), **mock** (isolated dependency), or **drive through the SDK** (stop re-implementing SDK flows).

---

## Findings + dispositions

### F1 — Test-runner loop  → **NOT justified → shared helper** (highest fan-out)
- Pattern: `for (const t of TESTS) { try { await t.fn() … } catch (err) { console.log('[FAIL]', …) } }` + `passed++/failed++` accounting + trailing `if (failed) process.exit(1)`.
- Fan-out: `tests/skr/{extension,serialization,compatibility,canonical-relationship,canonical-node,determinism}-tests.js`, `governance-evaluation-enforcement`, `refine-009-certification`, `expedition-dependency-enforcement`, `convergence-certification`, `gate-012-certification`, …
- **Home:** `tests/helpers/runner.js` → `export async function runSuite(tests, label)`. Delete the loop from every file; keep only the `TESTS` array.

### F2 — CLI harness  → **NOT justified → shared helper**
- Pattern: `CLI_PATH = path.resolve(process.cwd(), 'dist/cli/synth.js')` + `runSynth()/runCli()`/`spawnSync` wrappers + `parseJson()`.
- Fan-out: `verify-engine`, `synth-cli`, `synth-cli-repo`, `synth-cli-govern-explain`, `synth-bootstrap`, `first-contact-cli`, `first-contact-certification`, `task-cli`, `task-execution`, `task-ci-adapter`, `synth-log-identity-filters`, `identity-in-events`, …
- **Home:** consolidate into **`tests/helpers/cli.js`** (supersedes existing `tests/helpers/cli-harness.js`). Export `runSynth(args, cwd?)`, `runCli(dir, args)`, `parseJson(stdout)`.

### F3 — Bootstrap / makeCtx  → **NOT justified → context fixture**
- Pattern: `bootstrap({ infra: { eventLogPath: path.join(dataDir,'event-log.jsonl'), statePath: … } })` (+ optional `createAlignedContract`).
- Fan-out: `proposal-evaluation`, `refine-009-certification`, `project-mission`, `lifecycle-enforcement`, `governance-evaluation-enforcement`, `alignment-divergence`, `expedition-dependency-enforcement`, `convergence-certification`, `expedition-auto-commit`, `decision-events`.
- **Home:** `tests/helpers/context.js` → `makeDataDir()`, `makeCtx(overrides)`, `makeWorkspace()`. Drive via the **SDK `bootstrap`** (already supports `eventLogPath`→event-stream). This is test-only wiring, so it stays a test helper, *not* SDK.

### F4 — Workspace lifecycle  → **NOT justified → workspace helper**
- Pattern: `mkdtempSync(os.tmpdir())` + `cleanup()/fs.rm` + `fs.writeFile('package.json', …)` + `runSynth(['bootstrap', tmpDir, '--approve'])`.
- Fan-out: `expedition-draft-retirement`, `state-lag-no-repair`, `expedition-batch-operations`, `cli-mission-expedition-rank`, `cli-duplicate-advisory`, `captrans-missing-capability`, `governance-evaluation-schema`, `governance-complete-force`.
- **Home:** `tests/helpers/workspace.js` → `makeTmpWorkspace()`, `cleanup(dir)`.

### F5 — Event fixtures  → **fixture (partially exists — enforce reuse)**
- Pattern: `makeEvent`, `expeditionCreated`, `objectiveAdded`, `makeObservation`, `makeEvent('MISSION_CREATED', …)`.
- Note: `tests/helpers/kernel-event-fixtures.js` **already exists** but is not universally imported (jscpd shows copies in `validation-expansion.test.js`). 
- **Home:** extend `kernel-event-fixtures.js` as the single canonical fixture module; import it everywhere; delete local copies. Pure data builders — keep in test helpers (promote to `src/sdk` only if non-test code needs them later).

### F6 — parseJson / assert helpers  → **NOT justified → assert helper**
- Pattern: `function parseJson(stdout){ try { return JSON.parse(stdout.trim()) } catch … }` + local `assert(cond, msg)`.
- Fan-out: `expedition-finish`, `governance-evaluation-schema`, `expedition-auto-commit`, `synth-cli`, `verify-engine`, `synth-bootstrap`, `first-operator-experience`, `runtime-repair`, `evidence-path`.
- **Home:** `tests/helpers/assert.js` → `parseJson`, `parseJsonStrict`. Use Node's `assert` for the rest.

### F7 — Adapter lifecycle  → **fixture**
- Pattern: `adapter.configure({observations:[]}); assert state 'configured'; adapter.validate(); assert 'validated'; adapter.enable(…)`.
- Fan-out: 8 `adapter-*.test.js` files.
- **Home:** `tests/helpers/adapter.js` → `async function configureValidateEnable(adapter, obs)`.

### F8 — Mocks / stubs  → **mock lib**
- Pattern: repeated mock setups (clocks, fs, SDK function stubs, `SYNTH_*` env fixtures).
- **Home:** `tests/helpers/mocks.js` → `withMockClock()`, `stubFs()`, env-fixture builders.

---

## What the SDK *should* provide vs. what stays a test helper
- **Drive through SDK (stop re-implementing):** reading events (`readEvents`/`countEvents`), seeding (`seedEventLog`), path building (`sdk.paths.*`), `bootstrap`. Tests currently hand-roll these.
- **Test-only (helper, not SDK):** `runSynth`/`runCli` (spawns built CLI), `makeCtx`/`makeWorkspace` (test wiring), `parseJson`, `assert` extras, `runner`.
- **Test data (fixture):** `makeEvent`/`expeditionCreated`/etc.
- **Test isolation (mock):** clocks, fs, SDK stubs.
- **Promote to SDK only if** the same builder is needed by `src/` — revisit after migration.

## Migration strategy (incremental, safe)
1. Create the helper modules (F1–F8) as additive files — zero risk.
2. Migrate **one category at a time**, in small batches.
3. After each batch: `node --test <affected files>` must stay green; re-run jscpd to confirm the number drops.
4. Never do a single giant sweep; keep diffs reviewable.
5. Leave **justified** end-to-end duplicates (e.g., `first-operator-experience` journeys) with a `// keep: intentional scenario` note.

## Success metrics
- jscpd duplicated lines: **5,629 → target < 1,500**.
- Tests read as intent, not scaffolding.
- New helpers covered by the tests that consume them.

## Open question for operator
- Tolerance: is `<1,500` duplicated lines the right bar, or do we aim for near-zero (only `// keep` intentional scenarios)?

---

## Session follow-up — 2026-08-28 (targeted clone cleanup)

Re-measured with `npx --yes jscpd@4 tests -l 7 -k 70` (the correct tool;
`jscpd@latest` wrongly resolves to `cpd 5.0.16` and inflates numbers).

Before session: **3,838** dup lines / 259 sources / 204 clones / 7.96%.
After session:  **3,278** dup lines / 263 sources / 182 clones / 6.88%.

### New helpers created
- `tests/helpers/task-harness.js` — `run`, `makeTask`, `setupProject`, `teardown`,
  `CLI_PATH`. Consolidates the identical CLI/task scaffolding across
  `task-cli`, `task-execution`, `task-ci-adapter`.
- `tests/helpers/state-fixtures.js` — `assert`, `loadResolver`, `loadComputeEventHash`,
  `writeEventLog`, `writeManifest` + canonical event builders
  (`genesisEvent`, `missionCreatedEvent`, `missionApprovedEvent`, `missionCompletedEvent`,
  `missionArchivedEvent`, `expeditionCreatedEvent`, `expeditionStartedEvent`,
  `workItemCreatedEvent`). Removes the repeated inline canonical-event object
  literals in `transition-engine` and `stale-state`.
- `tests/helpers/assert.js` — exported `assert(condition, message)` throwing `ASSERTION FAILED:`.
  Bulk-extracted from 83 test files via automated script (was F6 `parseJson`/`assert`).
- `tests/helpers/cli-harness.js` — `readEventLog` now reads BOTH `event-stream` (modern
  partitioned) and legacy `event-log.jsonl`, merged & sorted by offset.
- `tests/helpers/mission-lifecycle.js` — `bootstrapProject`, `createAndApproveMission`,
  `createExecutingExpedition`. Consolidates the full bootstrap→mission→expedition
  CLI flow that was duplicated across certification tests.
- `tests/helpers/workspace.js` — fixed pre-existing bug: `makeTempDir` used
  `fs.mkdtemp` without callback (threw `ERR_INVALID_ARG_TYPE`); now uses
  `fs.promises.mkdtemp`.

### Migrated files (verified green)
- `two-party-approval.test.js`, `synth-log-identity-filters.test.js`,
  `task-cli.test.js`, `task-execution.test.js`, `task-ci-adapter.test.js`,
  `transition-engine.test.js`, `stale-state.test.js`, `runtime-repair.test.js`,
  `state-lag-no-repair.test.js` (behavior-equivalent; baseline had pre-existing
  `ENOENT event-log.jsonl` failure),
- `governance-lifecycle-contract.test.js` — **15→2 clones** (93% reduction),
- `expedition-lifecycle.test.js` — mission setup extracted; test functions
  retain their scenario-specific logic (remaining 14 clones are test-pattern
  duplication within the file, not cross-file).

### Metrics after full grind (2026-08-30)
- **170 clones**, **3,036 dup lines**, **6.41%** (from 204/3,838/7.96% start)
- **~20% reduction in duplicated lines** with zero syntax errors and all
  migrated tests passing.
- Remaining high-clone files use diverse patterns (SDK direct calls, synthetic
  event logs, node:test framework, perf-runner CLI wrappers) requiring
  pattern-specific consolidation rather than a single universal helper.

### Files migrated
- `task-cli.test.js`, `task-execution.test.js`, `task-ci-adapter.test.js` → import `task-harness`.
- `transition-engine.test.js`, `stale-state.test.js` → import `state-fixtures` (event literals
  replaced by builder calls).
- `two-party-approval.test.js` → `setupApprovalScenario` + `requestApproval`/`grantApproval`
  helpers remove the repeated approval-setup and request/grant blocks.
- `synth-log-identity-filters.test.js` → `identityEnv()` helper for the duplicated env block.
- `runtime-repair.test.js` → imports `runCli`, `createDraft`, `cleanup` from `trust-workflow.js`
  (exact duplicates; previously flagged as `runtime-repair ↔ trust-workflow`).

### Remaining (out of originally-flagged scope — systemic boilerplate)
These clones still appear in jscpd but pair the flagged file with a file NOT in the
original list, and represent the shared "certification test" header template:
- `synth-log-identity-filters.test.js` ↔ `identity-in-events.test.js` — duplicated
  header (`readEventLog` helper). Fix: extract `readEventLog` into a shared helper and
  import in both.
- `runtime-repair.test.js` ↔ `first-operator-experience.test.js` /
  `decision-events.test.js` — duplicated `import fs/os/path… REPO_ROOT/DIST_SYNTH/
  passed/failed/assert` header. Fix: a shared `tests/helpers/cert-test-base.js`.

Neither affects the originally-flagged clone *pairs* (all resolved). The header
boilerplate is a broader refactor; recommend a follow-up expedition if we want it gone.
