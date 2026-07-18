# EXP-ADP-OBS-001 — Observation Adapter

**Status:** Completed
**Kind:** Constitutional Adapter Contract
**Priority:** Critical
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**Depends On:** EXP-ADP-000, EXP-MST-001
**Blocks:** EXP-ADP-005, EXP-ADP-006, EXP-ADP-007, EXP-ADP-008, EXP-ADP-009, EXP-ADP-010, EXP-ADP-011, EXP-ADP-012, EXP-ADP-013, EXP-ADP-014, EXP-ADP-015, EXP-ADP-016, EXP-ADP-017

---

## Purpose

Define the canonical data structure that every adapter must emit when feeding evidence into Mission Studio.

Mission Studio never reads external systems directly.

Mission Studio consumes only `Observation[]`.

The Observation Adapter is not an external adapter. It is the constitutional contract that unifies all adapters upstream of planning.

---

## Constitutional Position

```text
Evidence
    │
    ▼
Adapter
    │
    ▼
Observation
    │
    ▼
Mission Studio
```

Every adapter that produces planning evidence emits Observations.

Mission Studio receives Observations and nothing else.

---

## Observation Model

```typescript
Observation {
  id: string
  source: ObservationSource
  category: ObservationCategory
  subject: string
  evidence: ObservationEvidence[]
  confidence: ObservationConfidence
  timestamp: number
  metadata?: Record<string, unknown>
}
```

### Fields

| Field | Purpose |
|-------|---------|
| `id` | Stable unique identifier for the observation |
| `source` | Which adapter produced it and where it came from |
| `category` | What kind of knowledge it represents |
| `subject` | What the observation is about |
| `evidence` | References and snippets backing the observation |
| `confidence` | Certain, high, medium, low, or unknown |
| `timestamp` | When the observation was produced |
| `metadata` | Adapter-specific, serializable context |

---

## Categories

Observations are classified by the kind of knowledge they carry.

Examples:

* `intent` — what the operator wants
* `language` — programming language detected
* `framework` — framework detected
* `dependency` — package or module dependency
* `component` — architectural component
* `architecture` — architectural style
* `constraint` — explicit or inferred limitation
* `risk` — potential problem
* `assumption` — believed but unverified fact
* `unknown` — identified gap
* `evidence` — raw supporting material
* `actor` — person, system, or role
* `capability` — existing or needed capability
* `test` — test-related finding
* `coverage` — coverage-related finding
* `custom` — adapter-specific category

Adapters may extend `metadata` freely, but `category` must remain canonical.

---

## Confidence

Every observation carries a confidence level:

* `certain` — directly observed, no inference
* `high` — strong evidence, minor inference
* `medium` — reasonable evidence, some inference
* `low` — weak evidence or heavy inference
* `unknown` — cannot be evaluated

Mission Studio uses confidence to decide when to ask clarifying questions.

---

## Evidence Reference

Each observation references the evidence that supports it.

```typescript
ObservationEvidence {
  description: string
  snippet?: string
  fingerprint?: string
}
```

Evidence must be traceable back to the original source.

Evidence is immutable.

---

## Observable Adapter Interface

Adapters that feed Mission Studio implement the `ObservableAdapter` interface:

```typescript
interface ObservableAdapter extends Adapter {
  observe(): Promise<ObservationBatch>
}
```

`observe()` is read-only.

`observe()` never mutates state.

`observe()` returns a batch of canonical Observations.

---

## Invariants

* Every observation has a non-empty `id`.
* Every observation has a valid `source.adapter`.
* Every observation has a canonical `category`.
* Every observation has at least one evidence reference.
* Every observation has a `confidence` value.
* `observe()` is idempotent for unchanged inputs.
* `observe()` does not invoke capabilities.
* `observe()` does not append events.

---

## Relation to Mission Studio

Mission Studio receives `Observation[]` from multiple adapters and performs:

```text
Observations
    │
    ▼
Knowledge Extraction
    │
    ▼
World Model
    │
    ▼
Confidence Evaluation
    │
    ▼
Question Generation
    │
    ▼
Mission / Expedition Proposal
    │
    ▼
Genesis
```

Mission Studio does not know which adapter produced which observation.

It only knows the canonical content, confidence, and evidence.

---

## Success Criteria

* `Observation` is a frozen kernel type.
* `ObservableAdapter` is part of the adapter constitution.
* Every evidence-producing adapter emits `Observation[]`.
* Mission Studio consumes only `Observation[]`.
* No platform-specific concepts leak into `Observation`.
* Confidence and evidence are mandatory and explainable.

---

## Completion Criteria

Observation Adapter is complete when:

* The `Observation` type is declared in `src/types/observation.ts`.
* The `ObservableAdapter` interface extends the canonical `Adapter` interface.
* Mission Studio's input contract is defined strictly as `Observation[]`.
* Existing adapters can optionally implement `observe()` without breaking changes.
* Documentation and constitution reflect Observation as a first-class primitive.
