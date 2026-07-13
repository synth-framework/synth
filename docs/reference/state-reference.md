> **Note:** The state model includes planning entities (missions, expeditions, objectives) and execution artifacts (work items). The planning model is artifact-independent. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

# State Reference

## State Structure

The canonical state contains the following fields:

```
{
    version: number,          // Number of events applied
    stateHash: string,        // Deterministic hash of the state
    workItems: Map<string, WorkItem>,  // WorkItem entities (canonical execution artifact)
    plans: Map<string, Plan>,        // Plan entities
    milestones: Map<string, Milestone>, // Milestone entities
    projects: Map<string, Project>,  // Project entities
    executions: Map<string, Execution>,
    lastEventOffset: number   // Index of last applied event
}
```

## Entity Types

### WorkItem

```
{
    id: string,
    status: "idle" | "active" | "blocked" | "complete",
    dependencies: string[],
    metadata: {
        blockReason?: string
    },
    createdAt: number,
    updatedAt: number
}
```

### Plan

```
{
    id: string,
    name: string,
    status: "draft" | "active" | "completed",
    milestones: string[],
    dependencies: string[],
    metadata: object
}
```

### Milestone

```
{
    id: string,
    planId: string,
    name: string,
    tickets: string[],
    completionCriteria: string,
    status: "pending" | "in_progress" | "completed"
}
```

### Project

```
{
    id: string,
    name: string,
    goal: string,
    plans: string[],
    status: "active"
}
```

## State Access Patterns

### Reading State

```
state = runtime.getState()
ticket = state.tickets["T-1"]
plan = state.plans["P-1"]
```

### State Hash

The state hash is computed as:

```
canonical = {
    v: version,
    t: SORT(keys(tickets)),
    p: SORT(keys(plans))
}
hash = DETERMINISTIC_HASH(JSON.stringify(canonical))
```

### State Persistence

State snapshots are saved with a hash envelope:

```
{
    state: canonicalState,
    stateHash: computedHash,
    savedAt: timestamp
}
```

On load, the stored hash is compared to the computed hash. A mismatch indicates tampering.

## Related Documents

- [12 - State Model](../architecture/12-state-model.md) -- State architecture
- [11 - Replay](../architecture/11-replay.md) -- State reconstruction via replay
