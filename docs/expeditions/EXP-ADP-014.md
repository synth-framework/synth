# EXP-ADP-014 — Mission Builder Adapter

**Status:** Completed  
**Kind:** Planning Adapter  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-005, EXP-ADP-010  
**Blocks:** Mission Studio planning pipeline

---

## Purpose

Convert Observations into mission Observations.

The Mission Builder Adapter is a Planning Adapter. It does not read files or external systems. It inspects `Observation[]` — especially `intent`, `mission`, and `capability` observations — and produces `mission` observations that Mission Studio can use to plan work.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Planning Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Surface candidate missions from extracted knowledge |

---

## Responsibilities

- Accept `Observation[]`.
- Convert `intent` observations into mission observations.
- Preserve existing `mission` observations.
- Derive missions from groups of related `capability` observations when no explicit intent exists.
- Emit `mission` Observations with meaningful names, goals, and source references.
- Avoid duplicates: two intents become two missions unless identical.
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
  category: "mission"
  subject: "Build CRM"
  confidence: "high"
  evidence: [{
    description: "Derived from intent observation",
    snippet: "Build a CRM"
  }]
  metadata: { sourceObservationId: "obs-intent-..." }
}
```

---

## Mission Derivation Rules

| Source | Rule |
|--------|------|
| `mission` | Pass through, preserving original evidence. |
| `intent` | Create a mission titled from the intent subject. Goal is the intent subject. |
| `capability` | If no intent/mission exists, group capabilities and create a single mission titled "Enable <capability-subjects>". |

---

## Confidence Rules

- `high` — mission derived from explicit mission or clear intent observation.
- `medium` — mission derived from capabilities or ambiguous intent.
- `low` — mission inferred from weak signals.

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
- Every mission references the observations that produced it.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Explicit mission observations are preserved.
- Intent observations produce mission observations.
- Capability observations produce a mission when no higher-level source exists.
- Adapter passes lifecycle and health checks.

---

## Completion Criteria

Mission Builder Adapter is complete when:

- `src/adapters/mission-builder/adapter.ts` implements the mission derivation logic.
- `src/adapters/mission-builder/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover mission preservation, intent conversion, capability fallback, and lifecycle.
