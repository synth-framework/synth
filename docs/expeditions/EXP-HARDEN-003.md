# EXP-HARDEN-003 — Genesis Hardening

**Status:** Proposed  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-001, EXP-HARDEN-002  
**Blocks:** EXP-HARDEN-004, EXP-HARDEN-005

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

Make Genesis defensive by validating snapshots before intake and certifying the seed event graph.

---

## Motivation

Genesis currently trusts the `ApprovedMissionModelSnapshot` it receives from Mission Studio via the snapshot bridge. It does not validate that parent references resolve, that identities are unique, or that the resulting event graph is connected. A defensive Genesis is necessary before SYNTH can guarantee constitutional correctness.

---

## Deliverables

1. **Snapshot acceptance validator**
   - Reject snapshots with invalid parent references.
   - Reject snapshots with duplicate identities.
   - Reject snapshots with missing required fields.

2. **Relationship validator**
   - Verify every expedition references an existing mission.
   - Verify every objective references an existing expedition.

3. **Genesis certification report**
   - Produce a report describing what Genesis validated and any warnings.

4. **Graph certification**
   - Confirm the seed event graph is connected and acyclic.

5. **Genesis integrity proofs**
   - Generate a proof artifact that certifies successful Genesis intake.

---

## Acceptance

Genesis rejects a snapshot with broken parent references and accepts a valid snapshot with a certification report.

---

## Phases

### Phase 1 — Design validator

Define the validation rules and error messages.

### Phase 2 — Implement snapshot acceptance

Add validation before `GenesisIntake.initialize` commits seed events.

### Phase 3 — Implement relationship validation

Check mission/expedition/objective parent references.

### Phase 4 — Certification report

Generate and persist a Genesis certification report.

---

## Risks

| Risk | Mitigation |
|---|---|
| Validator rejects valid snapshots | Start with warnings, escalate to errors after burn-in |
| Performance impact | Validate once at intake time |
| Error messages leak internals | Surface actionable messages without exposing implementation |

---

## Definition of Done

- [ ] Snapshot acceptance validator implemented.
- [ ] Relationship validator implemented.
- [ ] Genesis certification report generated.
- [ ] Graph certification implemented.
- [ ] Integrity proof artifact produced.
- [ ] Tests cover rejection and acceptance cases.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add validation module in `src/genesis/`.
2. Integrate into `GenesisIntake.initialize`.
3. Add certification report generation.
4. Add tests in `tests/genesis-snapshot-bridge.test.js` or new file.

---

## Completion Notes

Pending.
