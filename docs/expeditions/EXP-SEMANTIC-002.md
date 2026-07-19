# EXP-SEMANTIC-002 — Domain Modeling Engine

> **Architecture expedition.** Generate entities, aggregates, bounded contexts, invariants, policies, and ubiquitous language from intent and evidence.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-024 — Semantic Modeling  
**Depends On:** EXP-SEMANTIC-001 (Intent Modeling Engine)

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

The domain is canonical. Technology is a projection.

This expedition defines the Domain Modeling Engine that turns intent and evidence into a deterministic, implementation-independent domain model.

---

## Required Change

### 2.1 Domain Artifacts

Generate:

- Entities
- Value Objects
- Aggregates
- Relationships
- Invariants
- Policies
- Bounded Contexts
- Events
- Sources of Truth

### 2.2 Ubiquitous Language

Produce a governed vocabulary. Every concept has:

- canonical name
- aliases
- definition
- ownership
- relationships

### 2.3 Domain Integrity

Detect:

- duplicated concepts
- conflicting terminology
- cyclic dependencies
- inconsistent ownership

### 2.4 Domain Evolution

Track:

- additions
- splits
- merges
- deprecations

with replay support.

---

## Deliverables

1. Domain model schema.
2. Entity and aggregate extraction rules.
3. Bounded context boundary heuristics.
4. Ubiquitous language registry.
5. Domain integrity validation rules.
6. Domain evolution tracking.
7. Replay integration.
8. ADR on domain model semantics.

---

## Acceptance Criteria

- An intent model produces a domain model with entities, aggregates, and bounded contexts.
- Every concept has a canonical name, definition, ownership, and relationships.
- Integrity violations are detected deterministically.
- Domain evolution is replayable.
- The domain model is independent of implementation technology.
- `npm run govern` passes.

---

## Out of Scope

- Intent extraction (EXP-SEMANTIC-001).
- Knowledge Model projections (EXP-KNOWLEDGE-001).
- Prototype validation (EXP-KNOWLEDGE-002).
- Code generation.

---

## Success Criteria

The domain becomes a canonical, replayable artifact that downstream programs can project into architecture and implementations.
