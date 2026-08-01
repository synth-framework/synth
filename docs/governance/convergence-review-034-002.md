# EXP-REVIEW-002 — Second Convergence Review of Program 034

**Authority:** ADR-039 — Architectural Convergence Review  
**Review expedition:** [EXP-REVIEW-002](../expeditions/EXP-REVIEW-002.md)  
**Program reviewed:** [EXP-PROGRAM-034 — Task Orchestration Engine](../expeditions/EXP-PROGRAM-034.md)  
**Date:** 2026-08-01  
**Outcome:** **CONVERGED** at the design level

---

## Previous review

[EXP-REVIEW-001](convergence-review-043-034.md) concluded **REWRITE REQUIRED** for `EXP-PROGRAM-034` and required the program to:

1. Adopt the shared dependency-graph primitive.
2. Rewrite `TASK-004` to consume that primitive.
3. Split acceptance criteria into design-phase and implementation-phase deliverables.
4. Defer `TASK-007` (CI Orchestration Adapter).
5. Re-enter Convergence Review before leaving design phase.

## ADR-039 questionnaire

| # | Question | Finding |
| --- | --- | --- |
| 1 | Does the program still duplicate graph infrastructure with `EXP-PROGRAM-031`? | No. `TASK-004` is implemented in `src/task/task-graph.ts` and imports `buildTaskGraph`, `detectCycles`, `topologicalSort`, and `reachableFrom` from `src/graph/dependency-graph.ts`. |
| 2 | Are the task schema and dependency model consistent with the canonical event model and public vocabulary? | Yes. The task schema is a deterministic, declarative artifact. Dependencies are expressed as ids, matching the graph primitive's edge model. No event-model or replay semantics are modified. |
| 3 | Is the boundary between design-phase and implementation-phase deliverables clear? | Yes. The Program 034 tracker now has separate `### Design-phase deliverables` and `### Implementation-phase deliverables` sections. |
| 4 | Are deferred items explicitly excluded from design approval? | Yes. `TASK-007` (CI Orchestration Adapter), npm-script migration, and `synth task run` implementation remain implementation-phase work. |
| 5 | Does the shared primitive contract cover the operations `TASK-004` needs? | Yes. `detectCycles`, `topologicalSort`, and reverse reachability for `findAffectedTasks` are all supported by the primitive. |
| 6 | Is the risk register updated? | Yes. The duplicate-graph-engine risk now references `EXP-GRAPH-001` as the mitigation. |

## Required actions before implementation

1. Keep `TASK-007`, CI migration, and npm-script migration out of design-phase work.
2. Produce and accept the task schema/registry design (`TASK-001`, `TASK-002`).
3. Begin implementation only after this review record is merged and the program tracker is updated.

## Caveats

- This review approves the **design-phase** state only.
- Any attempt to implement `synth task run`, CI adapters, or npm-script migration before the task schema/registry design is accepted must be rejected by the Convergence gate.
- `EXP-PROGRAM-034` must undergo a third review if the implementation phase materially changes the dependency model or reintroduces duplicate graph infrastructure.

## Evidence

- `src/graph/dependency-graph.ts`
- `src/task/task-graph.ts`
- `tests/graph-dependency-primitive.test.js`
- `tests/task-graph.test.js`
- `docs/expeditions/EXP-PROGRAM-034.md`
