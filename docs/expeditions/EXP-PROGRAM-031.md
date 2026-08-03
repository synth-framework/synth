# EXP-PROGRAM-031 — Architectural Convergence

**Status:** Active  
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
├── EXP-REVIEW-001       First Convergence Review of Program 043 and Program 034
│       Review Expedition
│       Execute ADR-039 review, record outcomes, define shared dependency-graph primitive.
│
├── EXP-GRAPH-001        Shared Dependency-Graph Primitive
│       Architecture Expedition — Completed
│       Implement the generic DAG primitive consumed by 031 and 034.
│
├── EXP-REVIEW-002       Second Convergence Review of Program 034
│       Review Expedition — Completed (CONVERGED)
│       Re-evaluate Program 034 after TASK-004 rewrite and design-phase cleanup.
│
├── EXP-REVIEW-003       Third Convergence Review of Program 043
│       Review Expedition — Completed (CONVERGED)
│       Re-evaluate Program 043 after Workstreams A–E merge and 034 task-engine implementation.
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

## Current Recommendation

**Activate narrowly as a gating function.** The ADR is already accepted; the program itself is still Proposed. Do not try to build the full portfolio dashboard, supersession detector, or automated drift monitor yet.

**First milestone (completed):**

1. [x] Run a convergence review of `EXP-PROGRAM-043` before it begins implementation.
   - Recorded in `docs/governance/convergence-review-043-034.md`.
2. [x] Run a design review of `EXP-PROGRAM-034` before it leaves the design phase.
   - Outcome: REWRITE REQUIRED; adopt `docs/design/shared-dependency-graph.md` before implementation.
3. [x] Define the shared dependency-graph primitive that both 034 and 031 will use.
   - Contract: `docs/design/shared-dependency-graph.md`.

**Second milestone (completed):**

1. [x] Implement the shared dependency-graph primitive in `EXP-GRAPH-001`.
2. [x] Refactor `src/domain/graph.ts` to consume the primitive where possible.
3. [x] Update `EXP-PROGRAM-034/TASK-004` to use the primitive rather than building a separate engine.
4. [x] Re-enter Convergence Review for `EXP-PROGRAM-034` before it leaves design phase (`EXP-REVIEW-002`).

**Third milestone (in progress):**

1. [x] Re-enter Convergence Review for `EXP-PROGRAM-043` after Workstreams A–E merge and 034 task-engine implementation (`EXP-REVIEW-003`).
2. [ ] Implement the Program 030 planner's consumption of the task graph — depends on `EXP-PROGRAM-034/TASK-004` and the shared dependency-graph primitive.
3. [ ] Align with `EXP-PROGRAM-034` on the `synth task` CLI surface and acceptance gate before Program 030 integration.
4. [ ] Build portfolio dependency graph for Program 031 (`EXP-CONVERGENCE-003`) on top of the shared primitive.
5. [ ] Review Program 043 Phase 4 (Workstream F — agent identity and trust) under ADR-039 before it begins implementation; Phase 4 is downstream of this milestone.

> **Sequencing note:** `EXP-ONBOARD-002` has merged, so Program 043 already consumes the 034 task engine. Program 031's next step is to ensure Program 030 can consume the same task graph without duplicating graph infrastructure, then to evaluate 043 Phase 4 when its charters are ready.

**Review records:**
- `docs/governance/convergence-review-043-034.md` — EXP-REVIEW-001
- `docs/governance/convergence-review-034-002.md` — EXP-REVIEW-002
- `docs/governance/convergence-review-043-003.md` — EXP-REVIEW-003
**Shared primitive contract:** `docs/design/shared-dependency-graph.md`  
**Implementation charter:** `docs/expeditions/EXP-GRAPH-001.md`

**Deferred:** full supersession detection, acceptance-drift dashboard, and automated portfolio health until after 034 and 043 are moving.

**Caveat:** do not let 034 and 031 build independent graph engines. 034 needs a task dependency graph; 031 needs a program/expedition dependency graph. They share the generic graph primitive defined in `docs/design/shared-dependency-graph.md` and implemented in `EXP-GRAPH-001` (`src/graph/dependency-graph.ts`). Any extension to the primitive must be jointly reviewed to avoid divergence.

**Why this ordering:** architecture oversight is needed most when the next two programs (043 and 034) are about to touch the CLI surface and the build pipeline. A lightweight 031 gate now prevents duplicate work and divergence later.

---

## Relationship to Other Work

- **ADR-039 — Architectural Convergence Review** provides the constitutional rule this program implements.
- **EXP-REVIEW-001 — First Convergence Review of Program 043 and Program 034** is the first execution of this capability.
- **EXP-REVIEW-003 — Third Convergence Review of Program 043** records the post-implementation convergence outcome and the Phase 4 (Workstream F) gate.
- **EXP-PROGRAM-043** and **EXP-PROGRAM-034** are the first programs reviewed under this gate.
- **EXP-ONBOARD-002** has merged; Program 043 now consumes the `EXP-PROGRAM-034` task engine for first-contact onboarding.
- **EXP-PROGRAM-034** shares the dependency-graph primitive contract with this program; both consume `docs/design/shared-dependency-graph.md` and `EXP-GRAPH-001` rather than building separate graph engines.

---

## Long-Term Vision

Every SYNTH Program is continuously aligned with the canonical architecture. Convergence is not a retrospective cleanup activity; it is a forward-looking governance capability that ensures the portfolio evolves coherently as SYNTH itself evolves.

