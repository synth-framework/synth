# EXP-SIMPLIFICATION-001 — Completion Evidence

> Recorded after implementation and verification.

```yaml
EXP-SIMPLIFICATION-001:
  status: completed

  objective:
    Restore SYNTH's authority model by reducing runtime state to irreducible
    truth and making workflow, governance, execution, and projection concerns
    derived artifacts.

  completed:
    - ADR numbering collisions resolved (ADR-036 → ADR-047, ADR-037 → ADR-048)
    - docs/adr/README.md updated through ADR-048
    - ADR-047 and ADR-048 ratified as Accepted
    - CanonicalState reduced to irreducible domain truth in src/types/state.ts
    - Derived-state contract produced (EXP-SIMPLIFICATION-001-derived-state-contract.md)
    - Derived-state builders implemented under src/state/derived/
    - src/types/derived-state.ts introduced
    - src/runtime/replay.ts no longer populates derived fields
    - src/runtime/executor.ts builds DerivedState and passes it to consumers
    - CapabilityHandler type includes derivedState
    - src/core/graph-integrity.ts validates generated work items from events
    - Authority resolver design produced (EXP-SIMPLIFICATION-001-authority-resolver-design.md)
    - Regression tests added to tests/synth.test.js
    - data/canonical-state.json regenerated from event log under new shape

  verification:
    tests:
      npm_test:
        passed: true
        result: "119 passed, 0 failed"

      targeted_tests:
        - tests/alignment-divergence.test.js: 6 passed, 0 failed
        - tests/operator-journey.test.js: passed
        - tests/intent-refinement.test.js: 11 passed, 0 failed
        - tests/review-gate-engine-integration.test.js: 4 passed, 0 failed
        - tests/execution-intent.test.js: 2 passed, 0 failed
        - tests/graph-integrity.test.js: 15 passed, 0 failed

      replay_consistency:
        passed: true
        operational_hash: "521602200"
        replay_hash: "521602200"
        operational_hash_matches_replay_hash: true

      replay_graph_integrity:
        passed: true
        result: "19 passed, 0 failed"

      determinism:
        passed: true

      execution_gate_regression:
        passed: true

      protected_asset_escalation:
        passed: true

      explain_observability:
        passed: true
        result: "25 passed, 0 failed"

      typecheck:
        passed: true

  boundary_cases_verified:
    - CanonicalState no longer contains derived workflow fields
    - DerivedState reconstructs review gate state from events
    - DerivedState reconstructs Genesis alignment state from events
    - DerivedState reconstructs execution intent graph from events
    - Generated work items are derived, not canonical
    - Replay hash is stable and excludes derived fields
    - Graph integrity still detects duplicate WORK_ITEM_GENERATED identities

  architectural_fix:
    description: >
      CanonicalState now contains only irreducible domain truth. Workflow,
      governance, execution coordination, and audit state are computed on demand
      from the event log via pure derived-state builders. This separates fact
      from process and ensures governance enforcement protects canonical truth
      rather than accidental representations of truth.

  follow_up:
    - EXP-GOVERNANCE-ENFORCEMENT-001 — Implement authority resolver inside ExecutionGate
```

---

## Files changed

| File | Change |
|------|--------|
| `src/types/state.ts` | Reduced `CanonicalState` to irreducible truth; removed derived fields |
| `src/types/derived-state.ts` | New `DerivedState` and `DerivedStateProjection` types |
| `src/types/capability.ts` | `CapabilityHandler` accepts `derivedState` |
| `src/state/derived/build-derived-state.ts` | Pure builders for all derived state |
| `src/state/derived/index.ts` | Builder exports |
| `src/runtime/replay.ts` | No longer populates derived fields; `computeStateHash` excludes them |
| `src/runtime/executor.ts` | Builds `DerivedState` and passes it to domain/registry handlers |
| `src/core/graph-integrity.ts` | Validates generated work items from events; uses `DerivedState` for counts |
| `src/domain/execution.ts` | Already consumed `derivedState`; no functional change |
| `src/governance/review-gate-engine.ts` | Already consumed `derivedState`; no functional change |
| `src/cli/explain-observability.ts` | Updated to use `derivedState` |
| `docs/adr/ADR-047-intent-refinement-and-alignment-governance.md` | Renumbered from ADR-036; status Accepted |
| `docs/adr/ADR-048-genesis-lifecycle-and-alignment-contracts.md` | Renumbered from ADR-037; status Accepted |
| `docs/adr/README.md` | Updated through ADR-048 |
| `docs/expeditions/EXP-SIMPLIFICATION-001-derived-state-contract.md` | New derived-state contract |
| `docs/expeditions/EXP-SIMPLIFICATION-001-authority-resolver-design.md` | New authority resolver design |
| `tests/synth.test.js` | Added 6 simplification regression tests |
| `tests/alignment-divergence.test.js` | Uses `buildDerivedState` for alignment contract assertions |
| `tests/intent-refinement.test.js` | Runner passes `derivedState` to `applyDomain` |
| `tests/review-gate-engine-integration.test.js` | Runner returns derived state |
| `tests/execution-intent.test.js` | Uses `buildDerivedState` for execution intent assertions |
| `data/canonical-state.json` | Regenerated from event log under new canonical shape |

---

## Migration note

The canonical-state projection was regenerated from `data/event-log.jsonl` after
reducing `CanonicalState`. The event log is unchanged. Replay now produces a
consistent hash (`521602200`). This is expected migration evidence for the
state-shape change.

---

## Completion note

The storage model now matches the conceptual model: `CanonicalState` is
irreducible truth, and all workflow/governance/execution/audit views are
derived projections. This unblocks `EXP-GOVERNANCE-ENFORCEMENT-001` by ensuring
the authority resolver evaluates enforcement against canonical truth rather than
derived workflow state.
