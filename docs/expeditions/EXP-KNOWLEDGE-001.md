# EXP-KNOWLEDGE-001 — Canonical Knowledge Model

> This document is governed by **EXP-PROGRAM-025 — Canonical Knowledge & Validation**.

> **Architecture expedition.** Define the knowledge graph schema, projection engine, versioning, lineage, and semantic drift detection.

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-025 — Canonical Knowledge & Validation  
**Depends On:** EXP-SEMANTIC-002 (Domain Modeling Engine)
**Completed In:** PR #198

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Transform an approved Domain Model into a versioned Canonical Knowledge Graph. The graph becomes the single source of truth from which Missions, Expeditions, ADRs, documentation, and specifications are projected.

---

## Required Change

### 1.1 Knowledge Graph Schema

Adopt and extend the Synth Knowledge Representation (SKR) for project-level knowledge:

| Node Type | Description |
|-----------|-------------|
| `Mission` | Long-term strategic direction. |
| `Expedition` | Bounded engineering objective. |
| `Objective` | Measurable outcome within an expedition. |
| `Discovery` | Newly learned architectural knowledge. |
| `Decision` | Chosen architectural direction with rationale. |
| `Artifact` | Generated or imported document, model, or file. |
| `Observation` | Raw evidence from discovery. |
| `Constraint` | Hard limit on the solution space. |
| `Entity` | Domain entity from the Domain Model. |
| `ValueObject` | Immutable domain descriptor. |
| `DomainEvent` | Something that happened in the domain. |

| Relationship Type | Description |
|-------------------|-------------|
| `depends_on` | One node depends on another. |
| `implements` | A node implements another. |
| `supports` | A node supports another. |
| `derived_from` | A node is derived from another. |
| `discovers` | A node discovers another. |
| `produces` | A node produces another. |
| `invalidates` | A node invalidates another. |
| `blocks` | A node blocks another. |
| `relates_to` | Generic relationship. |
| `references` | Cross-reference. |

### 1.2 Projection Engine

Generate from the knowledge graph:

- Mission proposals
- Expedition proposals
- ADRs
- Architecture documentation
- Technical specifications
- User documentation

No projection becomes the source of truth.

### 1.3 Knowledge Versioning

Support:

- `version` — semantic version of the knowledge graph.
- `replay` — reconstruct graph from inputs and decisions.
- `lineage` — chain of versions.
- `provenance` — which adapter and inputs produced each node.

### 1.4 Semantic Drift Detection

Detect when projections or implementation diverge from canonical knowledge:

- `DOCUMENTATION_DRIFT` — generated docs no longer match knowledge.
- `ARCHITECTURE_DRIFT` — projected architecture differs from selected architecture.
- `REQUIREMENTS_DRIFT` — implementation lacks required objectives.
- `UNKNOWN_INTRODUCED` — new unknown appears without being recorded.

---

## Deliverables

1. Canonical Knowledge Graph module (`src/knowledge/`).
2. Knowledge graph schema and TypeScript types aligned with SKR.
3. Projection engine for Mission and Expedition proposals.
4. Projection engine for ADR and documentation artifacts.
5. Versioning, lineage, and provenance tracking.
6. Semantic drift detection engine.
7. Reference contract: `docs/reference/canonical-knowledge-contract.md`.
8. ADR on Canonical Knowledge semantics.
9. Regression tests.

---

## Acceptance Criteria

- An approved `DomainModel` produces a `KnowledgeGraph`.
- The graph contains nodes for entities, events, missions, expeditions, objectives, discoveries, decisions, artifacts, observations, and constraints.
- Projections produce deterministic Mission and Expedition proposals.
- Projections produce deterministic ADR and documentation outlines.
- Versioning records lineage and provenance.
- Drift detection reports documentation, architecture, requirements, and unknown drift.
- The same domain model and adapter version produce the same knowledge graph.
- `npm run govern` passes.

---

## Out of Scope

- Prototype validation (EXP-KNOWLEDGE-002).
- Runtime capability verification (EXP-KNOWLEDGE-002).
- Code generation from projections.
- IDE or editor integrations.

---

## Success Criteria

Deleting every generated document should not lose project understanding because every artifact is reproducible from the Canonical Knowledge Graph.
