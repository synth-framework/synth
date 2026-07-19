# EXP-KNOWLEDGE-001 — Canonical Knowledge Model

> **Architecture expedition.** Define the versioned knowledge graph, projection engine, semantic drift detection, and knowledge versioning semantics.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-025 — Canonical Knowledge & Validation  
**Depends On:** EXP-PROGRAM-024 (Semantic Modeling)

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

Replace document-centric development with knowledge-centric development.

This expedition defines the Canonical Knowledge Model: a versioned, replayable knowledge graph from which all project artifacts are projected.

---

## Required Change

### 1.1 Knowledge Graph

Create a versioned knowledge graph that stores:

- Intent
- Domain
- Constraints
- Decisions
- Evidence
- Assumptions
- Risks
- Questions
- Architecture rationale

### 1.2 Projection Engine

Generate from the knowledge model:

- Mission
- Expeditions
- Requirements
- ADRs
- Architecture documentation
- Technical specifications
- User documentation

No projection becomes the source of truth.

### 1.3 Knowledge Versioning

Support:

- replay
- branching
- merges
- lineage
- provenance

### 1.4 Semantic Drift Detection

Detect when projections diverge from canonical knowledge:

- documentation drift
- implementation drift
- architecture drift
- requirements drift

---

## Deliverables

1. Knowledge graph schema.
2. Projection engine contract.
3. Mission and Expedition projection rules.
4. Documentation projection templates.
5. Knowledge versioning semantics.
6. Lineage and provenance model.
7. Semantic drift detection rules.
8. ADR on canonical knowledge semantics.

---

## Acceptance Criteria

- The knowledge graph stores intent, domain, constraints, decisions, evidence, assumptions, risks, questions, and rationale.
- Projections produce deterministic artifacts from the knowledge graph.
- Deleting every generated document does not lose project understanding.
- Knowledge evolution is replayable and lineage-aware.
- Semantic drift is detectable between projections and canonical knowledge.
- `npm run govern` passes.

---

## Out of Scope

- Intent modeling (EXP-SEMANTIC-001).
- Domain modeling (EXP-SEMANTIC-002).
- Prototype validation (EXP-KNOWLEDGE-002).
- Code generation.

---

## Success Criteria

Knowledge becomes the durable, canonical center of every SYNTH project.
