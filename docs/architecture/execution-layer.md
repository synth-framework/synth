# Execution Layer

**Part of:** SKR-001
**Status:** Active Architecture
**Date:** 2026-06-28

---

## Purpose

The Execution Layer defines how the system realizes plans. It contains execution primitives, runtime concerns, and the event stream. It is implementation, not architecture.

## Vocabulary

| Current Name | Canonical Name | Description |
|-------------|----------------|-------------|
| `CapabilityRegistry` | `ExecutionPrimitiveRegistry` | Registry of execution primitives |
| `Capability` | `ExecutionPrimitive` | Smallest executable operation |
| `handleIntent()` | `executePlan()` | Plan execution entry point |
| `CommandBus` | `MutationAuthority` | Single mutation authority |

## Execution IR

Execution IR is the compiler output from planning. It is NOT SKR.

```
Decision
  ↓
Execution Plan
  ↓
Execution IR          ← Compiler output
  ↓
Execution Primitive Sequence
  ↓
Capability Invocation
  ↓
Event Stream
```

### Example

```yaml
kind: ExecutionPlan
id: EP-001
decision: DC-001
steps:
  - capability: CreateWorkItem
    params: { id: "WI-001", title: "Implement feature" }
  - capability: CreateExpedition
    params: { id: "EXP-001", goal: "Deliver feature" }
```

## Invariants

- **KI-001:** Canonical knowledge MUST NOT depend on execution
- **KI-005:** Execution primitives MAY evolve without affecting canonical knowledge

## Related Documents

- [SKR-001.md](SKR-001.md) — Full SKR specification
- [INTENT-001.md](../INTENT-001.md) — Execution is implementation of intent

---

*Part of SKR-001 — Synth Knowledge Representation*
