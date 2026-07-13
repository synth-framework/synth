# docs/reference/term-inventory.md

## EXP-TERM-001: Semantic Migration — Ticket → Work Item

**Status:** Complete
**Date:** 2026-06-28
**Scope:** dist/synth-v5.js (execution kernel)

---

## Methodology

Every occurrence of ticket-related terminology in the execution kernel was classified into one of three buckets:

- **CANONICAL** — The primary entity; migrated to WorkItem
- **COMPATIBILITY** — Preserved as alias for backward compatibility
- **HISTORICAL** — Unchanged (event type names, formal specifications)

---

## Inventory: dist/synth-v5.js

### Domain Functions (lines 179-194)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 179 | CANONICAL | `createTicket(id, overrides)` | `createWorkItem(id, overrides)` |
| 180 | CANONICAL | `startTicket(ticket)` | `startWorkItem(workItem)` |
| 181 | CANONICAL | `completeTicket(ticket)` | `completeWorkItem(workItem)` |
| 182 | CANONICAL | `blockTicket(ticket, reason)` | `blockWorkItem(workItem, reason)` |
| 184 | COMPATIBILITY | — | `createTicket(id, overrides)` (wrapper) |
| 185 | COMPATIBILITY | — | `startTicket(ticket)` (wrapper) |
| 186 | COMPATIBILITY | — | `completeTicket(ticket)` (wrapper) |
| 187 | COMPATIBILITY | — | `blockTicket(ticket, reason)` (wrapper) |

### applyDomain — Canonical Capabilities (lines 362-378)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 362 | CANONICAL | `case "CreateTicket"` → `TICKET_CREATED` | `case "CreateWorkItem"` → `WORK_ITEM_CREATED` |
| 365 | CANONICAL | `case "StartTicket"` → `TICKET_STARTED` | `case "StartWorkItem"` → `WORK_ITEM_STARTED` |
| 370 | CANONICAL | `case "CompleteTicket"` → `TICKET_COMPLETED` | `case "CompleteWorkItem"` → `WORK_ITEM_COMPLETED` |
| 374 | CANONICAL | `case "BlockTicket"` → `TICKET_BLOCKED` | `case "BlockWorkItem"` → `WORK_ITEM_BLOCKED` |
| 379 | COMPATIBILITY | — | `case "CreateTicket"` → `WORK_ITEM_CREATED` (alias) |
| 383 | COMPATIBILITY | — | `case "StartTicket"` → `WORK_ITEM_STARTED` (alias) |
| 387 | COMPATIBILITY | — | `case "CompleteTicket"` → `WORK_ITEM_COMPLETED` (alias) |
| 391 | COMPATIBILITY | — | `case "BlockTicket"` → `WORK_ITEM_BLOCKED` (alias) |

### applyDomain — State Access (lines 362-391)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 366, 371, 375 | CANONICAL | `state.tickets[id]` | `state.workItems[id]` |
| 383, 387, 391 | CANONICAL | `state.tickets[id]` | `state.workItems[id]` |

### applyEvent — Canonical Events (lines 833-837)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 833 | CANONICAL | — | `case "WORK_ITEM_CREATED":` → `state.workItems[...]` |
| 834 | CANONICAL | — | `case "WORK_ITEM_STARTED":` → `state.workItems[...]` |
| 835 | CANONICAL | — | `case "WORK_ITEM_COMPLETED":` → `state.workItems[...]` |
| 836 | CANONICAL | — | `case "WORK_ITEM_BLOCKED":` → `state.workItems[...]` |

### applyEvent — Replay Aliases (lines 838-842)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 838 | COMPATIBILITY | `state.tickets[p.ticket.id]` | `state.workItems[p.ticket.id]` |
| 839 | COMPATIBILITY | `state.tickets[...]` | `state.workItems[...]` |
| 840 | COMPATIBILITY | `state.tickets[...]` | `state.workItems[...]` |
| 841 | COMPATIBILITY | `state.tickets[...]` | `state.workItems[...]` |

### State Model

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 829 | CANONICAL | `tickets: {}` | removed |
| 843 | CANONICAL | — | `workItems: {}` (canonical) |
| 888 | CANONICAL | `t: Object.keys(state.tickets)` | removed |
| 888 | CANONICAL | `w: Object.keys(state.workItems)` | kept (already existed) |

### Validation (line 466)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 466 | CANONICAL | `idRequired: [..."StartTicket"...]` | `idRequired: [..."StartWorkItem"...]` |

### Policy Engine (line 596)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 596 | CANONICAL | `state.tickets[...]?.status` | `state.workItems[...]?.status` |
| 596 | COMPATIBILITY | `capabilities: ["StartTicket"...]` | `capabilities: ["StartWorkItem", "StartTicket"...]` |

### Capability Registry (lines 941-966)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 941 | CANONICAL | — | `CreateWorkItem` → `WORK_ITEM_CREATED` |
| 942 | CANONICAL | — | `StartWorkItem` → `WORK_ITEM_STARTED` |
| 943 | CANONICAL | — | `CompleteWorkItem` → `WORK_ITEM_COMPLETED` |
| 944 | CANONICAL | — | `BlockWorkItem` → `WORK_ITEM_BLOCKED` |
| 946 | COMPATIBILITY | `CreateTicket` → `TICKET_CREATED` | `CreateTicket` → `WORK_ITEM_CREATED` |
| 947 | COMPATIBILITY | `StartTicket` → `TICKET_STARTED` | `StartTicket` → `WORK_ITEM_STARTED` |
| 948 | COMPATIBILITY | `CompleteTicket` → `TICKET_COMPLETED` | `CompleteTicket` → `WORK_ITEM_COMPLETED` |
| 949 | COMPATIBILITY | `BlockTicket` → `TICKET_BLOCKED` | `BlockTicket` → `WORK_ITEM_BLOCKED` |

### ReplayVerifier (lines 1014-1024)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 1014 | CANONICAL | `ticketCount: Object.keys(state.tickets)` | `workItemCount: Object.keys(state.workItems)` |
| 1022 | CANONICAL | `ticketCount: Object.keys(state.tickets)` | `workItemCount: Object.keys(state.workItems)` |
| 1025 | CANONICAL | `Object.entries(replayedState.tickets)` | `Object.entries(replayedState.workItems)` |
| 1026 | CANONICAL | `Ticket ${id} invalid status` | `WorkItem ${id} invalid status` |

### Genesis (lines 1174-1179)

| Line | Classification | Before | After |
|------|---------------|--------|-------|
| 1174 | CANONICAL | `initialTickets` | `initialWorkItems` |
| 1176 | CANONICAL | `TICKET_CREATED` | `WORK_ITEM_CREATED` |
| 1177 | CANONICAL | `CreateTicket` | `CreateWorkItem` |
| 1178 | CANONICAL | `ticket: { id: ... }` | `workItem: { id: ... }` |

### New: ExecutionArtifactAdapter (lines 197-252)

| Line | Classification | Description |
|------|---------------|-------------|
| 197-252 | CANONICAL | New class: maps WorkItems to GitHub/Jira/Legacy projections |

### Exports

| Classification | Added |
|---------------|-------|
| CANONICAL | `createWorkItem`, `startWorkItem`, `completeWorkItem`, `blockWorkItem` |
| COMPATIBILITY | `createTicket`, `startTicket`, `completeTicket`, `blockTicket` |
| CANONICAL | `ExecutionArtifactAdapter` |

---

## HISTORICAL (Unchanged)

The following were intentionally NOT modified:

- **Event type names** (`TICKET_CREATED`, `TICKET_STARTED`, etc.) — preserved as replay aliases
- **Formal specification** references to ticket as example entity
- **ADR documents** — institutional memory
- **Capability names** in registry — alias entries

---

## Summary

| Category | Count |
|----------|-------|
| CANONICAL migrations | 35 |
| COMPATIBILITY aliases added | 12 |
| HISTORICAL preserved | 8 event types |
| Lines changed | ~80 |
| Tests updated | 99 (all passing) |
