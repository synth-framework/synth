# EXP-REFINE-003 — Divergence Gate

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 2 — Alignment Artifacts  
**Authority:** Synth Architectural Constitution

---

## Goal

Implement the Divergence Gate — a governance checkpoint that prevents Missions and Expeditions from proceeding when intent alignment is incomplete.

---

## Purpose

The Divergence Gate answers: *"Do we agree that the Alignment Contract accurately captures the intended outcome?"* It is the enforcement mechanism for the alignment layer.

---

## Deliverables

1. **Divergence Gate decision model** in `src/governance/divergence-gate.ts`.
2. **Gate states**:
   - `draft`
   - `awaiting_alignment`
   - `aligned`
   - `revision_required`
   - `rejected`
   - `superseded`
3. **Decisions**:
   - `aligned`
   - `revision_required`
   - `rejected`
   - `superseded`
4. **Divergence Report** artifact.
5. **Integration with Program 035 gate engine** where possible.
6. **Unit tests** covering all gate states and decisions.

---

## Acceptance Criteria

- A Mission cannot be created while the Divergence Gate is not `aligned`.
- The gate consumes a Refined Intent and an Alignment Contract.
- The gate produces a Divergence Report.
- `revision_required` returns the intent to refinement.
- `rejected` terminates the intent.
- `superseded` allows a new intent to replace the current one.
- The gate respects completion policies (Automatic, Human Required, AI Required).

---

## Out of Scope

- Mission creation side effects.
- Automated comparison of implementation to contract.
- Mission Studio visualization.

---

## Related

- ADR-047 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-REFINE-001 — Refinement Layer Model
- EXP-REFINE-002 — Alignment Contract
