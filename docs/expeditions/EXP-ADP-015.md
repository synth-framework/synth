# EXP-ADP-015 — Expedition Builder Adapter

**Status:** Completed  
**Kind:** Planning Adapter  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-014  
**Blocks:** Mission Studio planning pipeline

---

## Purpose

Convert mission Observations into expedition Observations.

The Expedition Builder Adapter is a Planning Adapter. It does not read files or external systems. It inspects `Observation[]` — especially `mission` observations — and produces `expedition` observations that Mission Studio can use to organize work into themes or epics.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Planning Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Decompose missions into thematic expeditions |

---

## Responsibilities

- Accept `Observation[]`.
- Preserve existing `expedition` observations.
- Convert each `mission` observation into one or more `expedition` observations.
- Split missions that reference multiple capabilities into separate expeditions.
- Emit `expedition` Observations with meaningful names and source references.
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
  category: "expedition"
  subject: "CRM Foundation Expedition"
  confidence: "high"
  evidence: [{
    description: "Derived from mission observation",
    snippet: "Build a CRM"
  }]
  metadata: { sourceMissionId: "obs-mission-..." }
}
```

---

## Expedition Derivation Rules

| Source | Rule |
|--------|------|
| `expedition` | Pass through, preserving original evidence. |
| `mission` (single theme) | Create one expedition titled "<Mission> Expedition". |
| `mission` (multiple themes) | Split by capability/domain keywords and create one expedition per theme. |

---

## Confidence Rules

- `high` — expedition derived from explicit expedition or clear single-theme mission.
- `medium` — expedition split from a multi-theme mission or derived from capabilities.

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
- Every expedition references the mission that produced it.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Explicit expedition observations are preserved.
- Mission observations produce expedition observations.
- Multi-theme missions produce multiple expeditions.
- Adapter passes lifecycle and health checks.

---

## Completion Criteria

Expedition Builder Adapter is complete when:

- `src/adapters/expedition-builder/adapter.ts` implements the expedition derivation logic.
- `src/adapters/expedition-builder/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover expedition preservation, mission conversion, multi-theme splitting, and lifecycle.
