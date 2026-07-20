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

> ## Final architectural program before the testing/stabilization era
>
> Program 035 is the last architectural program in Era III. After it succeeds, the SYNTH governance model is frozen and the project shifts into extensive real-world testing, defect fixing, ergonomics refinement, and completion of active programs under the new model. No new architectural concepts are introduced unless testing reveals genuine gaps.

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

Close the gap between human intent and deterministic execution by introducing three gate types, a `Refined Intent` artifact, and a replayable `Review Decision` artifact:

1. **Refinement Gate** — before Mission approval: *Did we understand what is actually being requested?*
2. **Review Gate** — after implementation: *Did we build what we agreed to build?*
3. **Acceptance Gate** — after review: *Is this production-worthy?*

This program has higher architectural priority than Program 027 because it changes how every future program is understood, executed, reviewed, and accepted.

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
    └──────── Rejected
```

Each gate is a decision point, not an approval itself. Decisions are governance events and are replayable.

---

## Execution Phases

Program 035 is executed in five dependency-ordered phases. Phases 1 and 2 define vocabulary and artifacts without touching runtime code. Phase 3 modifies execution. Phase 4 retrofits existing systems. Phase 5 certifies the model.

### Phase 1 — Governance Model

Define vocabulary, state machines, artifacts, and governance rules.

```text
EXP-GATE-001  Review Lifecycle
EXP-GATE-002  Completion Policies
EXP-GATE-003  Refinement Lifecycle
EXP-GATE-004  Decision Model
```

### Phase 2 — Artifacts

Define the canonical schemas that flow through the system.

```text
EXP-GATE-005  Review Gate Package
EXP-GATE-006  Refined Intent Artifact
EXP-GATE-007  Acceptance Policies
```

### Phase 3 — Engine

Modify execution behavior so gates are enforced.

```text
EXP-GATE-008  Review Gate Engine
EXP-GATE-009  Revision Governance
```

### Phase 4 — Integration

Retrofit existing systems and test against a real project.

```text
EXP-GATE-010  Mission Studio Integration
EXP-GATE-011  Retrofit Program 027
```

### Phase 5 — Certification

Prove the lifecycle behaves correctly across scenarios.

```text
EXP-GATE-012  Certification
```

---

## New Artifacts

### Refined Intent

The canonical interpretation produced by the Refinement Gate. It is not the conversation, not the screenshots, not the prompt — it is the governed understanding.

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

### Review Decision

A replayable governance event produced by every gate. Example:

```yaml
decision:
  type: revision_required

reason:
  "Mission Studio still resembles a dashboard instead of the approved design language."

affected_assets:
  - homepage
  - mission-studio
  - design-system

required_changes:
  - replace dashboard cards
  - restore document artifacts
  - increase whitespace

evidence:
  - design-board-v4.png
  - EXP-HOME-025

reviewer: human
timestamp:
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

## Protected Assets

The following artifacts introduced by this Program SHALL NOT be modified without a governance event:

- Refined Intent schema
- Review Gate Package format
- Review Decision event schema
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

Program 035 is complete only when it enables this workflow:

```text
User
  ↓
Intent
  ↓
Refinement Session
  ↓
Refined Intent ✓
  ↓
Mission
  ↓
Planning
  ↓
Implementation
  ↓
Review Package
  ↓
Human Review
  ↓
Revision Requested
  ↓
Implementation
  ↓
Review Package
  ↓
Approved
  ↓
Acceptance
  ↓
Closed
```

Additionally:

- Every future Program produces a Refined Intent before Mission approval.
- Every non-Automatic expedition passes through Review and Acceptance Gates before Closed.
- `Implementation Complete` is visibly distinct from `Accepted` in Mission Studio.
- RevisionRequested is a first-class, replayable event.
- Rich review decisions (Approve with Conditions, Supersede, Split, Merge, Escalate) are supported.
- The upstream-gate stop condition is enforced by the execution engine.
- Program 027 successfully executes under the three-gate model from its current paused state.
- AI agents cannot approve their own work under Human or AI Approval Required policies.

### Certification Scenarios

EXP-GATE-012 must prove at least these scenarios:

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

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** is paused and becomes the pilot certification project for Intent Refinement & Review Governance.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** will schedule Refinement, Review, and Acceptance Gates as part of the validation planner.
- **EXP-PROGRAM-032 — AI Agent Integration** will operate within gate policies; AI agents may review each other's work but cannot self-approve under non-Automatic policies.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that these gates extend.

---

## After Program 035

Once Program 035 is certified:

1. The SYNTH governance model is frozen.
2. Program 027 resumes under the new model.
3. Remaining active programs complete under the new model.
4. The project enters extensive real-world testing, defect fixing, and ergonomics refinement.
5. New architectural concepts are deferred unless testing reveals genuine gaps.

---

## Long-Term Vision

SYNTH's governance model becomes complete: intent is refined before it becomes a Mission, implementation is reviewed against the refined intent, and promotion is accepted only when production-worthy. Every decision is a replayable event, every gate is visible in Mission Studio, and drift is caught at the earliest possible checkpoint.
