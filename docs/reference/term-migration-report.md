# docs/reference/term-migration-report.md

## EXP-TERM-001: Semantic Migration — Ticket → Work Item

**Status:** Complete
**Priority:** Critical (Architectural Consistency)
**Date:** 2026-06-28

---

## Executive Summary

The execution kernel has been migrated from Ticket-centric to WorkItem-centric terminology. The Planning Cognition Engine, Agent Constitution, and Knowledge Base already used Work Item as the canonical execution entity. This migration unified the execution kernel with that vocabulary.

**Files modified:** 2 (`dist/synth-v5.js`, `tests/synth.test.js`)
**Documentation updated:** `docs/reference/terminology-migration-report.md` (previous terminology audit)
**New files:** `docs/reference/term-inventory.md`, `docs/reference/term-migration-report.md`
**Tests:** 99/99 passing

---

## What Changed

### 1. Canonical Execution Entity: WorkItem

The domain functions were renamed:

| Before | After |
|--------|-------|
| `createTicket()` | `createWorkItem()` |
| `startTicket()` | `startWorkItem()` |
| `completeTicket()` | `completeWorkItem()` |
| `blockTicket()` | `blockWorkItem()` |

Compatibility wrappers preserve the old names:
```javascript
function createTicket(id, overrides = {}) { return createWorkItem(id, overrides) }
```

### 2. Canonical Events: WORK_ITEM_*

New canonical event types:
- `WORK_ITEM_CREATED`
- `WORK_ITEM_STARTED`
- `WORK_ITEM_COMPLETED`
- `WORK_ITEM_BLOCKED`

Legacy events preserved as replay aliases:
- `TICKET_CREATED` → writes to `state.workItems`
- `TICKET_STARTED` → writes to `state.workItems`
- `TICKET_COMPLETED` → writes to `state.workItems`
- `TICKET_BLOCKED` → writes to `state.workItems`

Both event families produce identical replay state.

### 3. Canonical Capabilities: CreateWorkItem, etc.

New canonical capabilities registered:
- `CreateWorkItem`, `StartWorkItem`, `CompleteWorkItem`, `BlockWorkItem`

Legacy capabilities maintained as aliases:
- `CreateTicket` → routes to `CreateWorkItem` logic
- `StartTicket` → routes to `StartWorkItem` logic
- `CompleteTicket` → routes to `CompleteWorkItem` logic`
- `BlockTicket` → routes to `BlockWorkItem` logic`

All aliases emit `WORK_ITEM_*` events (canonical).

### 4. State Model: workItems

The state field changed:
```javascript
// Before
{ tickets: {}, workItems: {}, ... }

// After
{ workItems: {}, ... }
```

Both `TICKET_*` and `WORK_ITEM_*` events write to `state.workItems`.

### 5. Policy Engine Updated

The completed-work-protection policy now checks `state.workItems`:
```javascript
condition: (intent, state) => state.workItems[String(intent.payload.id)]?.status === "completed"
```

### 6. ExecutionArtifactAdapter (New)

A new projection layer maps canonical Work Items to external artifacts:

```
Work Item
  └── ExecutionArtifactAdapter
        ├── GitHub Issue
        ├── Jira Ticket
        ├── Linear Issue
        ├── Azure Work Item
        ├── Markdown Checklist
        └── Legacy Ticket
```

No planning logic exists inside adapters.

### 7. Genesis Updated

Genesis configuration changed:
```javascript
// Before
{ initialTickets: [{ id: "T-1", name: "..." }] }

// After
{ initialWorkItems: [{ id: "W-1", name: "..." }] }
```

---

## What Was Preserved

### Historical Event Types

`TICKET_CREATED`, `TICKET_STARTED`, `TICKET_COMPLETED`, `TICKET_BLOCKED` remain valid event types. They are replay aliases that write to the canonical `workItems` state. Existing event logs replay correctly without modification.

### Historical Documentation

ADRs, formal specifications, and migration guides were not modified. The terminology audit report (`docs/reference/terminology-migration-report.md`) documents the documentation-level migration separately.

### Legacy API

`api.handleIntent({ capability: "CreateTicket", ... })` continues to function. It routes to `CreateWorkItem` internally and emits `WORK_ITEM_CREATED`.

---

## Replay Compatibility

### Forward Replay

Old event logs containing `TICKET_*` events replay correctly:
```
TICKET_CREATED { ticket: { id: "T-1" } }  →  state.workItems["T-1"]
```

### Backward Compatibility

New `WORK_ITEM_*` events are understood by systems that only know about `TICKET_*` events if they share the same `applyEvent` logic (which both write to `workItems`).

### Mixed Replay

Event logs containing both `TICKET_*` and `WORK_ITEM_*` events replay correctly. Both families write to the same `state.workItems` map.

---

## Verification

| Check | Result |
|-------|--------|
| Source syntax valid | ✓ |
| All 99 tests pass | ✓ |
| Main demo runs | ✓ |
| Chain hashing works | ✓ |
| Policy enforcement works | ✓ |
| Replay verification works | ✓ |
| PCE integration works | ✓ |
| Expedition engine works | ✓ |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Planner contains no Ticket terminology | ✓ |
| Execution kernel uses Work Item internally | ✓ |
| Replay accepts Ticket and Work Item events | ✓ |
| Compatibility layer operational | ✓ |
| Legacy APIs continue functioning | ✓ |
| Canonical APIs documented | ✓ |
| Projection layer introduced | ✓ |
| All tests pass | ✓ |
| No historical documentation altered | ✓ |
| docs/reference/term-inventory.md produced | ✓ |
| Migration report generated | ✓ |

---

## Architectural Rule Enforced

> **Planning is artifact-independent.**
>
> The planner does not produce tickets. It produces engineering intent. Execution artifacts are projections of that intent.

The execution kernel now embodies this rule:
- Work Item is the single canonical execution entity
- Ticket is one possible projection
- The ExecutionArtifactAdapter is the only place where external artifact formats exist

---

## Related Documents

- [docs/reference/term-inventory.md](./term-inventory.md) — Detailed occurrence inventory
- [docs/reference/terminology-migration-report.md](./terminology-migration-report.md) — Documentation terminology audit
- [docs/guides/philosophy/01-engineering-philosophy.md](../guides/philosophy/01-engineering-philosophy.md) — Artifact Independence principle

---

*Migration completed: 2026-06-28*
*All systems operational*
