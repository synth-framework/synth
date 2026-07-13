---
Title: Replay
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md, 03-understanding-genesis.md
Knowledge Establishes: How to use replay to understand, verify, and debug Synth systems
Depends On: 01-getting-started.md, 03-understanding-genesis.md, philosophy/02-deterministic-engineering.md
Builds Toward: 10-recovery.md
Version: 1.0.0
Status: stable
---

# Replay

## What Is Replay?

Replay is the process of reconstructing system state from the event log. It is the core verification mechanism of Synth.

Because Synth is deterministic, replaying the same events always produces the same state. This is not just a theoretical property. It is a practical tool.

## Why Replay Matters

### Verification

Replay confirms that the current state is correct. If replay produces a different state than the current one, something is wrong. This could indicate:
- Event log corruption
- Bug in state application
- Tampering

### Debugging

When something goes wrong, replay the events leading up to the failure. You can see exactly how the state evolved. You can identify which event caused the problem.

### Understanding

Replay lets you understand how the system reached its current state. You can trace from any state back through every event to the beginning.

## How to Replay

```javascript
// Load all events
const events = await eventStore.loadAll()

// Rebuild state
const state = rebuildState(events)

// Check consistency
const check = await replayVerifier.verify()
console.log(check.consistent) // true or false
```

## Event Log Structure

The event log is an append-only sequence:

```
Event 1: SYSTEM_GENESIS
Event 2: PROJECT_CREATED
Event 3: TICKET_CREATED
Event 4: TICKET_STARTED
...
Event N: (most recent)
```

Each event contains:
- `id` — unique identifier
- `type` — what happened
- `timestamp` — when
- `transactionId` — which transaction
- `actor` — who did it
- `capability` — what capability was used
- `payload` — event-specific data
- `previousHash` — hash of previous event
- `eventHash` — hash of this event

## Partial Replay

You can replay up to any point:

```javascript
// Replay first 10 events
const partialState = rebuildState(events.slice(0, 10))

// Replay from event 5 to 15
const rangeState = rebuildState(events.slice(5, 15))
```

This is useful for debugging. You can find exactly which event changed the state in an unexpected way.

## Chain Verification

The event chain can be verified independently:

```javascript
const chainCheck = await eventStore.verifyChain()
console.log(chainCheck.valid) // true if chain is intact
console.log(chainCheck.issues) // any breaks found
```

This checks that every event correctly links to its predecessor.

## Practical Replay Scenarios

### "Why is this ticket blocked?"

Replay the events for that ticket:
```javascript
const ticketEvents = events.filter(e =>
  e.payload?.ticket?.id === "T-1" ||
  e.payload?.id === "T-1" ||
  e.payload?.ticketId === "T-1"
)
// Shows every state change for T-1
```

### "When was this decision made?"

Find the decision event:
```javascript
const decisionEvent = events.find(e =>
  e.type === "DECISION_ACCEPTED" &&
  e.payload.id === "DC-1"
)
// Shows when, by whom, and in what context
```

### "Is the state consistent?"

Run the verifier:
```javascript
const check = await replayVerifier.verify()
if (!check.consistent) {
  console.log("Issues:", check.issues)
}
```

## Related Documents

- [Deterministic Engineering](../guides/philosophy/02-deterministic-engineering.md) — The theory of replay
- [Recovery](10-recovery.md) — Using replay for recovery
- [Understanding Genesis](03-understanding-genesis.md) — Genesis events in replay

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
