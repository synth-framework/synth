> This document is governed by **EXP-KNOWLEDGE-001 — Canonical Knowledge Model**.

# Canonical Knowledge Contract

This document defines the contract for transforming an approved Intent Model and Domain Model into a versioned Canonical Knowledge Graph, projecting artifacts from it, and detecting semantic drift.

## 1. Purpose

The Canonical Knowledge Graph is the single source of truth for project understanding. Every other artifact—Mission, Expedition, ADR, documentation, specification—is a projection derived from the graph.

## 2. Inputs

- An approved `IntentModel`.
- An approved `DomainModel`.
- An optional `KnowledgeModelingAdapter`; defaults to `RuleBasedKnowledgeAdapter`.

Source of truth: `src/knowledge/types.ts`.

## 3. Outputs — `KnowledgeGraph`

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | `"synth-knowledge-graph-v1"`. |
| `version` | string | Graph version. |
| `generatedAt` | ISO timestamp | Generation time (not part of deterministic identity). |
| `lineage` | `KnowledgeLineage` | Parent versions and merge history. |
| `nodes` | `KnowledgeNode[]` | Canonical knowledge nodes. |
| `edges` | `KnowledgeEdge[]` | Typed relationships between nodes. |

## 4. Node Types (SKR Aligned)

| Type | Description |
|------|-------------|
| `Mission` | Long-term strategic direction. |
| `Expedition` | Bounded engineering objective. |
| `Objective` | Measurable outcome within an expedition. |
| `WorkItem` | Trackable execution unit. |
| `Discovery` | Newly learned architectural or domain knowledge. |
| `Decision` | Chosen architectural direction. |
| `Artifact` | Generated or imported document, model, or file. |
| `Observation` | Raw evidence or problem statement. |
| `Constraint` | Hard limit on the solution space. |

## 5. Edge Types (SKR Aligned)

| Type | Description |
|------|-------------|
| `depends_on` | Dependency relationship. |
| `implements` | Implementation relationship. |
| `supports` | Support relationship. |
| `derived_from` | Derivation relationship. |
| `discovers` | Discovery relationship. |
| `produces` | Production relationship. |
| `invalidates` | Invalidation relationship. |
| `blocks` | Blocking relationship. |
| `relates_to` | Generic relationship. |
| `references` | Cross-reference. |

## 6. Projection Engine

Projections are deterministic derivations from the graph:

| Projection | Description |
|------------|-------------|
| `MissionProjection` | Subject, purpose, objectives. |
| `ExpeditionProjection` | Subject, goal, parent mission. |
| `AdrProjection` | Architecture decision record. |
| `DocumentationProjection` | Documentation outline. |

No projection is canonical. Regenerating a projection from the same graph must yield the same result.

## 7. Versioning and Lineage

The graph carries:

- `version` — semantic version of the graph.
- `lineage.parentVersion` — previous version, if any.
- `lineage.mergeVersions` — versions merged into this one.
- `lineage.reason` — why the version changed.

## 8. Semantic Drift Detection

| Class | Meaning | Severity |
|-------|---------|----------|
| `DOCUMENTATION_DRIFT` | Generated docs no longer match the graph. | warning |
| `ARCHITECTURE_DRIFT` | Projected architecture differs from the graph. | warning |
| `REQUIREMENTS_DRIFT` | Required objectives are missing from the graph. | error |
| `UNKNOWN_INTRODUCED` | New unknown appears without being recorded. | warning |

## 9. Determinism

The same `IntentModel`, `DomainModel`, and adapter version must produce:

- the same nodes,
- the same edges,
- the same projections,
- the same drift findings for a given snapshot.

`generatedAt` is the only field allowed to vary across runs.

## 10. Adapter Contract

```ts
interface KnowledgeModelingAdapter {
  readonly id: string
  readonly version: string
  buildGraph(options: KnowledgeModelingOptions): KnowledgeGraph
  project(graph: KnowledgeGraph): KnowledgeProjections
  detectDrift(graph: KnowledgeGraph, snapshot: KnowledgeProjections): DriftFinding[]
}
```

## 11. Hard Constraints

> **Knowledge is canonical:** The graph is the source of truth; projections are disposable.
>
> **Implementation independence:** The graph must not depend on a specific framework, language, runtime, or deployment target.
>
> **Determinism:** Reproducible for fixed inputs and adapter version.
>
> **Replayability:** Graph evolution must be reconstructible from inputs and decisions.
