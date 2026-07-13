# Intent-Centric Architecture (INTENT-001)

## Status: Architectural Vision
## Date: 2026-06-28

---

## The Problem

The Synth kernel currently exposes **Capabilities** as its primary architectural concept. The planning model thinks in **Intents**. This is a vocabulary mismatch between architecture and implementation.

**Current leakage:**

| Layer | Leaked Term | Should Be |
|-------|-------------|-----------|
| API | `handleIntent()` → dispatches by `capability` | `handleIntent()` → translates Intent → Execution |
| Registry | `createCapabilityRegistry()` | `createIntentRegistry()` |
| Validation | `validateInvocation()` checks `capability` | `validateIntent()` checks `intent.type` |
| Policy | Policy scopes reference `capabilities` | Policy scopes reference `intent.types` |
| Genesis | Genesis registers `capabilities` | Genesis registers `intent.handlers` |
| Bus | `CommandBus` routes by `capability` | `CommandBus` routes by `intent.type` |
| Runtime | `RuntimeEngine` executes by `capability` | `RuntimeEngine` executes by `intent.type` |

110 references to "capability" in the kernel. Zero references to "Intent" as an architectural entity (despite `handleIntent()` being the primary API).

---

## The Principle

> **Intent is architecture. Capability is execution.**
>
> Exactly the same principle as: Mission is architecture. Ticket is projection.

An Intent is what the operator **wants to do**.
A Capability is how the system **executes it**.

The planner thinks: "I intend to create a work item."
The system thinks: "The CreateWorkItem capability handles that intent."

The planner never thinks about capabilities. The system never reveals them to the planner.

---

## Target Architecture

```
                    External Clients
                           │
              ┌────────────┴────────────┐
              │   Intent (What I want)   │
              │  CreateWorkItem          │
              │  CommissionMission       │
              │  RecordDiscovery       │
              └────────────┬────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Intent Translator    │  ← ONLY place Capability exists
              │                        │
              │  Intent → Capability   │
              │  (at system boundary)  │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Understanding      │
              │   (Intent validation)  │
              │   (Policy check)       │
              │   (Permission eval)    │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │        Planning        │
              │   (PCE: reduce         │
              │    uncertainty)        │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │        Decision        │
              │   (Approve? Reject?    │
              │    Escalate?)          │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │       Execution        │
              │   (Capability dispatch)│
              │   (applyDomain)        │
              │   (Event emission)     │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │       Projection       │
              │  (ExecutionArtifact    │
              │   Adapter)             │
              │   → GitHub, Jira, etc. │
              └────────────────────────┘
```

The pipeline is now:

```
Intent → Understanding → Planning → Decision → Execution → Projection
```

---

## The Translation Layer

Exactly as Ticket → WorkItem was translated at the API boundary, Intent → Capability would be translated at the architectural boundary:

```javascript
// CURRENT: Intent carries capability directly
api.handleIntent({
  actor: "user",
  capability: "CreateWorkItem",  // ← execution vocabulary leaks
  payload: { id: "W-1", name: "Task" }
})

// TARGET: Intent is architectural, execution is resolved
api.handleIntent({
  actor: "user",
  intent: {
    type: "CreateWorkItem",
    target: "execution.workItem",
    action: "create"
  },
  payload: { id: "W-1", name: "Task" }
})
// → IntentTranslator.resolve("CreateWorkItem") → "CreateWorkItem" capability
// → Capability is execution detail, not architectural contract
```

The Intent has **structure**:
- `type`: What (Create, Start, Complete, Block)
- `target`: On what (WorkItem, Mission, Expedition, Discovery)
- `action`: Which action (create, read, update, delete)

The Capability is a **flattened projection** of the Intent:
```
Intent { type: "Create", target: "WorkItem" } → Capability "CreateWorkItem"
Intent { type: "Start",  target: "WorkItem" } → Capability "StartWorkItem"
Intent { type: "Record", target: "Discovery" } → Capability "RecordDiscovery"
```

---

## What Changes

### No Change (Already Correct)

- `api.handleIntent()` — Already intent-oriented naming ✓
- PlanningEngine — Already intent-oriented ✓
- PCE — Already intent-oriented ✓

### Rename (Capability → Intent at architectural layer)

| Current | Target |
|---------|--------|
| `createCapabilityRegistry()` | `createIntentRegistry()` |
| `capabilityRegistry` | `intentRegistry` |
| `CapabilityRegistry` | `IntentRegistry` |
| `validateInvocation()` | `validateIntent()` |
| `validateCapability()` | `resolveIntent()` |
| `capability` field in intent | `intent.type` |

### Restructure (Policy scopes)

| Current | Target |
|---------|--------|
| `scope: { capabilities: ["StartWorkItem"] }` | `scope: { intents: ["StartWorkItem"] }` |
| Policy condition checks `intent.capability` | Policy condition checks `intent.type` |

### Restructure (CommandBus)

| Current | Target |
|---------|--------|
| `CommandBus` routes by `cmd.capability` | `CommandBus` routes by `cmd.intent.type` |
| `bus.dispatch({ capability: "X" })` | `bus.dispatch({ intent: { type: "X" } })` |

### Restructure (Genesis)

| Current | Target |
|---------|--------|
| Genesis registers `capabilities` | Genesis registers `intent.handlers` |
| `capabilitiesRegistered` | `intentsRegistered` |

---

## What Does NOT Change

### Capability as Execution Projection

The Capability concept survives — but only as the execution projection of an Intent. Exactly as Ticket survived as the projection of WorkItem:

```
Intent { type: "CreateWorkItem" }
  └── Capability "CreateWorkItem" (execution projection)
      └── applyDomain case "CreateWorkItem"
          └── Event WORK_ITEM_CREATED
```

The Capability is the name of the handler. It is not the architectural concept.

### Event Types

Event types (`WORK_ITEM_CREATED`, `MISSION_APPROVED`) don't change. They're the canonical record.

### Domain Functions

Domain functions (`createWorkItem`, `startMission`) don't change. They're pure logic.

### Replay

Replay doesn't change. Events are the canonical record.

---

## Comparison: Ticket → WorkItem vs Capability → Intent

| Dimension | Ticket → WorkItem | Capability → Intent |
|-----------|-------------------|---------------------|
| **Obsolescence** | Ticket was a legacy entity | Capability leaked from execution |
| **Canonical entity** | WorkItem | Intent |
| **Execution projection** | Legacy Ticket | Capability (handler name) |
| **Translation layer** | API: CreateTicket → CreateWorkItem | Architectural: capability → intent.type |
| **Registry** | Removed Ticket entries | Rename capabilityRegistry → intentRegistry |
| **Policy** | Removed Ticket scopes | Rename capability → intent in conditions |
| **Validation** | Removed Ticket from idRequired | Rename validateInvocation → validateIntent |
| **Domain** | Removed Ticket wrappers | No change (already clean) |
| **State** | Unified to workItems | No change (already clean) |
| **Events** | Preserved TICKET_* as aliases | No change |
| **Count** | 48 occurrences | ~110 occurrences |

---

## Migration Path

### Phase 1: Rename Registry

- `createCapabilityRegistry()` → `createIntentRegistry()`
- `capabilityRegistry` → `intentRegistry`
- Internal references updated

### Phase 2: Rename Validation

- `validateInvocation()` → `validateIntent()`
- `validateCapability()` → `resolveIntent()`

### Phase 3: Restructure Intent Contract

- Intent payload: `capability` field → `intent.type` nested field
- All dispatch sites updated

### Phase 4: Restructure Policy

- Policy scopes: `capabilities` → `intents`
- Policy conditions: `intent.capability` → `intent.type`

### Phase 5: Restructure CommandBus

- Route by `cmd.intent.type` instead of `cmd.capability`

### Phase 6: Restructure Genesis

- Genesis registers intent handlers
- `capabilitiesRegistered` → `intentsRegistered`

### Phase 7: Documentation

- All docs updated to use Intent as architectural concept
- Capability documented as execution projection only

### Phase 8: Tests

- All tests updated
- Compatibility suite for legacy `capability` field

---

## Acceptance Criteria

- [ ] `capabilityRegistry` renamed to `intentRegistry`
- [ ] `validateInvocation` renamed to `validateIntent`
- [ ] Intent contract uses `intent.type` not `capability`
- [ ] Policy scopes use `intents` not `capabilities`
- [ ] Zero `capability` references in architectural naming (allowed in comments/docs)
- [ ] Capability documented as execution projection of Intent
- [ ] All tests pass
- [ ] No replay regression

---

## Key Insight

The Ticket → WorkItem migration proved the pattern works:

1. **Identify** the architectural entity (WorkItem / Intent)
2. **Identify** the execution projection (Ticket / Capability)
3. **Rename** architectural components to use the architectural entity
4. **Preserve** the execution projection at the boundary only
5. **Translate** at the system boundary

The Capability is not wrong. It is in the wrong place. It belongs in the execution layer, not the architecture.

---

*Document: INTENT-001*
*Status: Architectural vision, ready for expedition when prioritized*
