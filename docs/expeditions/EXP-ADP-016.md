# EXP-ADP-016 — Objective Builder Adapter

**Status:** Completed  
**Kind:** Planning Adapter  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-015  
**Blocks:** Mission Studio planning pipeline

---

## Purpose

Convert expedition Observations into objective Observations.

The Objective Builder Adapter is a Planning Adapter. It does not read files or external systems. It inspects `Observation[]` — especially `expedition` observations — and produces `objective` observations that Mission Studio can use to define concrete, measurable goals.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Planning Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Decompose expeditions into actionable objectives |

---

## Responsibilities

- Accept `Observation[]`.
- Preserve existing `objective` observations.
- Convert each `expedition` observation into a set of concrete `objective` observations.
- Derive standard objectives: design, implement, and validate.
- Emit `objective` Observations with measurable phrasing and source references.
- Avoid duplicates.
- Never read external systems directly.
- Never mutate runtime state.

---

## Input

```typescript
Observation[]
```

---

## Output

```typescript
Observation {
  category: "objective"
  subject: "Design CRM Expedition"
  confidence: "medium"
  evidence: [{
    description: "Derived from expedition observation",
    snippet: "CRM Expedition"
  }]
  metadata: { sourceExpeditionId: "obs-expedition-...", phase: "design" }
}
```

---

## Objective Derivation Rules

| Source | Rule |
|--------|------|
| `objective` | Pass through, preserving original evidence. |
| `expedition` | Create three objectives: `Design <Expedition>`, `Implement <Expedition>`, and `Validate <Expedition>`. |

---

## Confidence Rules

- `high` — objective derived from explicit objective observation.
- `medium` — objective generated from an expedition.

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
- Every objective references the expedition that produced it.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Explicit objective observations are preserved.
- Expedition observations produce design, implement, and validate objectives.
- Adapter passes lifecycle and health checks.

---

## Completion Criteria

Objective Builder Adapter is complete when:

- `src/adapters/objective-builder/adapter.ts` implements the objective derivation logic.
- `src/adapters/objective-builder/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover objective preservation, expedition conversion, and lifecycle.
