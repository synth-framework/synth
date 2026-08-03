# EXP-TASK-012 — Task Graph Planner Integration

> Make Program 030's validation planner consume the Program 034 task graph for task discovery, dependency resolution, and execution ordering.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034; EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Depends On:** EXP-TASK-001, EXP-TASK-002, EXP-TASK-003, EXP-PROGRAM-030  
**Blocks:** Program 034 implementation-phase acceptance

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

Program 030's validation planner currently discovers available work from `package.json` scripts and orders selected scripts with hardcoded heuristics. Program 034 now provides a canonical task registry and dependency graph. This expedition makes the planner consume that graph so that:

1. The planner discovers available validators from the task registry, not from npm scripts.
2. Selected tasks are ordered by the task graph's topological sort.
3. `synth validate` executes planned tasks through the task engine (`synth task run`), preserving dependency resolution.
4. The legacy `npm run <script>` path remains equivalent, satisfying the Program 034 acceptance gate.

---

## Goals

1. Load the task registry and build the task graph during validation planning.
2. Replace the script-discovery surface in the planner with task ids from the registry.
3. Replace the hardcoded `orderScripts` heuristic with `taskExecutionOrder` from `src/task/task-graph.ts`.
4. Execute the planned validations through `runTasks` from `src/task/task-runner.ts`.
5. Ensure `synth validate --full` still delegates to the full governance pipeline.
6. Add an acceptance test proving `synth task run govern` produces the same proof artifact as `npm run govern`.

---

## Acceptance Criteria

1. `buildValidationPlan` accepts task registry/graph input and produces a plan whose `run` order matches the task graph's topological order.
2. `synth validate` executes planned tasks via the task engine; `npm run` is no longer the execution path inside the validator.
3. `synth validate --dry-run` reports task ids and their resolved dependency order.
4. Existing `synth validate` behavior is preserved for documentation-only and protected-asset changes.
5. `tests/task-govern-equivalence.test.js` asserts that `synth task run govern` and `npm run govern` produce identical proof artifacts (or equivalent proof signatures).
6. `npm run build` succeeds and all existing validation tests pass.

---

## Out of Scope

- Removing npm scripts from `package.json`.
- Changing the Convergence Certification or ExecutionGate logic.
- Adding new task lifecycle states beyond `proposed`, `accepted`, `deprecated`, `removed`.
- Watch mode for `synth task run`.

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Related Documents

- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-PROGRAM-030 — Intelligent Governance Orchestration](EXP-PROGRAM-030.md)
- [EXP-TASK-001 — Task Schema and Registry](EXP-TASK-001.md)
- [EXP-TASK-002 — Task CLI](EXP-TASK-002.md)
- [EXP-TASK-003 — Task Execution CLI](EXP-TASK-003.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
- `src/validation/planner.ts`
- `src/task/task-graph.ts`
- `src/task/task-runner.ts`
