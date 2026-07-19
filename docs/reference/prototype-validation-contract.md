> This document is governed by **EXP-KNOWLEDGE-002 — Prototype-First Validation**.

# Prototype-First Validation Contract

This document defines the contract for validating a Canonical Knowledge Graph before implementation through acceptance scenarios, mock APIs, simulations, and runtime verification.

## 1. Purpose

A project should be able to reach Mission approval without a single line of production code. Prototype-First Validation ensures that intent, domain, and acceptance criteria are understood and feasible before implementation begins.

## 2. Inputs

- A `KnowledgeGraph`.
- An optional `ValidationAdapter`; defaults to `RuleBasedValidationAdapter`.

Source of truth: `src/knowledge/validation/types.ts`.

## 3. Outputs — `ValidationReport`

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | `"synth-validation-report-v1"`. |
| `version` | string | Report version. |
| `status` | `"passed" \| "blocked" \| "pending"` | Aggregate validation status. |
| `scenarios` | `AcceptanceScenario[]` | Generated acceptance scenarios. |
| `mockApi` | `MockApiEndpoint[]` | Generated mock API endpoints. |
| `simulations` | `SimulationTrace[]` | Deterministic simulation traces. |
| `runtimeVerification` | `RuntimeVerificationReport` | Capability availability report. |
| `blockers` | `string[]` | Human-readable blocking issues. |
| `reportHash` | string | Deterministic hash of report content. |
| `generatedAt` | ISO timestamp | Generation time (not part of deterministic identity). |

## 4. Acceptance Scenarios

| Field | Description |
|-------|-------------|
| `id` | Stable scenario identifier. |
| `objectiveId` | Related knowledge graph objective. |
| `given` | Initial state or context. |
| `when` | Action or event. |
| `then` | Expected outcome. |
| `validationMethod` | `manual`, `simulation`, or `runtime-check`. |
| `status` | `passed`, `blocked`, or `pending`. |

## 5. Mock API Endpoints

| Field | Description |
|-------|-------------|
| `id` | Stable endpoint identifier. |
| `path` | REST path derived from a domain event. |
| `method` | HTTP method. |
| `description` | Human-readable purpose. |
| `requestSchema` | Request shape. |
| `responseSchema` | Response shape. |
| `derivedFromEventId` | Source domain event node id. |

## 6. Simulation Traces

| Field | Description |
|-------|-------------|
| `id` | Stable trace identifier. |
| `scenarioId` | Related acceptance scenario. |
| `events` | Ordered event sequence. |
| `outcome` | Expected outcome. |
| `deterministic` | Whether the trace is reproducible. |

## 7. Runtime Verification

| Field | Description |
|-------|-------------|
| `status` | Aggregate runtime status. |
| `checks` | Per-capability checks. |
| `reportHash` | Deterministic hash. |

Each `RuntimeCheck` reports `AVAILABLE`, `DEGRADED`, `MISSING`, or `UNAVAILABLE`.

## 8. Validation Status Rules

| Status | Condition |
|--------|-----------|
| `passed` | All scenarios validated and runtime checks pass. |
| `blocked` | Runtime checks fail or required scenarios are pending. |
| `pending` | Some scenarios require manual validation. |

## 9. Determinism

The same `KnowledgeGraph` and adapter version must produce:

- the same scenarios,
- the same mock API endpoints,
- the same simulation traces,
- the same runtime verification report,
- the same report hash.

`generatedAt` is the only field allowed to vary across runs.

## 10. Adapter Contract

```ts
interface ValidationAdapter {
  readonly id: string
  readonly version: string
  validate(options: ValidationOptions): ValidationReport
}
```

## 11. Hard Constraints

> **Validation before implementation:** Mission approval requires a passing or non-blocked validation report.
>
> **Determinism:** Reproducible for fixed inputs and adapter version.
>
> **Public commands only:** Runtime verification must use only observable environment commands.
