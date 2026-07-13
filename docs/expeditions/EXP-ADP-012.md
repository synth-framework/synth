# EXP-ADP-012 — Dependency Adapter

**Status:** Completed  
**Kind:** Intelligence Adapter  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-007, EXP-ADP-009  
**Blocks:** Architectural reconstruction, World Model enrichment

---

## Purpose

Build dependency, component, and capability graphs from Observations.

The Dependency Adapter is an Intelligence Adapter. It does not read files or external systems. It only inspects `Observation[]` and emits graph structures that Mission Studio can use to understand relationships between entities.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Intelligence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Surface relationships between dependencies, components, and capabilities |

---

## Responsibilities

- Accept `Observation[]`.
- Build a dependency graph from `dependency` observations.
- Build a component graph from `language` and `component` observations.
- Build a capability graph from `capability` observations.
- Emit `evidence` Observations containing each graph.
- Never read external systems directly.
- Never mutate runtime state.

---

## Input

```typescript
Observation[]
```

---

## Output

```typescript
Observation {
  category: "evidence"
  subject: "Dependency Graph"
  confidence: "high"
  evidence: [{
    description: "Dependency graph derived from observations",
    snippet: JSON.stringify(graph)
  }]
  metadata: {
    graph: {
      name: "dependency",
      nodes: [...],
      edges: [...]
    }
  }
}
```

---

## Graph Construction

### Dependency Graph

- Nodes: every `dependency` observation subject.
- Edges: connect dependencies that share the same source locator (e.g., the same `package.json`).

### Component Graph

- Nodes: every `language` and `component` observation subject.
- Edges: connect components that share the same source locator.

### Capability Graph

- Nodes: every `capability` observation subject.
- Edges: connect capabilities that share the same source locator (e.g., the same OpenAPI file).

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`build()` is available once enabled.

---

## Invariants

- Input is strictly `Observation[]`.
- Output is strictly `Observation[]`.
- Graphs contain no duplicate nodes.
- Edges reference only nodes present in the graph.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Dependency observations produce a dependency graph.
- Language/component observations produce a component graph.
- Capability observations produce a capability graph.
- Nodes with no shared source produce no edges.
- Adapter passes lifecycle and health checks.

---

## Completion Criteria

Dependency Adapter is complete when:

- `src/adapters/dependency/adapter.ts` implements the graph construction logic.
- `src/adapters/dependency/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover all three graph types and lifecycle.
