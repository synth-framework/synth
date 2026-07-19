> This document is governed by **EXP-SEMANTIC-001 — Intent Modeling Engine**.

# Semantic Intent Modeling Contract

This document defines the contract for transforming an approved Genesis artifact into a canonical, implementation-independent Intent Model.

## 1. Purpose

The Intent Model captures what the system should achieve, for whom, and under what assumptions. It is the canonical source of truth for goals, requirements, success criteria, and acceptance before any domain or implementation decisions are made.

## 2. Inputs

- An approved Genesis artifact (`IntentExtractionResult`).
- An optional `IntentModelingAdapter`; defaults to `RuleBasedIntentModelingAdapter`.

Source of truth: `src/semantic-modeling/intent/types.ts`.

## 3. Outputs — `IntentModel`

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | `"synth-intent-model-v1"`. |
| `version` | string | Model version. |
| `derivedFrom.discoveryArtifactId` | string | Source Genesis artifact id. |
| `derivedFrom.adapterId` | string | Adapter that produced the model. |
| `derivedFrom.adapterVersion` | string | Adapter version for reproducibility. |
| `graph.nodes` | `IntentNode[]` | Canonical intent nodes. |
| `graph.edges` | `IntentEdge[]` | Typed relationships between nodes. |
| `aggregateConfidence` | number | Average confidence across nodes. |
| `ambiguities` | `Ambiguity[]` | Detected ambiguity and conflict. |
| `generatedAt` | ISO timestamp | Generation time (not part of deterministic identity). |

## 4. Intent Node Types

| Type | Description |
|------|-------------|
| `problem` | The situation a goal resolves. |
| `goal` | What the system should achieve. |
| `stakeholder` | Who cares about a goal. |
| `outcome` | A measurable result of achieving a goal. |
| `success-criterion` | A concrete acceptance test for an outcome. |
| `assumption` | Something taken as true for the intent to hold. |
| `unknown` | A recognized gap that may affect the intent. |
| `constraint` | A hard limit on the solution space. |

## 5. Intent Edge Types

| Type | Semantics |
|------|-----------|
| `derives` | A problem derives a goal. |
| `produces` | A goal produces an outcome. |
| `validated-by` | An outcome is validated by a success criterion. |
| `owns` | A stakeholder owns a goal. |
| `affects` | A constraint or unknown affects another node. |

## 6. Confidence Model

Every node carries a confidence score between 0.0 and 1.0. Aggregate confidence is the arithmetic mean of node confidence. Confidence is deterministic for a fixed artifact and adapter version.

## 7. Ambiguity Detection

| Class | Meaning | Blocking |
|-------|---------|----------|
| `MISSING_REQUIRED` | A required field is absent. | Yes |
| `LOW_CONFIDENCE` | A node falls below the confidence threshold. | No |
| `CONFLICTING` | The same label maps to multiple nodes. | No |
| `NEEDS_DISAMBIGUATION` | An unaccepted unknown has high confidence. | Yes |

Ambiguities are surfaced with location, message, and affected node ids.

## 8. Determinism

The same approved Genesis artifact and adapter version must produce:

- the same set of nodes,
- the same edges,
- the same aggregate confidence,
- the same ambiguities.

`generatedAt` is the only field allowed to vary across runs.

## 9. Adapter Contract

```ts
interface IntentModelingAdapter {
  readonly id: string
  readonly version: string
  model(options: IntentModelingOptions): IntentModel
}
```

Adapters must be deterministic and self-describing.

## 10. Hard Constraints

> **Implementation independence:** The Intent Model must not depend on a specific framework, language, runtime, or deployment target.
>
> **Determinism:** Reproducible for fixed inputs and adapter version.
>
> **Replayability:** Model evolution must be reconstructible from the Genesis artifact and any clarification decisions.
>
> **Canonical vocabulary:** Node labels must respect `docs/ubiquitous-language.md`.
