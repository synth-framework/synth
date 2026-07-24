# EXP-REFINE-007 — Mission Studio Integration

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 4 — Integration and Certification  
**Authority:** Synth Architectural Constitution

---

## Goal

Add Refinement as the first phase of the Mission Studio lifecycle.

---

## Purpose

Mission Studio should surface refinement, alignment, and convergence as first-class phases. This expedition updates the Mission Studio state machine and projection layer to include the new pre-Mission phases.

---

## Deliverables

1. **Updated Mission Studio lifecycle**:
   ```text
   Intent
     ↓
   Refinement
     ↓
   Alignment
     ↓
   Discovery
     ↓
   Mission
     ↓
   Expedition
     ↓
   Governance
     ↓
   Replay
   ```
2. **Mission Studio projections** for:
   - Refined Intent
   - Alignment Contract
   - Divergence Gate status
   - Convergence Report
3. **State machine updates** in the planning/runtime layers.
4. **UI specifications** for the new phases.
5. **Tests** verifying the updated lifecycle transitions.

---

## Acceptance Criteria

- Mission Studio displays Refinement as the first phase.
- Alignment Contract approval is visible as a gate state.
- Convergence Certification appears after Acceptance.
- The state machine prevents skipping Refinement/Alignment before Mission creation.
- Projections include the new artifacts.

---

## Out of Scope

- Visual redesign of Mission Studio.
- Runtime execution of refinement (this expedition focuses on state and projection).

---

## Related

- ADR-047 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-027 — Mission Studio Homepage
