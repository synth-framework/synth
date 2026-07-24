# EXP-DOC-005 — Reconcile Expedition Statuses for Programs 035 and 036

**Status:** Completed  
**Kind:** Documentation Remediation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-039 — Documentation Remediation Program  
**Authority:** Synth Architectural Constitution

---

## Goal

Align child expedition statuses with the implementation state declared by their parent programs.

---

## Purpose

Programs 035 and 036 are both marked as having engine, integration, and certification complete, awaiting formal closeout. However, many child expeditions are still marked **Proposed**:

- Under **EXP-PROGRAM-035**: all 13 `EXP-GATE-001` through `EXP-GATE-013` expeditions are Proposed.
- Under **EXP-PROGRAM-036**: most `EXP-REFINE-001` through `EXP-REFINE-016` expeditions are Proposed, while the implementation is described as complete in the program charter.

This status lag creates noise in status reports and may contribute to governance-identity validation errors.

---

## Deliverables

1. Updated statuses for `EXP-GATE-001` through `EXP-GATE-013` to reflect actual implementation state.
2. Updated statuses for stale `EXP-REFINE-*` expeditions under EXP-PROGRAM-036.
3. A reconciliation note in each updated expedition explaining the status change.
4. Updated program charters marking Programs 035 and 036 as "Completed and accepted" once reconciliation is done.

---

## Acceptance Criteria

- [x] Every child expedition of Program 035 has a status consistent with the program charter.
- [x] Every child expedition of Program 036 has a status consistent with the program charter.
- [x] Programs 035 and 036 are marked "Completed and accepted" after reconciliation.
- [x] Each status change includes a brief rationale note.

---

## Out of Scope

- Reopening implementation work.
- Changing governance semantics.
- Modifying runtime code.

---

## Related

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-PROGRAM-036.md`
- `docs/expeditions/EXP-GATE-*.md`
- `docs/expeditions/EXP-REFINE-*.md`
