# EXP-GATE-008 — Review Gate Engine

**Status:** Proposed  
**Kind:** Engine Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Depends On:** EXP-GATE-004, EXP-GATE-005, EXP-GATE-007  
**Blocks:** EXP-GATE-009, EXP-GATE-010, EXP-GATE-011

---

## Purpose

Implement the runtime engine that enforces gate stop conditions and routes Review Gate packages to the correct reviewer based on completion and acceptance policies. No implementation may pass a gate automatically unless the expedition's declared completion policy explicitly allows automatic resolution.

This expedition turns the Review Gate from a documented convention into a deterministic execution boundary.

---

## Goal

Build a deterministic gate engine that:

- Evaluates whether a Review Gate package is ready for review.
- Applies the expedition's completion policy: **Automatic**, **Human Approval Required**, or **AI Approval Required**.
- Routes the package to the appropriate reviewer authority without allowing the implementing agent to self-approve under non-Automatic policies.
- Blocks downstream expeditions while an upstream gate is awaiting a decision.
- Produces a replayable **Review Decision** event for every gate resolution.

---

## Definition of Done / Acceptance Criteria

- [ ] Engine evaluates gate readiness from the Review Gate Package, including the Refined Intent reference, implementation evidence, divergence report, and test evidence.
- [ ] Engine enforces the three completion policies and rejects any resolution that does not match the declared policy.
- [ ] Engine prevents any implementation from passing a gate automatically unless the expedition explicitly declares an **Automatic** completion policy.
- [ ] Engine routes each Review Gate package to a reviewer authority matching the policy and records the assignment as a governance event.
- [ ] Engine blocks dependent expeditions from starting while an upstream expedition is awaiting any gate decision.
- [ ] Engine produces a replayable Review Decision event containing decision type, reason, reviewer, evidence, affected assets, timestamp, and next action.
- [ ] Engine rejects self-approval by the implementing agent under **Human Approval Required** or **AI Approval Required** policies.
- [ ] Unit and integration tests cover automatic routing, policy enforcement, stop conditions, and self-approval prevention.

---

## Protected Assets

This expedition touches engine logic and schemas that are protected under EXP-PROGRAM-035:

- Review Gate Package format
- Review Decision event schema
- Completion policy definitions
- Acceptance policy definitions
- Gate engine logic

Any change to these assets after this program is certified requires an Architecture Expedition and a new ADR.

---

## Relationship to Program 035

EXP-GATE-008 is the first engine expedition in **Phase 3 — Engine** of EXP-PROGRAM-035 — Intent Refinement & Review Governance. It converts the governance model, artifacts, and policies defined in Phases 1 and 2 into executable behavior. Without this engine, the Review Gate cannot enforce stop conditions or guarantee that work is reviewed by the correct authority.

The engine's behavior will be validated against **Program 027 (Mission Studio Homepage)**, which serves as the pilot certification project for the three-gate model. Program 027 is paused as a baseline candidate until the Review Gate engine and related governance systems are certified.

---

## Out of Scope

- Refinement Gate engine implementation (EXP-GATE-003).
- Acceptance Gate engine implementation.
- Mission Studio UI for gate visualization (EXP-GATE-010).
- Retrofitting existing expeditions to declare completion policies (EXP-GATE-011).
- Real-time negotiation or chat-based review workflows.

---

## Related documents

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-GATE-004.md`
- `docs/expeditions/EXP-GATE-005.md`
- `docs/expeditions/EXP-GATE-007.md`
