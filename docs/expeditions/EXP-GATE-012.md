# EXP-GATE-012 — Certification

> **Certification expedition.** Certify Program 035 — Intent Refinement & Review Governance by executing Program 027 — Mission Studio Homepage as the validation project. Prove the five canonical governance scenarios end-to-end.

**Status:** Proposed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GATE-001, EXP-GATE-002, EXP-GATE-003, EXP-GATE-004, EXP-GATE-005, EXP-GATE-006, EXP-GATE-007, EXP-GATE-008, EXP-GATE-009, EXP-GATE-010, EXP-GATE-011, EXP-PROGRAM-027 Phase 1 baseline  
**Blocks:** Era IV — Testing & Stabilization

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Program 035 introduces the three-gate governance model (Refinement, Review, Acceptance) and a new `Refined Intent` contract. Before the model is frozen and the project enters the testing/stabilization era, the model must be certified against a real program. Program 027 — Mission Studio Homepage is the pilot validation project: its Phase 1 baseline is already implementation-complete and paused at the natural Review Gate checkpoint, making it the ideal candidate to exercise every gate transition.

This expedition does not add new features. It validates that the governance model behaves correctly under realistic conditions and that the engine enforces the documented stop conditions, revision loops, and invalidation rules.

---

## Goal

Execute Program 027 through the three-gate model defined in Program 035 and prove the following five canonical governance scenarios:

**Scenario 1 — Straight-through acceptance**
```text
Refinement approved
  ↓
Mission created
  ↓
Implementation
  ↓
Review approved
  ↓
Accepted
```

**Scenario 2 — Revision loop**
```text
Review
  ↓
Revision Requested
  ↓
Implementation resumes
  ↓
Review
  ↓
Approved
```

**Scenario 3 — Refinement clarification blocks Mission**
```text
Refinement
  ↓
Clarification Requested
  ↓
Mission cannot be created
```

**Scenario 4 — Mission change invalidates reviews**
```text
Mission changes
  ↓
Existing reviews invalidated
```

**Scenario 5 — Superseded expedition pauses dependents**
```text
Expedition superseded
  ↓
Dependent expeditions paused
```

Each scenario must be reproducible, recorded as replayable governance events, and verifiable through public commands.

---

## Acceptance Criteria

1. All five certification scenarios are executed against Program 027 and produce deterministic, documented outcomes.
2. Each scenario leaves a replayable trail of `Refined Intent`, `Review Decision`, `Revision Request`, `Acceptance Gate`, and/or `Supersede` events in the canonical event log.
3. The engine enforces the upstream-gate stop condition: no dependent expedition begins while an upstream expedition is awaiting a gate decision.
4. Scenario 4 demonstrates that a Mission change invalidates existing Review Gate decisions and requires re-review before acceptance can proceed.
5. Scenario 5 demonstrates that superseding an expedition pauses all downstream dependents until the superseding expedition or new plan is resolved.
6. Program 027's frozen Phase 1 expeditions (EXP-HOME-001, EXP-HOME-002, EXP-HOME-025) pass through the three-gate lifecycle without silent modification to their implementation baselines.
7. Certification evidence is published as a structured report and attached to the governance proof artifact.
8. `npm run govern` passes after certification, confirming the repository remains in a governed, replay-consistent state.

---

## Out of Scope

- Adding new homepage features or extending Program 027's Phase 1 scope.
- Re-implementing frozen Program 027 expeditions.
- Defining new gate types beyond Refinement, Review, and Acceptance.
- Modifying the Mission, Expedition, Replay, Genesis, or Event Model semantics.
- Real-time chat or negotiation workflows.

---

## Protected Assets

This expedition validates, but does not modify, the protected artifacts introduced by Program 035. Any defect found must be fixed through a subsequent governed expedition, not by bypassing the model:

- Refined Intent schema
- Review Gate Package format
- Review Decision event schema
- Revision Request event schema
- Acceptance Gate Package format
- Acceptance Policy definitions
- Gate engine logic
- Upstream-gate stop condition

---

## Relationship to Program 035

EXP-GATE-012 is the final expedition of **EXP-PROGRAM-035 — Intent Refinement & Review Governance** (Phase 5: Certification). It closes the program by proving that the governance model works in practice before the model is frozen for the testing/stabilization era.

- **EXP-GATE-001 through EXP-GATE-007** supply the vocabulary, artifacts, and policies being exercised.
- **EXP-GATE-008 and EXP-GATE-009** supply the engine and revision governance being certified.
- **EXP-GATE-010** supplies the Mission Studio visualization used to observe gate state.
- **EXP-GATE-011** applies the model to Program 027 and produces the baseline candidate.
- **EXP-GATE-012** executes the certification scenarios against that baseline and produces the final evidence.

---

## Success Criteria

The expedition succeeds when an independent reviewer can:

- Replay each of the five scenarios from the event log.
- Confirm that gate decisions are recorded as replayable events.
- Confirm that the engine prevents progression while gates are unresolved.
- Confirm that Mission changes invalidate prior reviews.
- Confirm that superseded expeditions pause dependents.
- Confirm that Program 027 remains in a governed, certifiable state.

Program 035 is complete only when EXP-GATE-012 succeeds.
