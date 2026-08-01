# EXP-TASK-003 — Task Execution CLI

> Implement the execution surface of the SYNTH task engine: run tasks with dependency resolution, discover affected tasks from changes, and generate new task files from templates.

**Status:** Draft  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034  
**Depends On:** EXP-TASK-001, EXP-TASK-002, EXP-GRAPH-001, EXP-REVIEW-002  
**Blocks:** TASK-006 (npm adapter), TASK-007 (CI adapter), TASK-011 (npm-script migration)

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

`EXP-TASK-002` made tasks discoverable and explainable. This expedition makes them executable. It is the final CLI surface Program 034 needs before `package.json` scripts can be migrated to the canonical task model.

---

## Goals

1. Implement a deterministic task runner that resolves dependencies and executes them in topological order.
2. Add `synth task run <id|group> [--dry-run]`.
3. Add `synth task affected [--task <id>]... [--since <ref>]`.
4. Add `synth task generate <id> --group <group> [--command <cmd>]`.
5. Support group execution by running every task in a group (sequentially for this charter).
6. Produce structured, machine-readable output for agent consumption.
7. Leave `--watch` as a documented future extension point; do not implement it here.

---

## Acceptance Criteria

- `synth task run <id>` executes the task and its transitive dependencies in order.
- `synth task run <id> --dry-run` returns the planned execution order without running commands.
- `synth task run <group>` runs all tasks in the group (no dependency deduplication required beyond per-task ordering).
- Failed commands stop execution and report the failing task with exit code.
- `synth task affected --task build --task docs` returns the set of tasks transitively affected by changes to the named tasks.
- `synth task generate <id> --group <group>` writes a valid `.task.json` file to `data/tasks/`.
- Generate refuses to overwrite an existing task file unless `--force` is passed.
- Tests cover successful execution, dry-run, failure handling, affected-task discovery, and generate.

---

## Out of Scope

- `--watch` mode (extension point only).
- Parallel execution and concurrency limits (defer to execution engine hardening).
- npm-script migration (`TASK-011`).
- CI adapter (`TASK-007`).
- Integration with Program 030's planner/fingerprint cache (`TASK-005` overlap; this charter provides the CLI, not the planner).

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
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
