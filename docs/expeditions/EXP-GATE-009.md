# EXP-GATE-009 — Revision Governance

> **Engine expedition.** Implement `RevisionRequested` and `RevisionCompleted` as first-class, replayable governance events and define how revision loops pause, resume, and invalidate downstream dependent expeditions.

**Status:** Proposed  
**Kind:** Engine Expedition  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GATE-001 — Review Lifecycle; EXP-GATE-004 — Decision Model; EXP-GATE-005 — Review Gate Package; EXP-GATE-008 — Review Gate Engine  
**Blocks:** EXP-GATE-010 — Mission Studio Integration; EXP-GATE-011 — Retrofit Program 027; EXP-GATE-012 — Certification

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Unsafe
  Requires ADR: Yes
```

---

## Purpose

Make revision loops explicit, replayable, and safe for dependent expeditions. Today, a Review Gate decision of `Revision Required` is recorded as a decision, but the re-entry into implementation, the completion of the revision, and the effect on downstream work are not modeled as distinct events. This expedition introduces `RevisionRequested` and `RevisionCompleted` as first-class governance events so that the event log fully captures when an expedition re-enters implementation, when it exits the revision loop, and how dependent expeditions are paused and resumed around the loop.

---

## Goal

Implement runtime support for the revision loop and its downstream effects:

```text
Review Gate
    │
    ├──────── Revision Required
    │            │
    │            ▼
    │    RevisionRequested
    │            │
    │            ▼
    │    Implementation
    │            │
    │            ▼
    │    RevisionCompleted
    │            │
    │            ▼
    │    Review Gate (resubmitted)
    │            │
    │            ...
    │
    ▼
Acceptance Gate
```

For each revision loop:

- Append a `RevisionRequested` event when the Review Gate resolves to `Revision Required`.
- Append a `RevisionCompleted` event when the revised implementation is resubmitted to the Review Gate.
- Transition the expedition state machine through `Review Gate` → `Revision` → `Implementation` → `Review Gate`.
- Enforce the upstream-gate stop condition for dependent expeditions while an upstream expedition is in an unresolved revision loop.
- Define when a revision invalidates or requires re-review of downstream work.
- Update replay handlers so canonical state remains deterministic.

---

## Acceptance Criteria

1. `RevisionRequested` and `RevisionCompleted` are registered as governance event types with mandatory fields: target expedition, originating Review Gate decision reference, reason, evidence, reviewer, and timestamp. Events are hash-chained and replayable like all other governance events.

2. The Review Gate engine appends `RevisionRequested` when resolving a Review Gate to `Revision Required`, and appends `RevisionCompleted` when the expedition resubmits its revised implementation to the Review Gate.

3. Replay/state derivation correctly transitions an expedition from `Review Gate` to `Revision` to `Implementation` and back to `Review Gate`. The state hash remains deterministic and existing replay tests continue to pass.

4. Dependent expeditions cannot be approved, started, or resumed while an upstream expedition has an outstanding `RevisionRequested` without a subsequent `RevisionCompleted` or terminal gate decision. Attempts to advance downstream work return a clear governance error referencing the blocked upstream expedition.

5. If a revision introduces new scope, divergence, or a changed Refined Intent, affected downstream expeditions are automatically invalidated or marked for re-review; expeditions outside the affected scope remain unblocked once the upstream `RevisionCompleted` event is recorded.

6. Mission Studio and CLI status surfaces the `Revision` state distinctly from `Implementation` and `Implementation Complete`, and downstream dependencies are shown as paused until the revision loop closes.

7. Tests cover: single revision loop, multiple consecutive revisions, rejection after revision, dependent pause and resume, replay determinism, and invalidation of affected downstream work.

8. An ADR in `docs/adr/` records the event schemas, state-machine changes, and downstream interaction semantics.

---

## Out of Scope

- Visual design of revision timelines in Mission Studio (handled by EXP-GATE-010).
- Retrofitting Program 027 to use the new events (handled by EXP-GATE-011).
- End-to-end certification of the full three-gate model (handled by EXP-GATE-012).
- Real-time negotiation or chat-based revision workflows.

---

## Protected Assets

This expedition modifies engine logic and extends the governance event taxonomy. The following artifacts are therefore protected and SHALL NOT be further modified without a subsequent governance event and, where required, an Architecture Expedition or ADR:

- Event Model and governance event taxonomy.
- `RevisionRequested` and `RevisionCompleted` event schemas.
- Review Gate engine logic.
- Expedition state machine and lifecycle vocabulary.
- ExecutionGate mutation rules.
- Upstream-gate stop condition logic.
- Replay invariants and state-derivation handlers.

---

## Relationship to Program 035

EXP-GATE-009 is the second expedition in **Phase 3 — Engine** of **EXP-PROGRAM-035 — Intent Refinement & Review Governance**. It turns the `Revision Required` decision into a replayable lifecycle with explicit pause and resume semantics for dependent expeditions.

- **EXP-GATE-001 — Review Lifecycle** defined the `Revision Required` branch.
- **EXP-GATE-004 — Decision Model** formalized the `Review Decision` event schema that `RevisionRequested` references.
- **EXP-GATE-005 — Review Gate Package** defined the package that carries revision reason and evidence.
- **EXP-GATE-008 — Review Gate Engine** provides the runtime checkpoint where `RevisionRequested` and `RevisionCompleted` are emitted.
- **EXP-GATE-010 — Mission Studio Integration** will visualize revision state and blocked downstream work.
- **EXP-GATE-011 — Retrofit Program 027** will apply these events to **EXP-PROGRAM-027 — Mission Studio Homepage**, the pilot certification project for Program 035.
- **EXP-GATE-012 — Certification** must prove the revision-loop scenario end-to-end.

---

## Success Criteria

This expedition succeeds when:

- The event log unambiguously records the start and end of every revision loop.
- Replay produces a deterministic state in which an expedition in revision is distinct from an expedition awaiting review or accepted for closure.
- Dependent expeditions are automatically paused and resumed around upstream revision loops.
- A revision that changes scope or divergence correctly invalidates only the affected downstream work.
- Program 027 can demonstrate a complete revision loop under the new governance events.
