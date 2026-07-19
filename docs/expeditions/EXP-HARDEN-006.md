# EXP-HARDEN-006 — Validation Expansion

**Status:** Completed and accepted
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-004, EXP-HARDEN-005  
**Blocks:** EXP-HARDEN-007

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Create permanent regression suites that guard against the defects discovered during Programs 007–009.

---

## Motivation

One-off fixes are not enough. The defects found in Mission Studio parent references and graph connectivity must be permanently prevented from recurring. This expedition turns each hardening activity into an automated regression test.

---

## Deliverables

1. **Relationship Integrity tests**
   - Verify parent references in all generated snapshots.

2. **Snapshot Certification tests**
   - Validate persisted snapshots automatically.

3. **Replay Graph Validation tests**
   - Ensure Replay catches broken aggregate references.

4. **Genesis Intake Validation tests**
   - Ensure Genesis rejects invalid snapshots.

5. **Cross-Version Replay tests**
   - Replay older event logs with current runtime.

6. **Projection Determinism tests**
   - Verify documentation projections are deterministic.

7. **Long-Running Replay tests**
   - Replay large event logs to check stability.

8. **Graph Integrity Certification tests**
   - Validate graph invariants across examples.

---

## Acceptance

`npm run govern` runs the expanded validation suite and all tests pass.

---

## Phases

### Phase 1 — Inventory existing tests

Map current test coverage and identify gaps.

### Phase 2 — Add relationship tests

Cover Mission Studio parent-reference correctness.

### Phase 3 — Add snapshot and Genesis tests

Cover certification and intake validation.

### Phase 4 — Add replay and graph tests

Cover graph-aware replay and integrity proofs.

### Phase 5 — Integrate into govern

Ensure all new tests run under `npm run govern`.

---

## Risks

| Risk | Mitigation |
|---|---|
| Test suite becomes too slow | Parallelize and use fixtures |
| Tests are brittle | Test invariants, not exact IDs |
| Coverage gaps | Use the defects from 007–009 as test cases |

---

## Definition of Done

- [x] Existing test inventory complete.
- [x] Relationship Integrity tests added.
- [x] Snapshot Certification tests added.
- [x] Replay Graph Validation tests added.
- [x] Genesis Intake Validation tests added.
- [x] Cross-Version Replay tests added.
- [x] Projection Determinism tests added.
- [x] Long-Running Replay tests added.
- [x] Graph Integrity Certification tests added.
- [x] All tests run under `npm run govern`.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Audit current tests.
2. Add new test files in `tests/`.
3. Update `npm run test:all` if needed.
4. Run full governance.

---

## Completion Notes

Implemented on branch `feat/exp-harden-006`. The full governance pipeline runs via the CI `proof` check on the PR; acceptance is recorded through PR merge. Everything else is done and verified by targeted validation.

**Phase 1 — Test inventory (deliverables 1–6, 8 confirmed; 7 was missing).** Each mapped suite was run and confirmed green before any change:

| Deliverable | Suite | Result |
|---|---|---|
| 1. Relationship Integrity | `tests/mission-studio-proposal-graph.test.js` (EXP-HARDEN-001) | 11/11 |
| 2. Snapshot Certification | `tests/mission-studio-snapshot-integrity.test.js` (EXP-HARDEN-002) | 16/16 |
| 3. Replay Graph Validation | `tests/replay-graph-integrity.test.js` (EXP-HARDEN-004) | 19/19 |
| 4. Genesis Intake Validation | `tests/genesis-hardening.test.js` (EXP-HARDEN-003) | 18/18 |
| 5. Cross-Version Replay | first-contact archive (32 events) inside `tests/replay-graph-integrity.test.js` | covered |
| 6. Projection Determinism | `tests/first-contact-projection.test.js` (6/6) + `scripts/verify-documentation-projection.js` (exit 0) | covered |
| 7. Long-Running Replay | **was missing** — added in `tests/validation-expansion.test.js` | new |
| 8. Graph Integrity Certification | `tests/graph-integrity.test.js` (EXP-HARDEN-005) | 15/15 |

The conventional home for this map is the expedition doc itself (EXP-HARDEN-003…005 documented their suites the same way); `scripts/verify-capability-validation-map.js` maps capabilities to npm scripts, not expedition deliverables, and hardening suites are deliberately not capability-map entries.

**GAP 1 — Memory-persistence footgun (fixed at the infra seam).** Root cause: `createInfra` (`src/infra/index.ts`) built the event store unconditionally via `EventStore.createAuthorized(config.eventLogPath)`, and `EventStore` falls back to `<cwd>/data/event-log.jsonl` when no path is given — `isFile` gated only the state/checkpoint stores, git, and fs. Every `bootstrap({ infra: { persistence: "memory" } })` that reached a write path appended to the repo's canonical log (confirmed live: `tests/api-adapter-integration.test.js` appended 5 events per run, 215 → 220 lines, SHA-256 changed; log restored byte-identical). Fix: new `InMemoryEventStore` in `src/infra/event-store.ts` (same idiom as `InMemoryStateStore`/`InMemoryCheckpointStore`, same write-authorization token, wrapped by the same `createGuardedEventStore` proxy so ExecutionGate stays the single mutation authority), selected in `createInfra` when `persistence !== "file"`. This changes infra wiring only — no event schemas, replay semantics, or gate behavior. Every memory-mode consumer was audited: CLI mission/expedition/docs commands and `bootstrap-apply.ts` are single-invocation (drafts persist via `data/drafts/` files, not the log); `tests/`, `scripts/verify-determinism.js`, and `examples/_shared/run-example.js` read through the same context instance, so per-instance in-memory reads are equivalent; every script that needs a durable log already uses `persistence: "file"` with explicit paths. Zero consumer changes were required. Regression guard (3 tests in `tests/validation-expansion.test.js`): memory-mode write path leaves `data/event-log.jsonl` byte-identical (hash-or-absent, CI-safe), memory mode creates no `data/event-log.jsonl` even under an empty cwd (child process), and file mode with explicit paths still writes. After the fix: `api-adapter-integration` 6/6 with the log byte-identical (SHA-256 `03718ab4…c3db5` before and after every suite run).

**GAP 2 — Status-enum validation on replay (deferred from EXP-HARDEN-004).** `checkStructuralConsistency` in `src/core/replay-verifier.ts` now validates mission (`draft|active|completed|archived`), expedition (`draft|approved|executing|completed|cancelled`), and objective (`draft|completed`) statuses alongside workItem/plan, same divergences idiom, enums mirroring `src/types/state.ts`. Fixture audit before enforcing: the only committed event-log fixture (first-contact archive) is all-draft — clean; the local pre-audit archive (`data/archive/event-log-2026-06-29-pre-audit.jsonl`, untracked/gitignored) carries legacy vocabulary (`proposed`/`planning`/`open`) but nothing replays it. `consistent` semantics unchanged: new divergences fire only on genuinely invalid enums.

**GAP 3 — Generated work items vs the m/e/o identity space (deferred from EXP-HARDEN-005).** The check lives in `validateGeneratedWorkItems` (`src/core/graph-integrity.ts`) — the seam where EXP-HARDEN-005 placed all generated-work-item validation — not in the replay-tier `validateAggregateGraph`, preserving the documented tiering (replay tier: m/e/o space; graph-integrity tier: m/e/o + generated work items). A `WORK_ITEM_GENERATED` id found in `state.missions`/`state.expeditions`/`state.objectives` is a `duplicate-creation` violation ("used as both X and generatedWorkItem", mirroring the replay-tier message idiom) bucketed under the existing `unique-identity` invariant. A consistency test proves m/e/o-internal clashes are still flagged identically by both reports.

**GAP 4 — Long-Running Replay (deliverable 7).** A synthetic 10,800-event log (80 missions × mixed expedition/objective/work-item/lifecycle traffic) replays with identical stateHash across runs, `chainValid`, `consistent` with zero divergences against the saved projection, `graphValid`, and a `valid` graph-integrity report (measured ~1.7s; completion asserted, duration recorded, only a generous 120s tripwire). The 215-event legacy-class shape (heavy duplicate creations + broken refs) at 4,300 and 17,200 events keeps legacy semantics (`consistent: true`, `graphValid: false`) and scales near-linearly: 3.09x time for 4x events (min-of-3, quadratic would be ~16x; bound 12x absorbs CI noise).

**GAP 5 — Confidence-gate drift guard (documented in EXP-HARDEN-002).** No behavior change. Guard tests pin the gate's invariants: a bare one-observation draft (today 0.67) rejects with the `Confidence X.XX below threshold Y.Y` idiom quoting the session's own confidence; an enriched mission/expedition/objective session (today 0.71) approves with proposals; a blocking unknown rejects with `Blocking unknowns prevent approval` even above the threshold. Threshold or confidence-formula drift now fails the suite.

**Phase 5 — govern wiring.** New `test:validation-expansion` script (18 tests) runs in `test:all` immediately after `test:api-adapter-integration`; `npm run govern` = build + test:all + proof picks it up.

**Sibling pollution fix (same class as GAP 1).** `tests/first-contact-projection.test.js` ran `scripts/repair-first-contact-archive.js` against the real archive; the script writes `replay-report.json` in place, so every suite run rewrote the committed file with the post-HARDEN-004 verifier shape (`graphValid` + 36 violations). The repair test now mirrors the archive into `os.tmpdir()`, runs the script there, asserts the derived report (consistent, chain valid, 32 events), and guards the committed `replay-report.json` byte-identical. `generate-first-contact-projection.js --check` (12 files, deterministic) and `verify-website-sync.js` both pass with the restored archive.

Follow-ups (noted, not fixed — candidates for EXP-HARDEN-007 Observability or the program report):

1. `PartitionStore`/`SegmentStore` in `createInfra` still default to `<cwd>/data/event-stream` under memory mode (initialize-only mkdir; nothing appends in audited flows) — same fallback shape as the event-log footgun, lower severity.
2. `createFileSystemSnapshotStore("./data/snapshots")` is hardcoded in `src/core/bootstrap.ts` for all persistence modes; only `saveSnapshot`/`listSnapshots` operations write there.
3. `scripts/verify-determinism.js` and `tests/genesis-hardening.test.js` still pass `eventLogPath` under `persistence: "memory"` — inert after the fix (the paths were only ever isolation intent); cosmetic cleanup optional.
