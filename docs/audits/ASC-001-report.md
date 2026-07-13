# ASC-001: Architectural Semantic Consolidation

## Status: Complete
## Date: 2026-06-28
## Priority: Critical (Architectural Consistency)

---

## Problem Statement

Three architectural generations coexisted in the execution kernel:

1. **Legacy Execution Kernel** — Ticket, Plan, Milestone, Project
2. **Intermediate Migration** — WorkItem + Ticket wrappers + compatibility aliases + replay aliases
3. **Current Architecture (PCE)** — Mission, Expedition, Objective, Discovery, Decision

The intermediate migration (EXP-TERM-001) eliminated the dual-state problem (`state.tickets` vs `state.workItems`) but left dual code paths throughout the system:
- Duplicate capability cases in `applyDomain`
- Duplicate capability entries in the registry
- Duplicate policy scope entries
- Duplicate validation entries
- Domain wrapper functions

ASC-001 eliminates the obsolete execution model while preserving replay compatibility.

---

## Architectural Rule

> **Compatibility belongs at system boundaries only.**
>
> If compatibility requires architectural pollution, compatibility loses.

Boundaries where compatibility is preserved:
- Event replay (TICKET_* events → canonical WORK_ITEM_* state)
- API translation (CreateTicket request → CreateWorkItem dispatch)

Layers where compatibility is **absent**:
- Domain functions
- Runtime engine
- State model
- Validation
- Policy engine
- Capability registry
- Planning engine

---

## Changes by Phase

### Phase 1: Domain — Ticket Wrappers Removed

**Removed:**
```javascript
// DELETED
function createTicket(id, overrides) { return createWorkItem(id, overrides) }
function startTicket(ticket) { return startWorkItem(ticket) }
function completeTicket(ticket) { return completeWorkItem(ticket) }
function blockTicket(ticket, reason) { return blockWorkItem(ticket, reason) }
```

**Remaining:**
```javascript
function createWorkItem(id, overrides)
function startWorkItem(workItem)
function completeWorkItem(workItem)
function blockWorkItem(workItem, reason)
```

### Phase 2: applyDomain — Ticket Cases Removed

**Removed:** 4 duplicate capability cases from `applyDomain`:
- `case "CreateTicket":` → `WORK_ITEM_CREATED`
- `case "StartTicket":` → `WORK_ITEM_STARTED`
- `case "CompleteTicket":` → `WORK_ITEM_COMPLETED`
- `case "BlockTicket":` → `WORK_ITEM_BLOCKED`

**Remaining:** Only canonical WorkItem cases.

API translation handles legacy requests at the boundary.

### Phase 3: applyEvent — Replay Aliases Delegate Internally

**Before:**
```javascript
case "TICKET_CREATED": if (p.ticket) state.workItems[p.ticket.id] = p.ticket; break
case "TICKET_STARTED": { /* duplicated logic */ break }
// ... duplicated for each event type
```

**After:**
```javascript
case "TICKET_CREATED": {
  if (p.ticket) {
    const canonicalEvent = { type: "WORK_ITEM_CREATED", payload: { workItem: p.ticket } }
    applyEvent(state, canonicalEvent)  // Delegates to canonical logic
  }
  break
}
```

Zero duplicated state-handling logic.

### Phase 4: Registry — Ticket Entries Removed

**Removed:** 4 capability entries from registry:
- `CreateTicket`, `StartTicket`, `CompleteTicket`, `BlockTicket`

**Remaining:** 21 capabilities (4 canonical WorkItem + 17 others).

### Phase 5: API Translation Layer

**Added in SynthAPI:**
```javascript
const CAPABILITY_ALIASES = {
  "CreateTicket": "CreateWorkItem",
  "StartTicket": "StartWorkItem",
  "CompleteTicket": "CompleteWorkItem",
  "BlockTicket": "BlockWorkItem",
}
```

Translation happens at `handleIntent()` entry point only. Domain, runtime, and planner never see legacy capability names.

### Phase 6: Validation + Policy Cleaned

**Validation:** Removed `CreateTicket`, `StartTicket`, `CompleteTicket`, `BlockTicket` from `idRequired`.

**Policy:** Removed `StartTicket`, `BlockTicket`, `ResetTicket` from completed-work-protection scope. Now only `StartWorkItem`, `BlockWorkItem`.

### Phase 7: Genesis — Already Clean

Genesis already emitted `WORK_ITEM_CREATED` with `initialWorkItems`. No change needed.

### Phase 8: Planning — Already Clean

PlanningEngine never referenced Ticket. No change needed.

---

## Four-Layer Architecture

After consolidation, the system has exactly four layers:

```
Planning Layer
    │
    ├── Mission      (strategic direction)
    ├── Expedition   (bounded engineering objective)
    ├── Objective    (specific deliverable)
    └── Discovery    (learned knowledge)
    └── Decision     (chosen direction)
    │
    ▼
Execution Layer
    │
    └── WorkItem     (canonical execution entity)
    │
    ▼
Projection Layer
    │
    ├── ExecutionArtifactAdapter
    │       ├── GitHub Issue
    │       ├── Jira Ticket
    │       ├── Linear Issue
    │       ├── Azure DevOps Work Item
    │       ├── Markdown Checklist
    │       └── Legacy Ticket
    │
    ▼
External Tool
```

No planning component knows which projection exists.
No execution component contains Ticket terminology.
Ticket survives only as a compatibility adapter.

---

## Verification

### Kernel Cleanliness

| Check | Result |
|-------|--------|
| Domain: zero `createTicket` wrappers | ✓ |
| applyDomain: zero `CreateTicket` cases | ✓ |
| Registry: zero `CreateTicket` entries | ✓ |
| Validation: zero Ticket in `idRequired` | ✓ |
| Policy: zero Ticket in capability scope | ✓ |
| State: only `workItems` field | ✓ |
| Replay aliases: TICKET_* → WORK_ITEM_* | ✓ |
| API translator: CAPABILITY_ALIASES | ✓ |

### Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Core Kernel | 99 | ✓ All pass |
| ASC-001 Compatibility | 7 | ✓ All pass |
| **Total** | **106** | **✓ 106/106** |

### Compatibility Tests

| Test | Status |
|------|--------|
| CreateTicket → CreateWorkItem at API boundary | ✓ |
| StartTicket → StartWorkItem at API boundary | ✓ |
| CompleteTicket → CompleteWorkItem at API boundary | ✓ |
| TICKET_CREATED replay → state.workItems | ✓ |
| Registry: zero Ticket entries | ✓ |
| Internal kernel: zero Ticket entities | ✓ |
| Mixed canonical + legacy replay consistency | ✓ |

---

## Deleted Components

| Component | Location | Reason |
|-----------|----------|--------|
| `createTicket()` | Domain | Replaced by `createWorkItem()` |
| `startTicket()` | Domain | Replaced by `startWorkItem()` |
| `completeTicket()` | Domain | Replaced by `completeWorkItem()` |
| `blockTicket()` | Domain | Replaced by `blockWorkItem()` |
| `CreateTicket` case | applyDomain | API translator handles it |
| `StartTicket` case | applyDomain | API translator handles it |
| `CompleteTicket` case | applyDomain | API translator handles it |
| `BlockTicket` case | applyDomain | API translator handles it |
| `CreateTicket` entry | Registry | Not a canonical capability |
| `StartTicket` entry | Registry | Not a canonical capability |
| `CompleteTicket` entry | Registry | Not a canonical capability |
| `BlockTicket` entry | Registry | Not a canonical capability |
| Duplicate state logic | applyEvent | Replaced by delegation |

---

## Files Modified

| File | Changes |
|------|---------|
| `dist/synth-v5.js` | Kernel consolidation |
| `tests/synth.test.js` | Updated tests + compatibility suite |

## Files Added

| File | Purpose |
|------|---------|
| `docs/audits/ASC-001-report.md` | This report |

## Preserved (Unchanged)

| File | Reason |
|------|--------|
| All ADRs | Historical documents |
| `docs/reference/terminology-migration-report.md` | Previous audit report |
| Historical documentation | Institutional memory |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Internal kernel contains zero Ticket entities | ✓ |
| Canonical events are WORK_ITEM_* | ✓ |
| Canonical capabilities are WorkItem capabilities | ✓ |
| Ticket exists only as compatibility | ✓ |
| Planning remains artifact-independent | ✓ |
| All tests pass (106/106) | ✓ |
| Replay remains deterministic | ✓ |
| No architectural regression | ✓ |

---

*Consolidation completed: 2026-06-28*
*106 tests passing, 0 failures*
