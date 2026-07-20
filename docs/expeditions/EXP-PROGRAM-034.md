# EXP-PROGRAM-034 — Task Orchestration Engine

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** ADR-044 — External Build Systems Are Adapters  
**Scope:** Replace static npm script orchestration with a canonical, governed task model  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** High

---

## Thesis

> **SYNTH implements governance orchestration, but `package.json` is still acting as the orchestration engine.**

Program 030 introduced an intelligent governance planner that reasons about repository impact, artifact classes, and validation dependencies. That planner currently invokes npm scripts. npm is an adapter in the tooling ecosystem; it should not be the source of truth for how SYNTH executes its own work.

This program creates a canonical **Task Orchestration Engine** that owns the execution model. npm, pnpm, Bun, cargo, make, Bazel, GitHub Actions, and other systems become thin front ends that delegate to the same engine.

---

## Purpose

- Make tasks first-class governed artifacts.
- Replace the ever-growing `package.json` script registry with a discoverable task model.
- Provide dependency-aware, impact-aware, explainable task execution.
- Enable CI to delegate orchestration to SYNTH rather than duplicating npm script knowledge.
- Feed Program 030's planner with a canonical task graph.

---

## Core Abstraction — Task

> **A Task is a deterministic, declarative unit of work with metadata, dependencies, grouping, tags, and execution semantics.**

```text
Task
  ├── id
  ├── description
  ├── command
  ├── group
  ├── dependsOn
  ├── tags
  ├── estimatedDurationMs
  ├── capabilities
  └── requiredBy
```

Tasks are immutable artifacts. They may be defined as JSON files, derived from convention-based metadata in code, or registered by capabilities.

---

## Deliverables

### TASK-001 — Task Model

Define the canonical task schema and lifecycle states:

- `proposed`
- `accepted`
- `deprecated`
- `removed`

Tasks carry:

- `id` — stable identifier
- `description` — human-readable purpose
- `command` — executable command or capability invocation
- `group` — namespace (e.g. `runtime`, `documentation`, `governance`)
- `dependsOn` — upstream task ids
- `tags` — searchable classifications
- `estimatedDurationMs` — planning input
- `capabilities` — required runtime capabilities

### TASK-002 — Task Registry

Implement discovery from:

- `.synth/tasks/*.task.json`
- `data/tasks/*.task.json`
- Test and script metadata exports
- Capability registrations

Enforce uniqueness, validate dependency references, and detect duplicates.

### TASK-003 — Task CLI

Implement:

```bash
synth task list [--group <group>] [--tag <tag>]
synth task explain <id>
synth task run <id|group> [--dry-run] [--watch]
synth task affected
synth task graph [--format dot|json|mermaid]
synth task doctor
synth task generate <id> [--group <group>]
```

### TASK-004 — Dependency Graph

Build and materialize a task dependency graph. Expose it to Program 030's planner and the proof cache. Support cycle detection and topological scheduling.

### TASK-005 — Impact-Aware Execution

Given a diff, determine which tasks are affected and schedule only those. Integrate with the fingerprinting system from Program 030.

### TASK-006 — npm Adapter

Reduce `package.json` scripts to a thin adapter layer:

```json
{
  "scripts": {
    "build": "synth task build",
    "test": "synth task test",
    "govern": "synth task govern",
    "verify": "synth task verify",
    "docs": "synth task docs",
    "proof": "synth task proof",
    "release": "synth task release",
    "task": "node dist/cli/synth.js task"
  }
}
```

Keep legacy scripts as shims during the transition, but mark them deprecated.

### TASK-007 — CI Orchestration Adapter

Update CI workflows to invoke `synth task govern`, `synth task verify`, or `synth task test <group>` instead of raw npm scripts. The CI becomes a trigger, not a scheduler.

### TASK-008 — Task Groups

Define canonical groups:

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

Support `synth task run runtime` to execute every task in a group.

### TASK-009 — Task Explanation

Every task must be explainable:

```bash
synth task explain runtime-integrity
```

Output includes capability, purpose, dependencies, estimated duration, and consumers.

### TASK-010 — Task Doctor

Detect:

- Orphaned tasks (no group or no reachable consumer)
- Duplicate task ids
- Missing dependencies
- Circular dependencies
- Deprecated tasks still referenced by CI

### TASK-011 — Migration from npm Scripts

Inventory all existing npm scripts. Map each to a task, group, and dependencies. Create the corresponding `.synth/tasks/*.task.json` files. Deprecate legacy npm scripts without removing them until the program is accepted.

---

## Definition of Done

- [ ] ADR-044 accepted.
- [ ] Task schema, registry, and CLI implemented.
- [ ] All existing `npm run` scripts have a corresponding task definition.
- [ ] `package.json` reduced to the adapter layer.
- [ ] CI updated to invoke `synth task`.
- [ ] Program 030 planner consumes the task graph.
- [ ] `synth task doctor` reports zero critical issues.
- [ ] Documentation (`docs/reference/tasks.md`) and operator guide updated.
- [ ] Acceptance test: `synth task govern` produces the same proof artifact as the legacy `npm run govern`.

---

## Dependencies

- EXP-PROGRAM-030 — Intelligent Governance Orchestration (planner, fingerprints, proof cache)
- ADR-044 — External Build Systems Are Adapters

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Large migration surface | Keep legacy npm scripts as shims; remove only after acceptance. |
| Operator muscle memory | Document the new commands and provide alias guidance. |
| CI breakage | Update workflows incrementally; validate against the legacy pipeline. |
| Circular task dependencies | Enforce DAG validation in the registry and `synth task doctor`. |

---

## Related

- ADR-044 — External Build Systems Are Adapters
- EXP-PROGRAM-030 — Intelligent Governance Orchestration
- `docs/governance.md`
- `package.json`
