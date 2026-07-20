# EXP-REFINE-001 — Refinement Layer Model

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 1 — Refinement Model  
**Authority:** Synth Architectural Constitution

---

## Goal

Define the canonical refinement process that transforms ambiguous human intent into a governed `Refined Intent` artifact.

---

## Purpose

Before SYNTH can enforce alignment, it must have a deterministic way to capture and structure intent. This expedition establishes the refinement lifecycle, the Refined Intent artifact schema, and the events that represent refinement activity.

---

## Deliverables

1. **Refined Intent artifact schema** in `src/governance/refined-intent.ts`.
2. **Refinement lifecycle state machine** with states:
   - `draft`
   - `awaiting_alignment`
   - `aligned`
   - `revision_required`
   - `rejected`
   - `superseded`
3. **Refinement events**:
   - `INTENT_REFINEMENT_STARTED`
   - `INTENT_REFINEMENT_QUESTION_ANSWERED`
   - `INTENT_REFINEMENT_REVISED`
   - `INTENT_REFINEMENT_SUBMITTED`
   - `INTENT_REFINEMENT_REJECTED`
   - `INTENT_REFINEMENT_SUPERSEDED`
4. **Refinement service** that progresses an intent through the lifecycle.
5. **Unit tests** covering the full refinement lifecycle.

---

## Acceptance Criteria

- A Refined Intent can be created from raw intent input.
- The refinement lifecycle progresses deterministically through valid transitions.
- Invalid transitions throw a named `RefinementError`.
- All refinement events are replayable.
- The Refined Intent schema validates correctly with the existing validation framework.

---

## Out of Scope

- UI for refinement in Mission Studio.
- AI-generated refinement questions.
- Reference evidence binding.
- Divergence Gate enforcement.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-004 — Refinement Questions Engine
