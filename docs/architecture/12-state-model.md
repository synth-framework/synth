> **Note:** The `tickets` field in state holds execution artifacts. These are projections of planning intent, not canonical planning entities. The planning model (Mission → Expedition → Objective → Work Item) is artifact-independent. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

# 12 - State Model

This document describes how Synth manages state: canonical state derivation, snapshots, hashing, and integrity verification.

## Canonical State

The canonical state is the authoritative system state derived by replaying all events through the domain logic. It is not stored directly. It is computed on demand.

```
canonicalState = replay(eventLog)
```

This means:
- The event log is the source of truth
- State is a cached projection of the event log
- State can always be reconstructed from events
- State changes only when events are appended

## State Structure

The canonical state contains:

| Field | Description |
|-------|-------------|
| version | Event count (number of events applied) |
| stateHash | Deterministic hash of the state |
| tickets | Map of ticket ID to ticket entity |
| plans | Map of plan ID to plan entity |
| milestones | Map of milestone ID to milestone entity |
| projects | Map of project ID to project entity |
| lastEventOffset | Index of the last applied event |

## State Hashing

The state hash is computed deterministically:

```
canonical = {
    v: state.version,
    t: SORT(Object.keys(state.tickets)),
    p: SORT(Object.keys(state.plans))
}
stateHash = HASH(JSON.stringify(canonical))
```

**Properties:**
- Deterministic: same state always produces the same hash
- Sensitive to version: changes when events are applied
- Sensitive to entity set: changes when tickets/plans are added/removed
- Not sensitive to entity content details (status, metadata)

## State Reconstruction

State is reconstructed by applying events in order:

```
state = emptyState()
for event in eventLog:
    state = applyEvent(state, event)
    state.version += 1
state.stateHash = computeStateHash(state)
return state
```

Each event type has a corresponding `applyEvent` handler that updates the relevant entity in the state.

## State Snapshots

While state is derived on demand, snapshots can be persisted for performance:

### Saving State

```
stateSnapshot = {
    state: canonicalState,
    stateHash: computeStateHash(canonicalState),
    savedAt: timestamp
}
persist(stateSnapshot)
```

### Loading State

```
snapshot = load()
expectedHash = computeStateHash(snapshot.state)
if snapshot.stateHash != expectedHash:
    throw IntegrityError("State hash mismatch")
return snapshot.state
```

**Key property:** Snapshot integrity is verified on load. A tampered snapshot is rejected, not accepted with a warning.

## State Verification

State is verified in two ways:

### 1. Replay Verification

Reconstruct state from the event log and compare the hash:

```
replayedState = replay(eventLog)
if replayedState.stateHash != expectedHash:
    report "Replay hash mismatch"
```

### 2. Snapshot Verification

Load a persisted snapshot and verify its hash:

```
snapshot = loadSnapshot()
if snapshot.stateHash != computeStateHash(snapshot.state):
    throw "Snapshot tampered"
```

## State Invariants

| Invariant | Description |
|-----------|-------------|
| S1 | State is always a pure function of the event log |
| S2 | State hash is deterministic |
| S3 | State hash changes when events are added |
| S4 | State hash matches after replay |
| S5 | Snapshot integrity is verified on load |

## State Access Patterns

### Read-Only Access

State can be read at any time without going through the mutation pipeline:

```
state = runtime.getState()
ticket = state.tickets["T-1"]
```

Read operations do not require permits, guard tokens, or policy evaluation.

### Mutation Access

All mutations go through the execution pipeline:

```
result = api.handleIntent({
    actor: "user",
    capability: "StartTicket",
    payload: { id: "T-1" }
})
```

Mutations produce events, which update state on the next state reconstruction.

## State Consistency Model

Synth uses an **eventual consistency** model for state reads:

- Event writes are immediately persisted
- State is reconstructed on demand (lazy)
- State reflects all events up to the reconstruction point
- There is no "stale read" of already-persisted events

This is stronger than eventual consistency in distributed systems because:
- There is only one event log (no replication lag)
- State reconstruction is deterministic
- Events are never lost or reordered

## Related Documents

- [09 - Event Model](09-event-model.md) -- How events drive state changes
- [11 - Replay](11-replay.md) -- How replay reconstructs state
- [17 - Runtime Invariants](17-runtime-invariants.md) -- State-related invariants
