# ADR-047 — Intent Refinement and Alignment Governance

**Status:** Accepted  
**Date:** 2026-07-21  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, Mission Studio, Governance

---

## Context

SYNTH currently governs transformation from:

```text
Mission
 ↓
Expedition
 ↓
Execution
 ↓
Evidence
```

This model is deterministic and replayable, and it works well when the Mission artifact already captures the intended outcome with sufficient fidelity. However, human intent often enters SYNTH as incomplete, ambiguous, or globally expressed:

- "Build this homepage"
- "Make the onboarding better"
- "Create a marketplace"
- "Improve the architecture"

These statements contain objectives, constraints, references, aesthetic expectations, and implied acceptance criteria that are not always represented in the Mission artifact.

The Program 027 homepage incident demonstrated this failure mode clearly. The expeditions had strong specifications: design tokens, component catalogs, semantic rules, and explicit anti-goals such as "no generic dashboard components." Yet the implementation still drifted toward a generic dashboard aesthetic. The implementation was *compliant* with the expedition DoDs but not *converged* with the human intent.

This creates a distinct failure mode:

```text
Implementation conforms to specification

but

Implementation diverges from intent
```

Existing governance validates correctness against explicit artifacts, but it does not validate whether the explicit artifacts adequately represent the originating intent. A separate layer is needed to control ambiguity **before** it becomes a Mission, and to enforce **alignment** between intent, evidence, and implementation throughout the lifecycle.

EXP-PROGRAM-035 introduces Review, Refinement, and Acceptance Gates. Those gates answer:

- Did we understand what was requested? (Refinement Gate)
- Did we build what we agreed to build? (Review Gate)
- Is this production-worthy? (Acceptance Gate)

What remains ungoverned is the **alignment contract** that binds human intent to the artifacts that will be executed and reviewed. Without that contract, an implementation can satisfy every gate while still failing to deliver the intended outcome.

---

## Decision

Introduce a dedicated **Intent Refinement and Alignment Governance** layer, chartered as EXP-PROGRAM-036. This layer sits before Mission creation and produces a governed Alignment Contract that becomes the authoritative reference for all downstream work.

The lifecycle becomes:

```text
Raw Intent
    ↓
Intent Model
    ↓
Refined Intent Artifact
    ↓
Alignment Contract
    ↓
Divergence Gate (alignment review)
    ↓
Mission
    ↓
Expedition
    ↓
Implementation
    ↓
Review Gate
    ↓
Acceptance Gate
    ↓
Convergence Certification
```

EXP-PROGRAM-035 governs **execution correctness**: can work move forward safely?

EXP-PROGRAM-036 governs **intent correctness**: is the work still the thing we agreed to build?

The two programs are complementary and together close the gap between human intent and deterministic execution.

---

## New Concepts

### 1. Refinement Layer

The Refinement Layer transforms ambiguous or implicit human intent into explicit, reviewable form. It does not create a Mission. It creates the artifacts that must be approved before a Mission can be created.

Inputs:

- Natural language
- Images and design boards
- Documents and examples
- Existing software
- Conversations and clarifications

Outputs:

- **Intent Model** — the structured interpretation of raw intent.
- **Refined Intent Artifact** — the governed interpretation of what was requested.

### 2. Intent Model

The first artifact produced from raw intent. It captures not only what was explicitly requested, but also the implicit expectations, forbidden interpretations, and unresolved ambiguity that would otherwise be lost.

```text
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

The Intent Model is the input to the Refined Intent. It is intentionally broader and may contain uncertainty. The refinement process reduces that uncertainty before producing a contract-ready Refined Intent.

### 3. Refined Intent Artifact

A canonical artifact containing:

```text
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

The Refined Intent is not the conversation, the screenshots, or the prompt. It is the explicit, approved interpretation that will be used to create the Alignment Contract.

### 4. Alignment Contract

The central artifact introduced by this ADR. The Alignment Contract is the formal agreement between the operator and SYNTH that the captured intent accurately represents the intended outcome.

It contains:

```text
Intent Summary
Expected Experience
Required Behaviors
Visual References
Functional Expectations
Technical Constraints
Success Criteria
Explicit Non-Requirements
Allowed Variation
Forbidden Drift
Approval Record
```

The Alignment Contract becomes the bridge between human understanding and machine execution. A Mission cannot be created until the Alignment Contract is approved.

### 5. Divergence Gate

A new governance checkpoint that occurs **before Mission creation**. It asks:

> "Do we agree that this representation accurately captures the intended outcome?"

Possible states:

```text
draft
awaiting_alignment
aligned
revision_required
rejected
superseded
```

A Mission cannot start unless the Divergence Gate is `aligned`.

### 6. Convergence Certification

After implementation, acceptance, and review, Convergence Certification asks:

> "Does the final outcome represent the intended outcome?"

It compares:

```text
Original Intent
        +
Alignment Contract
        +
Implementation Evidence
        +
Final Result
```

and produces a **Convergence Report**.

---

## Relationship to EXP-PROGRAM-035

EXP-PROGRAM-035 and EXP-PROGRAM-036 solve different failure modes and must remain distinct:

| Program | Question | When |
|---|---|---|
| EXP-PROGRAM-035 | Did we build what we agreed to build? | After implementation |
| EXP-PROGRAM-036 | Did we capture what was actually intended? | Before Mission creation |

Together they form a complete governance loop:

```text
                Genesis
                  │
           Intent Model    (036)
                  │
          Refined Intent    (036)
                  │
       Alignment Contract  (036)
                  │
          Divergence Gate   (036)
                  │
              Mission
                  │
             Expeditions
                  │
          Implementation
                  │
          Review Gates      (035)
                  │
          Acceptance Gate   (035)
                  │
       Convergence Certification (036)
```

EXP-PROGRAM-035 should continue implementation first because its execution-control mechanisms are already in flight and are a prerequisite for enforcing any gate. EXP-PROGRAM-036 is chartered afterward to introduce the refinement layer, alignment contract, divergence gate, and convergence certification.

---

## Consequences

### Positive

- Human intent is made explicit and reviewable before implementation begins.
- The gap between "compliant with specification" and "converged with intent" becomes visible and governable.
- Visual, experiential, and emotional intent can be captured through references and constraints, not just prose requirements.
- Future homepage-style incidents are caught at the alignment checkpoint rather than after implementation.
- SYNTH's governance model extends from execution correctness to intent correctness.

### Negative

- Adds a new lifecycle phase, increasing friction for simple or well-understood tasks.
- Requires tooling to bind reference evidence (images, designs, examples) to the Alignment Contract.
- May slow down early Mission creation until operators and agents learn to produce strong Alignment Contracts.

### Neutral

- Does not replace existing Mission, Expedition, or Replay semantics.
- Does not eliminate Review Gates or Acceptance Gates.
- Program 027 becomes the pilot for both programs.

---

## Alternatives Considered

### 1. Fold refinement and alignment into EXP-PROGRAM-035

Rejected. EXP-PROGRAM-035 is about gates and execution control. Refinement and alignment are about pre-execution intent capture. Combining them would blur the architectural boundary and make the program too large.

### 2. Rely on stronger expedition DoDs to prevent drift

Rejected. Program 027 already had unusually strong DoDs and still drifted. Stronger specification without an alignment contract still leaves the agent free to interpret the specification in ways the human did not intend.

### 3. Require human sign-off on every Mission

Rejected. Human sign-off alone does not create a replayable, reference-bound artifact. The Alignment Contract makes the basis for approval explicit and governable.

### 4. Add an AI-based divergence detector now

Rejected for this ADR. Automated divergence detection is valuable but depends on the Alignment Contract existing first. The contract must be defined before detection tooling can be built.

---

## Related

- ADR-043 — AI Agent Validation Scope Boundary
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-027 — Mission Studio Homepage
- docs/governance.md
- docs/reference/public-vocabulary.md
