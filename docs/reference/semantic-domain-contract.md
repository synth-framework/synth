> This document is governed by **EXP-SEMANTIC-002 — Domain Modeling Engine**.

# Semantic Domain Modeling Contract

This document defines the contract for transforming an approved Intent Model into a canonical, implementation-independent Domain Model.

## 1. Purpose

The Domain Model captures the concepts, relationships, invariants, and boundaries of the problem space. It is the canonical source of truth for the ubiquitous language and for all implementation-independent system knowledge.

## 2. Inputs

- An approved `IntentModel`.
- An optional `DomainModelingAdapter`; defaults to `RuleBasedDomainModelingAdapter`.

Source of truth: `src/semantic-modeling/domain/types.ts`.

## 3. Outputs — `DomainModel`

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | `"synth-domain-model-v1"`. |
| `version` | string | Model version. |
| `derivedFrom.intentModelId` | string | Source intent model id. |
| `derivedFrom.adapterId` | string | Adapter that produced the model. |
| `derivedFrom.adapterVersion` | string | Adapter version for reproducibility. |
| `entities` | `Entity[]` | Domain entities. |
| `valueObjects` | `ValueObject[]` | Immutable descriptors. |
| `aggregates` | `Aggregate[]` | Consistency boundaries. |
| `relationships` | `DomainRelationship[]` | Typed associations. |
| `invariants` | `Invariant[]` | Rules that must always hold. |
| `policies` | `Policy[]` | Decision rules. |
| `boundedContexts` | `BoundedContext[]` | Semantic boundaries. |
| `events` | `DomainEvent[]` | Domain events. |
| `sourcesOfTruth` | `SourceOfTruth[]` | Canonical ownership of facts. |
| `ubiquitousLanguage` | `UbiquitousLanguageTerm[]` | Governed vocabulary. |
| `integrityFindings` | `IntegrityFinding[]` | Detected model issues. |
| `generatedAt` | ISO timestamp | Generation time (not part of deterministic identity). |

## 4. Domain Elements

### 4.1 Entity

| Field | Description |
|-------|-------------|
| `id` | Stable identifier. |
| `name` | PascalCase concept name. |
| `description` | How the concept was inferred. |
| `confidence` | Certainty score. |
| `evidence` | Source labels. |

### 4.2 Value Object

Same shape as Entity, but represents an immutable descriptor without identity.

### 4.3 Aggregate

| Field | Description |
|-------|-------------|
| `id` | Stable identifier. |
| `name` | Aggregate name. |
| `rootEntityId` | Root entity of the aggregate. |
| `entityIds` | Entities enclosed by the aggregate. |

### 4.4 Bounded Context

| Field | Description |
|-------|-------------|
| `id` | Stable identifier. |
| `name` | Context name. |
| `owner` | Stakeholder or team that owns the context. |
| `entityIds` | Entities belonging to the context. |

### 4.5 Domain Event

| Field | Description |
|-------|-------------|
| `id` | Stable identifier. |
| `name` | PascalCase event name. |
| `description` | What happened. |
| `emittedBy` | Entity that emits the event. |

### 4.6 Ubiquitous Language Term

| Field | Description |
|-------|-------------|
| `canonicalName` | Approved term. |
| `aliases` | Alternative names. |
| `definition` | Precise meaning. |
| `owner` | Bounded context that owns the term. |
| `relationships` | Related terms. |

## 5. Integrity Findings

| Class | Meaning | Severity |
|-------|---------|----------|
| `DUPLICATED_CONCEPT` | Same concept under different names. | warning |
| `CONFLICTING_TERMINOLOGY` | Same name means different things. | warning |
| `CYCLIC_DEPENDENCY` | Circular relationships between entities. | error |
| `INCONSISTENT_OWNERSHIP` | Entity not owned by any context. | warning |

## 6. Determinism

The same `IntentModel` and adapter version must produce:

- the same entities,
- the same relationships,
- the same bounded contexts,
- the same ubiquitous language,
- the same integrity findings.

`generatedAt` is the only field allowed to vary across runs.

## 7. Adapter Contract

```ts
interface DomainModelingAdapter {
  readonly id: string
  readonly version: string
  model(options: DomainModelingOptions): DomainModel
}
```

Adapters must be deterministic and self-describing.

## 8. Hard Constraints

> **Implementation independence:** The Domain Model must not depend on a specific framework, language, runtime, or deployment target.
>
> **Determinism:** Reproducible for fixed inputs and adapter version.
>
> **Replayability:** Model evolution must be reconstructible from the Intent Model and any modeling decisions.
>
> **Canonical vocabulary:** Terms must respect `docs/ubiquitous-language.md`.
