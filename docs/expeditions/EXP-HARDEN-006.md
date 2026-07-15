# EXP-HARDEN-006 — Validation Expansion

**Status:** Proposed  
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

- [ ] Existing test inventory complete.
- [ ] Relationship Integrity tests added.
- [ ] Snapshot Certification tests added.
- [ ] Replay Graph Validation tests added.
- [ ] Genesis Intake Validation tests added.
- [ ] Cross-Version Replay tests added.
- [ ] Projection Determinism tests added.
- [ ] Long-Running Replay tests added.
- [ ] Graph Integrity Certification tests added.
- [ ] All tests run under `npm run govern`.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit current tests.
2. Add new test files in `tests/`.
3. Update `npm run test:all` if needed.
4. Run full governance.

---

## Completion Notes

Pending.
