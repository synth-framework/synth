# EXP-ADP-010 — Knowledge Extraction Adapter

**Status:** Completed  
**Kind:** Intelligence Adapter  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-005, EXP-ADP-006, EXP-ADP-007, EXP-ADP-008, EXP-ADP-009  
**Blocks:** World Model construction

---

## Purpose

Convert raw Observations into structured Knowledge Observations that Mission Studio can assemble into a World Model.

Knowledge Extraction is the first Intelligence Adapter. It does not read files or talk to external systems. It only transforms the output of Evidence Adapters.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Intelligence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Derive missions, capabilities, components, constraints, and risks from evidence |

---

## Responsibilities

- Accept `Observation[]` from Evidence Adapters.
- Derive `mission` observations from intent observations.
- Derive `capability` observations from specification capability and dependency observations.
- Derive `component` observations from language and dependency observations.
- Derive `constraint` observations from constraint observations.
- Derive `risk` observations when conflicting or low-confidence evidence is detected.
- Emit every derived observation with evidence references back to source observations.
- Never read external systems directly.
- Never mutate runtime state.

---

## Input

```typescript
Observation[]
```

Example source observations:

```typescript
{ category: "intent", subject: "CRM", confidence: "high", evidence: [...] }
{ category: "language", subject: "TypeScript", confidence: "high", evidence: [...] }
{ category: "dependency", subject: "express", confidence: "high", evidence: [...] }
{ category: "capability", subject: "listUsers", confidence: "high", evidence: [...] }
{ category: "constraint", subject: "Users must log in", confidence: "medium", evidence: [...] }
```

---

## Output

```typescript
Observation {
  category: "mission"
  subject: "CRM"
  confidence: "high"
  evidence: [{ description: "Derived from intent observation", fingerprint: "..." }]
  metadata: { sourceCategories: ["intent"] }
}
```

Other derived categories:

- `capability` — e.g. "listUsers", "UserService.GetUser"
- `component` — e.g. "TypeScript runtime component", "express integration"
- `constraint` — preserved and re-referenced from evidence
- `risk` — e.g. "Low confidence in inferred mission"

---

## Extraction Rules

| Source Category | Derived Knowledge | Rule |
|-----------------|-------------------|------|
| `intent` | `mission` | Direct mapping with lowered confidence if confidence is not certain |
| `capability` | `capability` | Pass-through with consolidated evidence |
| `dependency` | `component` / `capability` | Map runtime dependencies to components |
| `language` | `component` | Map languages to runtime components |
| `constraint` | `constraint` | Preserve with source reference |
| `unknown` | `risk` | Low-confidence or unknown evidence generates risk observations |

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`extract()` is available once enabled.

---

## Invariants

- Input is strictly `Observation[]`.
- Output is strictly `Observation[]`.
- Every derived observation references its source observations.
- Derived confidence is never higher than the lowest-confidence source.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Intent observations produce mission observations.
- Specification capabilities produce capability observations.
- Languages and dependencies produce component observations.
- Conflicts or unknowns produce risk observations.
- Adapter passes lifecycle and health checks.
- Extraction is deterministic for the same input.

---

## Completion Criteria

Knowledge Extraction Adapter is complete when:

- `src/adapters/knowledge/adapter.ts` implements the extraction logic.
- `src/adapters/knowledge/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover mission, capability, component, constraint, and risk extraction.
