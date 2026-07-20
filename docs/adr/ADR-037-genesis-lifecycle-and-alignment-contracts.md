# ADR-037 — Genesis Lifecycle and Alignment Contracts

**Status:** Proposed  
**Date:** 2026-07-20  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, Mission Studio, Governance

---

## Context

SYNTH's lifecycle has historically begun at the Mission:

```text
Intent
  ↓
Mission
  ↓
Expedition
  ↓
Execution
  ↓
Evidence
```

This model is deterministic, replayable, and effective when the Mission artifact already captures the intended outcome with high fidelity. However, the Program 027 homepage incident demonstrated that a Mission can be well-specified and still fail to converge with human intent.

The Program 027 expeditions contained:

- explicit goals and DoDs
- design governance rules
- component and artifact catalogs
- runtime requirements
- projection contracts
- explicit anti-goals such as "no generic dashboard components"

Despite this, the implementation drifted toward a generic dashboard aesthetic. The agent was *compliant* with the specifications but not *converged* with the human intent. The specifications existed, but the validated transformation path from human intent to executable understanding was incomplete.

This exposed a new class of failure:

```text
Implementation conforms to specification

but

Implementation diverges from intent
```

The failure was not missing instructions. It was missing **validated understanding** before Mission creation.

EXP-PROGRAM-035 introduced Review, Refinement, and Acceptance Gates to govern execution correctness. EXP-PROGRAM-036 began addressing intent capture with the Intent Model and Refinement Layer. The time has come to make the pre-Mission layer explicit as a first-class architectural boundary: the **Genesis Layer**.

---

## Decision

Introduce a **Genesis Lifecycle** that precedes Mission creation. The Genesis Layer is responsible for transforming ambiguous human intent into an approved, executable understanding before any Mission is chartered.

The lifecycle becomes:

```text
                    Genesis Layer

Human Intent
      ↓
Intent Model
      ↓
Refinement Session
      ↓
Alignment Contract
      ↓
Reference Evidence Binding
      ↓
Divergence Gate
      ↓
Approved Interpretation
      ↓
Mission Creation
      ↓
                    Synthesis Layer

Expedition
      ↓
Implementation
      ↓
                    Governance Layer

Review Gate
      ↓
Acceptance Gate
      ↓
Convergence Certification
```

The Genesis Layer separates two distinct failure classes:

| Failure Class | Question | Governed By |
|---|---|---|
| Understanding failure | Did we understand what was wanted? | Genesis Layer (036) |
| Execution failure | Did we build what we agreed to build? | Review/Acceptance Gates (035) |

A Mission cannot be created until the Divergence Gate produces an `aligned` decision.

---

## New Concepts

### 1. Intent

The raw, often ambiguous, human expression of desire. Examples:

- "Build this homepage"
- "Make onboarding better"
- "Create a marketplace"
- "Improve the architecture"

Intent is not yet a contract. It is the input to the Genesis Layer.

### 2. Intent Model

The first structured artifact produced from raw intent. It captures:

- explicit objectives
- implicit objectives
- audience
- problem statement
- desired outcome
- non-goals
- forbidden interpretations
- allowed interpretations
- reference evidence
- confidence level
- unresolved ambiguity
- known unknowns

The Intent Model makes implicit assumptions explicit and surfaces ambiguity before it becomes a Mission.

### 3. Refinement Session

A clarification loop that transforms a draft Intent Model into a sufficient one. It generates questions based on gaps, records answers, and revises the model. A Refinement Session ends when the model reaches sufficient confidence or is explicitly marked insufficient/superseded.

### 4. Alignment Contract

The formal agreement between operator and SYNTH that the captured understanding accurately represents the intended outcome. It is the single most important artifact introduced by this ADR.

The Alignment Contract contains:

```text
Intent Summary
Expected Experience
Required Properties
Forbidden Properties
Allowed Variation
Visual References
Behavioral References
Functional Expectations
Technical Constraints
Success Criteria
Explicit Non-Requirements
Reference Evidence
Approval Record
```

The Alignment Contract is the bridge between human understanding and machine execution. It is the artifact against which implementation is reviewed and convergence is certified.

### 5. Reference Evidence Binding

Humans communicate intent through artifacts that are not prose: images, sketches, prototypes, screenshots, existing products, CLI recordings, design boards. Reference Evidence Binding formalizes the relationship between a requirement and the artifact that justifies it.

Example transformation:

```text
Requirement:
"Make homepage like this design"

becomes:

Intent:
Homepage is Mission Studio experience

Evidence:
board-3-homepage-design.png

Interpretation:
Workspace-first application shell

Forbidden interpretations:
Marketing landing page
Generic SaaS dashboard
Chat interface
```

### 6. Divergence Gate

The governance checkpoint that occurs before Mission creation. It asks:

> "Do we agree that the Alignment Contract accurately captures the intended outcome?"

Possible decisions:

- `aligned` — Mission creation permitted
- `revision_required` — refine understanding
- `rejected` — intent cannot be pursued as stated
- `superseded` — replaced by a new intent

A Mission cannot start unless the Divergence Gate is `aligned`.

### 7. Convergence Certification

After implementation, acceptance, and review, Convergence Certification asks:

> "Does the final outcome represent the intended outcome?"

It compares the original Alignment Contract, implementation evidence, and final result, producing a Convergence Report.

---

## Relationship to Existing Work

### EXP-PROGRAM-035 — Intent Refinement & Review Governance

035 governs execution correctness. It answers: *"Did we build what we agreed to build?"* It provides the Review Gate, Acceptance Gate, revision loop, and execution-control mechanisms that the Divergence Gate extends.

### EXP-PROGRAM-036 — Intent Refinement & Alignment Governance

036 is redefined by this ADR as the program that introduces the Genesis Layer. It answers: *"Did we understand what was actually intended?"* It delivers the Intent Model, Refinement Session, Alignment Contract, Reference Evidence Binding, Divergence Gate, and Convergence Certification.

### EXP-PROGRAM-027 — Mission Studio Homepage

Program 027 remains paused and becomes the first proving ground for the Genesis Layer. Before homepage implementation resumes, Program 027 must produce:

```text
Intent Model
      ↓
Refinement Session
      ↓
Alignment Contract
      ↓
Reference Evidence Binding
      ↓
Divergence Gate: aligned
      ↓
Mission
```

### EXP-PROGRAM-022 — Genesis

The existing Genesis program provides the lifecycle that the Genesis Layer extends. Genesis materializes the system; the Genesis Layer materializes understanding.

---

## Consequences

### Positive

- Human intent is made explicit, reviewable, and governable before Mission creation.
- The failure mode "compliant but not converged" becomes visible and preventable.
- Visual, experiential, and emotional intent can be captured through references and constraints.
- SYNTH gains a clean three-layer architecture: Genesis, Synthesis, Governance.
- Future homepage-style incidents are caught at the alignment checkpoint rather than after implementation.

### Negative

- Adds a new lifecycle phase, increasing friction for simple or well-understood tasks.
- Requires discipline from operators and agents to produce strong Alignment Contracts.
- May slow down early Mission creation until the new workflow is internalized.

### Neutral

- Does not replace existing Mission, Expedition, or Replay semantics.
- Does not eliminate Review Gates or Acceptance Gates.
- Program 027 becomes the pilot for the Genesis Layer.

---

## Alternatives Considered

### 1. Continue without a Genesis Layer

Rejected. The homepage incident proves that strong expedition specifications are insufficient to prevent semantic drift. A pre-Mission alignment layer is necessary.

### 2. Fold the Genesis Layer into EXP-PROGRAM-035

Rejected. 035 is about execution correctness and gates; the Genesis Layer is about understanding and alignment. Combining them would blur a critical architectural boundary.

### 3. Require human sign-off on every Mission

Rejected. Human sign-off alone does not create a replayable, reference-bound artifact. The Alignment Contract makes the basis for approval explicit and governable.

### 4. Add an AI-based divergence detector before the Alignment Contract

Rejected. Automated divergence detection is valuable but depends on the Alignment Contract existing first. The contract must be defined before detection tooling can be built.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-PROGRAM-027 — Mission Studio Homepage
- EXP-PROGRAM-022 — Genesis
- docs/governance.md
- docs/reference/public-vocabulary.md
