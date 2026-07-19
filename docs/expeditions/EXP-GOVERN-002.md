# EXP-GOVERN-002 — Validation Dependency Graph

> **Architecture expedition.** Make every governance check self-describing by declaring its inputs, outputs, scope, and module membership, producing a dependency graph without changing execution order yet.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-021 — Incremental Governance  
**Depends On:** EXP-GOVERN-001 (Governance Profiling)

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Give every governance check a declarative contract so the system can reason about which checks are independent, which overlap, and which can be skipped when specific files or modules are unchanged.

This expedition builds the model. It does not yet skip or cache anything.

---

## Required Change

### 2.1 Define a check registration contract

Every check is registered with:

```ts
registerCheck({
  id: "mission-integrity",
  module: "missions",
  inputs: ["missions/**", "expeditions/**"],
  outputs: [],
  scope: "governance",
  protectedAssets: ["Mission Studio"],
})
```

Required fields:

- `id` — stable check identifier.
- `module` — governance module this check belongs to.
- `inputs` — file globs, event types, or conceptual dependencies.
- `outputs` — artifacts or proofs produced.
- `scope` — `governance`, `product`, `runtime`, `documentation`, etc.
- `protectedAssets` — which protected assets this check validates, if any.

### 2.2 Define governance modules

Introduce a canonical module list:

```text
contracts
documentation
cli
kernel
runtime
governance
missions
expeditions
website
tests
```

Each module exposes:

```text
name
fingerprintDependencies
governanceChecks[]
```

### 2.3 Build the dependency graph

From registered checks, produce a directed acyclic graph (DAG):

```text
Check A
        \
         ▼
        Check B
         /
Check C
```

The graph is emitted as an artifact for inspection:

```json
{
  "kind": "GovernanceDependencyGraph",
  "modules": [...],
  "checks": [...],
  "edges": [...]
}
```

### 2.4 Detect overlaps and orphans

The registration system must report:

- checks with no inputs (global checks).
- checks with overlapping inputs (potential redundancy).
- modules with no checks.
- checks that depend on files outside any declared module.

---

## Deliverables

1. **Check registration API** and migration of existing checks.
2. **Governance module definitions** documented and committed.
3. **Dependency graph artifact** produced during `npm run govern`.
4. **ADR** explaining the check contract and module boundaries.

---

## Acceptance Criteria

- Every check invoked by `npm run govern` is registered through the new API.
- `npm run govern` emits a `GovernanceDependencyGraph` artifact.
- The graph is a DAG; cycles produce a fatal error.
- Overlapping inputs and global checks are reported as warnings.
- No protected asset is removed from validation scope.

---

## Out of Scope

- Fingerprinting or caching.
- Skipping checks based on the graph.
- Parallel execution.
- Adding new checks.

---

## Success Criteria

The expedition succeeds when `npm run govern` can print, for every check:

```text
mission-integrity
  module: missions
  inputs: missions/**, expeditions/**
  outputs: (none)
  scope: governance
```
