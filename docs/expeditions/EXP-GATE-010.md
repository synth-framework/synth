# EXP-GATE-010 — Mission Studio Integration: Visualize gate states in Mission Studio: Refinement Pending, Review Pending, Revision Required, Accepted, Closed.

> **Integration expedition.** Surface the Intent Refinement & Review Governance lifecycle inside Mission Studio so operators can see, at a glance, where every expedition stands and what is required to advance it.

**Status:** Proposed  
**Kind:** Integration Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Phase:** Phase 4 — Integration  
**Depends On:** EXP-GATE-001, EXP-GATE-003, EXP-GATE-004, EXP-GATE-005, EXP-GATE-006, EXP-GATE-007, EXP-GATE-008, EXP-GATE-009  
**Blocks:** EXP-GATE-011, EXP-GATE-012

---

## Purpose

The three-gate model only governs execution if its state is visible to operators. Today, expedition status is easy to misread: `Implementation Complete` looks like success, `Revision Required` can be mistaken for a fresh task, and a blocked upstream gate may be invisible to downstream work. This expedition makes the gate lifecycle a first-class projection in Mission Studio by rendering every expedition's current gate state, the decision that produced it, and the next action required to move forward.

The states visualized in this expedition are:

```text
Refinement Pending  → awaiting Refinement Gate decision
Review Pending      → awaiting Review Gate decision
Revision Required   → Review Gate returned work to implementation
Accepted            → Acceptance Gate approved
Closed              → expedition completed and accepted
```

These five states are the minimum signals an operator needs to understand program health without reading the event log.

---

## Goal

Integrate gate-state visualization into Mission Studio so that:

1. Every expedition card, row, or detail view displays its current gate state.
2. The five required states (`Refinement Pending`, `Review Pending`, `Revision Required`, `Accepted`, `Closed`) are visually distinct and accessible.
3. The state is derived from replayable governance events, not from mutable expedition metadata.
4. Operators can open an expedition to see which gate produced the current state, the reviewer, the decision reason, and the next action.
5. Upstream gate blockers are surfaced on downstream expeditions so the upstream-gate stop condition is visible.
6. Program 027, the pilot certification project, can be visualized under the new model as soon as its expeditions are retrofitted.

---

## Acceptance Criteria

1. Mission Studio renders a gate-state badge or indicator for every expedition in at least the five required states: `Refinement Pending`, `Review Pending`, `Revision Required`, `Accepted`, and `Closed`.
2. Each state has a consistent, accessible visual treatment (color, icon, and text label) that is documented in the Mission Studio Design System.
3. The state displayed is computed from canonical governance events (`RefinedIntentApproved`, `ReviewGateDecision`, `RevisionRequest`, `AcceptanceGateDecision`, `Closed`) rather than from hand-edited expedition metadata.
4. Selecting an expedition reveals the gate history: current gate, decision, reviewer identity, reason, and next action drawn from the Review Gate Package or Acceptance Gate Package.
5. Downstream expeditions visually indicate when they are blocked by an unresolved upstream gate, enforcing the upstream-gate stop condition in the UI.
6. The visualization works for Program 027's frozen expeditions (`EXP-HOME-001`, `EXP-HOME-002`, `EXP-HOME-025`) once they are retrofitted with gate events.
7. The integration does not modify Protected Assets: Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, Constitutional Baseline, or Public Vocabulary.

---

## Definition of Done

- [ ] Gate-state component(s) are added to Mission Studio with documented props and visual states.
- [ ] A mapping from governance events to the five displayed states is implemented and tested.
- [ ] The expedition list/detail views render gate-state badges correctly.
- [ ] Blocked downstream expeditions display an upstream-gate blocker indicator.
- [ ] Accessibility review confirms states are distinguishable without color alone.
- [ ] Visual regression tests cover the five required states and the blocker indicator.
- [ ] A demo scenario using Program 027 data renders `Refinement Pending`, `Review Pending`, `Revision Required`, `Accepted`, and `Closed` correctly.

---

## Out of Scope

- Implementing the Review Gate engine or Acceptance Gate engine (EXP-GATE-008, EXP-GATE-009).
- Defining the gate schemas, packages, or policies (EXP-GATE-005, EXP-GATE-006, EXP-GATE-007).
- Retrofitting Program 027 itself (EXP-GATE-011).
- Certification scenarios for the full lifecycle (EXP-GATE-012).
- Real-time notifications or chat-based review workflows.

---

## Protected Assets

This expedition does not modify existing Protected Assets. It reads from the Event Model and projects the existing governance event vocabulary into Mission Studio:

- **Not modified:** Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, Constitutional Baseline, Public Vocabulary.
- **Established by this expedition:** The mapping from governance events to Mission Studio gate-state indicators. Once accepted, this mapping becomes a protected integration contract and SHALL NOT change without a governance event and, if required, a new ADR.

---

## Relationship to Program 035

EXP-GATE-010 is the first expedition in **Phase 4 — Integration** of **EXP-PROGRAM-035 — Intent Refinement & Review Governance**, the final architectural program before the testing and stabilization era. It closes the loop between governance events and operator experience by making gate states visible in Mission Studio.

It directly enables:

- **EXP-GATE-011 — Retrofit Program 027:** the pilot certification project cannot demonstrate the three-gate model until Mission Studio can render its gate states.
- **EXP-GATE-012 — Certification:** certification scenarios must be observable in Mission Studio to prove the lifecycle behaves correctly.

It consumes the outputs of:

- **EXP-GATE-001 — Review Lifecycle** and **EXP-GATE-003 — Refinement Lifecycle** for the state machine.
- **EXP-GATE-004 — Decision Model** for the decision vocabulary.
- **EXP-GATE-005 — Review Gate Package** and **EXP-GATE-007 — Acceptance Policies** for the evidence and reviewer details.
- **EXP-GATE-006 — Refined Intent Artifact** for the upstream contract reference.
- **EXP-GATE-008 — Review Gate Engine** and **EXP-GATE-009 — Revision Governance** for the events that drive the states.

---

## Relationship to Program 027

**EXP-PROGRAM-027 — Mission Studio Homepage** is the pilot certification project for Program 035. Its frozen expeditions (`EXP-HOME-001`, `EXP-HOME-002`, `EXP-HOME-025`) will be retrofitted to the three-gate model, and Mission Studio itself will be the surface that visualizes their gate states. This expedition therefore has a dual role: it is both a consumer of Program 035's governance model and a deliverable of Program 027's product surface.

---

## Success Criteria

This expedition succeeds when an operator can open Mission Studio and, without reading the event log, answer:

- Which expeditions are awaiting refinement, review, or revision?
- Which expeditions have been accepted or closed?
- Why is an expedition in its current state?
- What is the next action required to advance an expedition?
- Which downstream expeditions are blocked by an unresolved upstream gate?

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-GATE-001.md`
- `docs/expeditions/EXP-GATE-003.md`
- `docs/expeditions/EXP-GATE-004.md`
- `docs/expeditions/EXP-GATE-005.md`
- `docs/expeditions/EXP-GATE-006.md`
- `docs/expeditions/EXP-GATE-007.md`
- `docs/expeditions/EXP-GATE-008.md`
- `docs/expeditions/EXP-GATE-009.md`
- `docs/expeditions/EXP-GATE-011.md`
- `docs/expeditions/EXP-GATE-012.md`
