# EXP-ADP-017 — Wizard Adapter

**Status:** Completed
**Kind:** Planning
**Priority:** Medium
**Depends On:** EXP-ADP-000, EXP-ADP-OBS-001, EXP-ADP-016
**Blocks:** Mission Studio interactive approval

---

## Objective

Convert objective observations into interactive wizard step observations.

The Wizard Adapter is a Planning Adapter. It does not read files or external systems. It inspects `Observation[]` — especially `objective` observations — and produces `wizard` observations that Mission Studio can present to an operator for interactive approval, rejection, merging, splitting, or refinement.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Planning Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Surface interactive approval steps for objectives |

---

## Responsibilities

- Accept `Observation[]`.
- Preserve existing `wizard` observations.
- Convert each `objective` observation into a `wizard` observation.
- Attach a configurable set of interactive actions (approve, reject, merge, split, refine).
- Emit `wizard` Observations with meaningful titles, evidence references, and action metadata.
- Avoid duplicates.
- Never read external systems directly.
- Never mutate runtime state.

---

## Inputs/Outputs

### Input

```typescript
Observation[]
```

Example source observation:

```typescript
{
  category: "objective",
  subject: "Design CRM Expedition",
  confidence: "medium",
  evidence: [{ description: "Derived from expedition observation", snippet: "CRM Expedition" }],
  metadata: { sourceExpeditionId: "obs-expedition-...", phase: "design" }
}
```

### Output

```typescript
Observation {
  id: "obs-wizard-..."
  source: { adapter: "wizard", locator: "objective-obs-objective-..." }
  category: "wizard"
  subject: "Review: Design CRM Expedition"
  confidence: "medium"
  evidence: [{
    description: "Derived from objective observation",
    snippet: "Design CRM Expedition",
    fingerprint: "..."
  }]
  timestamp: number
  metadata: {
    sourceObjectiveId: "obs-objective-...",
    objectiveSubject: "Design CRM Expedition",
    actions: ["approve", "reject", "merge", "split", "refine"],
    phase: "design"
  }
}
```

---

## Wizard Derivation Rules

| Source | Rule |
|--------|------|
| `wizard` | Pass through, preserving original evidence and refreshing the source locator. |
| `objective` | Create one wizard observation titled `Review: <objective subject>` with the configured actions. |

---

## Confidence Rules

- `high` — wizard observation explicitly provided.
- `medium` — wizard generated from an objective observation.

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`build()` is available once enabled.

---

## Invariants

- Input is strictly `Observation[]`.
- Output is strictly `Observation[]`.
- Every wizard observation references the objective that produced it.
- Duplicate objectives produce only one wizard observation.
- No external system is accessed.
- No state is mutated.

---

## Public Interface

```typescript
interface WizardAdapter extends Adapter {
  build(): Promise<ObservationBatch>
  buildFrom(observations: Observation[]): Promise<ObservationBatch>
}
```

Implementation: `src/adapters/wizard/adapter.ts`  
Tests: `tests/adapter-wizard.test.js`

---

## Success Criteria

- Existing wizard observations are preserved.
- Objective observations produce wizard observations.
- Each wizard observation exposes the configured interactive actions.
- Adapter passes lifecycle and health checks.
- Evaluation is deterministic for the same input.

---

## Definition of Done

- [x] `src/adapters/wizard/adapter.ts` implements the wizard derivation logic.
- [x] `src/adapters/wizard/types.ts` defines the input/output contracts.
- [x] The adapter is registered in `AdapterRegistry`.
- [x] Tests cover wizard preservation, objective conversion, configured actions, duplicate suppression, and lifecycle.
- [x] Expedition documentation (`EXP-ADP-017.md`) is recorded as Completed.
