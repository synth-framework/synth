# EXP-PROGRAM-035 — Intent Convergence & Acceptance Governance

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

> **Deterministic execution requires deterministic understanding, and completed work requires explicit acceptance.**
>
> SYNTH already governs execution deterministically: Mission → Expedition → Replay → Evidence. What remains non-deterministic is the mental model an implementer builds from available evidence, and whether the completed result actually satisfies the intent that originated it. This program closes both gaps by making **intent convergence** and **acceptance governance** first-class lifecycle phases.

The homepage incident proved the distinction: nothing technically failed, no tests failed, no contracts failed, yet the implementation was not the implementation the operator wanted. The missing primitive was a gate asking:

> **Does this implementation satisfy the evidence?**

Not:

> **Did I build what the expedition says?**

This program introduces the governance primitive that asks the first question explicitly.

---

## Purpose

Complete SYNTH's governance model before the validation freeze by governing both interpretation and acceptance:

- **Before implementation:** refine raw intent into explicit contracts, protected references, and experiential invariants.
- **After implementation:** require explicit review, revision, and acceptance before work is promoted.
- Make **Completed ≠ Accepted** a first-class distinction across all SYNTH artifacts.
- Introduce **Acceptance Policies** that define who may approve what.
- Extend Mission Studio to visualize review and acceptance states.

---

## Core Abstraction — Two Convergence Loops

```text
Raw Intent
      │
      ▼
Intent Refinement
      │
      ▼
Mission Approval
      │
      ▼
Expedition Approval
      │
      ▼
Implementation
      │
      ▼
Completed
      │
      ▼
Pending Review
      │
      ├──────────────┐
      ▼              │
Accepted             │
      │              │
      ▼              │
Promoted             │
                     │
      ▲              │
      │              │
Revision Requested ◄─┘
```

**Intent convergence** (left side) prevents drift before implementation. **Acceptance convergence** (right side) prevents drift after implementation. Together they form a closed loop from intent to promotion.

---

## Goals

1. **Refine intent before architecture.** Capture open questions, assumptions, success signals, anti-goals, references, and acceptance assets.
2. **Protect references as assets.** Treat accepted references as protected artifacts that cannot change without a new Refinement Session.
3. **Encode experience invariants.** Define experiential constraints and anti-patterns.
4. **Introduce acceptance states.** Distinguish Completed, Pending Review, Revision Requested, Accepted, and Promoted.
5. **Make review and revision replayable.** Every review decision and revision request becomes an event.
6. **Define acceptance policies.** Different artifacts require different reviewers (human, AI, council, engine).
7. **Gate promotion by acceptance.** No completed work advances until it is explicitly accepted.
8. **Generalize beyond UI.** Apply convergence and acceptance to APIs, CLIs, documentation, architecture, and runtime.

---

## Program Composition

```text
EXP-PROGRAM-035
Intent Convergence & Acceptance Governance
│
├── Pre-Implementation Convergence
│   │
│   ├── EXP-CONVERGE-001  Refinement Session
│   │       Process Expedition
│   │       Turn ambiguous human requests into governed implementation constraints.
│   │
│   ├── EXP-CONVERGE-002  Reference Contract
│   │       Governance Expedition
│   │       Define and protect accepted references: mockups, boards, videos, diagrams.
│   │
│   ├── EXP-CONVERGE-003  Experience Contract
│   │       Design Expedition
│   │       Encode experiential invariants and anti-patterns.
│   │
│   ├── EXP-CONVERGE-004  Convergence Gates
│   │       Process Expedition
│   │       Introduce milestone approvals that block downstream work.
│   │
│   ├── EXP-CONVERGE-005  Divergence Report
│   │       Governance Expedition
│   │       Compare reference against implementation and record resolutions.
│   │
│   ├── EXP-CONVERGE-006  Visual Governance
│   │       Engineering Expedition
│   │       Automated comparison: screenshot diff, semantic diff, layout diff, artifact mapping.
│   │
│   ├── EXP-CONVERGE-007  Architectural Convergence
│   │       Architecture Expedition
│   │       Generalize refinement and convergence beyond UI to all SYNTH artifacts.
│   │
│   ├── EXP-CONVERGE-008  Governance Integration
│   │       Governance Expedition
│   │       Update Mission, Expedition, Certification, Replay, and Evidence models.
│   │
│   ├── EXP-CONVERGE-009  AI Refinement Protocol
│   │       AI Expedition
│   │       Mandated pre-implementation questions and the Implementation Brief artifact.
│   │
│   └── EXP-CONVERGE-010  Convergence Certification
│           Certification Expedition
│           Add Reference, Experience, Architectural, and Behavioral Convergence to certification.
│
└── Post-Implementation Acceptance
    │
    ├── EXP-ACCEPT-001  Review Lifecycle
    │       Governance Expedition
    │       Introduce Completed → Pending Review → Accepted → Promoted states.
    │
    ├── EXP-ACCEPT-002  Revision Governance
    │       Governance Expedition
    │       Introduce RevisionRequested, RevisionCompleted, and revision loops.
    │
    ├── EXP-ACCEPT-003  Acceptance Policies
    │       Governance Expedition
    │       Define who is allowed to approve what.
    │
    └── EXP-ACCEPT-004  Mission Studio Integration
            Product Expedition
            Visualize Pending Review, Needs Revision, Accepted, and Promoted inside Mission Studio.
```

---

## New Artifacts

### Refinement Report

Produced by EXP-CONVERGE-001. Contains:

```text
Open Questions
Assumptions
Success Signals
Anti-goals
References
Acceptance Assets
```

### Reference Contract

Produced by EXP-CONVERGE-002. Contains:

```text
Accepted mockups
Design boards
Videos
CLI examples
Architecture diagrams
Interaction recordings
Canonical screenshots
Protected flag
Version
```

Reference Contracts are **protected assets**. Changes require a new Refinement Session and a governance event.

### Experience Contract

Produced by EXP-CONVERGE-003. Contains:

```text
Experience invariants (e.g., calm, persistent, document-oriented, operator-centric)
Anti-patterns (e.g., generic dashboard, floating widgets, disconnected cards, chat bubbles)
Examples of conformance and non-conformance
```

### Reference Convergence Report

Produced at every Convergence Gate. Contains:

```text
Reference artifacts
Current implementation
Known divergence
Accepted divergence
Rejected divergence
Approval
Reviewer
Evidence
```

### Divergence Report

Produced by EXP-CONVERGE-005. Contains:

```text
Reference
Implementation
Differences
Severity
Resolution
```

### Implementation Brief

Produced by EXP-CONVERGE-009. An agent must answer before implementation:

```text
What are the protected assets?
What must never change?
Show accepted references.
What constitutes success?
What constitutes failure?
What should I imitate?
What should I avoid?
```

### Acceptance Review

Produced by EXP-ACCEPT-001. Contains:

```text
Reviewer
Evidence
Result (Accepted / Rejected)
Reason
Next Action (Promote / Request Revision)
Timestamp
```

### Revision Request

Produced by EXP-ACCEPT-002. Contains:

```text
Target Expedition
Reason
Evidence
Reviewer
Timestamp
```

RevisionRequested becomes a first-class event in the event log.

---

## Lifecycle States

Every implementation-producing Expedition now moves through explicit states:

```text
Proposed
    ↓
Approved
    ↓
Executing
    ↓
Completed
    ↓
Pending Review
    ↓
Accepted
    ↓
Promoted
```

From **Pending Review**, the result may also transition to **Revision Requested**, then back through **Completed** and review.

---

## Convergence & Acceptance Gates

| Gate | Trigger | Evidence Required |
|---|---|---|
| **Refinement Gate** | Mission approved | Refinement Report, Reference Contract, Experience Contract |
| **Architecture Gate** | Reference Contract approved | Architecture aligned with Reference Contract |
| **Implementation Gate** | Expeditions complete | Divergence Report showing acceptable convergence |
| **Review Gate** | Implementation marked Completed | Acceptance Review with evidence |
| **Certification Gate** | Work Accepted | Reference, Experience, Architectural, and Behavioral Convergence all pass |

No downstream work proceeds until the relevant gate opens.

---

## Acceptance Policies

Different artifacts require different reviewers. EXP-ACCEPT-003 defines policies such as:

```text
Documentation      → AI Review
Homepage           → Human Review
Architecture       → Architecture Council
Protected Assets   → Protected Asset Owner
Release            → Certification Engine
```

Policies are themselves governed artifacts and may vary by program.

---

## Protected Assets

The following artifacts introduced by this Program SHALL NOT be modified without a new Refinement Session and a governance event:

- Reference Contract
- Experience Contract
- Accepted reference assets (mockups, boards, recordings, diagrams)
- Acceptance Review records
- Revision Request records

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Refining ambiguous intent into explicit contracts | Implementing from ambiguous or undocumented intent |
| Protecting accepted references as assets | Allowing references to drift silently during implementation |
| Defining experiential invariants and anti-patterns | Imposing unreviewed aesthetic or experiential decisions |
| Gating downstream work on convergence | Bypassing convergence gates to save time |
| Recording accepted and rejected divergence | Hiding divergence between reference and implementation |
| Requiring explicit acceptance after completion | Treating "Completed" as equivalent to "Accepted" |
| Recording RevisionRequested events | Informal revision requests outside the event log |
| Defining acceptance policies per artifact type | Allowing any actor to approve any artifact |
| Generalizing convergence to APIs, CLI, docs, architecture, runtime | Limiting governance to UI only |
| Requiring agents to produce an Implementation Brief | Starting implementation without answering the protocol |

---

## Out of Scope

- Replacing the existing Mission → Expedition → Replay lifecycle.
- Automating away human approval at Acceptance Gates.
- Storing reference assets inside the event log (links and hashes are stored; assets live in canonical storage).
- Dictating specific tools for visual diffing (tooling is an adapter decision).
- Real-time collaboration or negotiation features.

---

## Success Criteria

- Every future Program that produces a visible artifact must produce a Reference Contract before architecture begins.
- Every future Program must pass at least one Convergence Gate before certification.
- Every completed Expedition moves through Pending Review before it can be Accepted or Promoted.
- Divergence between reference and implementation is always recorded, never hidden.
- RevisionRequested is a first-class event and replayable.
- AI implementers produce an Implementation Brief before writing code.
- The framework is applicable to UI, API, CLI, documentation, architecture, and runtime.
- SYNTH operators can trace any implementation decision back to a Refinement Report, Reference Contract, accepted Divergence Report, or Acceptance Review.

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** is the first Program to use the new framework in practice. Its Milestones A–D become Convergence Gates, and its completed expeditions move through Acceptance Review.
- **EXP-PROGRAM-020 — Website Experience** convergence is now governed by Reference Contracts rather than ad-hoc design reviews.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that refinement validates against.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** will invoke Convergence and Acceptance Gates as part of the validation planner.
- **EXP-PROGRAM-032 — AI Agent Integration** will consume the AI Refinement Protocol and operate within Acceptance Policies.

---

## Long-Term Vision

SYNTH becomes a deterministic **communication, implementation alignment, and acceptance** system. Every implementer—human or AI—receives the same protected interpretation of intent before building, and every completed artifact is explicitly reviewed against that intent before promotion. Ambiguity is captured early, divergence is visible, conformance is governable, and acceptance is replayable.
