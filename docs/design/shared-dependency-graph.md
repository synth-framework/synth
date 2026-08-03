# Shared Dependency-Graph Primitive

**Authority:** EXP-REVIEW-001 — First Convergence Review of Program 043 and Program 034  
**Status:** Design contract  
**Date:** 2026-08-03  

---

## Purpose

Both `EXP-PROGRAM-031` (Architectural Convergence) and `EXP-PROGRAM-034` (Task Orchestration Engine) need dependency-graph capabilities. To avoid two independent graph engines, this document defines a single generic DAG primitive that both programs consume.

## Background

- `src/domain/graph.ts` already implements cycle detection, reachability, and connectivity for the project graph.
- `EXP-PROGRAM-034/TASK-004` proposes building a task dependency graph with cycle detection and topological scheduling.
- `EXP-PROGRAM-031/EXP-CONVERGENCE-003` proposes a program/expedition dependency graph for portfolio sequencing.

## Design

### Core abstraction

```ts
type EdgeType = "depends_on" | "contains" | "belongs_to" | string

type GraphEdge = {
  from: string
  to: string
  type: EdgeType
  metadata?: Record<string, unknown>
}

type GraphNode<T> = {
  id: string
  payload: T
  metadata?: Record<string, unknown>
}

type Graph<T> = {
  nodes: Map<string, GraphNode<T>>
  edges: GraphEdge[]
}
```

### Operations

```ts
// Build a graph from an array of node payloads and directed edges.
// The builder validates that every edge references an existing node id.
function buildGraph<T>({
  nodes,
  edges,
}: {
  nodes: { id: string; payload: T; metadata?: Record<string, unknown> }[]
  edges: { from: string; to: string; type: EdgeType; metadata?: Record<string, unknown> }[]
}): Graph<T>

// Return a topologically sorted list of node ids, or the first cycle found.
function topologicalSort<T>(graph: Graph<T>): { ok: true; order: string[] } | { ok: false; cycle: string[] }

// Return all elementary cycles in the graph.
function detectCycles<T>(graph: Graph<T>): string[][]

// Return all node ids reachable from a starting node via outgoing edges.
function reachableFrom<T>(graph: Graph<T>, startId: string): Set<string>

// Return true if the graph contains no cycles.
function isAcyclic<T>(graph: Graph<T>): boolean

// Return inbound and outbound adjacency lists for efficient traversal.
function buildAdjacencyLists(graph: Graph<unknown>): {
  inbound: Map<string, Set<string>>
  outbound: Map<string, Set<string>>
}
```

### Determinism requirements

All operations are deterministic for a given input graph:

- `topologicalSort` returns node ids in a stable order; when multiple nodes are eligible, the node that was first discovered (i.e., appears first in the input edge or node order) is emitted first.
- `detectCycles` returns cycles in a stable order; nodes within a cycle are ordered by first discovery during traversal.
- `reachableFrom` returns nodes in breadth-first order, ordered by first discovery from `startId`.
- `buildAdjacencyLists` preserves input order in the adjacency sets, which must be iterated in insertion order by callers that require stability.

### Consumers

#### Program 034 — Task graph

- Nodes: task ids.
- Edges: `depends_on` from task to upstream task.
- Uses: `topologicalSort` for execution order, `detectCycles` for `synth task doctor`.

#### Program 031 — Program/expedition graph

- Nodes: program and expedition ids.
- Edges: `depends_on` from program/expedition to upstream program/expedition.
- Uses: `detectCycles` for portfolio validation, `reachableFrom` for impact analysis.

## Implementation notes

- The primitive is type-parameterized so consumers can attach domain-specific payloads without leaking domain logic into the graph module.
- Edge types are strings to allow domain-specific relationships without widening the core API.
- Cycle detection must be deterministic: cycles are returned in a stable order and nodes within a cycle are ordered by first discovery.
- The module will live at `src/graph/dependency-graph.ts` when implemented.
- Existing `src/domain/graph.ts` can be refactored to use the primitive once it is available.

## Out of scope

- Execution scheduling (Program 034).
- Portfolio dashboard rendering (Program 031).
- Mutable graph operations; the primitive is read-only over an immutable graph.
