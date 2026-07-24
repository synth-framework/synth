# EXP-SIMPLIFICATION-002 — Test Infrastructure Unification

> Phase 2 of the SYNTH simplification program: reduce duplicated test infrastructure before simplifying production subsystems.

## Authority

- Depends on: `EXP-COMPLEXITY-AUDIT-001`, `EXP-CAPABILITY-BOUNDARY-001`
- Classification: Test infrastructure is **Application** (simplifiable).
- Kernel: **Protected**. No production code changes beyond test helpers.

## Objective

Replace duplicated helper implementations across the test suite with shared test infrastructure modules. Test behavior coverage must remain identical.

## Constraints

- No new concepts.
- No new lifecycle states.
- No new events.
- No new public vocabulary.
- No kernel modifications.
- No production behavior changes.
- No test deletion.

## Acceptance criteria

| Deliverable | Status |
|---|---|
| One CLI harness | ✅ `tests/helpers/cli-harness.js` |
| One kernel fixture library | ✅ `tests/helpers/kernel-event-fixtures.js` |
| One governance fixture library | ✅ `tests/helpers/governance-read-model-fixture.js` |
| One adapter lifecycle helper | ✅ `tests/helpers/adapter-lifecycle.js` |
| One execution fixture library | ✅ `tests/helpers/execution-fixtures.js` |
| One trust workflow helper | ✅ `tests/helpers/trust-workflow.js` |
| Representative tests migrated | ✅ 7 tests updated |
| Full test suite passes | ✅ 119 passed |

## Remaining work

The shared helpers exist and are validated. Full migration of the remaining ~60 test files that still define local copies is a mechanical follow-up. It should be done incrementally, file by file, to keep `npm test` green after each change.

## Success metrics

| Metric | Target |
|---|---|
| Duplicated helper definitions | -50% |
| `runSynth` definitions | 1 |
| `parseJson` definitions | 1 |
| `makeEvent` definitions | 1 |
| `makeObservation` definitions | 1 |

## Non-goals

- Do not simplify production subsystems in this expedition.
- Do not redesign adapter, discovery, or environment interfaces.
- Do not delete or rewrite test scenarios.

## Program context

This expedition is Phase 2 of the simplification program:

1. ✅ Phase 1 — Stabilize kernel safety boundary.
2. **Phase 2 — Simplify test infrastructure.** (this expedition)
3. Phase 3 — Application subsystem simplification.
4. Phase 4 — Re-audit and measure.

## Rationale

Production simplification becomes dangerous when tests are expensive to update. By unifying test infrastructure first, each subsequent production simplification expedition touches fewer test files and carries lower regression risk.
