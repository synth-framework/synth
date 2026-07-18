# EXP-EXEC-002 — Work Item Runtime

**Status:** Proposed  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-EXEC-001 (Execution Intent Model)  
**Blocks:** EXP-EXEC-003, EXP-EXEC-004, EXP-EXEC-005

---

## Purpose

Implement the runtime that executes `ExecutionIntent`s through the ExecutionGate, emitting events for each mutation.

## Scope

- Intent Synthesizer: map `GeneratedWorkItem` to one or more `ExecutionIntent`s.
- Capability dispatch: route each intent to the appropriate registered capability.
- Transaction boundaries: group intents into atomic transactions where required.
- Failure handling: halt, rollback, and emit failure events.

## Acceptance

- A `GeneratedWorkItem` can be decomposed into executable intents.
- Each intent execution emits lifecycle events.
- Failure stops the Expedition and records the reason.

## Definition of Done

- [ ] Intent Synthesizer implemented.
- [ ] Capability dispatch implemented.
- [ ] Transaction boundaries defined.
- [ ] Regression tests pass.
- [ ] PR opened and CI checks pass.
- [ ] Expedition accepted.
