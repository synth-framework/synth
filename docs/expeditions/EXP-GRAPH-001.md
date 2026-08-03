# EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive

> Implement the generic DAG primitive defined in `docs/design/shared-dependency-graph.md` so both `EXP-PROGRAM-031` (portfolio graph) and `EXP-PROGRAM-034` (task graph) consume the same graph engine.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-031 — Architectural Convergence  
**Authority:** EXP-REVIEW-001 — First Convergence Review of Program 043 and Program 034  
**Joint with:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Depends On:** EXP-REVIEW-001, `docs/design/shared-dependency-graph.md`  
**Blocks:** EXP-PROGRAM-034 implementation, EXP-CONVERGENCE-003 portfolio graph

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

Prevent `EXP-PROGRAM-031` and `EXP-PROGRAM-034` from building independent graph engines. This expedition produces a single, type-parameterized DAG primitive that both programs consume through a stable API.

---

## Background

- `src/domain/graph.ts` already implements cycle detection, reachability, and connectivity for the project graph.
- `EXP-PROGRAM-034/TASK-004` needs a task dependency graph with cycle detection and topological scheduling.
- `EXP-PROGRAM-031/EXP-CONVERGENCE-003` needs a program/expedition dependency graph for portfolio sequencing and impact analysis.
- The design contract in `docs/design/shared-dependency-graph.md` defines the core abstraction and operations.

---

## Goals

1. Implement the `Graph<T>`, `GraphNode<T>`, and `GraphEdge` types.
2. Implement `topologicalSort`, `detectCycles`, `reachableFrom`, `isAcyclic`, and `buildAdjacencyLists`.
3. Refactor `src/domain/graph.ts` to delegate to the new primitive where possible.
4. Add contract tests that pin determinism and cycle-order stability.
5. Do **not** build task scheduling or portfolio rendering into the primitive.

---

## Acceptance Criteria

- `src/graph/dependency-graph.ts` exists and exports the core API.
- All operations return deterministic results.
- Cycle detection returns cycles in a stable order; nodes within a cycle are ordered by first discovery.
- The primitive passes property-based or exhaustive tests for acyclic graphs, cyclic graphs, empty graphs, and disconnected graphs.
- Existing `src/domain/graph.ts` tests still pass after refactoring.
- `EXP-PROGRAM-034/TASK-004` can import and use the primitive for task dependency operations.
- `EXP-PROGRAM-031/EXP-CONVERGENCE-003` can import and use the primitive for portfolio dependency operations.

---

## Out of Scope

- Task execution scheduling (Program 034).
- Portfolio dashboard rendering (Program 031).
- Mutable graph operations; the primitive remains read-only over an immutable graph.
- Event-model or replay changes.

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Evidence

- Implementation: `src/graph/dependency-graph.ts`
  - Exports `Graph<T>`, `GraphNode<T>`, `GraphEdge`, and `EdgeType`.
  - Implements `buildGraph`, `topologicalSort`, `detectCycles`, `isAcyclic`, `reachableFrom`, and `buildAdjacencyLists`.
  - Deterministic ordering is driven by input order, not alphabetical sorting.
  - Edge-type filtering is supported but defaults to considering all edges.
- Refactored consumer: `src/domain/graph.ts` delegates `detectCycles`, `isAcyclic`, `reachableFrom`, and graph types to the primitive.
- Adopted consumer: `src/task/task-graph.ts` builds task graphs and passes `depends_on` as the edge type explicitly.
- Tests: `tests/graph-dependency-primitive.test.js`
  - Covers acyclic, cyclic, empty, and disconnected graphs.
  - Pins determinism, input-order stability, and cycle-order stability.
  - Validates `buildGraph` validation rules and edge-type filtering.
- Tests: `tests/shared-dependency-graph-implementation.test.js`
  - Verifies the charter, prefix registry, and cross-program references.
- Validation:
  - `npm run build` passes.
  - `node tests/graph-dependency-primitive.test.js` passes.
  - `node tests/shared-dependency-graph-implementation.test.js` passes.
  - `node tests/task-graph.test.js` passes.

## Related documents

- [EXP-PROGRAM-031 — Architectural Convergence](EXP-PROGRAM-031.md)
- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [docs/design/shared-dependency-graph.md](../design/shared-dependency-graph.md)
- [docs/governance/convergence-review-043-034.md](../governance/convergence-review-043-034.md)
