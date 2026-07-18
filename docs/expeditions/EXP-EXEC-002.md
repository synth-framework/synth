# EXP-EXEC-002 — Work Item Runtime

**Status:** Accepted  
**Merged:** PR #125
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

- [x] Intent Synthesizer implemented (`src/execution/intent-synthesizer.ts`).
- [x] Capability dispatch implemented (`src/execution/runtime.ts`).
- [x] Transaction boundaries defined (single Expedition graph = single event transaction).
- [x] Regression tests implemented (`tests/execution-runtime.test.js`).
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

## Implementation

- `src/execution/intent-synthesizer.ts` — maps `GeneratedWorkItem` metadata to `ExecutionIntent` lists.
- `src/execution/runtime.ts` — `executeGraph` dispatches intents to injected capability handlers, verifies results, emits lifecycle events, and halts on failure with optional rollback.
- `src/execution/index.ts` — public API exports.
- `tests/execution-runtime.test.js` — regression tests for synthesis, dispatch, ordering, success, and failure paths.

## Completion Notes

Merged via PR #125. The Work Item Runtime is the execution engine used by all subsequent expeditions in EXP-PROGRAM-016.
