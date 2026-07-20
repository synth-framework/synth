# EXP-PROGRAM-035 — Refinement & Convergence Framework

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

> **Deterministic execution requires deterministic understanding.**
>
> Missions describe *what* to build. They do not fully describe *how success should be interpreted*. This program introduces refinement, reference contracts, convergence gates, and implementation validation so that human intent, reference evidence, and implementation remain aligned throughout execution.

SYNTH already governs execution deterministically:

```text
Mission
  ↓
Expedition
  ↓
Replay
  ↓
Evidence
```

What remains non-deterministic is the mental model an implementer—human or AI—builds from the available evidence. Program 035 closes that gap by making **interpretation itself governable**. Instead of assuming every implementer will infer the same intent, SYNTH requires that intent be refined into explicit contracts and validated through convergence gates before substantial implementation proceeds.

---

## Purpose

Make intent interpretation a first-class capability of SYNTH before the validation freeze:

- Introduce **Refinement Sessions** that turn ambiguous human requests into governed implementation constraints.
- Define **Reference Contracts** that protect accepted mockups, design boards, videos, CLI examples, architecture diagrams, and interaction recordings.
- Define **Experience Contracts** that capture experiential invariants and anti-patterns.
- Introduce **Convergence Gates** as milestone approvals that block downstream work until reference and implementation converge.
- Produce **Divergence Reports** that compare reference against implementation, classify severity, and record resolutions.
- Add **Reference Validation** to the certification pipeline.

---

## Core Abstraction — Interpretation as Governance

> **Every implementer receives the same protected interpretation of intent.**

Before implementation, SYNTH will require:

```text
Intent
  ↓
Discovery
  ↓
Mission
  ↓
Refinement
  ↓
Reference Contract
  ↓
Architecture
  ↓
Expeditions
  ↓
Convergence Gates
  ↓
Certification
```

The Refinement & Convergence Framework does not replace the existing lifecycle; it sits between Mission and Architecture, and again between Expeditions and Certification, ensuring that interpretation is as governed as execution.

---

## Goals

1. **Refine intent before architecture.** Capture open questions, assumptions, success signals, anti-goals, references, and acceptance assets.
2. **Protect references as assets.** Treat accepted references as protected artifacts that cannot change without a new Refinement Session.
3. **Encode experience invariants.** Define experiential constraints (calm, persistent, document-oriented) and anti-patterns (generic dashboard, chat bubbles, floating widgets).
4. **Gate implementation by convergence.** No substantial downstream work proceeds until a Convergence Gate is approved.
5. **Make divergence visible.** Every implementation compares reference → implementation → differences → severity → resolution.
6. **Generalize beyond UI.** Apply the same framework to APIs, CLIs, documentation, architecture, and runtime.
7. **Update SYNTH governance artifacts.** Extend Mission, Expedition, Certification, Replay, and Evidence to include refinement artifacts.

---

## Program Composition

```text
EXP-PROGRAM-035
Refinement & Convergence Framework
│
├── EXP-REFINE-001  Refinement Session
│       Process Expedition
│       Turn ambiguous human requests into governed implementation constraints.
│
├── EXP-REFINE-002  Reference Contract
│       Governance Expedition
│       Define and protect accepted references: mockups, boards, videos, diagrams.
│
├── EXP-REFINE-003  Experience Contract
│       Design Expedition
│       Encode experiential invariants and anti-patterns.
│
├── EXP-REFINE-004  Convergence Gates
│       Process Expedition
│       Introduce milestone approvals that block downstream work.
│
├── EXP-REFINE-005  Divergence Report
│       Governance Expedition
│       Compare reference against implementation and record resolutions.
│
├── EXP-REFINE-006  Visual Governance
│       Engineering Expedition
│       Automated comparison: screenshot diff, semantic diff, layout diff, artifact mapping.
│
├── EXP-REFINE-007  Architectural Convergence
│       Architecture Expedition
│       Generalize refinement and convergence beyond UI to all SYNTH artifacts.
│
├── EXP-REFINE-008  Governance Integration
│       Governance Expedition
│       Update Mission, Expedition, Certification, Replay, and Evidence models.
│
├── EXP-REFINE-009  AI Refinement Protocol
│       AI Expedition
│       Mandated pre-implementation questions and the Implementation Brief artifact.
│
└── EXP-REFINE-010  Certification
        Certification Expedition
        Add Reference, Experience, Architectural, and Behavioral Convergence to certification.
```

---

## New Artifacts

### Refinement Report

Produced by EXP-REFINE-001. Contains:

```text
Open Questions
Assumptions
Success Signals
Anti-goals
References
Acceptance Assets
```

### Reference Contract

Produced by EXP-REFINE-002. Contains:

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

Produced by EXP-REFINE-003. Contains:

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

Produced by EXP-REFINE-005. Contains:

```text
Reference
Implementation
Differences
Severity
Resolution
```

### Implementation Brief

Produced by EXP-REFINE-009. An agent must answer before implementation:

```text
What are the protected assets?
What must never change?
Show accepted references.
What constitutes success?
What constitutes failure?
What should I imitate?
What should I avoid?
```

---

## Convergence Gates

Convergence Gates are explicit approval boundaries. Downstream expeditions cannot begin until the gate opens.

| Gate | Trigger | Evidence Required |
|---|---|---|
| **Refinement Gate** | Mission approved | Refinement Report, Reference Contract, Experience Contract |
| **Architecture Gate** | Reference Contract approved | Architecture aligned with Reference Contract |
| **Implementation Gate** | Expeditions complete | Divergence Report showing acceptable convergence |
| **Certification Gate** | Implementation complete | Reference, Experience, Architectural, and Behavioral Convergence all pass |

---

## Protected Assets

The following artifacts introduced by this Program SHALL NOT be modified without a new Refinement Session and a governance event:

- Reference Contract
- Experience Contract
- Accepted reference assets (mockups, boards, recordings, diagrams)

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
| Generalizing convergence to APIs, CLI, docs, architecture, runtime | Limiting convergence governance to UI only |
| Requiring agents to produce an Implementation Brief | Starting implementation without answering the protocol |

---

## Out of Scope

- Replacing the existing Mission → Expedition → Replay lifecycle.
- Automating away human approval at Convergence Gates.
- Storing reference assets inside the event log (links and hashes are stored; assets live in canonical storage).
- Dictating specific tools for visual diffing (tooling is an adapter decision).

---

## Success Criteria

- Every future Program that produces a visible artifact must produce a Reference Contract before architecture begins.
- Every future Program must pass at least one Convergence Gate before certification.
- Divergence between reference and implementation is always recorded, never hidden.
- AI implementers produce an Implementation Brief before writing code.
- The framework is applicable to UI, API, CLI, documentation, architecture, and runtime.
- SYNTH operators can trace any implementation decision back to a Refinement Report, Reference Contract, or accepted Divergence Report.

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** is the first Program to use the new framework in practice. Its Milestones A–D become Convergence Gates.
- **EXP-PROGRAM-020 — Website Experience** convergence is now governed by Reference Contracts rather than ad-hoc design reviews.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that refinement validates against.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** will invoke Convergence Gates as part of the validation planner.
- **EXP-PROGRAM-032 — AI Agent Integration** will consume the AI Refinement Protocol.

---

## Long-Term Vision

SYNTH becomes a deterministic **communication and implementation alignment** system, not merely a deterministic execution system. Every implementer—human or AI—receives the same protected interpretation of intent, and every implementation is validated against explicit references before it is certified. Ambiguity is captured early, divergence is visible, and conformance is governable.
