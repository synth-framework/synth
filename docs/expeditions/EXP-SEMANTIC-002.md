> This document is governed by **EXP-PROGRAM-024 — Semantic Modeling**.

# EXP-SEMANTIC-002 — Domain Modeling Engine

> **Architecture expedition.** Define the domain ontology, ubiquitous language, bounded contexts, integrity rules, and semantic drift detection for the problem space.

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

Transform an approved Intent Model into an implementation-independent Domain Model. The model captures the concepts, relationships, invariants, and boundaries of the problem space, and produces a governed ubiquitous language.

---

## Required Change

### 2.1 Domain Ontology

Define the canonical elements of a SYNTH Domain Model:

| Element | Description |
|---------|-------------|
| `Entity` | A domain object with identity that persists over time. |
| `ValueObject` | An immutable, identity-free descriptor. |
| `Aggregate` | A consistency boundary enclosing entities and value objects. |
| `Relationship` | A typed association between domain elements. |
| `Invariant` | A rule that must always hold true. |
| `Policy` | A decision rule that governs behavior. |
| `BoundedContext` | A semantic boundary within which a model is consistent. |
| `DomainEvent` | Something that happened in the domain. |
| `SourceOfTruth` | The canonical owner of a fact or concept. |

### 2.2 Ubiquitous Language

Produce a governed vocabulary from the domain model:

| Field | Description |
|-------|-------------|
| `canonicalName` | The single approved name for a concept. |
| `aliases` | Alternative names that map to the canonical term. |
| `definition` | A precise explanation. |
| `ownership` | The bounded context that owns the term. |
| `relationships` | Related terms. |

### 2.3 Domain Integrity Rules

Detect:

- `DUPLICATED_CONCEPT` — the same concept appears under different names.
- `CONFLICTING_TERMINOLOGY` — the same name means different things in different contexts.
- `CYCLIC_DEPENDENCY` — two or more elements depend on each other circularly.
- `INCONSISTENT_OWNERSHIP` — a term is owned by multiple bounded contexts without an explicit mapping.

### 2.4 Bounded Contexts

Derive boundaries from:

- distinct stakeholder groups,
- separate lifecycle ownership,
- conflicting terminology,
- natural aggregate boundaries.

### 2.5 Domain Evolution

Track:

- additions,
- splits,
- merges,
- deprecations.

Every change must be replayable from the inputs and decisions that produced it.

---

## Deliverables

1. Domain Modeling Engine module (`src/semantic-modeling/domain/`).
2. `DomainModel` schema and TypeScript types.
3. Rule-based domain extraction adapter.
4. Ubiquitous language generator.
5. Domain integrity rule engine.
6. Bounded context detection.
7. Reference contract: `docs/reference/semantic-domain-contract.md`.
8. ADR on Domain Modeling semantics.
9. Regression tests.

---

## Acceptance Criteria

- An approved `IntentModel` produces a `DomainModel`.
- The model contains entities, relationships, invariants, policies, bounded contexts, and events.
- The ubiquitous language lists every canonical term with definition and ownership.
- Domain integrity rules detect duplicated concepts, conflicting terminology, cyclic dependencies, and inconsistent ownership.
- The same intent model and adapter version produce the same domain model.
- `npm run govern` passes.

---

## Out of Scope

- Canonical Knowledge Model persistence (EXP-PROGRAM-025).
- Prototype-first validation (EXP-PROGRAM-025).
- Code generation from the domain model.
- IDE or editor integrations.

---

## Success Criteria

The implementation stack is replaceable without changing the canonical domain model. Two independent agents using the same adapter version and the same `IntentModel` converge on substantially equivalent domain models:

- same entities,
- same relationships,
- same bounded contexts,
- same ubiquitous language terms,
- same integrity findings.
