# ADR-039 — Architectural Convergence Review

**Status:** Accepted  
**Date:** 2026-07-19  
**Deciders:** EXP-PROGRAM-031 — Architectural Convergence  
**Authority:** Synth Architectural Constitution  

---

## Context

SYNTH is an evolving platform. Foundational concepts such as Genesis, Discovery, Mission, Expedition, Governance, Replay, Homepage, Repository Governance, and AI Interoperability have matured faster than the programs chartered to implement them. As a result, active programs and their expeditions may describe objectives, acceptance criteria, and implementation paths that no longer reflect the current architectural baseline.

Completing outdated plans increases technical debt, produces obsolete artifacts, and reduces governance quality. A mechanism is needed to ensure that implementation remains subordinate to architecture.

## Decision

All active Programs, Expeditions, and long-lived governance artifacts MUST periodically undergo an **Architectural Convergence Review** before additional implementation proceeds.

A Convergence Review determines whether an active Program or Expedition still represents the desired architecture. It is a governed gate, not an ad hoc discussion.

## Principle

> **Implementation is subordinate to architecture.**

An unfinished Program is **not automatically valid** simply because it is unfinished. It must remain convergent with the current architectural baseline. If it diverges, implementation pauses until the Program or Expedition is rewritten, merged, archived, or explicitly accepted as converged.

## Required Review

Every active Program must answer the following questions before implementation continues:

- Is the charter still valid?
- Are the acceptance criteria still correct?
- Have newer Programs superseded any objectives?
- Do remaining Expeditions still represent the preferred implementation?
- Should any Expeditions be rewritten?
- Should any Expeditions move to another Program?
- Should the Program be archived?

## Outcomes

Each review produces exactly one of the following outcomes:

| Outcome | Meaning |
| --- | --- |
| **CONVERGED** | The Program or Expedition aligns with the current architecture. Implementation may continue. |
| **REWRITE REQUIRED** | The objective is still valid, but the charter or expeditions must be updated before implementation continues. |
| **SUPERSEDED** | A newer Program or Expedition replaces this work. The artifact is archived. |
| **MERGE** | Ownership of the work moves to another Program. |

## Governance Rule

No Program may continue implementation while in **Rewrite Required** status.

A Program in **Rewrite Required** must:

1. Update its charter and affected Expeditions to reflect the current architecture.
2. Undergo a subsequent Convergence Review.
3. Receive a **Converged** outcome before implementation resumes.

## State Transition

```text
Proposed
    ↓
Approved
    ↓
Active
    ↓
Convergence Review
    ↓
Converged ✓
    ↓
Implementation
    ↓
Accepted
    ↓
Completed
```

If a Program later falls out of alignment with the architecture, it transitions back to **Convergence Review** before further implementation.

## Consequences

### Positive

- Prevents implementation of obsolete or architecturally misaligned expeditions.
- Keeps the program portfolio synchronized with the canonical product model.
- Turns architectural alignment into a measurable, governable property.
- Reduces wasted work and accidental technical debt.

### Negative

- Adds a governance gate that can pause active work.
- Requires ongoing maintenance of the architectural baseline and review process.
- May delay implementation while charters are rewritten.

## Proof Impact

- **P1 — Constitutional proofs:** This ADR becomes part of the constitutional baseline.
- **P2 — Governance proofs:** Convergence Review outcomes become evidence attached to Program lifecycle events.
- **P3 — Replay proofs:** Replay must reconstruct Program lifecycle states, including Convergence Review transitions.

## Kernel Impact

None. This ADR governs program lifecycle metadata, not runtime kernel components.

## Constitutional Baseline Impact

Requires updating `docs/architecture/constitutional-baseline.md` to include the Convergence Review gate in the Program lifecycle. Increment the minor version of the Program Lifecycle provision.

## Related

- `docs/expeditions/EXP-PROGRAM-031.md` — Architectural Convergence Program.
- `docs/expeditions/EXP-REVIEW-001.md` — First Program Convergence Review.
- `docs/architecture/constitutional-baseline.md` — Constitutional baseline.

