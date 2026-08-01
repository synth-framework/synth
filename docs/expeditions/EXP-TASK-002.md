# EXP-TASK-002 — Task CLI

> Implement the read-only and diagnostic `synth task` subcommands that make the canonical task registry discoverable and explainable for operators and agents.

**Status:** Draft  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034  
**Depends On:** EXP-TASK-001, EXP-GRAPH-001, EXP-REVIEW-002  
**Blocks:** EXP-TASK-005 (impact-aware execution), TASK-006 (npm adapter), TASK-007 (CI adapter)

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

`EXP-TASK-001` produced a canonical task schema and registry. This expedition exposes that registry through the CLI so operators can list, inspect, visualize, and diagnose tasks without editing derived state or running tasks.

This is intentionally **read-only / diagnostic only**. Task execution (`synth task run`) and migration from npm scripts are out of scope; they depend on the CLI surface defined here.

---

## Goals

1. Add `task` as a first-class CLI namespace.
2. Implement `synth task list [--group <group>] [--tag <tag>]`.
3. Implement `synth task explain <id>`.
4. Implement `synth task graph [--format dot|json|mermaid]`.
5. Implement `synth task doctor`.
6. Keep all output structured JSON by default, with `--human` prose support where appropriate.
7. Do not implement task execution, `synth task run`, CI adapters, or npm-script migration.

---

## Acceptance Criteria

- `synth task --help` returns the namespace help.
- `synth task list` returns all tasks from the registry with id, description, group, and tags.
- `synth task list --group <group>` filters by group.
- `synth task list --tag <tag>` filters by tag.
- `synth task explain <id>` returns full task metadata plus downstream consumers and transitive dependency count.
- `synth task graph --format json` returns the task graph as nodes and edges.
- `synth task graph --format dot` returns a Graphviz DOT representation.
- `synth task graph --format mermaid` returns a Mermaid flowchart.
- `synth task doctor` detects and reports: duplicate ids (registry load fails fast, so reported as load error), missing dependencies, circular dependencies, orphaned tasks, and deprecated tasks.
- Unknown task ids produce clear `TaskNotFound` errors.
- Tests cover list filtering, explain output, graph formats, and doctor diagnostics.

---

## Out of Scope

- `synth task run`, `synth task affected`, `synth task generate`.
- CI adapter migration (`TASK-007`).
- npm-script migration (`TASK-011`).
- Impact-aware execution (`TASK-005`).
- Modifying canonical-state.json, AGENTS.md, or other derived state.

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
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
