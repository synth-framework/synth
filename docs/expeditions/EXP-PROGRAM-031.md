# EXP-PROGRAM-031 — Architectural Convergence

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Program and expedition alignment with the evolving architectural baseline  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** High  
**Public Impact:** Low  
**Product Impact:** Medium  
**Execution Impact:** Low  

---

## Thesis

> **Governance should continuously ensure that implementation plans remain aligned with the evolving architectural vision. Architectural convergence prevents obsolete work, reduces implementation waste, and keeps the program portfolio synchronized with the canonical product model.**

SYNTH already governs correctness, determinism, evidence, contracts, and replay. This program adds a new governance axis: **architectural alignment**. Code can be correct, tests can pass, evidence can exist, and an implementation can still be architecturally obsolete. Architectural convergence detects and prevents that drift.

---

## Purpose

Establish Architectural Convergence as a permanent SYNTH capability that:

- Periodically reviews active Programs and Expeditions against the current architecture.
- Detects supersession, acceptance drift, and architecture drift.
- Produces deterministic outcomes: **Converged**, **Rewrite Required**, **Superseded**, or **Merge**.
- Blocks implementation on Programs that are not converged.
- Exposes portfolio health through a deterministic dashboard.

This program implements the constitutional rule defined in **ADR-039 — Architectural Convergence Review**.

---

## Mission

Make architectural alignment a measurable, replayable, and enforceable property of the SYNTH program lifecycle.

---

## Program Composition

```text
EXP-PROGRAM-031
Architectural Convergence
│
├── EXP-CONVERGENCE-001  Program Review Engine
│       Architecture Expedition
│       Define how Programs are evaluated against the current architectural baseline.
│
├── EXP-CONVERGENCE-002  Expedition Review
│       Architecture Expedition
│       Define how individual Expeditions are checked against terminology,
│       architecture, dependencies, and acceptance criteria.
│
├── EXP-CONVERGENCE-003  Program Dependency Graph
│       Architecture Expedition
│       Model dependencies and sequencing across the program portfolio.
│
├── EXP-CONVERGENCE-004  Supersession Detection
│       Architecture Expedition
│       Detect when a newer Program or Expedition replaces older work.
│
├── EXP-CONVERGENCE-005  Acceptance Drift Detection
│       Architecture Expedition
│       Detect outdated or misaligned acceptance criteria.
│
├── EXP-CONVERGENCE-006  Architecture Drift Detection
│       Architecture Expedition
│       Detect when Expeditions reference outdated concepts, vocabulary,
│       or implementation paths.
│
├── EXP-CONVERGENCE-007  Portfolio Dashboard
│       Product Expedition
│       Surface implementation progress, convergence scores, and recommendations.
│
└── EXP-CONVERGENCE-008  Governance Gate
        Architecture Expedition
        Enforce the Convergence Review gate before implementation begins.
```

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

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
| --- | --- |
| Defining convergence review semantics and outcomes | Modifying Protected Assets |
| Building review engines, dependency graphs, and drift detectors | Changing Program lifecycle semantics without ADR approval |
| Surfacing portfolio health and recommendations | Bypassing the Convergence Review gate |
| Recording convergence outcomes as governance evidence | Implementing convergence as a one-time manual checklist |
| Integrating with the event log and replay | Hardcoding subjective judgment into the engine |

### Hard Constraints

> **Convergence is continuous, not one-time.**
>
> **Convergence outcomes are deterministic and evidence-backed.**
>
> **No implementation proceeds without a Converged outcome.**
>
> **A Program can return to Convergence Review if it drifts.**

---

## Out of Scope

- Modifying the core Mission / Expedition lifecycle semantics.
- Modifying Replay or event model semantics.
- Implementing operator-specific optimizations (see EXP-PROGRAM-032).
- Implementing AI agent interoperability (see EXP-PROGRAM-026).

---

## Success Criteria

- Every active Program has a recorded Convergence Review outcome.
- A Program in **Rewrite Required** status cannot begin or continue implementation.
- Superseded work is archived and no longer scheduled.
- The portfolio dashboard accurately reflects implementation progress and convergence health.
- Convergence Review outcomes are replayable from the event log.
- No Protected Asset is modified.

---

## Definition of Done

- [ ] EXP-CONVERGENCE-001 completed and accepted.
- [ ] EXP-CONVERGENCE-002 completed and accepted.
- [ ] EXP-CONVERGENCE-003 completed and accepted.
- [ ] EXP-CONVERGENCE-004 completed and accepted.
- [ ] EXP-CONVERGENCE-005 completed and accepted.
- [ ] EXP-CONVERGENCE-006 completed and accepted.
- [ ] EXP-CONVERGENCE-007 completed and accepted.
- [ ] EXP-CONVERGENCE-008 completed and accepted.
- [ ] ADR-039 is accepted and referenced by the constitutional baseline.
- [ ] Convergence Review gate is enforced before new implementation work.
- [ ] `npm run govern` passes.

---

## Relationship to Other Work

- **ADR-039 — Architectural Convergence Review** provides the constitutional rule this program implements.
- **EXP-REVIEW-001 — Program Convergence Review** is the first execution of this capability.
- **EXP-PROGRAM-022–024, 026–030** are the first programs to be reviewed under this gate.

---

## Long-Term Vision

Every SYNTH Program is continuously aligned with the canonical architecture. Convergence is not a retrospective cleanup activity; it is a forward-looking governance capability that ensures the portfolio evolves coherently as SYNTH itself evolves.

