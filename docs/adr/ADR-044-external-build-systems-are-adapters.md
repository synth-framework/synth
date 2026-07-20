# ADR-044 — External Build Systems Are Adapters

**Status:** Proposed  
**Date:** 2026-07-20  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, CI Maintainers, Tooling Ecosystem

---

## Context

SYNTH currently orchestrates validation, documentation, certification, and release work through a large set of npm scripts in `package.json`. Over time this registry has grown to hundreds of entries: `test:runtime-integrity`, `docs:verify-first-contact-projection`, `govern:benchmark`, `proof:verify`, and many more.

This creates several problems:

- **npm is the workflow engine.** A generic package-manager script block has become the source of truth for SYNTH's own governance orchestration.
- **Discoverability is poor.** Operators must read `package.json` or remember naming conventions; there is no `synth task list` or `synth task explain`.
- **Dependency information is implicit.** Scripts call other scripts, but no machine-readable graph exists for planning, caching, or impact analysis.
- **Groups and namespaces are encoded in colons.** This is a fragile convention, not a canonical model.
- **CI duplicates the orchestration.** GitHub Actions and local workflows invoke npm scripts directly instead of asking SYNTH to plan and execute validation.
- **Program 030** introduced an intelligent governance planner that classifies artifacts, computes fingerprints, and schedules validators. That planner should invoke canonical tasks, not npm scripts.

---

## Decision

External build and orchestration systems — npm, pnpm, Bun, cargo, make, just, Bazel, GitHub Actions, and similar — are **adapters** in the SYNTH architecture. They may trigger SYNTH, but they do not own the execution model.

SYNTH owns the canonical task model:

- Tasks are first-class governed artifacts.
- Tasks declare metadata, dependencies, groups, tags, and execution semantics.
- Tasks are discoverable, explorable, and executable through the SYNTH CLI.
- npm scripts are reduced to a thin compatibility layer that delegates to `synth task`.

### Target shape of `package.json`

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

### Canonical task model

Tasks live under `.synth/tasks/` as declarative artifacts. Ungoverned trees fall back to the legacy repo-root `data/tasks/` path until they are initialized. Example:

```json
{
  "id": "runtime-integrity",
  "description": "Verify runtime invariants through replay and state equivalence checks.",
  "command": "node tests/runtime-integrity.test.js",
  "group": "runtime",
  "dependsOn": ["build"],
  "tags": ["runtime", "governance", "replay"],
  "estimatedDurationMs": 4000,
  "capabilities": ["Runtime"]
}
```

### CLI surface

```bash
synth task list                      # list all tasks by group
synth task explain <id>              # show metadata, dependencies, reverse dependencies
synth task run <id>                  # execute a single task
synth task run <group>               # execute all tasks in a group
synth task affected                  # run tasks impacted by the current diff
synth task graph                     # emit task dependency graph
synth task doctor                    # detect orphaned, duplicate, or invalid tasks
synth task generate <id>             # scaffold a new governed task
```

### Discovery

Tasks may be discovered from:

- `.synth/tasks/*.task.json`
- `data/tasks/*.task.json` (legacy fallback for ungoverned trees)
- Convention-based metadata in test and script files
- A registry populated by capabilities

### Relationship to Program 030

Program 030's Intelligent Governance Orchestration planner consumes the task graph. Instead of invoking `npm run test:...`, it invokes `synth task run ...` with a deterministic plan that can be replayed and explained.

---

## Consequences

### Positive

- npm scripts become a thin adapter, not the workflow engine.
- Tasks are governable, versioned, and discoverable.
- CI can delegate orchestration to SYNTH, reducing duplication.
- Impact-aware execution (`synth task affected`) reduces validation cost.
- The task graph feeds Program 030's planner and proof cache.
- Explainability improves: `synth task explain` replaces reading `package.json`.

### Negative

- Requires migrating a large number of npm scripts to task artifacts.
- Existing muscle memory (`npm run test:foo`) must adapt or be shimmed.
- Task runner must be built, tested, and certified before the legacy scripts can be removed.

### Neutral

- npm remains a supported adapter; this ADR does not remove npm from the project.
- External contributors can still use familiar entry points while SYNTH owns the canonical model.

---

## Alternatives Considered

### 1. Keep npm scripts as the primary orchestration layer

Rejected. It contradicts SYNTH's goal of governing its own execution model and leaves Program 030 dependent on an external, non-canonical script registry.

### 2. Replace npm entirely with a custom task runner

Rejected. npm is still the canonical package manager for the Node.js ecosystem. The correct boundary is adapter, not replacement.

### 3. Generate task definitions from `package.json` automatically

Rejected as the long-term solution. While a one-time migration script may be useful, the canonical model should be authored deliberately, not derived from the legacy registry indefinitely.

---

## Related

- EXP-PROGRAM-030 — Intelligent Governance Orchestration
- EXP-PROGRAM-034 — Task Orchestration Engine
- ADR-043 — AI Agent Validation Scope Boundary
- `docs/governance.md`
