> **Note:** Capabilities listed below operate on execution artifacts (Work Items). These are projections of planning intent, not planning entities. The canonical planning model uses Mission → Expedition → Objective → Work Item. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

# Capability Reference

## Built-in Capabilities

### Ticket Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreateTicket | `id`, `name`, `[status]` | TICKET_CREATED | None |
| StartTicket | `id` | TICKET_STARTED | Ticket exists, status is idle |
| CompleteTicket | `id` | TICKET_COMPLETED | Ticket exists, status is active |
| BlockTicket | `id`, `reason` | TICKET_BLOCKED | Ticket exists |

### Plan Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreatePlan | `id`, `name` | PLAN_CREATED | None |
| ActivatePlan | `id` | PLAN_ACTIVATED | Plan exists, status is draft |
| CompletePlan | `id` | PLAN_COMPLETED | Plan exists, status is active |

### Milestone Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreateMilestone | `id`, `planId`, `name` | MILESTONE_CREATED | Plan exists |
| StartMilestone | `id` | MILESTONE_STARTED | Milestone exists, status is pending |
| CompleteMilestone | `id` | MILESTONE_COMPLETED | Milestone exists, status is in_progress |

### Project Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreateProject | `id`, `name`, `goal` | PROJECT_CREATED | None |

## Capability Details

### CreateTicket

Creates a new ticket in the system.

**Input:**
- `id` (string, required): Unique ticket identifier
- `name` (string, required): Ticket name
- `status` (string, optional): Initial status (default: "idle")

**Output Events:**
- TICKET_CREATED

**Example:**
```
{
    actor: "user-1",
    capability: "CreateTicket",
    payload: { id: "T-1", name: "Implement feature" }
}
```

### StartTicket

Transitions a ticket from idle to active.

**Input:**
- `id` (string, required): Ticket identifier

**Output Events:**
- TICKET_STARTED

**Preconditions:**
- Ticket must exist
- Ticket status must be "idle"

**Example:**
```
{
    actor: "user-1",
    capability: "StartTicket",
    payload: { id: "T-1" }
}
```

### CompleteTicket

Transitions a ticket from active to complete.

**Input:**
- `id` (string, required): Ticket identifier

**Output Events:**
- TICKET_COMPLETED

**Preconditions:**
- Ticket must exist
- Ticket status must be "active"

**Example:**
```
{
    actor: "user-1",
    capability: "CompleteTicket",
    payload: { id: "T-1" }
}
```

### BlockTicket

Transitions a ticket to blocked status.

**Input:**
- `id` (string, required): Ticket identifier
- `reason` (string, required): Block reason

**Output Events:**
- TICKET_BLOCKED

**Preconditions:**
- Ticket must exist

**Example:**
```
{
    actor: "user-1",
    capability: "BlockTicket",
    payload: { id: "T-1", reason: "Waiting for dependency" }
}
```

## Related Documents

- [07 - Capability Model](../architecture/07-capability-model.md) -- How capabilities work
- [16 - Extension Model](../architecture/16-extension-model.md) -- Adding capabilities
