---
Title: Recovery
Domain: operator
Audience: operators
Prerequisites: 03-understanding-genesis.md, 09-replay.md
Knowledge Establishes: How to recover from failures using Synth's deterministic replay and immutable history
Depends On: 03-understanding-genesis.md, 09-replay.md, philosophy/02-deterministic-engineering.md
Builds Toward: 11-best-practices.md
Version: 1.0.0
Status: stable
---

# Recovery

## Synth's Recovery Guarantee

Because Synth is deterministic and event-sourced, recovery is always possible. The event log contains everything needed to reconstruct the system. State is derived. The log is sacred.

## Types of Recovery

### State Corruption

If the state file is corrupted:

```javascript
// Solution: Replay from event log
const events = await eventStore.loadAll()
const state = rebuildState(events)
await stateStore.save(state)
```

The event log is the source of truth. State can always be reconstructed.

### Lost State File

If the state file is deleted:

```javascript
// Solution: Replay from event log (same as above)
const events = await eventStore.loadAll()
const state = rebuildState(events)
await stateStore.save(state)
```

### Event Log Corruption

If the event log is corrupted (detected by chain verification):

```javascript
const chainCheck = await eventStore.verifyChain()
if (!chainCheck.valid) {
  console.log("Chain breaks at:", chainCheck.issues)
  // Manual intervention required
  // The corrupted events must be investigated
}
```

This is serious. The event log should never corrupt. If it does:
1. Identify the corruption point
2. Determine if events were tampered with or lost
3. Restore from backup if available
4. Investigate the root cause

### Genesis Failure

If Genesis fails, the system has not sealed. Recovery is simple:

```javascript
// Clear data and re-bootstrap
// (Delete data directory, fix config, restart)
```

### Invariant Violation

If an invariant violation occurs:
1. **Stop.** Do not continue operating.
2. **Preserve state.** Do not modify anything.
3. **Investigate.** Use replay to understand what happened.
4. **Report.** The invariant violation indicates a bug or structural issue.

## Recovery Procedures

### Full Recovery from Events

```javascript
// 1. Load all events
const events = await eventStore.loadAll()

// 2. Verify chain
const chainCheck = await eventStore.verifyChain()
if (!chainCheck.valid) {
  throw new Error("Event log corrupted: " + chainCheck.issues.join(", "))
}

// 3. Rebuild state
const state = rebuildState(events)

// 4. Verify consistency
const check = await replayVerifier.verify()
if (!check.consistent) {
  throw new Error("Replay inconsistent: " + check.issues.join(", "))
}

// 5. Save recovered state
await stateStore.save(state)
```

### Partial Recovery

If only some data is lost:

```javascript
// Rebuild just the needed portion
const events = await eventStore.loadAll()
const state = rebuildState(events)
// Access the specific entity
const ticket = state.tickets["T-1"]
```

## Prevention

The best recovery is prevention:

1. **Monitor chain integrity** — Regular `verifyChain()` checks
2. **Monitor replay consistency** — Regular `replayVerifier.verify()` checks
3. **Backup event log** — The event log is the only data that matters
4. **Do not modify events** — Events are immutable for a reason

## Related Documents

- [Replay](09-replay.md) — Understanding replay
- [Understanding Genesis](03-understanding-genesis.md) — Initialization and first events
- [Deterministic Engineering](../guides/philosophy/02-deterministic-engineering.md) — Why recovery works

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
