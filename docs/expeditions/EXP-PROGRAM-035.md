# EXP-PROGRAM-035 — Intent Refinement & Review Governance

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

> **Deterministic execution requires deterministic understanding, and understanding requires governance.**
>
> The homepage incident revealed three distinct opportunities for drift: before implementation (did we understand the intent?), during implementation (did we build what was agreed?), and after implementation (is this production-worthy?). SYNTH currently governs the middle phase well. This program introduces governance for all three.

There are two problems that often look like one:

- **Communication problem:** "I thought I had already explained that."
- **Governance problem:** "The intent was never made contractual."

A Refinement Gate bridges the two by turning conversation into a canonical, reviewable artifact before implementation begins.

---

## Purpose

Close the gap between human intent and deterministic execution by introducing three gate types and a new `Refined Intent` artifact:

1. **Refinement Gate** — before Mission approval: *Did we understand what is actually being requested?*
2. **Review Gate** — after implementation: *Did we build what we agreed to build?*
3. **Acceptance Gate** — after review: *Is this production-worthy?*

This program has higher architectural priority than Program 027 because it changes how every future program is understood, executed, and accepted.

---

## Core Abstraction — Three Gate Types

```text
Intent
    │
    ▼
Refinement Gate
    │
    ├──────── Refined Intent
    │
    └──────── Clarification Requested ──→ Intent
    │
    ▼
Mission
    │
    ▼
Planning
    │
    ▼
Implementation
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
    └──────── Rejected ──→ Revision / Mission review
```

Each gate is a decision point, not an approval itself. Decisions are governance events and are replayable.

---

## New Artifact — Refined Intent

A canonical interpretation produced by the Refinement Gate. It is not the conversation, not the screenshots, not the prompt — it is the governed understanding.

```text
Refined Intent

Objective
Scope
Non-goals
Success criteria
Visual references
Behavioral references
Constraints
Protected assets
Acceptance examples
Known unknowns
Risks
```

The Refined Intent becomes the contract against which Review and Acceptance Gates are evaluated.

---

## Gate Definitions

### 1. Refinement Gate

**Occurs:** Before Mission approval.

**Purpose:** Did we understand what is actually being requested?

**Artifacts reviewed:**
- Raw intent
- Evidence
- References
- Mockups
- Constraints
- Assumptions
- Unknowns

**Possible decisions:**
- `Refined Intent` approved
- `Clarification Requested` — return to intent gathering

---

### 2. Review Gate

**Occurs:** After implementation.

**Purpose:** Did we build what we agreed to build?

**Artifacts reviewed:**
- Refined Intent
- Implementation
- Divergence report
- Test evidence
- Reference comparisons

**Possible decisions:**
- `Approve`
- `Approve with Conditions`
- `Revision Required`
- `Reject`
- `Supersede Expedition`
- `Split Expedition`
- `Merge Expedition`
- `Escalate to Mission`
- `Escalate to Program`

---

### 3. Acceptance Gate

**Occurs:** After review.

**Purpose:** Is this production-worthy?

**Artifacts reviewed:**
- Review decision
- Certification evidence
- UX validation
- Stakeholder input
- Rollout readiness

**Possible decisions:**
- `Accepted` → Closed
- `Rejected` → Revision or Mission review

---

## Completion Policies

Every expedition declares one of three completion policies that determine how its gates are staffed.

### Automatic

No human or AI reviewer required. Gate advances immediately when evidence is present.

```text
Documentation cleanup
Refactoring
Generated projections
Low-risk mechanical changes
```

### Human Approval Required

A human reviewer must resolve the gate.

```text
Homepage design
Architecture
Design System
Mission UX
Experience-shaping work
```

### AI Approval Required

A different AI agent must resolve the gate. The implementation agent cannot approve itself.

```text
Documentation quality
Test quality
Generated assets
Naming consistency
Style consistency
```

---

## Stop Conditions

1. **No dependent expedition may begin while an upstream expedition is awaiting any gate decision.**
2. An implementation agent cannot approve its own work under Human or AI Approval Required policies.
3. A gate cannot be skipped, bypassed, or auto-resolved without an explicit Automatic completion policy.
4. Rejected work must produce a new plan before re-entering execution.
5. A Mission cannot be approved until its Refined Intent passes the Refinement Gate.

---

## Program Composition

```text
EXP-PROGRAM-035
Intent Refinement & Review Governance
│
├── Refinement Gate
│   │
│   ├── EXP-REFINE-001  Refined Intent Artifact
│   │       Governance Expedition
│   │       Define the canonical interpretation artifact produced before Mission approval.
│   │
│   ├── EXP-REFINE-002  Refinement Gate Engine
│   │       Architecture Expedition
│   │       Implement the gate that evaluates intent, evidence, references, and unknowns.
│   │
│   └── EXP-REFINE-003  Clarification Loop
│           Process Expedition
│           Define how Clarification Requested returns to intent gathering.
│
├── Review Gate
│   │
│   ├── EXP-REVIEW-001  Review Lifecycle
│   │       Governance Expedition
│   │       Introduce Implementation Complete → Review Gate → decision → Accepted → Closed.
│   │
│   ├── EXP-REVIEW-002  Revision Governance
│   │       Governance Expedition
│   │       Introduce RevisionRequested, RevisionCompleted, and revision loops as replayable events.
│   │
│   ├── EXP-REVIEW-003  Rich Decision Model
│   │       Governance Expedition
│   │       Define Approve, Approve with Conditions, Reject, Supersede, Split, Merge, Escalate.
│   │
│   ├── EXP-REVIEW-004  Review Gate Package
│   │       Governance Expedition
│   │       Define the artifact produced at every review gate.
│   │
│   ├── EXP-REVIEW-005  Visual & Semantic Comparison
│   │       Engineering Expedition
│   │       Automated comparison: screenshot diff, semantic diff, layout diff, artifact mapping.
│   │
│   └── EXP-REVIEW-006  AI Review Protocol
│           AI Expedition
│           Mandate that AI agents review each other's work and cannot self-approve.
│
├── Acceptance Gate
│   │
│   ├── EXP-ACCEPT-001  Acceptance Lifecycle
│   │       Governance Expedition
│   │       Define Review Gate → Acceptance Gate → Accepted → Closed.
│   │
│   ├── EXP-ACCEPT-002  Acceptance Policies
│   │       Governance Expedition
│   │       Define who is allowed to accept what (human, AI, council, engine, asset owner).
│   │
│   └── EXP-ACCEPT-003  Production Certification Gate
│           Certification Expedition
│           Integrate certification, UX validation, and rollout readiness into acceptance.
│
├── Cross-Cutting
│   │
│   ├── EXP-GATE-001  Completion Policies
│   │       Governance Expedition
│   │       Define Automatic, Human Approval Required, and AI Approval Required.
│   │
│   ├── EXP-GATE-002  Mission Studio Integration
│   │       Product Expedition
│   │       Visualize Refinement Pending, Review Pending, Revision Required, Accepted, and Closed.
│   │
│   ├── EXP-GATE-003  Retrofit Program 027
│   │       Governance Expedition
│   │       Migrate Program 027 to the three-gate model and freeze completed expeditions as evidence.
│   │
│   └── EXP-GATE-004  Certification
│           Certification Expedition
│           Certify Intent Refinement & Review Governance using Program 027 as the validation project.
```

---

## New Artifacts

### Refined Intent

The canonical interpretation produced by the Refinement Gate. Contains:

```text
Objective
Scope
Non-goals
Success criteria
Visual references
Behavioral references
Constraints
Protected assets
Acceptance examples
Known unknowns
Risks
```

### Review Gate Package

Produced at every Review Gate. Contains:

```text
Target expedition
Refined Intent reference
Current implementation
Known divergence
Accepted divergence
Rejected divergence
Reviewer                   → human, AI, council, or engine per policy
Decision                   → Approve / Approve with Conditions / Revision Required / Reject / Supersede / Split / Merge / Escalate
Reason
Next action
Evidence
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

### Acceptance Gate Package

Produced at every Acceptance Gate. Contains:

```text
Target expedition
Review decision
Certification evidence
Stakeholder approvals
Rollout readiness
Reviewer
Decision                   → Accepted / Rejected
Timestamp
```

### Acceptance Policy

A governed artifact defining who may resolve which gate. Examples:

```text
Refinement Gate    → Human + Evidence
Review Gate        → Human for design, AI for docs
Acceptance Gate    → Certification Engine + Stakeholder
```

---

## Protected Assets

The following artifacts introduced by this Program SHALL NOT be modified without a governance event:

- Refined Intent schema
- Review Gate Package format
- Acceptance Gate Package format
- Revision Request event schema
- Acceptance Policy definitions
- Gate engine logic

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Turning conversation into a Refined Intent artifact | Implementing from ambiguous or undocumented intent |
| Gating Mission approval on a Refined Intent | Approving a Mission without reviewed intent |
| Pausing execution at any gate | Treating `Completed` as equivalent to `Accepted` |
| Requesting revision after review | Merging or promoting unreviewed work |
| Rejecting work that does not satisfy evidence | Silently approving failing work |
| Making rich review decisions (supersede, split, merge, escalate) | Reducing every review to binary approve/reject |
| Defining Automatic, Human, and AI approval policies | Allowing an agent to approve its own work under non-Automatic policies |
| Enforcing the upstream-gate stop condition | Starting dependent expeditions while upstream is awaiting a gate decision |
| Visualizing gate states in Mission Studio | Hiding gate state from operators |
| Using Program 027 as the certification pilot | Continuing Program 027 implementation before the model is certified |

---

## Out of Scope

- Replacing the existing Mission → Expedition → Replay lifecycle.
- Real-time negotiation or chat-based review workflows.
- Storing large binary reference assets inside the event log (links and hashes only).
- Dictating specific review tools (tooling is an adapter decision).

---

## Success Criteria

- Every future Program produces a Refined Intent before Mission approval.
- Every non-Automatic expedition passes through Review and Acceptance Gates before Closed.
- `Implementation Complete` is visibly distinct from `Accepted` in Mission Studio.
- RevisionRequested is a first-class, replayable event.
- Rich review decisions (Approve with Conditions, Supersede, Split, Merge, Escalate) are supported.
- The upstream-gate stop condition is enforced by the execution engine.
- Program 027 successfully executes under the three-gate model from its current paused state.
- AI agents cannot approve their own work under Human or AI Approval Required policies.

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** is paused and becomes the pilot certification project for Intent Refinement & Review Governance.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** will schedule Refinement, Review, and Acceptance Gates as part of the validation planner.
- **EXP-PROGRAM-032 — AI Agent Integration** will operate within gate policies; AI agents may review each other's work but cannot self-approve under non-Automatic policies.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that these gates extend.

---

## Long-Term Vision

SYNTH's governance model becomes complete: intent is refined before it becomes a Mission, implementation is reviewed against the refined intent, and promotion is accepted only when production-worthy. Every decision is a replayable event, every gate is visible in Mission Studio, and drift is caught at the earliest possible checkpoint.
