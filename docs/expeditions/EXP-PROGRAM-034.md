# EXP-PROGRAM-034 — Task Orchestration Engine

**Status:** Active — design phase approved  
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

> Implemented in `src/task/task-schema.ts` as part of `EXP-TASK-001`.

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

> Implemented in `src/task/task-registry.ts` as part of `EXP-TASK-001`.

Implement discovery from:

- `.synth/tasks/*.task.json`
- `data/tasks/*.task.json`
- Test and script metadata exports (future extension)
- Capability registrations (future extension)

Enforce uniqueness, validate dependency references, and detect duplicates.

### TASK-003 — Task CLI

> Implemented in `EXP-TASK-002` and `EXP-TASK-003`.

Implemented:

```bash
synth task list [--group <group>] [--tag <tag>]
synth task explain <id>
synth task graph [--format dot|json|mermaid]
synth task doctor
synth task run <id|group> [--dry-run]
synth task affected [--task <id>]...
synth task generate <id> --group <group> [--command <cmd>]
```

Deferred:

```bash
synth task run <id|group> --watch
```

### TASK-004 — Dependency Graph

> Implemented in `src/task/task-graph.ts`; consumes `src/task/task-registry.ts`.

Build and materialize a task dependency graph. Expose it to Program 030's planner and the proof cache. Support cycle detection and topological scheduling.

### TASK-005 — Impact-Aware Execution

Given a diff, determine which tasks are affected and schedule only those. Integrate with the fingerprinting system from Program 030.

### TASK-006 — npm Adapter

> Implemented in `EXP-TASK-005`.

Reduced `package.json` scripts to thin adapters that delegate to `synth task run <id>`. Every script except `build` (which bootstraps the TypeScript compiler) now uses the task engine. Legacy scripts remain as shims; deprecation is deferred to the acceptance gate.

```json
{
  "scripts": {
    "build": "tsc && node scripts/generate-dist-manifest.js",
    "test": "node dist/cli/synth.js task run test",
    "govern": "node dist/cli/synth.js task run govern",
    "...": "node dist/cli/synth.js task run <id>"
  }
}
```

### TASK-007 — CI Orchestration Adapter

> Implemented in `EXP-TASK-006`.

Update CI workflows to invoke `synth task govern`, `synth task verify`, or `synth task test <group>` instead of raw npm scripts. The CI becomes a trigger, not a scheduler.

Implemented changes:

- `.github/workflows/proof.yml` now runs `node dist/cli/synth.js task run govern` after `npm run build`.
- `.github/workflows/publish.yml` now runs documentation tasks via `node dist/cli/synth.js task run <id>` after `npm run build`.
- `.github/workflows/release.yml` now runs `node dist/cli/synth.js task run govern` after `npm run build`.
- `tests/task-ci-adapter.test.js` verifies that workflows invoke the task engine directly and that every CI-invoked task exists in the registry.
- `EXP-ONBOARD-002` migrated Program 043's first-contact onboarding to `synth task run` invocations, confirming the adapter boundary in production.

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

> Implemented in `EXP-TASK-004`.

Inventoryed all existing npm scripts in `package.json`. Mapped each to a task, group, and dependencies. Created the corresponding `data/tasks/*.task.json` files. Legacy npm scripts remain in place; deprecation happens after the adapter migration (`TASK-006`).

---

## Definition of Done

### Design-phase deliverables

- [x] Shared dependency-graph primitive adopted (`src/graph/dependency-graph.ts`).
- [x] `TASK-004` rewritten to consume the shared primitive (`src/task/task-graph.ts`).
- [x] Task schema and registry design accepted (`src/task/task-schema.ts`, `src/task/task-registry.ts`, `EXP-TASK-001`).
- [x] Acceptance criteria split into design-phase and implementation-phase deliverables.
- [x] `TASK-007` (CI Orchestration Adapter) explicitly deferred until task engine acceptance.
- [x] Second Convergence Review (`EXP-REVIEW-002`) records a **CONVERGED** outcome.

### Implementation-phase deliverables

- [ ] ADR-044 accepted.
- [x] Task schema and registry implemented (`EXP-TASK-001`).
- [x] Read-only/diagnostic task CLI implemented (`EXP-TASK-002`): `list`, `explain`, `graph`, `doctor`.
- [x] Task execution CLI implemented (`EXP-TASK-003`): `run`, `affected`, `generate`.
- [ ] Watch mode for `synth task run` (deferred).
- [x] All existing `npm run` scripts have a corresponding task definition (`EXP-TASK-004`).
- [x] `package.json` reduced to the adapter layer (`EXP-TASK-005`).
- [x] CI updated to invoke `synth task` (`EXP-TASK-006`).
- [ ] Program 030 planner consumes the task graph.
  - Next: align with Program 031/043 on the shared dependency-graph contract and the task graph export surface.
- [x] `synth task doctor` reports zero critical issues on the canonical task set.
  - Verified: `synth task doctor` reports healthy with no critical issues.
- [x] Documentation (`docs/reference/tasks.md`) and operator guide updated.
  - `docs/reference/tasks.md` drafted; operator guide updated with `synth task run` equivalents in validation and getting-started flows.
- [ ] Acceptance test: `synth task govern` produces the same proof artifact as the legacy `npm run govern`.
  - This is the final acceptance gate; it depends on all preceding implementation-phase deliverables and validates that the task engine does not change governance output.

## Convergence Review

### EXP-REVIEW-001 — First Convergence Review

- **Outcome:** **REWRITE REQUIRED** at the design level.
- **Review record:** `docs/governance/convergence-review-043-034.md`
- **Authority:** ADR-039 — Architectural Convergence Review
- **Required alignment actions:**
  1. Adopt the shared dependency-graph primitive defined in `docs/design/shared-dependency-graph.md`.
  2. Rewrite `TASK-004` to consume the shared primitive rather than building a separate task graph engine.
  3. Split acceptance criteria into design-phase and implementation-phase deliverables.
  4. Defer `TASK-007` (CI Orchestration Adapter) until the task engine is accepted.
  5. Re-enter Convergence Review before leaving design phase.

### EXP-REVIEW-002 — Second Convergence Review

- **Outcome:** **CONVERGED** at the design level.
- **Review record:** `docs/governance/convergence-review-034-002.md`
- **Required actions completed before design approval:**
  1. [x] Implement the shared dependency-graph primitive in `EXP-GRAPH-001`.
  2. [x] Adopt the primitive defined in `docs/design/shared-dependency-graph.md`.
  3. [x] Rewrite `TASK-004` to consume the shared primitive rather than building a separate task graph engine.
  4. [x] Split acceptance criteria into design-phase and implementation-phase deliverables.
  5. [x] Defer `TASK-007` (CI Orchestration Adapter) until the task engine is accepted.
- **Required actions before implementation:**
  1. [x] Produce and accept the task schema/registry design (`TASK-001`, `TASK-002`).
  2. [x] Do not implement `synth task run`, CI adapters, or npm-script migration until the design is accepted; read-only diagnostic CLI (`EXP-TASK-002`) is permitted.

---

## Dependencies

- EXP-PROGRAM-030 — Intelligent Governance Orchestration (planner, fingerprints, proof cache)
- ADR-044 — External Build Systems Are Adapters
- EXP-PROGRAM-031 — Shared dependency-graph primitive contract
- EXP-PROGRAM-043 — consumes the task engine via `EXP-ONBOARD-002` (first-contact onboarding migrated to `synth task run`); validates the adapter boundary

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Large migration surface | Keep legacy npm scripts as shims; remove only after acceptance. |
| Operator muscle memory | Document the new commands and provide alias guidance. |
| CI breakage | Update workflows incrementally; validate against the legacy pipeline. |
| Circular task dependencies | Enforce DAG validation in the registry and `synth task doctor`. |
| Duplicate graph engine with EXP-PROGRAM-031 | Contract defined in `docs/design/shared-dependency-graph.md`; implementation chartered as `EXP-GRAPH-001`. |

---

## Current Recommendation

**Implementation is in progress; complete the remaining deliverables in the sequence above.** This program has a high blast radius because it replaces `package.json` scripts, changes CI invocation, and introduces a canonical task model. The design is accepted and the adapter boundary is validated; now finish the implementation-phase acceptance gates.

**Why wait:**

- The immediate `npm run govern` slowness can be mitigated today with `--max-concurrency` and better proof caching.
- `EXP-PROGRAM-031` should define the shared dependency-graph primitive first; otherwise 034 and 031 risk building two graph engines.
- `EXP-PROGRAM-043` must fix the operator-facing pain before the orchestration engine underneath it is rewritten.

**Design-phase goals:**

1. [x] Produce a task schema and registry design (`src/task/task-schema.ts`, `src/task/task-registry.ts`).
2. [x] Align with 031 on the shared dependency-graph primitive (`docs/design/shared-dependency-graph.md`).
3. [x] Produce a joint review record (`docs/governance/convergence-review-043-034.md`).
4. [x] Implement or adopt the shared primitive through `EXP-GRAPH-001` before writing task graph code.
5. [x] Rewrite `TASK-004` to consume the primitive from `src/graph/dependency-graph.ts`.
6. [x] Split acceptance criteria into design-phase and implementation-phase deliverables.
7. [x] Defer `TASK-007` (CI Orchestration Adapter) until the task engine is accepted.
8. Do **not** implement `synth task run`, CI adapters, or npm-script migration until the design is accepted.

**Sequencing:** 034 is in implementation phase. Remaining deliverables should close in this order:
1. Resolve any critical issues reported by `synth task doctor` on the canonical task set.
2. Draft `docs/reference/tasks.md` and update the operator guide with the new `synth task` commands.
3. Integrate the task graph with Program 030's planner under Program 031's convergence gate.
4. Run the acceptance test comparing `synth task govern` output to the legacy `npm run govern` proof artifact.

Program 043 already consumes the task engine via `EXP-ONBOARD-002`; that migration validated the adapter boundary and is not duplicate work.

---

## Related

- ADR-044 — External Build Systems Are Adapters
- EXP-PROGRAM-030 — Intelligent Governance Orchestration
- `docs/governance.md`
- `package.json`
