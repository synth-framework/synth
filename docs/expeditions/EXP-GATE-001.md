# EXP-GATE-001 — Review Lifecycle

> **Governance model expedition.** Define the post-implementation review lifecycle and the decision taxonomy that turns `Implementation Complete` into `Accepted` or `Closed`.

**Status:** Proposed  
**Kind:** Governance Model Expedition  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-PROGRAM-035 Phase 1 charter  
**Blocks:** EXP-GATE-002, EXP-GATE-004, EXP-GATE-005, EXP-GATE-008, EXP-GATE-010, EXP-GATE-011

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

Make the transition from implementation to acceptance explicit, reviewable, and replayable. Today, `Implementation Complete` is easily mistaken for `Accepted`. This expedition defines the Review Gate as a mandatory governance checkpoint where an implementation is evaluated against its approved Refined Intent and a decision is recorded before any promotion or closure.

---

## Goal

Specify the complete Review Gate lifecycle:

```text
Implementation Complete
        │
        ▼
   Review Gate
        │
        ├──────── Approve
        │
        ├──────── Approve with Conditions
        │
        ├──────── Revision Required ──→ Implementation
        │
        ├──────── Reject
        │
        ├──────── Supersede Expedition
        │
        ├──────── Split Expedition
        │
        ├──────── Merge Expedition
        │
        ├──────── Escalate to Mission
        │
        └──────── Escalate to Program
        │
        ▼
   Acceptance Gate
        │
        ├──────── Accepted ──→ Closed
        │
        └──────── Rejected
```

For each decision, define:

- When it applies.
- What evidence is required.
- Who may resolve it under which completion policy.
- What next state or expedition it produces.
- How it is recorded as a replayable event.

---

## Acceptance Criteria

1. The Review Gate lifecycle is documented as a deterministic state machine with the states `Implementation Complete`, `Review Gate`, `Accepted`, and `Closed`, plus all decision branches.
2. Each Review Gate decision (`Approve`, `Approve with Conditions`, `Revision Required`, `Reject`, `Supersede`, `Split`, `Merge`, `Escalate to Mission`, `Escalate to Program`) has a written definition, required evidence, and a clear next action.
3. A decision of `Revision Required` always returns the expedition to `Implementation` and produces a replayable `Revision Request` event; `Reject` requires a new plan before re-entry.
4. `Approve` and `Approve with Conditions` advance the expedition to the Acceptance Gate; `Accepted` advances it to `Closed`.
5. The upstream-gate stop condition is stated: no dependent expedition may begin while an upstream expedition is awaiting any gate decision.
6. The distinction between `Implementation Complete` and `Accepted` is visible in the lifecycle vocabulary and in any Mission Studio representation.
7. No runtime code is changed; the output is specification, vocabulary, and artifact schemas only.

---

## Out of Scope

- Implementing the Review Gate engine.
- Modifying Genesis, ExecutionGate, Mission, Expedition, or Replay semantics.
- Defining the Refined Intent artifact or the Refinement Gate lifecycle.
- Defining the Acceptance Gate policies or package format beyond the `Accepted` / `Rejected` boundary.

---

## Protected Assets

This expedition establishes the following protected artifacts. They SHALL NOT be modified without a subsequent governance event and, where required, an Architecture Expedition or ADR:

- Review Gate state machine and lifecycle vocabulary.
- Review Gate decision taxonomy.
- Review Gate Package format.
- Review Decision event schema.
- Revision Request event schema.

---

## Relationship to Program 035

EXP-GATE-001 is the first expedition in **EXP-PROGRAM-035 — Intent Refinement & Review Governance** (Phase 1: Governance Model). It supplies the Review Gate lifecycle that all subsequent gate expeditions refine, package, enforce, and certify.

- **EXP-GATE-002 — Completion Policies** will assign reviewer types to gate decisions.
- **EXP-GATE-004 — Decision Model** will formalize the `Review Decision` event schema.
- **EXP-GATE-005 — Review Gate Package** will define the canonical package format.
- **EXP-GATE-008 — Review Gate Engine** will enforce this lifecycle in runtime execution.
- **EXP-GATE-010 — Mission Studio Integration** will visualize the lifecycle in Mission Studio.
- **EXP-GATE-011 — Retrofit Program 027** will apply this lifecycle to **EXP-PROGRAM-027 — Mission Studio Homepage**, the pilot certification project for Program 035.

---

## Success Criteria

The expedition succeeds when a reviewer can read this charter and unambiguously answer:

- What state follows `Implementation Complete`?
- What decisions are valid at the Review Gate?
- What happens after each decision?
- How is a decision recorded and replayed?
- When may downstream work begin?
