# EXP-ADP-013 — Architecture Adapter

**Status:** Completed  
**Kind:** Intelligence Adapter  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-007, EXP-ADP-008  
**Blocks:** Architectural reconstruction, World Model enrichment

---

## Purpose

Infer architectural style from Observations.

The Architecture Adapter is an Intelligence Adapter. It does not read files or external systems. It inspects `Observation[]` — especially file paths, dependency names, and document snippets — and produces `architecture` observations that Mission Studio can use to understand the system's shape.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Intelligence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Surface candidate architectural styles with confidence |

---

## Responsibilities

- Accept `Observation[]`.
- Detect signals for hexagonal, DDD, MVC, layered, and microservices architectures.
- Emit `architecture` Observations for each detected style.
- Report confidence based on signal strength.
- Avoid over-inference: weak or absent signals produce low-confidence or no observations.
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
  category: "architecture"
  subject: "Hexagonal Architecture"
  confidence: "high"
  evidence: [{
    description: "Detected hexagonal architecture signals",
    snippet: "..."
  }]
  metadata: { style: "hexagonal", signals: [...] }
}
```

---

## Detection Signals

| Style | Positive Signals |
|-------|------------------|
| Hexagonal | `port`, `adapter`, `hexagonal`, `driving`, `driven` in paths/text |
| DDD | `aggregate`, `entity`, `value object`, `bounded context`, `domain` in domain context |
| MVC | `model`, `view`, `controller`, `mvc` in paths/text |
| Layered | `domain/`, `application/`, `infrastructure/`, `presentation/`, `ui/` directories |
| Microservices | multiple `service`, `api`, `gateway`, distinct service names |

---

## Confidence Rules

- `high` — multiple strong signals or explicit naming.
- `medium` — some signals but not definitive.
- `low` — weak or single signal.
- No observation if there are zero signals.

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`infer()` is available once enabled.

---

## Invariants

- Input is strictly `Observation[]`.
- Output is strictly `Observation[]`.
- Every inferred architecture references the observations that produced it.
- Confidence reflects signal strength.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Hexagonal signals produce a hexagonal architecture observation.
- DDD signals produce a DDD observation.
- MVC signals produce an MVC observation.
- Layered directory structures produce a layered observation.
- Microservice signals produce a microservices observation.
- Adapter passes lifecycle and health checks.

---

## Completion Criteria

Architecture Adapter is complete when:

- `src/adapters/architecture/adapter.ts` implements the inference logic.
- `src/adapters/architecture/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover all five supported architectural styles and lifecycle.
