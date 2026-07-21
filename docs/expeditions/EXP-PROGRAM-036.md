# EXP-PROGRAM-036 — Intent Refinement & Alignment Governance

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

> **Deterministic execution requires deterministic understanding, and understanding requires a governed Genesis Alignment Layer before Mission creation.**
>
> The Program 027 homepage incident revealed that strong specifications are not sufficient to prevent semantic drift. The missing layer is not more documentation; it is a formal mechanism to capture human intent, bind it to canonical evidence, validate the interpretation, and enforce alignment before any Mission is chartered.

EXP-PROGRAM-035 answers: *"Did we build what we agreed to build?"*

EXP-PROGRAM-036 answers: *"Did we capture what was actually intended?"*

---

## Purpose

Introduce the **Genesis Alignment Layer**: a deterministic mechanism to transform ambiguous human intent into an approved, executable understanding before Mission creation. This layer sits before the Synthesis Layer (Mission → Expedition → Implementation) and the Governance Layer (Review Gate → Acceptance Gate). The program delivers:

1. **Intent Model** — the structured interpretation of raw intent, including implicit expectations and forbidden interpretations.
2. **Refined Intent** — the governed, contract-ready interpretation derived from the Intent Model.
3. **Alignment Contract** — the formal agreement between operator and SYNTH that captured intent matches intended outcome.
4. **Divergence Gate** — prevent Missions and Expeditions from proceeding when intent alignment is incomplete.
5. **Interactive Decision Acquisition** — structured, adapter-independent decision requests that eliminate uncertainty during refinement.
6. **Reference Evidence Binding** — formal relationship between requirements and the artifacts (images, designs, examples) that justify them.
7. **Convergence Certification** — validate final outcomes against original intent and the Alignment Contract.

This program has equal architectural priority to Program 035 because it closes a separate, equally important governance gap.

---

## Core Abstraction — Intent-to-Mission Pipeline

```text
                    Genesis Alignment Layer

Raw Intent
    │
    ▼
Intent Model
    │
    ▼
Refinement Session
    │
    ▼
Refined Intent Artifact
    │
    ▼
Alignment Contract
    │
    ▼
Reference Evidence Binding
    │
    ▼
Divergence Gate
    │
    ├──────── Aligned ─────────→ Mission Creation
    │
    ├──────── Revision Required ──→ Refinement
    │
    └──────── Rejected ─────────→ Intent Rejected
```

After implementation, the Convergence Certification loop closes the pipeline:

```text
Implementation
    │
    ▼
Review Gate            (035)
    │
    ▼
Acceptance Gate        (035)
    │
    ▼
Convergence Certification (036)
    │
    ▼
Closed
```

---

## SYNTH's Three Layers

EXP-PROGRAM-036 establishes the missing first layer of SYNTH:

```text
Genesis Alignment Layer
      |
      |  Intent → Understanding → Alignment Contract
      |
Synthesis Layer
      |
      |  Mission → Expedition → Implementation
      |
Governance Layer
      |
      |  Review Gate → Acceptance Gate → Convergence Certification
```

| Layer | Question | Failure Class Solved |
|---|---|---|
| Genesis Alignment | Did we understand what was wanted? | Understanding failure |
| Synthesis | Did we plan the right work? | Planning failure |
| Governance | Did we build what we agreed to build? | Execution failure |

---

## Execution Phases

Program 036 is executed in five dependency-ordered phases:

- **Phase 0** defines the canonical governance lifecycle state machine that all subsequent phases obey.
- **Phase 1** defines the vocabulary and artifacts of intent modeling.
- **Phase 2** defines the Alignment Contract and the Divergence Gate that validates it.
- **Phase 3** introduces Interactive Decision Acquisition to eliminate residual uncertainty through structured, adapter-independent interactions.
- **Phase 4** binds reference evidence, certifies convergence, integrates refinement into Mission Studio, and uses Program 027 as the pilot.

### Phase 0 — Governance Lifecycle Specification

Produce the canonical specification for SYNTH's full governance lifecycle before any further implementation proceeds. This phase ensures all gates, states, transitions, satisfiers, events, and replay expectations are explicit and reviewable.

```text
EXP-REFINE-012  Governance Lifecycle State Machine
```

### Phase 1 — Refinement Model

Define the canonical refinement process, artifacts, and lifecycle.

```text
EXP-REFINE-011  Intent Interpretation Model
EXP-REFINE-001  Refinement Layer Model
EXP-REFINE-004  Refinement Questions Engine
```

### Phase 2 — Alignment Artifacts

Define the Alignment Contract and Divergence Gate semantics.

```text
EXP-REFINE-002  Alignment Contract
EXP-REFINE-003  Divergence Gate
```

### Phase 3 — Interactive Refinement

Introduce structured decision acquisition so the Refinement Layer can eliminate uncertainty through deterministic, adapter-independent interactions.

```text
EXP-REFINE-010  Interactive Decision Acquisition
                Decision Acquisition Engine
                Adapter Capability Detection
                Interactive Decision Artifacts
```

### Phase 4 — Convergence Certification, Evidence Binding, and Integration

Bind reference evidence to the Alignment Contract, certify final outcomes against original intent, integrate refinement into Mission Studio, and use Program 027 as the pilot.

```text
EXP-REFINE-005  Reference Evidence Binding
EXP-REFINE-006  Convergence Certification
EXP-REFINE-007  Mission Studio Integration
EXP-REFINE-008  Program 027 Retrofit
EXP-REFINE-009  Certification
```

---

## New Artifacts

### Intent Model

The first structured artifact produced from raw intent. It captures not only what was explicitly requested, but also the implicit expectations, forbidden interpretations, and unresolved ambiguity that would otherwise be lost in the first refinement step.

```text
Intent Model

Explicit objectives
Implicit objectives
Audience
Problem statement
Desired outcome
Non-goals
Forbidden interpretations
Allowed interpretations
Reference evidence
Confidence level
Unresolved ambiguity
Known unknowns
```

### Refined Intent

The governed interpretation produced from the Intent Model. It is not the conversation, not the screenshots, not the prompt — it is the explicit, approved understanding.

```text
Refined Intent

Objective
Audience
Problem
Desired outcome
Non-goals
Constraints
Visual references
Behavioral references
Success criteria
Known ambiguities
Open questions
Version
```

### Alignment Contract

The formal agreement that the captured intent accurately represents the intended outcome.

```text
Alignment Contract

Intent Summary
Expected Experience
Required Behaviors
Visual References
Functional Expectations
Technical Constraints
Success Criteria
Explicit Non-Requirements
Allowed Interpretation
Allowed Variation
Forbidden Interpretation
Forbidden Drift
Approval Record
```

### Divergence Report

Produced when alignment is reviewed. Contains:

```text
Target intent
Alignment Contract reference
Known divergence
Accepted divergence
Rejected divergence
Reviewer
Decision
Reason
Evidence
Timestamp
```

### Convergence Report

Produced after implementation. Contains:

```text
Original intent reference
Alignment Contract reference
Implementation evidence
Final result reference
Divergence detected
Divergence accepted
Decision
Certified / Not certified
Timestamp
```

---

## Gate Definitions

### Divergence Gate

**Occurs:** Before Mission approval.

**Purpose:** Do we agree that the Alignment Contract accurately captures the intended outcome?

**Artifacts reviewed:**

- Raw intent
- Intent Model
- Refined Intent
- Alignment Contract
- Reference evidence
- Constraints
- Assumptions
- Open questions

**Possible decisions:**

- `aligned` — Mission creation permitted
- `revision_required` — refine intent and contract
- `rejected` — intent cannot be pursued as stated
- `superseded` — replaced by a new intent

---

## Completion Policies

The Divergence Gate supports the same policy model as Program 035:

### Automatic

Gate advances when required artifacts are present and valid.

```text
Well-understood mechanical tasks
Generated projections
Documentation reorganization
```

### Human Approval Required

A human reviewer must confirm alignment.

```text
Homepage design
Mission Studio UX
Architecture changes
Experience-shaping work
```

### AI Approval Required

A different AI agent confirms alignment. The implementation agent cannot approve its own interpretation.

```text
Refactoring intent
Test strategy
Naming conventions
Style alignment
```

---

## Stop Conditions

1. A Mission cannot be approved until its Alignment Contract passes the Divergence Gate.
2. A Refined Intent cannot produce an Alignment Contract until required references are bound.
3. An Alignment Contract cannot be approved without explicit success criteria, forbidden interpretation, and forbidden drift.
4. A Refined Intent cannot be produced from an Intent Model whose confidence is below the policy threshold without human escalation.
5. Rejected alignment must produce a new Refined Intent or Intent Model, not a silent retry.
6. A changed Alignment Contract invalidates downstream Missions until re-aligned.

---

## Protected Assets

The following artifacts introduced by this Program SHALL NOT be modified without a governance event:

- Intent Model schema
- Refined Intent schema
- Alignment Contract schema
- Divergence Gate decision schema
- Convergence Report schema
- Reference Evidence Binding format
- Divergence Gate engine logic

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Turning conversation into a Refined Intent artifact | Creating a Mission from ambiguous or undocumented intent |
| Binding screenshots, designs, and examples as reference evidence | Storing large binary assets inside the event log |
| Defining Allowed Variation and Forbidden Drift | Leaving interpretation entirely to the implementation agent |
| Gating Mission approval on an approved Alignment Contract | Approving a Mission without aligned intent |
| Requesting revision when intent is unclear | Silently proceeding with weak alignment |
| Producing a Convergence Report after implementation | Treating "tests passed" as sufficient proof of intent convergence |
| Using Program 027 as the pilot | Continuing Program 027 implementation before alignment governance is in place |

---

## Out of Scope

- Replacing the existing Mission → Expedition → Replay lifecycle.
- Real-time negotiation or chat-based refinement workflows.
- Automated visual diff tooling in Phase 1 (may be added later as an adapter).
- Dictating specific reference-evidence tools.

---

## Success Criteria

Program 036 is complete only when it enables this workflow:

```text
User
  ↓
Raw Intent
  ↓
Intent Model
  ↓
Refinement Session
  ↓
Refined Intent
  ↓
Alignment Contract
  ↓
Reference Evidence Binding
  ↓
Divergence Gate Review
  ↓
Aligned
  ↓
Mission Created
  ↓
Expedition
  ↓
Implementation
  ↓
Review Gate          (035)
  ↓
Acceptance Gate      (035)
  ↓
Convergence Certification (036)
  ↓
Closed
```

Additionally:

- Every future Program produces an Intent Model, Refined Intent, and Alignment Contract before Mission approval.
- The Divergence Gate prevents Mission creation when alignment is incomplete.
- The Alignment Contract explicitly names Allowed Interpretation, Forbidden Interpretation, Allowed Variation, and Forbidden Drift.
- Reference evidence is bound by link/hash, not embedded in the event log.
- Convergence Certification compares final outcomes against the Alignment Contract.
- Program 027 successfully executes under the combined 035/036 model from its current paused state.

### Certification Scenarios

EXP-REFINE-009 must prove at least these scenarios:

**Scenario 1 — Straight-through alignment**
```text
Raw Intent
  ↓
Intent Model
  ↓
Refined Intent
  ↓
Alignment Contract
  ↓
Divergence Gate: aligned
  ↓
Mission created
```

**Scenario 2 — Revision loop**
```text
Raw Intent
  ↓
Intent Model
  ↓
Refined Intent
  ↓
Alignment Contract
  ↓
Divergence Gate: revision_required
  ↓
Refinement resumes
  ↓
Divergence Gate: aligned
  ↓
Mission created
```

**Scenario 3 — Missing reference blocks alignment**
```text
Raw Intent
  ↓
Intent Model without visual references
  ↓
Refined Intent rejected
  ↓
Mission cannot be created
```

**Scenario 4 — Changed Alignment Contract invalidates Mission**
```text
Mission approved
  ↓
Alignment Contract changed
  ↓
Mission suspended until re-aligned
```

**Scenario 5 — Convergence failure after implementation**
```text
Implementation accepted
  ↓
Convergence Certification
  ↓
Divergence detected
  ↓
Revision requested
```

---

## Relationship to Other Work

- **ADR-037 — Genesis Lifecycle and Alignment Contracts** elevates this program into the three-layer SYNTH architecture and defines the Genesis Alignment Layer.
- **EXP-PROGRAM-035 — Intent Refinement & Review Governance** provides the gate engine and execution-control mechanisms that the Divergence Gate extends.
- **EXP-PROGRAM-027 — Mission Studio Homepage** is paused and becomes the pilot certification project for the Genesis Alignment Layer.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** will schedule Divergence Gates as part of the validation planner.
- **EXP-PROGRAM-032 — AI Agent Integration** will operate within alignment policies; AI agents may assist refinement but cannot approve their own interpretation under non-Automatic policies.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that the Genesis Alignment Layer extends.

---

## After Program 036

Once Programs 035 and 036 are certified:

1. The SYNTH governance model is frozen.
2. Program 027 resumes under the combined model.
3. Remaining active programs complete under the new model.
4. The project enters extensive real-world testing, defect fixing, and ergonomics refinement.
5. New architectural concepts are deferred unless testing reveals genuine gaps.

---

## Long-Term Vision

SYNTH's governance model becomes complete: raw intent is modeled into an Intent Model, refined into a Refined Intent, bound to evidence through an Alignment Contract, reviewed at a Divergence Gate before execution, executed under Review and Acceptance Gates, and finally certified for convergence with the original intent. Every decision is a replayable event, every gate is visible in Mission Studio, and drift is caught at the earliest possible checkpoint.
