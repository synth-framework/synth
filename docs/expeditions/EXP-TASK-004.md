# EXP-TASK-004 — npm Script Migration

> Inventory every `npm run` script in `package.json` and produce a corresponding canonical task definition in `data/tasks/*.task.json`, so the task engine can replace npm as the source of truth for execution.

**Status:** Draft  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034  
**Depends On:** EXP-TASK-001, EXP-TASK-002, EXP-TASK-003, EXP-GRAPH-001, EXP-REVIEW-002  
**Blocks:** TASK-006 (npm adapter), TASK-007 (CI adapter)

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

`EXP-TASK-003` made tasks executable. This expedition populates the task registry with definitions for every existing npm script so operators can run `synth task run <script>` as a drop-in replacement for `npm run <script>`.

---

## Goals

1. Inventory all scripts in `package.json`.
2. Create one `data/tasks/<script-name>.task.json` file per script.
3. Assign each task to a canonical group:
   - `build`
   - `runtime`
   - `documentation`
   - `installer`
   - `governance`
   - `discovery`
   - `environment`
   - `certification`
   - `proof`
   - `release`
   - `distribution`
   - `ai`
4. Declare obvious dependencies (e.g., `govern` depends on `build`).
5. Keep `package.json` untouched in this charter.
6. Add a regression test that fails if any npm script lacks a matching task.

---

## Acceptance Criteria

- Every script in `package.json` has a matching `data/tasks/<name>.task.json` file.
- All generated task files pass `validateTask`.
- `synth task doctor` reports zero critical issues.
- `synth task list` includes every npm script.
- A test asserts 1:1 coverage between npm scripts and task definitions.
- Legacy npm scripts are marked `lifecycle: deprecated` only after the adapter migration; for now they remain `accepted`.

---

## Out of Scope

- Modifying `package.json` scripts.
- CI adapter migration.
- Removing or deprecating npm scripts.
- Parallel execution or concurrency tuning.
- Impact-aware scheduling (Program 030 integration).

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Related documents

- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-TASK-001 — Task Schema and Registry](EXP-TASK-001.md)
- [EXP-TASK-002 — Task CLI](EXP-TASK-002.md)
- [EXP-TASK-003 — Task Execution CLI](EXP-TASK-003.md)
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
