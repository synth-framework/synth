# EXP-REVIEW-002 — Second Convergence Review of Program 034

> Re-evaluate `EXP-PROGRAM-034 — Task Orchestration Engine` under ADR-039 after it completed the required design-phase rewrite: shared dependency-graph primitive adopted, `TASK-004` rewritten, acceptance criteria split, and `TASK-007` deferred.

**Status:** Completed — Outcome **CONVERGED** at the design level  
**Kind:** Review Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-031 — Architectural Convergence  
**Authority:** ADR-039 — Architectural Convergence Review  
**Depends On:** EXP-REVIEW-001, EXP-GRAPH-001, `EXP-PROGRAM-034` design-phase actions  
**Blocks:** `EXP-PROGRAM-034` leaving design phase
**Completed:** 2026-08-03

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

`EXP-PROGRAM-034` received **REWRITE REQUIRED** in `EXP-REVIEW-001`. The program has now:

1. Adopted the shared dependency-graph primitive (`src/graph/dependency-graph.ts`).
2. Rewritten `TASK-004` to build the task graph on that primitive (`src/task/task-graph.ts`).
3. Split its Definition of Done into design-phase and implementation-phase deliverables.
4. Explicitly deferred `TASK-007` (CI Orchestration Adapter) until the task engine is accepted.

This expedition executes the second Convergence Review and records whether the program is now **CONVERGED** at the design level or requires further rewrite.

---

## Scope

Review only the design-phase state of `EXP-PROGRAM-034`. Do not review implementation progress for `synth task run`, npm-script migration, or CI adapters — those are implementation-phase work gated by this review.

---

## Review Questions (ADR-039)

1. Does the program still duplicate graph infrastructure with `EXP-PROGRAM-031`?
2. Are the task schema and dependency model consistent with the canonical event model and public vocabulary?
3. Is the boundary between design-phase and implementation-phase deliverables clear?
4. Are deferred items (`TASK-007`, npm-script migration, CI adapters) explicitly excluded from design approval?
5. Does the shared primitive contract cover the operations `TASK-004` needs?
6. Is the risk register updated to reflect the current state?

---

## Evidence

- `src/graph/dependency-graph.ts` — shared primitive implementation.
- `src/task/task-graph.ts` — `TASK-004` consuming the primitive.
- `tests/graph-dependency-primitive.test.js` — primitive contract tests.
- `tests/task-graph.test.js` — task graph tests.
- `docs/expeditions/EXP-PROGRAM-034.md` — updated Definition of Done and design-phase goals.

---

## Expected Outcome

**CONVERGED** at the design level, contingent on:

- No remaining duplicate graph engine risk.
- Design-phase deliverables clearly separated from implementation-phase deliverables.
- `TASK-007` and CI migration remain deferred.

If any question fails, the outcome is **REWRITE REQUIRED** with specific actions.

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Related documents

- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-PROGRAM-031 — Architectural Convergence](EXP-PROGRAM-031.md)
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [docs/governance/convergence-review-043-034.md](../governance/convergence-review-043-034.md)
- [docs/design/shared-dependency-graph.md](../design/shared-dependency-graph.md)
