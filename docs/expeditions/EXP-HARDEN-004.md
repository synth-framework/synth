# EXP-HARDEN-004 — Replay Hardening

**Status:** Proposed  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-003  
**Blocks:** EXP-HARDEN-005, EXP-HARDEN-006

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

Extend Replay from a determinism checker to a correctness checker that validates graph integrity and aggregate navigation.

---

## Motivation

The current Replay Verifier confirms that operational state matches the replayed state and that the hash chain is intact. It does not verify that the event graph is semantically correct: that every expedition points to a real mission, every objective points to a real expedition, and no orphans exist. Replay should prove correctness, not just determinism.

---

## Deliverables

1. **Graph-aware replay**
   - During replay, validate parent-child relationships between aggregates.

2. **Referential integrity verification**
   - Every `missionId` referenced by an expedition resolves to a mission.
   - Every `expeditionId` referenced by an objective resolves to an expedition.

3. **Aggregate navigation validation**
   - Confirm `state.missions[expedition.missionId]` exists after replay.
   - Confirm `state.expeditions[objective.expeditionId]` exists after replay.

4. **Cross-version replay**
   - Ensure older event logs replay correctly with newer runtime versions.

5. **Projection equivalence**
   - Verify that different projections of the same state are equivalent.

---

## Acceptance

Replay fails with a clear explanation when an event log contains broken aggregate references, and passes only when the graph is fully connected.

---

## Phases

### Phase 1 — Define graph invariants

Document the relationships Replay must verify.

### Phase 2 — Extend Replay Verifier

Add graph-integrity checks to `src/core/replay-verifier.ts`.

### Phase 3 — Extend replay engine

Update `src/runtime/replay.ts` to enforce navigation invariants.

### Phase 4 — Regression tests

Add event logs with intentional defects and assert Replay catches them.

---

## Risks

| Risk | Mitigation |
|---|---|
| New checks break legacy logs | Start as warnings, then enforce |
| Performance impact | Graph checks are O(n) |
| False positives | Test with real examples first |

---

## Definition of Done

- [ ] Graph invariants documented.
- [ ] Replay Verifier extended with graph checks.
- [ ] Replay engine enforces navigation invariants.
- [ ] Cross-version replay tests added.
- [ ] Projection equivalence tests added.
- [ ] Defective event logs caught by tests.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Design graph invariant specification.
2. Extend `ReplayVerifier.checkStructuralConsistency` or add new checks.
3. Update `applyEvent` to warn or fail on broken navigation.
4. Add tests in `tests/` and `scripts/verify-replay.js`.

---

## Completion Notes

Pending.
