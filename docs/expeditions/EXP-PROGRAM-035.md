# EXP-PROGRAM-035 — Review Gate Governance

**Status:** Proposed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Governance model extension  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** Medium  
**Public Impact:** Medium  
**Execution Impact:** High

---

## Thesis

> **Completed is not the same as Accepted.**
>
> SYNTH's execution model currently moves expeditions from `Executing` to `Completed`. The homepage incident proved this is insufficient: nothing technically failed, yet the implementation was not the implementation the operator wanted. The missing primitive is a **Review Gate** — a decision point that pauses execution and asks: *Does this implementation satisfy the evidence?*

A Review Gate is not an approval itself. It is a configurable decision point that can resolve as **Approved**, **Revision Requested**, or **Rejected**. This generalizes naturally to many review types without changing the model:

```text
Design Review Gate
Architecture Review Gate
Security Review Gate
Product Review Gate
Accessibility Review Gate
AI Review Gate
Customer Review Gate
```

The engine understands "there is a review gate here"; the specific reviewer and acceptance policy are configurable.

---

## Purpose

Introduce review-driven execution into SYNTH itself before any further homepage implementation. This program has higher architectural priority than Program 027 because it changes how every future program is executed.

- Make `Implementation Complete` distinct from `Accepted`.
- Introduce **Review Gates** as explicit decision points.
- Support **Approved**, **Revision Requested**, and **Rejected** resolutions.
- Define **Completion Policies**: Automatic, Human Approval Required, AI Approval Required.
- Enforce the stop condition: no dependent expedition begins while upstream is awaiting review.
- Use **Program 027 — Mission Studio Homepage** as the pilot certification project.

---

## Core Abstraction — The Review Gate Lifecycle

Every expedition now moves through the Review Gate lifecycle:

```text
Proposed
    ↓
Executing
    ↓
Implementation Complete
    ↓
Review Gate
    │
    ├──────── Approved ──────── Accepted ──────── Closed
    │
    ├──────── Revision Requested ───────→ Executing
    │
    └──────── Rejected
```

**Key rule:** No dependent expedition may begin while an upstream expedition is Awaiting Review.

---

## Completion Policies

Every expedition declares one of three completion policies.

### Automatic

Completion immediately advances execution.

```text
Documentation cleanup
Refactoring
Generated projections
Low-risk mechanical changes
```

### Human Approval Required

Completion produces a review package. Execution pauses. Nothing downstream may start until the reviewer approves or rejects.

```text
Homepage design
Architecture
Design System
Mission UX
Any experience-shaping work
```

### AI Approval Required

Completion is evaluated by another agent. The implementation agent cannot approve itself.

```text
Documentation quality
Test quality
Generated assets
Naming consistency
Style consistency
```

---

## Program Composition

```text
EXP-PROGRAM-035
Review Gate Governance
│
├── EXP-GATE-001  Review Lifecycle
│       Governance Expedition
│       Introduce Implementation Complete → Review Gate → Approved/Revision/Rejected → Accepted → Closed.
│
├── EXP-GATE-002  Revision Governance
│       Governance Expedition
│       Introduce RevisionRequested, RevisionCompleted, and revision loops as replayable events.
│
├── EXP-GATE-003  Completion Policies
│       Governance Expedition
│       Define Automatic, Human Approval Required, and AI Approval Required policies.
│
├── EXP-GATE-004  Review Gate Engine
│       Architecture Expedition
│       Implement the engine that enforces stop conditions and routes packages to reviewers.
│
├── EXP-GATE-005  Review Gate Package
│       Governance Expedition
│       Define the artifact produced at every review gate: evidence, divergence, reviewer, decision.
│
├── EXP-GATE-006  Acceptance Policies
│       Governance Expedition
│       Define who is allowed to approve what (human, AI, council, engine, asset owner).
│
├── EXP-GATE-007  Mission Studio Integration
│       Product Expedition
│       Visualize Pending Review, Needs Revision, Accepted, and Promoted inside Mission Studio.
│
├── EXP-GATE-008  Retrofit Program 027
│       Governance Expedition
│       Migrate Program 027 to the Review Gate model and freeze completed expeditions as evidence.
│
└── EXP-GATE-009  Certification
        Certification Expedition
        Certify Review Gate Governance using Program 027 as the validation project.
```

---

## New Artifacts

### Review Gate Package

Produced at every Review Gate. Contains:

```text
Target expedition
Reference artifacts
Current implementation
Known divergence
Accepted divergence
Rejected divergence
Reviewer                   → human, AI, council, or engine per acceptance policy
Decision                   → Approved / Revision Requested / Rejected
Reason                     → why the decision was made
Next action                → Promote / Revise / Abandon
Evidence                   → links, screenshots, recordings, comparison assets
Timestamp
```

### Revision Request

A first-class event in the event log. Contains:

```text
Target expedition
Reason
Evidence
Reviewer
Timestamp
```

### Acceptance Policy

A governed artifact defining who may approve what. Examples:

```text
Documentation      → AI Review
Homepage           → Human Review
Architecture       → Architecture Council
Protected Assets   → Protected Asset Owner
Release            → Certification Engine
```

---

## Stop Conditions

1. **No dependent expedition may begin while an upstream expedition is Awaiting Review.**
2. An implementation agent cannot approve its own work under the AI Approval Required policy.
3. A Review Gate cannot be skipped, bypassed, or auto-approved without an explicit Automatic completion policy.
4. Rejected expeditions must produce a new plan before re-entering execution.

---

## Protected Assets

The following artifacts introduced by this Program SHALL NOT be modified without a governance event:

- Review Gate Package format
- Revision Request event schema
- Acceptance Policy definitions
- Review Gate engine logic

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Pausing execution at a Review Gate | Treating `Completed` as equivalent to `Accepted` |
| Requesting revision after review | Merging or promoting unreviewed work |
| Rejecting an implementation that does not satisfy evidence | Silently approving work that fails review |
| Defining Automatic, Human, and AI approval policies | Allowing an agent to approve its own work under non-Automatic policies |
| Enforcing the upstream-review stop condition | Starting dependent expeditions while upstream is Awaiting Review |
| Visualizing review states in Mission Studio | Hiding review state from operators |
| Using Program 027 as the certification pilot | Continuing Program 027 implementation before the model is certified |

---

## Out of Scope

- Replacing the existing Mission → Expedition → Replay lifecycle.
- Real-time negotiation or chat-based review workflows.
- Storing large binary reference assets inside the event log (links and hashes only).
- Dictating specific review tools (tooling is an adapter decision).

---

## Success Criteria

- Every future Program declares a completion policy for each expedition.
- Every non-Automatic expedition passes through a Review Gate before it is Accepted.
- `Implementation Complete` is visibly distinct from `Accepted` in Mission Studio.
- RevisionRequested is a first-class, replayable event.
- The upstream-review stop condition is enforced by the execution engine.
- Program 027 successfully executes under Review Gate Governance from its current paused state.
- AI agents cannot approve their own work under Human or AI Approval Required policies.

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** is paused and becomes the pilot certification project for Review Gate Governance.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** will schedule Review Gates as part of the validation planner.
- **EXP-PROGRAM-032 — AI Agent Integration** will operate within Review Gate policies; AI agents may review each other's work but cannot self-approve under non-Automatic policies.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that Review Gates extend.

---

## Long-Term Vision

SYNTH's execution model becomes fully review-aware. Every expedition produces evidence, every non-trivial change passes through a Review Gate, and every promotion is traceable to an explicit decision. The framework prevents implementation drift by design, makes revision a normal and replayable part of the lifecycle, and ensures that completed work is genuinely accepted before it advances.
