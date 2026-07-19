# EXP-PROGRAM-022 — AI-Native First Contact

**Status:** Active  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Greenfield onboarding and intent discovery  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **The first interaction between an operator and SYNTH should not begin with repository initialization or governance commands. It should begin with deterministic intent discovery that produces replayable, approval-driven artifacts before any project state is created.**

SYNTH excels once intent has been formalized into Missions and Expeditions, but the transition from **"I have an idea"** to **"I have a Mission"** is still largely delegated to the agent. That gap is a product boundary, not a temporary workflow issue.

Greenfield onboarding must become a deterministic Discovery workflow that minimizes ambiguity, captures intent, verifies capabilities, and delays repository materialization until a Mission is approved.

---

## Purpose

Design and implement the canonical greenfield onboarding experience for SYNTH.

Transform an unstructured user idea into an approved Mission through a deterministic Discovery workflow. The workflow must produce replayable, immutable artifacts and delay code generation and repository mutation until after operator approval.

This program introduces product infrastructure. It does not change the Mission lifecycle, Expedition execution semantics, or the deterministic governance contract.

---

## Core Abstraction — First Contact Discovery

The unit of greenfield onboarding is a **First Contact Discovery** session:

> A replayable, approval-driven artifact that captures operator intent, audience, constraints, unknowns, and architecture candidates before any project state exists.

```text
User Intent
      ↓
Discovery
      ↓
Discovery Artifact
      ↓
Architecture Projection
      ↓
Capability Verification
      ↓
Mission Approval
      ↓
Repository Materialization
      ↓
Expedition Proposals
```

A Discovery artifact records *what the operator wants* and *why*, not the code that implements it. It becomes the foundation for Mission generation and the authoritative source of intent during replay.

---

## Mission

Make SYNTH greenfield onboarding behave like a deterministic intent-discovery system:

- Every project begins with a First Contact Discovery session.
- Discovery extracts intent, detects ambiguity, and identifies unknowns.
- Discovery produces architecture candidates as projections, not canonical state.
- Capability verification confirms that the selected architecture can be realized.
- Mission creation is gated on Discovery approval.
- Repository materialization happens only after Mission approval.

---

## Program Composition

```
EXP-PROGRAM-022
AI-Native First Contact
│
├── EXP-AIFC-001  Discovery Lifecycle Specification
│       Architecture Expedition
│       Define the canonical greenfield discovery workflow and approval gates.
│
├── EXP-AIFC-002  Discovery Artifact Schema
│       Architecture Expedition
│       Design the immutable, replayable Discovery artifact.
│
├── EXP-AIFC-003  Intent Extraction Engine
│       Architecture Expedition
│       Extract intent, audience, constraints, and success criteria from
│       unstructured operator input.
│
├── EXP-AIFC-004  Clarification Strategy
│       Architecture Expedition
│       Detect ambiguity, score confidence, and generate targeted
│       clarification questions.
│
├── EXP-AIFC-005  Architecture Projection Engine
│       Architecture Expedition
│       Produce architecture candidates with rationale, tradeoffs, and
│       recommended choice.
│
├── EXP-AIFC-006  Capability Verification Framework
│       Architecture Expedition
│       Verify runtime, language, framework, and platform assumptions before
│       Mission creation.
│
├── EXP-AIFC-007  Mission Materialization Pipeline
│       Architecture Expedition
│       Initialize repository, manifest, Mission, and Expedition proposals
│       only after Discovery approval.
│
├── EXP-AIFC-008  Greenfield Operator Experience
│       Product Expedition
│       Design the CLI and interactive flow for greenfield onboarding.
│
├── EXP-AIFC-009  Replay and Governance Integration
│       Architecture Expedition
│       Integrate Discovery artifacts with replay verification and
│       governance proofs.
│
└── EXP-AIFC-010  Certification and UX Validation
        Product Expedition
        Certify the greenfield workflow with real operators and agents.
```

> **Note on identifiers:** The prefix `EXP-AIFC` is used to avoid colliding with the existing Discovery expedition sequence (`EXP-DISCOVERY-001..007`) and the earlier First Contact program (`EXP-FIRSTCONTACT-001..011`).

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)
- Brownfield Discovery semantics

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

All work in this Program stays in the Allowed column:

| Allowed | Forbidden |
|---|---|
| New Discovery artifact and lifecycle | Changing Mission approval semantics |
| Intent extraction and clarification | Changing Expedition execution semantics |
| Architecture projection as read-only artifact | Brownfield discovery redesign |
| Capability verification | Code generation quality as a goal |
| Repository materialization after approval | IDE integrations |
| Replay and governance integration | Weakening deterministic governance |
| CLI and operator experience for greenfield | Bypassing ExecutionGate for mutations |

### Hard Constraints

> **No state before approval:** No repository, manifest, event log, or generated code may be created until the Discovery artifact is approved and the Mission is created.
>
> **Replayability:** Every Discovery artifact must be reproducible from its inputs and approved state.
>
> **Deterministic projections:** Architecture candidates are projections; the selected architecture becomes canonical only through approval.

---

## Out of Scope

- Changes to the Mission lifecycle.
- Changes to Expedition execution semantics.
- Brownfield discovery, except aligning terminology and artifacts.
- Code generation quality beyond capability verification.
- IDE or editor integrations.
- Commercial cloud CI integrations.

---

## Success Criteria

The program is complete when:

- A user can start with a plain-language idea such as "Let's build a space mission tracker" or "Create me a markdown viewer in Python."
- SYNTH consistently produces a Discovery artifact, architecture alternatives, capability verification, an approval-ready Mission, and initial Expedition proposals.
- No repository state, code, or governance artifacts are generated before Mission approval.
- Discovery artifacts are replayable and integrate with governance proofs.
- The greenfield workflow is certified with real operators and agents.
- The workflow converges with brownfield onboarding on the same Discovery abstraction.

---

## Relationship to Other Work

- **EXP-PROGRAM-006** defines the Discovery compiler. This program consumes Discovery concepts and may contribute greenfield-specific observation or projection capabilities.
- **EXP-PROGRAM-021** improves governance performance. Greenfield workflows must remain governable and should benefit from incremental validation.
- **EXP-BROWNFIELD-001** established the brownfield onboarding workflow. This program defines the greenfield equivalent; both should converge on the same Discovery artifact model.
- **EXP-CLI-001** improved CLI diagnostics; greenfield operator experience builds on that surface.
- **EXP-CERT-001** will certify failure behavior; greenfield onboarding must be included in certification coverage.
