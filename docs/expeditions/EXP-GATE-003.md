# EXP-GATE-003 — Refinement Lifecycle

> **Governance model expedition.** Define the pre-Mission refinement lifecycle: Intent → Refinement Gate → Refined Intent / Clarification Requested. A Mission cannot be approved without an approved Refined Intent.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Depends On:** EXP-PROGRAM-035  
**Blocks:** EXP-GATE-004 — Decision Model, EXP-GATE-006 — Refined Intent Artifact

---

## Purpose

Close the gap between raw human intent and governed execution by defining the Refinement Gate: the mandatory pre-Mission phase where ambiguous intent is converted into a canonical, reviewable Refined Intent, or returned for clarification. Until the Refinement Gate approves a Refined Intent, no Mission may be created or approved.

---

## Goal

Specify the complete pre-Mission refinement lifecycle:

1. **Intent ingestion** — capture raw intent, evidence, references, constraints, assumptions, and unknowns.
2. **Refinement Gate** — evaluate whether the intent is sufficiently understood to become a contractual Refined Intent.
3. **Decision outcomes**:
   - **Refined Intent approved** — the governed understanding becomes the basis for Mission approval.
   - **Clarification Requested** — the intent is returned for more evidence or conversation; the gate remains open.
4. **Mission approval dependency** — enforce that Mission approval is blocked until an approved Refined Intent exists.

---

## Definition of Done

- [ ] Refinement Gate lifecycle is documented with clear entry and exit criteria.
- [ ] The `Refined Intent` and `Clarification Requested` decisions are defined as mutually exclusive, replayable governance outcomes.
- [ ] A Mission approval rule is specified: no Mission may be approved without an approved Refined Intent.
- [ ] The relationship between raw intent, Refined Intent, Mission, and downstream Review Gate is mapped.
- [ ] Clarification Requested loops back to intent gathering; the lifecycle does not bypass the gate.
- [ ] Stop conditions are documented for expeditions that depend on a Mission awaiting refinement.

---

## Protected Assets

The following concepts established by this expedition are protected and SHALL NOT be modified without an Architecture Expedition and a new ADR:

- The pre-Mission Refinement Gate lifecycle.
- The rule that Mission approval requires an approved Refined Intent.
- The two decision outcomes of the Refinement Gate: `Refined Intent` and `Clarification Requested`.

---

## Relationship to Program 035

EXP-GATE-003 is the first expedition in Phase 1 of EXP-PROGRAM-035. It defines the first gate of the three-gate governance model and establishes the Refined Intent as the contractual boundary between human intent and Mission execution. Program 027 (Mission Studio Homepage) will exercise this lifecycle as its pilot certification project.

---

## Out of Scope

- Schema design for the Refined Intent artifact (EXP-GATE-006).
- Review Gate lifecycle (EXP-GATE-001).
- Acceptance Gate lifecycle.
- Engine enforcement implementation (EXP-GATE-008).
