# ADR-007 — Capability Graph Model

**Status:** Accepted
**Date:** 2026-07-15
**Author:** Synth Architecture
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. Discovery produces a `DiscoveryEvidence` artifact containing observations, capabilities, and provider selections. The next step is to give SYNTH a structured, queryable model of capabilities and providers so that planning and execution can reason about the environment as a graph rather than a flat list.

Today, provider selection is embedded in the discovery orchestrator. As the number of capability families and providers grows, a flat resolution table will become difficult to extend, validate, and debug. The project needs a canonical graph model that:

- Represents capabilities as typed nodes.
- Represents providers as typed nodes.
- Records which providers satisfy which capabilities.
- Records dependencies between capabilities.
- Supports deterministic resolution.
- Is serializable, versioned, and replayable.

## Decision

### 1. Introduce the Capability Graph

A **Capability Graph** is a directed, acyclic graph composed of two node kinds and two edge kinds.

**Node kinds:**

| Kind | Description |
|---|---|
| `CapabilityNode` | A capability family such as `Revision`, `Filesystem`, or `Forge`. |
| `ProviderNode` | A concrete provider such as `git-revision` or `node-filesystem`. |

**Edge kinds:**

| Kind | Source | Target | Meaning |
|---|---|---|---|
| `satisfies` | ProviderNode | CapabilityNode | The provider can satisfy the capability. |
| `requires` | CapabilityNode | CapabilityNode | The capability depends on another capability. |

### 2. Capability Node Schema

```text
CapabilityNode {
  id: string          // canonical identifier, e.g. "cap:Revision"
  family: CapabilityFamily
  version: string     // schema version of the node definition
  required: boolean   // whether the capability is required for execution
  metadata: object    // human-readable description, compatibility notes
}
```

### 3. Provider Node Schema

```text
ProviderNode {
  id: string          // canonical identifier, e.g. "prov:git-revision"
  name: string
  version: string
  capabilities: string[]  // ids of capabilities this provider advertises
  priority: number        // default selection priority
  metadata: object
}
```

### 4. Resolution Algorithm

Resolution transforms a capability request into a selected provider path.

```text
resolve(requestedCapability):
  1. Locate the CapabilityNode.
  2. Collect all ProviderNodes with a "satisfies" edge to it.
  3. Filter to providers that are available in the discovery evidence.
  4. Sort by (priority desc, confidence desc, name asc).
  5. If the capability has "requires" edges, recursively resolve each dependency.
  6. Return the provider path: [provider, ...dependencies].
```

If no provider satisfies a required capability, resolution fails with a deterministic error.

### 5. Graph Construction

The graph is built from two inputs:

1. **Constitutional capability catalog** — the fixed list of capability families supported by SYNTH.
2. **Discovery evidence** — the output of the discovery orchestrator, including provider observations and selections.

The construction process:

```text
For each family in catalog:
  create CapabilityNode

For each provider in evidence:
  create ProviderNode
  create "satisfies" edges to advertised capabilities

For each known dependency:
  create "requires" edge between CapabilityNodes
```

### 6. Serialization Format

The graph serializes to a canonical JSON document with schema version `synth-capability-graph-v1`.

```text
{
  schema: "synth-capability-graph-v1"
  version: "1.0.0"
  timestamp: number
  nodes: CapabilityNode[] | ProviderNode[]
  edges: { id, source, target, kind, metadata }[]
  resolution: { [capabilityId]: providerPath }
}
```

The serialized graph becomes part of the discovery evidence bundle and is preserved for replay.

### 7. Determinism Rule

Graph construction and resolution must be deterministic for identical discovery evidence. The order of nodes and edges in the serialized output is canonical (sorted by id). Provider tie-breaking uses priority, confidence, and name only.

## Consequences

- **Easier:** Provider selection becomes explicit, testable, and inspectable.
- **Easier:** New capabilities and providers are added by extending the graph, not by changing resolution logic.
- **Easier:** Planning can ask questions like "what providers are available for Runtime?" without knowing provider implementations.
- **Easier:** Dependencies between capabilities are modeled explicitly.
- **Harder:** The graph must remain acyclic; cycle detection is required.
- **Harder:** Resolution failures must produce clear evidence.

## Proof Impact

- **P1 Structural:** Reinforced — environment interactions are modeled explicitly rather than embedded in execution paths.
- **P2 Behavioral:** Unchanged; resolution does not alter event semantics.
- **P3 Historical:** Strengthened — the capability graph is preserved as replayable evidence.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — identical discovery evidence produces identical graphs and resolutions.

## Kernel Impact

No frozen kernel components are modified. The Capability Graph is an Environment Layer artifact consumed by planning and execution. It does not change the event schema, replay semantics, mutation authority, or proof obligations.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md` as a governance policy governing capability modeling.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-002.md`
