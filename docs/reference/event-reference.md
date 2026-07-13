> **Note:** Event types with `TICKET_` prefix are execution artifact events. They represent projections of planning intent onto work items. The canonical planning model uses Mission → Expedition → Objective → Work Item. Events are implementation-level projections, not planning entities. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

# Event Reference

## Event Schema

All events share the following structure:

```
{
    id: string,           // Unique event identifier
    type: string,         // Event type (uppercase with underscores)
    timestamp: number,    // Creation time (ms since epoch)
    transactionId: string, // Originating transaction ID
    capability: string,   // Capability that produced this event
    actor: string,        // Actor who initiated the action
    payload: object,      // Event-specific data
    previousHash: string, // Hash of preceding event (operational events)
    eventHash: string     // Hash of this event (operational events)
}
```

## Domain Events

### TICKET_CREATED

Emitted when a new ticket is created.

**Payload:**
```
{
    ticket: {
        id: string,
        status: "idle",
        dependencies: [],
        metadata: {},
        createdAt: number,
        updatedAt: number
    }
}
```

### TICKET_STARTED

Emitted when a ticket transitions to active status.

**Payload:**
```
{
    id: string,
    status: "active"
}
```

### TICKET_COMPLETED

Emitted when a ticket transitions to complete status.

**Payload:**
```
{
    id: string,
    status: "complete"
}
```

### TICKET_BLOCKED

Emitted when a ticket transitions to blocked status.

**Payload:**
```
{
    id: string,
    status: "blocked",
    reason: string
}
```

### PLAN_CREATED

Emitted when a new plan is created.

**Payload:**
```
{
    plan: {
        id: string,
        name: string,
        status: "draft",
        milestones: [],
        dependencies: [],
        metadata: {}
    }
}
```

### PLAN_ACTIVATED

Emitted when a plan transitions to active status.

**Payload:**
```
{
    id: string,
    status: "active"
}
```

### PLAN_COMPLETED

Emitted when a plan transitions to completed status.

**Payload:**
```
{
    id: string,
    status: "completed"
}
```

### MILESTONE_CREATED

Emitted when a new milestone is created.

**Payload:**
```
{
    milestone: {
        id: string,
        planId: string,
        name: string,
        tickets: [],
        completionCriteria: "",
        status: "pending"
    }
}
```

### MILESTONE_STARTED

Emitted when a milestone transitions to in_progress status.

**Payload:**
```
{
    id: string,
    status: "in_progress"
}
```

### MILESTONE_COMPLETED

Emitted when a milestone transitions to completed status.

**Payload:**
```
{
    id: string,
    status: "completed"
}
```

### PROJECT_CREATED

Emitted when a new project is created.

**Payload:**
```
{
    project: {
        id: string,
        name: string,
        goal: string,
        plans: [],
        status: "active"
    }
}
```

## System Events

### SYSTEM_GENESIS

Emitted once during system initialization.

**Payload:**
```
{
    projectName: string,
    systemId: string,
    partitions: number
}
```

## Related Documents

- [09 - Event Model](../architecture/09-event-model.md) -- Event architecture
- [11 - Replay](../architecture/11-replay.md) -- How events are replayed
