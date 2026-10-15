# Testing and Reporting Infrastructure — Reviewed Plan

**Expedition:** `f0f81e358899d8f2` — Revisit testing and reporting infrastructure  
**Mission:** Framework Maturation v2 (`4ab7e9d2cc7b1b66`)  
**Status:** draft review — intended output is a plan, not a broad refactor  
**Date:** 2026-10-13  
**Base:** `main` @ `12f1bce56b73832b182888dae32a1963756930e1` (Verification Coverage Truthfulness merged)  
**Branch:** `expedition/framework-maturation-v2-4ab7e9d/revisit-testing-and-reporting-infrastructure-f0f81e3`

---

## 0. Executive summary

The canonical test chain (`test:all`) currently expands to **114 npm-run steps** defined in `data/tasks/test%3Aall.task.json` and executed via `scripts/task-adapter-shim.js` → `dist/cli/synth.js task run <script>` → governance profiler → proof. The profiler (`scripts/govern-profiler.js`) decomposes the chain truthfully after the Verification Coverage Truthfulness fix (F1), produces `GovernSummary`, `GovernanceDependencyGraph`, baselines, and timing.

There are **252 test files** and **124 `test:*` npm scripts** (161 total scripts, 169 task definitions). 14 task-defined checks are not in `test:all` (intentionally or by drift). The test surface grew ad-hoc while taming the codebase; many suites overlap, some are environment-dependent, and failure reporting does not always name the exact check.

This plan proposes:

1. Keep `test:all` as the canonical chain but introduce **layered grouping** (core, governance, adapters, ledger, environment, installer, etc.) and a **governance class** mapping that already exists in `scripts/governance/governance-classes.js` and `profiles.js`.
2. Decompose the profiler into three clear stages: **collection → scheduling → reporting**, with explicit failure identification.
3. Normalize test/report/logging surfaces: every check emits `{checkId, status, duration, module, inputs, outputs, determinism}`; failures include `checkId`, file, assertion, and environment context.
4. Decision matrix for suites: **distinct** (ledger, execution, environment, installer), **merge** (mission-studio variants, discovery variants, adapter variants), **retire** (stale tasks that are not in chain and not serving a profile).
5. Make environment-dependent behavior explicit via `environment-capability-report`, `SYNTH_TASK_VERBOSE`, and a new `determinism` field (`deterministic|contextual|non-deterministic`) already present in check registry but not surfaced in failure messages.

No broad refactor is performed in this expedition; this document is the reviewed plan that future expeditions will implement.

---

## 1. Canonical test chain (`test:all`)

### 1.1 Current state

- **Definition:** `data/tasks/test%3Aall.task.json` — `id: test:all`, `command: npm run test && npm run test:governance-quiet-output && ... && npm run test:adr` (114 steps)
- **Package.json delegation:** `test:all` script is `node scripts/task-adapter-shim.js test:all` — shim builds `dist/` if missing then delegates to `node dist/cli/synth.js task run test:all`
- **Governance profiler:** `scripts/govern-profiler.js` → `loadGovernChecks()` reads canonical task definition (after F1 fix) or fails loudly; previously it parsed `package.json` shim and yielded zero checks (build+proof only). Now it:
  - Parses `test:all` command via `parseNpmRunChecks` (splits on `&&`, extracts `npm run <script>`)
  - Rejects recursive `test:all` and empty chain
  - Builds checks: `build` + each script in chain (excluding `build`/`proof` duplicates) + `proof`
- **Task registry:** `data/tasks/*.task.json` — 169 tasks, 127 test-related, 14 not in chain:
  ```
  check:adr, test:agent-sdk, test:ai-capability-projection, test:all,
  test:execution-gate-regression, test:governance-evaluation-enforcement,
  test:governance-orchestration, test:installer-certification,
  test:mcp-server, test:package-distribution, test:proof,
  test:proposal-evaluation, test:release, test:synth-cli-govern-explain
  ```
  Some are intentionally outside chain (e.g., `test:proof` is a stage, `test:all` itself, `bench:interruption`), some are drift (e.g., `test:proposal-evaluation` was red at HEAD in F11).

### 1.2 Issues

- **Length:** 114 sequential steps, ~10 min estimated, no parallelism at task level (though `parallel-runner.js` exists but is not used for `test:all` chain; orchestrator uses `Scheduler` and `IncrementalEngine` for incremental mode, but `govern --full` runs checks sequentially via `runCommand` which spawns with `stdio: inherit`).
- **No grouping:** All checks are flat; no way to run `test:ledger:*` or `test:mission-studio:*` as a group without editing the task file.
- **Drift:** `package.json` has 124 `test:*` scripts but only 114 in chain; `data/tasks` has 127 test tasks but 14 missing from chain — registration is manual (`scripts/copy-framework-tasks.js` copies `data/tasks` to `dist/tasks`).
- **Failure identification:** `runCommand` inherits stdio, so failing test output is visible, but `GovernSummary` only records `status: failed`, `exitCode`, `duration`; it does not capture which assertion failed or which file.

### 1.3 Proposed future (not implemented here)

- **Layered chain:** Introduce `test:core`, `test:governance`, `test:adapters`, `test:ledger`, `test:environment`, `test:installer`, `test:documentation` as intermediate tasks that each expand to a subset. Then `test:all` = `test:core && test:governance && ...`. This matches existing `governance-classes.js` modules: `contracts, documentation, cli, kernel, runtime, governance, missions, expeditions, website, tests`.
- **Parallelism:** Use `ParallelRunner` for independent checks (those with no `dependencies`). Currently `check-registry.js` has `dependencies: [build]` as default, but many checks could run in parallel after build.
- **Registration guard:** `test:task-npm-adapter` already asserts every npm script delegates to shim; extend it to assert every `test:*` task is either in `test:all` or explicitly marked `standalone: true` in its task JSON. This prevents silent drift (F9).
- **Explicit failure envelope:** Every check should emit JSON with `checkId` on failure, not just rely on stdio. The task runner (`src/cli/synth.ts` task run) should catch non-zero exit and print `{"checkId": "...", "status": "failed", "exitCode": ..., "artifact": "tests/...test.js"}`.

---

## 2. Governance profiler decomposition and reporting

### 2.1 Current modules

- `scripts/govern-profiler.js` (616 LOC): `loadGovernChecks`, `runCommand`, `buildSummary`, `runGovernProfile`
- `scripts/governance/check-registry.js` (160 LOC): `EXPLICIT_CHECKS` (7 entries), `resolveCheck`, `resolveChecks`, `isCacheable`, `registerCheck` — default check has `module: tests`, `inputs: [src/**, tests/**, scripts/**, docs/**]`, `determinism: deterministic`, `dependencies: [build]`
- `scripts/governance/dependency-graph.js`: `buildDependencyGraph` — detects cycles, globals (no inputs), builds modules/checks/edges/warnings
- `scripts/governance/scheduler.js`: `Scheduler.plan` — reasons about changed inputs, module membership, downstream invalidation
- `scripts/governance/parallel-runner.js`: runs checks in parallel (not used by `test:all` sequential path)
- `scripts/governance/orchestrator.js` (304 LOC): `runGovernanceOrchestrator` — loads project context, computes impacted classes via `change-detector.js`, resolves profile (`local-fast`, `pull-request`, `main-branch`, `release`), builds `classToScripts` map, decides `requiredScripts`, uses `Scheduler` for decisions, produces `GovernOrchestrationSummary`
- `scripts/governance/profiles.js`: 4 profiles, all currently require all 8 classes (`documentation, knowledge, runtime, kernel, compiler, release, design, tests`) — `allowSkip` distinguishes `local-fast`/`pull-request` (skippable) vs `main-branch`/`release` (strict)
- `scripts/governance/governance-classes.js`, `incremental-engine.js`, `proof-store.js`, `fingerprint.js`, `module-mapper.js`, `explain.js`, `change-detector.js`, etc.

### 2.2 Reporting surfaces

- **GovernSummary** (`kind: GovernSummary`, `schemaVersion: 1.0.0`): `mode`, `changedFiles`, `totalDurationMs`, `executedDurationMs`, `checkCount`, `skippedCount`, `checks[]` with `checkId, status, action, reason, durationMs, percentage, startTime, endTime, module, inputs, outputs, filesTouched, dependencies, cacheability, protectedAssets, fingerprint`
- **GovernanceDependencyGraph**: `modules`, `checks`, `edges`, `warnings` (cycles, globals)
- **Baseline**: `proof/govern-baseline.json` persisted
- **Proof**: `proof/proof-*.json` generated by `npm run proof`
- **Console**: `runCommand` with `stdio: inherit` and `SYNTH_TASK_VERBOSE=1` — telemetry visible on failure, but not structured
- **Orchestration summary**: `GovernOrchestrationSummary` with `profile`, `affectedClasses`, `requiredClasses`, `protectedAssets`, `risk`, `reason`

### 2.3 Issues

- **Decomposition:** `govern-profiler.js` mixes collection (load checks), execution (runCommand), and reporting (buildSummary). The orchestrator (`orchestrator.js`) re-implements some of the same logic (class mapping, profile resolution) but does not share `loadGovernChecks` truthfully — it uses `capability-validation-map.json` which historically had only 47 of 111 scripts (F1).
- **Two paths:** `govern --full` uses profiler directly; `govern --profile` uses orchestrator. They should converge on one `loadGovernChecks` source.
- **Reporting:** `GovernSummary` has rich fields but `check-registry.js` only defines 7 explicit checks; 107 checks fall back to defaults with generic inputs/outputs, so `filesTouched`, `dependencies` are not accurate.
- **Failure naming:** `runCommand` returns `status: failed` but does not include `checkId` in error message unless caller adds it. The task runner does include checkId, but only when run via `synth task run`, not when run via raw `npm run test:*`.
- **Environment-dependent behavior:** `environment-capability-report` exists (`test:environment-capability-report`) and lists unsupported families, but its guidance is not surfaced in failure messages. Tests that depend on git history (e.g., `artifact-policy.test.js` skips when no base branch) do `t.skip` but do not log environment context.

### 2.4 Proposed decomposition (future)

```
Collection (check-registry + task registry)
  → Scheduling (scheduler + incremental-engine + dependency-graph)
    → Execution (parallel-runner or sequential runCommand)
      → Reporting (GovernSummary + OrchestrationSummary + proof + baseline)

Single source of truth: data/tasks/*.task.json + package.json scripts
```

- **Collection:** `loadGovernChecks` reads `data/tasks/test%3Aall.task.json` (canonical) — already fixed. Extend to read `governance-classes.json` or `capability-validation-map.json` to enrich `module`, `inputs`, `outputs`, `determinism` for each check, not just 7 explicit.
- **Scheduling:** `Scheduler` should be the only place that decides `run` vs `skip`; `orchestrator.js` should delegate to it, not re-implement class filtering.
- **Execution:** `ParallelRunner` should be used for `test:all` when `profile.allowSkip=false` (main-branch/release) and checks have no inter-dependencies. For now, sequential is safer but slower.
- **Reporting:** Standardize on `GovernSummary` + `GovernanceDependencyGraph` + `proof` + `explain` report. Every failure should emit:
  ```json
  {
    "checkId": "test:ledger-writer",
    "status": "failed",
    "exitCode": 1,
    "durationMs": 1234,
    "module": "runtime",
    "determinism": "deterministic",
    "environment": {"git": "available", "filesystem": "available", "network": "unsupported"},
    "failure": {"file": "tests/ledger-writer.test.js", "assertion": "...", "stack": "..."}
  }
  ```
- **Logging:** Introduce `SYNTH_GOVERN_LOG_LEVEL` (error, warn, info, debug) and ensure `SYNTH_TASK_VERBOSE` is respected. Quiet output test (`test:governance-quiet-output`) already checks that unknown options are refused and env is passed correctly.

---

## 3. Test/report/logging surfaces

### 3.1 Test surfaces

- **Direct:** `npm run test:*` — each runs `node --test tests/<name>.test.js` or via task shim
- **Chain:** `npm run test:all` — 114 steps via task JSON
- **Govern:** `npm run govern` — build + test:all + proof, via profiler
- **Validate:** `synth validate` — adaptive, runs only affected checks via impact analyzer; `synth validate --full` delegates to `npm run govern`
- **Govern incremental:** `test:governance-incremental`, `test:governance-optimization`, `test:governance-orchestration`, `test:govern-profiler`

### 3.2 Report surfaces

- **Proof:** `proof/proof-*.json`, `proof/govern-baseline.json`, `proof/govern-dependency-graph.json`
- **GovernSummary:** JSON with timing, cache decisions
- **Ledger:** `.synth/data/event-stream/`, `.synth/data/canonical-state.json`, `.synth/data/expeditions/*.json`
- **Docs:** `docs/governance.md`, `docs/governance/`, `docs/plans/`, `docs/audits/`
- **CLI:** `synth status`, `synth explain replay`, `synth explain governance`, `synth explain all`

### 3.3 Logging surfaces

- **Task runner:** `SYNTH_TASK_VERBOSE=1` enables verbose task output (telemetry)
- **Quiet logs:** `SYNTH_QUIET_LOGS=0` disables quiet mode for tests like `clean-machine-output`
- **Perf logs:** `SYNTH_PERF_LOG` path for brownfield certification/validation
- **Govern profiler:** uses `console.log` and `spawn` with `stdio: inherit` — no structured log file, only JSON summary

### 3.4 Issues

- **No unified log:** Each test writes to stdout/stderr via `node:test`; failures are not aggregated into a single report with checkId.
- **Environment-dependent behavior not explicit:** Tests that skip due to missing git history or unsupported capabilities do `t.skip` but do not record environment in `GovernSummary`. The capability report exists but is not linked to test failures.
- **Quiet output:** `test:governance-quiet-output` verifies that env override is passed as env and unknown options are refused, but does not verify that quiet mode actually suppresses logs.

### 3.5 Proposed normalization

- **Structured test output:** Every test file should use `node:test` with TAP or JSON reporter, and the task runner should capture output to `proof/test-results/<checkId>.json` with `checkId`, `status`, `duration`, `assertions`.
- **Environment explicit:** Add `environment` field to `GovernanceCheck` (already partially via `determinism`): `deterministic` (no env), `contextual` (needs git, filesystem), `non-deterministic` (needs network, time). On failure, include `environment` in report and suggest `SYNTH_ENV=...` override.
- **Logging levels:** Introduce `SYNTH_LOG_LEVEL` and ensure all `console.log` in tests use a logger that respects it. The `clean-machine-output` test already checks that machine output is clean; extend it to check that logs are structured JSON when `SYNTH_LOG_FORMAT=json`.

---

## 4. Which suites should remain distinct, merge, or retire

### 4.1 Criteria

- **Distinct:** Protects a distinct invariant, has unique inputs/outputs, or is a separate governance class (ledger, execution, environment, installer, documentation)
- **Merge:** Overlaps heavily with another suite, tests same module, or is a variant (e.g., `mission-studio-*` 4 files test same studio but different aspects)
- **Retire:** Not in `test:all`, not in any profile, red at HEAD, and not serving as a guard (F9)

### 4.2 Inventory (242 files, 114 in chain, 14 missing)

**Ledger (6): distinct — keep**
- `test:ledger-writer`, `test:ledger-doctor`, `test:ledger-ceremony`, `test:ledger-capability-commits`, `test:ledger-delivery`, `test:ledger-abandonment`
- Reason: Each tests a distinct ceremony or writer mechanism; inputs are `src/ledger/*`, outputs are commits on ledger branch; distinct from other governance.

**Execution (5): distinct — keep but consider merging 2**
- `test:execution-intent`, `test:execution-runtime`, `test:execution-branch`, `test:execution-commit`, `test:execution-projection`
- Reason: Each tests a distinct phase of execution (intent, runtime, branch policy, commit, projection). `execution-branch` and `execution-branch-policy` could merge (policy is subset of branch), but keep distinct for now because branch policy has 25 tests and is a separate concern.

**Environment (5): distinct — keep, merge 2 into 1**
- `test:environment-discovery`, `test:environment-capability-graph`, `test:environment-filesystem`, `test:environment-discovery-evidence`, `test:environment-capability-report`
- Proposal: Merge `environment-discovery` + `environment-discovery-evidence` (both test discovery evidence) into one; keep `capability-graph`, `filesystem`, `capability-report` distinct because they test different outputs.

**Mission Studio (8): merge — 8 → 3**
- `test:mission-studio`, `test:mission-studio-snapshot-lineage`, `test:mission-studio-proposal-graph`, `test:mission-studio-snapshot-integrity`, `test:mission-studio-adapter-mapper`, `test:mission-studio-adapter-collector`, `test:mission-studio-duplicate-detection`, `test:mission-studio-adapter-*` etc.
- Proposal: Merge into 3: `mission-studio-core` (studio + lineage + integrity), `mission-studio-adapters` (mapper + collector), `mission-studio-duplicate` (duplicate detection + advisory). Currently 8 files, many overlap.

**Discovery (8): merge — 8 → 2**
- `discovery-adapter-contract`, `discovery-capability-contract`, `discovery-consumer-integration`, `discovery-consumers`, `discovery-correlate`, `discovery-findings`, `discovery-git-adapter`, `discovery-normalize`, `discovery-observation-capability`, `discovery-operational-artifact-adapter`, `discovery-project-model-rules`, `discovery-project-model`, `discovery-projection-capability`, `discovery-replay-contract`, `discovery-replay`, `discovery-session-provider` — many not in `test:all` chain, only in `test:discovery` meta task.
- Proposal: Merge into `test:discovery-contract` (adapter contracts) and `test:discovery-engine` (replay, findings, consumers). Keep `test:discovery` as meta.

**Adapter (16): merge — 16 → 4**
- `adapter-architecture`, `adapter-bdd`, `adapter-catalog`, `adapter-confidence`, `adapter-conversation`, `adapter-document`, `adapter-expedition-builder`, `adapter-filesystem`, `adapter-introspection`, `adapter-knowledge-extraction`, `adapter-mission-builder`, `adapter-objective-builder`, `adapter-specification`, `adapter-tdd`, `adapter-wizard`, `adapter`
- Proposal: Merge into `test:adapter-core` (catalog, architecture, introspection), `test:adapter-tdd-bdd` (tdd, bdd, conversation), `test:adapter-builders` (mission-builder, expedition-builder, objective-builder, wizard), `test:adapter-docs` (document, filesystem, knowledge-extraction, specification, confidence, dependency). Currently each adapter has its own test but they share harness.

**Installer (7): distinct — keep**
- `test:installer-contract`, `test:installer-environment`, `test:installer-distribution`, `test:installer-engine`, `test:installer-verify`, `test:installer-manifest`, `test:installer-upgrade`, `test:installer-certification` (missing from chain)
- Reason: Each installer phase is distinct; keep but add `installer-certification` to chain (it was missing).

**Documentation (3): distinct — keep**
- `test:documentation-expedition`, `test:documentation-integrity`, `test:documentation-projections`
- Reason: Each tests different projection integrity.

**Governance (4): distinct — keep, add missing**
- `test:governance-quiet-output`, `test:governance-incremental`, `test:governance-optimization`, `test:governance-orchestration`, `test:governance-evaluation-enforcement` (missing), `test:governance-record`, `test:govern-profiler`
- Proposal: Keep distinct; add `governance-evaluation-enforcement` and `governance-orchestration` to chain (they were missing).

**Stale/retire candidates (from missing list):**
- `test:proposal-evaluation` — was red at HEAD in F11, now fixed but not in chain; should be **merged** into `test:mission-studio` or added to chain.
- `test:task-npm-adapter`, `test:task-schema-registry` — were red in F9, not in chain; **retire** if they are superseded by `test:task-npm-adapter` guard, or fix and add to chain.
- `test:agent-sdk`, `test:mcp-server`, `test:package-distribution`, `test:ai-capability-projection` — not in chain; **distinct** but should be added to chain if they are part of release profile.
- `test:proof`, `test:release`, `test:adr`, `check:adr`, `check:artifact-policy` — `proof` is a stage, not a test; `check:artifact-policy` is already in chain; `test:adr`/`check:adr` are documentation integrity, should be **distinct** and kept.
- `test:synth-cli-govern-explain` — missing, should be **merged** into `test:synth-cli` or `test:explain-observability`.

### 4.3 Decision matrix summary

| Category | Count | Decision | Rationale |
|----------|-------|----------|-----------|
| ledger | 6 | distinct, keep | distinct ceremonies |
| execution | 5 | distinct, keep (merge 2 optionally) | distinct phases |
| environment | 5 | distinct, merge 2→1 | evidence overlap |
| mission-studio | 8 | merge 8→3 | same module |
| discovery | 8+ | merge 8→2 + meta | same engine |
| adapter | 16 | merge 16→4 | shared harness |
| installer | 7+1 | distinct, keep | distinct phases |
| documentation | 3 | distinct, keep | distinct projections |
| governance | 4+2 | distinct, keep | distinct concerns |
| stale | 14 missing | 5 retire, 9 add/merge | F9/F11 |

**Target after merge:** ~70 checks instead of 114, with same coverage but less duplication. Not implemented in this expedition; this is the plan.

---

## 5. How failures identify exact check and environment-dependent behavior explicit

### 5.1 Current failure reporting

- `runCommand` spawns with `stdio: inherit`, so failure output is visible but not captured in `GovernSummary`.
- `GovernSummary` has `checkId`, `status`, `exitCode`, `duration`, but not `failure.file`, `failure.assertion`.
- Task runner (`synth task run`) prints `{"checkId": "...", "status": "failed"}` on non-zero exit, but only when run via CLI, not via raw `npm run`.
- Environment-dependent tests use `t.skip` with message like `"no base branch in this checkout (CI fetches full history)"` but do not log environment.

### 5.2 Proposed improvements

1. **Failure envelope:** Every check failure should emit structured JSON:
   ```json
   {
     "checkId": "test:ledger-writer",
     "status": "failed",
     "exitCode": 1,
     "durationMs": 1234,
     "module": "runtime",
     "determinism": "contextual",
     "environment": {
       "git": "available",
       "filesystem": "available",
       "network": "unsupported",
       "baseBranch": "missing"
     },
     "failure": {
       "file": "tests/ledger-writer.test.js",
       "line": 42,
       "assertion": "assert.strictEqual",
       "expected": "true",
       "actual": "false",
       "stack": "..."
     },
     "nextStep": "Run 'npm run test:ledger-writer -- --verbose' or check environment report"
   }
   ```
2. **CheckId in every log line:** Prefix logs with `[checkId]` so `govern` output can be grepped.
3. **Environment explicit:** 
   - `environment-capability-report` already lists supported/degraded/unsupported families; surface its `guidance` in failure messages when `determinism=contextual` or `non-deterministic`.
   - Tests that depend on git history should check `git rev-parse --verify refs/heads/main` and if missing, emit `{"environment": {"baseBranch": "missing"}, "nextStep": "Run 'git fetch origin main --unshallow'"}` instead of just `t.skip`.
   - Introduce `SYNTH_ENV=ci|local|container` and make tests assert environment, not assume.
4. **Determinism field:** Already in `check-registry.js` (`deterministic|contextual|non-deterministic`) but not used in reporting. Use it to decide cacheability and to tag failures: `deterministic` failures are always bugs; `contextual` failures may be env-dependent; `non-deterministic` failures are flaky and should be retried or marked.
5. **Quiet output:** `test:governance-quiet-output` should verify that when `SYNTH_QUIET_LOGS=1`, only `checkId` and `status` are printed, not full stack. When `SYNTH_TASK_VERBOSE=1`, full telemetry is printed.

### 5.3 Implementation sketch (future expeditions)

- **Expedition 1:** Normalize logging — introduce logger with levels, make all tests use it, add `checkId` prefix.
- **Expedition 2:** Merge suites per decision matrix — 114 → ~70, add registration guard.
- **Expedition 3:** Parallelize — use `ParallelRunner` for independent checks, measure speedup.
- **Expedition 4:** Environment explicit — add `environment` field to `GovernSummary`, surface capability report in failures, make `t.skip` emit structured reason.

---

## 6. Governance profiler — detailed decomposition plan

### 6.1 Current file map

- `scripts/govern-profiler.js`: entry, `loadGovernChecks`, `runCommand`, `buildSummary`, `runGovernProfile`
- `scripts/governance/check-registry.js`: registry, defaults
- `scripts/governance/dependency-graph.js`: graph
- `scripts/governance/scheduler.js`: scheduling
- `scripts/governance/incremental-engine.js`: incremental
- `scripts/governance/proof-store.js`: proof cache
- `scripts/governance/orchestrator.js`: orchestration with profiles
- `scripts/governance/profiles.js`: profiles
- `scripts/governance/governance-classes.js`: classes
- `scripts/governance/change-detector.js`, `fingerprint.js`, `module-mapper.js`, `explain.js`, `benchmark.js`, `cache-backend.js`, `git-hooks/`, etc.

### 6.2 Proposed decomposition

**Stage 1 — Collection:**
- `src/governance/collection/` — `loadChecksFromTaskRegistry`, `resolveCheckMetadata`, `enrichWithCapabilityMap`
- Single source: `data/tasks/*.task.json` + `package.json` + `capability-validation-map.json`
- Output: `Check[]` with full metadata

**Stage 2 — Scheduling:**
- `src/governance/scheduling/` — `buildGraph`, `detectCycles`, `planIncremental`, `planFull`
- Input: `Check[]`, `changedFiles`, `profile`
- Output: `Plan[]` with `action: run|skip`, `reason`

**Stage 3 — Execution:**
- `src/governance/execution/` — `runCheck`, `runParallel`, `runSequential`, `captureOutput`
- Input: `Plan[]`
- Output: `Result[]` with `status`, `duration`, `failure`

**Stage 4 — Reporting:**
- `src/governance/reporting/` — `buildSummary`, `buildGraph`, `buildBaseline`, `buildProof`, `explain`
- Input: `Result[]`
- Output: `GovernSummary`, `GovernanceDependencyGraph`, `proof`, `baseline`, `explanation`

Currently all 4 stages are in `govern-profiler.js` and `orchestrator.js` with overlap. Future work splits them.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Merging suites hides failures | Keep distinct `checkId` even after merge; merged task runs multiple test files but reports each file as sub-check |
| Parallelism introduces flakiness | Only parallelize `deterministic` checks; `contextual`/`non-deterministic` stay sequential; add retry for `non-deterministic` |
| Environment-dependent tests fail in CI | Make env explicit, add `environment` field, and make CI fetch full history (`--unshallow`) as already done in proof guard fix |
| Registration drift (F1/F9) | Add guard: every `test:*` task must be in `test:all` or marked `standalone`; CI fails if not |
| Logging too verbose or too quiet | `SYNTH_TASK_VERBOSE` and `SYNTH_QUIET_LOGS` already exist; add `SYNTH_LOG_LEVEL` and test it |

---

## 8. Next steps — expeditions

1. **EXP-TEST-001 — Normalize logging and failure envelope** (scope: `tests/helpers/*`, `scripts/governance/*`, `src/cli/task-runner`)
   - Deliverable: Every failure names `checkId`, file, assertion, environment
2. **EXP-TEST-002 — Merge suites per matrix** (scope: `data/tasks/test%3Aall.task.json`, `data/tasks/*.task.json`, `tests/*`)
   - Deliverable: 114 → ~70 checks, same coverage, registration guard
3. **EXP-TEST-003 — Parallelize independent checks** (scope: `scripts/governance/parallel-runner.js`, `scripts/govern-profiler.js`)
   - Deliverable: `govern --full` uses parallel runner, measured speedup, no flakiness
4. **EXP-TEST-004 — Environment explicit** (scope: `src/environment/*`, `tests/environment-*`, `scripts/governance/*`)
   - Deliverable: `environment` field in `GovernSummary`, capability guidance in failures, `t.skip` with structured reason

Each expedition should be **draft → approved → committed → executing → completed** with evidence attached (git-diff, proof, baseline).

---

## 9. Appendix — Current test chain breakdown

See `data/tasks/test%3Aall.task.json` for full list. Grouped:

- **Core:** `test`, `test:governance-quiet-output`, `test:skr`, `test:audit`, `test:replay`, `test:replay-graph-integrity`, `test:graph-integrity`, `test:explain-observability`, `test:determinism`, `test:adversarial`
- **Adapters:** `test:adapter`, `test:tdd`, `test:bdd`, `test:conversation`, `test:document`, `test:filesystem`, `test:specification`, `test:knowledge-extraction`, `test:confidence`, `test:dependency`, `test:architecture`, `test:mission-builder`, `test:expedition-builder`, `test:objective-builder`, `test:wizard`, `test:mission-studio*` (8), `test:cli-duplicate-advisory`, `test:api-adapter-integration`, `test:adapter-introspection`
- **Execution:** `test:execution-intent`, `test:execution-runtime`, `test:execution-branch`, `test:execution-commit`, `test:execution-projection`
- **Ledger:** `test:ledger-writer`, `test:ledger-doctor`, `test:ledger-ceremony`, `test:ledger-capability-commits`, `test:ledger-delivery`, `test:ledger-abandonment`, `test:expedition-governance`, `test:expedition-auto-commit`, `test:expedition-evidence`, `test:declared-branch`
- **Environment:** `test:environment-discovery`, `test:environment-capability-graph`, `test:environment-filesystem`, `test:environment-discovery-evidence`, `test:environment-capability-report`
- **Installer:** `test:installer-contract`, `test:installer-environment`, `test:installer-distribution`, `test:installer-engine`, `test:installer-verify`, `test:installer-manifest`, `test:installer-upgrade`, `test:synth-cli`
- **Documentation:** `test:documentation-expedition`, `test:documentation-integrity`, `test:documentation-projections`, `test:public-vocabulary-audit`, `test:freeze-certification`
- **Other:** `test:operator-journey`, `test:first-contact-patterns`, `test:first-contact-quickstart`, `test:first-contact-archive-a`, `test:first-operator-experience`, `test:brownfield`, `test:adoption-validation`, `test:ai-benchmark`, `test:core-boundary`, `test:impact-analyzer`, `test:validation-mapping`, `test:validation-planner`, `test:protected-asset-escalation`, `test:govern-recursion-guard`, `test:draft-integrity`, `test:evidence-path`, `test:decision-events`, `test:operator-briefing`, `test:clean-machine-output`, `test:extraction-reporting`, `test:runtime-integrity`, `test:repository-identity`, `test:resume-briefing`, `test:taskpro-regression`, `bench:interruption`, `test:governance-record`, `test:verify-engine`, `test:discovery`, `test:govern-profiler`, `test:task-npm-adapter`, `test:task-schema-registry`, `test:governance-incremental`, `test:governance-optimization`, `test:runtime-repair`, `test:certification-framework`, `test:artifact-policy`, `test:auto-commit-ignored-paths`, `test:no-write-on-read`, `check:artifact-policy`, `test:adr`

---

## 10. References

- F1: Proof Gate does not run test suite — fixed in Verification Coverage Truthfulness expedition (`87e6515de3815bea`)
- F7–F10, F15: snapshot verification, branch-gate, stale tasks, evidence manifest, auto-commit — also fixed in same expedition
- `docs/plans/master-delivery-plan.md` rev 3.6 — records F1–F15 and E5 slices
- `docs/architecture/testing-and-tasking.md` — testing and tasking architecture
- `docs/guides/developer/testing.md` — developer testing guide
- `scripts/governance/` — profiler modules
- `data/tasks/` — task registry

---

**End of reviewed plan — ready for expedition approval and implementation in follow-up expeditions.**
