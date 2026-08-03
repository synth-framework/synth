# Convergence Review Record — Program 043 & Program 034

**Review ID:** EXP-REVIEW-001  
**Authority:** ADR-039 — Architectural Convergence Review  
**Date:** 2026-08-03  
**Reviewer:** synth-cli/operator  
**Programs reviewed:** EXP-PROGRAM-043, EXP-PROGRAM-034  
**Outcome:** EXP-PROGRAM-043 **CONVERGED** (all workstreams complete); EXP-PROGRAM-034 **REWRITE REQUIRED** at design level  

---

## Program summaries

### EXP-PROGRAM-043 — Agent Onboarding & Operator Experience

All workstreams are implemented, reviewed, and merged:

- A: Guided first-contact flow.
- B: Actionable CLI output (`--dry-run`, `--human`).
- C: Capability transparency (`synth capabilities`) and repository adapter surface (`EXP-ADP-001`).
- D: Derived-state protection (`EXP-GUARD-001`), expedition scope (`EXP-SCOPE-001`), and completion gates (`EXP-GATE-014`).
- E: Evidence capture (`EXP-EVIDENCE-001`), event-log query (`EXP-EVENTLOG-001`), and AGENTS.md sync (`EXP-AGENTS-001`).
- F: Agent identity (`EXP-IDENTITY-001`), event signing (`EXP-SIGN-001`), two-party approval (`EXP-APPROVAL-001`), and git snapshots (`EXP-GIT-001`).

### EXP-PROGRAM-034 — Task Orchestration Engine

Still in design phase. Charter defines task model, registry, CLI, dependency graph, impact-aware execution, npm adapter, CI adapter, task groups, explanation, doctor, and migration. Depends on Program 030 and ADR-044. The design currently risks building a duplicate graph engine; it must adopt the shared dependency-graph primitive defined in `docs/design/shared-dependency-graph.md` before leaving design phase.

---

## ADR-039 questionnaire

### 1. Is the charter still valid?

- **043:** Yes. The original problem statement — onboarding friction, missing capability transparency, agents completing without evidence — is still valid and the implemented workstreams address it.
- **034:** Yes, but the design must be narrowed. The full program is too large to implement in one pass; the immediate need is the shared graph primitive and task model, not CI migration.

### 2. Are the acceptance criteria still correct?

- **043:** Yes. The existing acceptance criteria map to merged PRs and passing tests.
- **034:** Partially. The criteria assume a complete engine replacement. They should be split into design-phase acceptance (schema + primitive contract) and implementation-phase acceptance.

### 3. Have newer programs superseded any objectives?

- No newer program supersedes 043 or 034. However, 034's dependency-graph objective overlaps with Program 031. The overlap must be resolved by a shared primitive owned jointly.

### 4. Do remaining expeditions still represent the preferred implementation?

- **043:** Workstream F expeditions (`EXP-IDENTITY-001`, `EXP-SIGN-001`, `EXP-APPROVAL-001`, `EXP-GIT-001`) are still the right direction but depend on the guardrails from Workstream D being proven in production.
- **034:** `TASK-004` (Dependency Graph) must be rewritten to consume the shared primitive defined in `docs/design/shared-dependency-graph.md` rather than inventing a new graph engine.

### 5. Should any expeditions be rewritten?

- **034/TASK-004** must be rewritten to reference the shared dependency-graph primitive.
- **034/TASK-007** (CI Orchestration Adapter) should be deferred until the task engine is accepted.

### 6. Should any expeditions move to another program?

- No. The shared graph primitive will be a joint deliverable of 031 and 034, tracked under Program 031's gating function.

### 7. Should the program be archived?

- Neither program should be archived.

---

## Outcomes

| Program | Outcome | Rationale | Required actions |
|---|---|---|---|
| EXP-PROGRAM-043 | **CONVERGED** (all workstreams complete) | Workstreams A–F align with the current architecture and have passing tests/evidence. | Continue to closure under the existing program charter; any new operator-experience work must pass ADR-039 review before implementation. |
| EXP-PROGRAM-034 | **REWRITE REQUIRED** | Design phase is valid but `TASK-004` would duplicate graph work; scope must narrow and adopt the shared primitive. | 1. Adopt the primitive defined in `docs/design/shared-dependency-graph.md`. 2. Rewrite `TASK-004` to consume the shared primitive. 3. Split acceptance criteria into design-phase and implementation-phase deliverables. 4. Defer CI migration (`TASK-007`) until the task engine is accepted. 5. Re-enter Convergence Review before leaving design phase. |

---

## Shared dependency-graph primitive

See `docs/design/shared-dependency-graph.md` for the full contract.

Summary:

- A generic DAG primitive extracted from the existing `src/domain/graph.ts` concepts.
- Provides `topologicalSort`, `detectCycles`, `reachableFrom`, and `isAcyclic`.
- 034 consumes it for task dependencies.
- 031 consumes it for program/expedition dependency graphs.
- Implementation is deferred to a follow-up expedition after both programs accept the contract.

---

## Next steps

1. Update Program 031 tracker to Active and record this review.
2. Update Program 043 tracker with CONVERGED outcome.
3. Update Program 034 tracker with REWRITE REQUIRED outcome and required alignment.
4. Implement the shared dependency-graph primitive in a follow-up expedition.
5. Re-review Program 034 before it leaves design phase.
