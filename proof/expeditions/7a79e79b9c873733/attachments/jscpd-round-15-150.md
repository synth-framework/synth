# Round 15/150 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 15 -k 150`
Before: 7 clones / 206 dup lines (0.45%). After: 0 clones / 0 lines. 268 files (+3 helpers).

## Triage → fix (all 7)

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `governance-complete-force:38` ↔ `governance-evaluation-schema:27` (39l, CLI approveMission) | Known F2+F3 | Thin wrappers → `tests/helpers/mission-lifecycle.js:createAndApproveMission` (file subject/purpose preserved, `returnGateContext:true`); dropped now-unused `bootstrap`/`createAlignedContract` imports |
| 2 | `gate-012:58` ↔ `review-gate:35` (30l, `createRunner`) | NEW execution-runner | New `tests/helpers/domain-runner.js:createDomainRunner({makeCtx})` (superset API: `getEvents` + `getCanonicalState`); migrated 3rd identical copy `intent-refinement:39` preemptively (verified its call sites ignore `run()` return) |
| 3 | `expedition-lifecycle:95` ↔ `governance-lifecycle-contract:37` (44l, `certifyConvergence`) | Known F3 | New `tests/helpers/governance-intent.js:certifyConvergence` (fixed payload); `expedition-completion-gates:41` is a near-variant (different artifacts/asserts) — left for its floor |
| 4 | `expedition-auto-commit:72` ↔ `expedition-batch-operations:32` (22l, CLI approve tail) | Known F2+F4 | Same as #1 (wrappers → mission-lifecycle helper) |
| 5 | `environment-capability-report:18` ↔ `environment-discovery-evidence:21` (17l, `makeInMemoryContext`) | NEW discovery ctx | New `tests/helpers/in-memory-context.js` |
| 6 | `discovery-replay:181` ↔ self `119` (22l, session literal) | NEW intra-file | In-file `makeSession(overrides)` builder; site 2 → `makeSession()`, site 1 passes adapters/executionOrder/projections |
| 7 | `convergence-certification:61` ↔ `governance-evaluation-enforcement:52` (32l, in-memory approveMission + createExecutingExpedition) | Known F5-adjacent | `governance-intent.js:approveMission` (purpose param) + `createExecutingExpedition`; 3-line purpose wrappers kept (below floor) |

`expedition-lifecycle:44` (5th CLI copy, single-evidence) migrated too. Helper evidence loop runs ~3 iterations to clear 0.72 (probed: 0.67→0.69→0.71→0.73) vs original single add — same approved-mission outcome.

## Verification (post-edit `node --test`)

PASS: convergence-certification, governance-evaluation-enforcement, governance-lifecycle-contract (135s), expedition-lifecycle (1043s), governance-evaluation-schema, expedition-batch-operations, intent-refinement, environment-capability-report, environment-discovery-evidence, discovery-replay.
Pre-existing failures, byte-identical on pristine HEAD copies: gate-012 Scenario 1 (`CONVERGENCE_CERTIFICATION_REQUIRED`), review-gate ×2 (reviewer-kind policy messages), complete-force (`expedition complete without convergence should fail`), auto-commit (`SYNTH_AUTO_COMMIT=0 should not auto-commit`). Not caused by this round; out of scope (separate `5f2f84fe` idea).

## Guardrail notes

- One home per pattern; wrappers only carry file-specific params (subject/purpose) and are ≤7 lines.
- `certifyConvergence` fixed-payload helper deliberately excludes `convergence-certification:102` (observedFeatures param) and `expedition-dependency-enforcement:94` (decision param) variants — later floors.
- `timestamp`-flavor `makeCtx` untouched (different function).
