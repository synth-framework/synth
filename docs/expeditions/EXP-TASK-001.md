# EXP-TASK-001 — Task Schema and Registry

> Formalize the SYNTH task schema and implement a discoverable, validated task registry that feeds the task graph and the future `synth task` CLI.

**Status:** Draft  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034  
**Depends On:** EXP-GRAPH-001, EXP-REVIEW-002  
**Blocks:** `synth task` CLI implementation, Program 030 planner task consumption

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

`EXP-PROGRAM-034` has a de facto task schema in `data/tasks/*.task.json` and a graph engine in `src/task/task-graph.ts`. This expedition makes the schema explicit, versioned, and validated, and turns task discovery into a reusable registry so the CLI and planner can consume tasks consistently.

---

## Goals

1. Define a canonical JSON Schema for `*.task.json` files.
2. Implement TypeScript types and runtime validation for the schema.
3. Implement a task registry that discovers tasks from:
   - `data/tasks/*.task.json`
   - `.synth/tasks/*.task.json`
   - Capability registrations (future extension point)
4. Enforce uniqueness, validate dependency references, and detect duplicates.
5. Produce the registry as the input to `buildTaskGraph`.
6. Do not implement task execution or CLI commands.

---

## Acceptance Criteria

- `src/task/task-schema.ts` exports a `Task` type and a `validateTask` function.
- `src/task/task-registry.ts` exports a `TaskRegistry` class/value and a `loadTaskRegistry(dirs)` function.
- Invalid task files produce clear, actionable errors.
- Duplicate task ids are rejected.
- Unknown task dependencies are rejected at registry load time.
- The registry integrates cleanly with `src/task/task-graph.ts`.
- Tests cover valid tasks, invalid tasks, duplicates, and missing dependencies.

---

## Out of Scope

- Task execution (`synth task run`).
- CLI command surface (`synth task list`, `synth task explain`).
- CI adapter migration (`TASK-007`).
- npm-script migration (`TASK-011`).
- Capability-based task registration (extension point only).

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Related documents

- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
- [docs/design/shared-dependency-graph.md](../design/shared-dependency-graph.md)
