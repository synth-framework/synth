> This document is governed by **EXP-GENESIS-002 — Genesis Intent Capture & Classification**.

# Genesis Intent Capture & Classification Contract

This document defines the contracts for turning raw operator input into a classified, scoped Genesis artifact. It covers intent capture, context classification, constraint extraction, scope negotiation, ambiguity detection, unknown tracking, and evidence attachment.

## 1. Intent Capture Engine

### 1.1 Inputs

The intent capture engine accepts evidence from:

- natural language statements
- documents (Markdown, text, PDF)
- URLs
- images and diagrams
- existing repositories
- prior transcripts

### 1.2 Output — `IntentExtractionResult`

| Field | Type | Description |
|-------|------|-------------|
| `intent.description` | string | Plain-language project goal. |
| `intent.goals` | string[] | High-level objectives. |
| `intent.successCriteria` | string[] | Measurable outcomes. |
| `audience.primaryUsers` | string[] | Primary users of the system. |
| `audience.stakeholders` | string[] | Other interested parties. |
| `environment.targetRuntime` | string | Preferred runtime (e.g., Node.js, Python). |
| `environment.languagePreferences` | string[] | Preferred languages. |
| `environment.platformConstraints` | string[] | Deployment/platform constraints. |
| `capabilities.required` | string[] | Must-have capabilities. |
| `capabilities.optional` | string[] | Nice-to-have capabilities. |
| `constraints.functional` | string[] | Functional constraints. |
| `constraints.nonFunctional` | string[] | Non-functional constraints (performance, security, etc.). |
| `unknowns` | ExtractedUnknown[] | Identified unknowns and risks. |
| `confidence.overall` | number | Aggregate confidence score. |
| `confidence.byField` | Record | Per-field confidence scores. |
| `transcript` | TranscriptEntry[] | Replayable conversation history. |

Source of truth: `src/first-contact/extract/types.ts`.

### 1.3 Determinism

Intent extraction adapters must be deterministic: the same input and context produce the same result for a fixed adapter version.

## 2. Context Classifier

### 2.1 Classification Dimensions

| Dimension | Values |
|-----------|--------|
| Origin | `greenfield`, `brownfield`, `hybrid` |
| Distribution | `internal`, `commercial`, `oss` |
| Maturity | `prototype`, `production` |
| Criticality | `low`, `medium`, `high`, `critical` |
| Domain | free-form domain label |

### 2.2 Output

The classifier produces the `context` section of the Genesis artifact:

```json
{
  "repositoryType": "greenfield",
  "phase": "intent-capture",
  "implementationState": "missing",
  "sourceHistory": "MISSING"
}
```

## 3. Constraint Extraction

Constraints are extracted into two categories:

| Category | Examples |
|----------|----------|
| `functional` | must support markdown rendering, must allow user login |
| `nonFunctional` | must load in < 1s, must be deployable offline |

Constraints become hard requirements for architecture projection and capability verification.

## 4. Scope Negotiation

Scope is expressed with MoSCoW priorities:

| Priority | Meaning |
|----------|---------|
| `Must Have` | Required for MVP approval. |
| `Should Have` | Important but not blocking. |
| `Could Have` | Desired if capacity allows. |
| `Won't Have` | Explicitly out of scope. |

The scope negotiation strategy recommends an MVP boundary based on:

- constraint priority
- complexity estimate
- confidence score
- unknown impact

## 5. Ambiguity Detection

Ambiguities are classified as:

| Class | Meaning |
|-------|---------|
| `MISSING_REQUIRED` | A required field is absent. |
| `LOW_CONFIDENCE` | Extracted value has low confidence. |
| `CONFLICTING` | Two or more values contradict each other. |
| `NEEDS_DISAMBIGUATION` | Term has multiple plausible meanings. |

The clarification strategy generates targeted questions for each ambiguity.

## 6. Unknown Tracker

Unknowns are recorded with:

| Field | Description |
|-------|-------------|
| `field` | Which artifact field is affected. |
| `description` | What is unknown. |
| `confidence` | Confidence that this is a genuine gap. |
| `accepted` | Whether the operator accepted the unknown as a risk. |

Blocking unknowns prevent approval regardless of overall confidence.

## 7. Evidence Attachment Model

Every field in the Genesis artifact must be traceable to evidence:

- `evidenceRefs`: ids of evidence claims supporting the field.
- `observationIds`: ids of raw observations supporting the evidence.
- `transcript`: conversation history that led to the field.

## 8. Adapter Contract

Intent extraction adapters implement:

```ts
interface IntentExtractionAdapter {
  readonly version: string
  extract(input: string, context?: IntentExtractionContext): IntentExtractionResult
}
```

Clarification strategies implement:

```ts
interface ClarificationStrategy {
  readonly version: string
  detectAmbiguities(artifact: IntentExtractionResult): Ambiguity[]
  generateQuestions(ambiguities: Ambiguity[]): ClarificationQuestion[]
  applyAnswer(artifact, question, answer): IntentExtractionResult
  shouldContinue(artifact): boolean
}
```

## 9. Convergence Criterion

Two independent agents using the same adapter version and the same inputs must produce substantially equivalent artifacts:

- same intent description (semantic equivalence)
- same classification dimensions
- same constraints
- same scope priorities
- same unknowns (within tolerance for confidence thresholds)
