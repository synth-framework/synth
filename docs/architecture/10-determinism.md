# 10 - Determinism

Determinism is the foundational property of Synth. This document defines what determinism means in the Synth context, identifies sources of nondeterminism, and describes how the system mitigates them.

## Definition

A Synth system is **deterministic** if and only if:

> Given the same event log and the same domain logic, replay always produces the same canonical state.

This is not a goal or a preference. It is an architectural property that is structurally enforced at every layer.

## Requirements for Determinism

For determinism to hold, the following must be true:

1. **Domain logic is pure** -- same (intent, state) always produces same events
2. **Event ordering is preserved** -- events are processed in log order
3. **State reconstruction is pure** -- same events always produce same state
4. **No hidden state** -- all state is derived from the event log
5. **No ambient authority** -- execution depends only on explicit inputs
6. **Stable serialization** -- hash computation uses canonical (sorted-key) representation

## Sources of Nondeterminism

Common sources of nondeterminism in software systems and Synth's mitigations:

| Source | Problem | Synth Mitigation |
|--------|---------|-----------------|
| System clock | Different time on each run | Uses event timestamp, not system clock |
| Random number generation | Different values each call | Randomness is controlled and recorded |
| Unordered iteration | Hash maps with undefined iteration order | All iterations use sorted keys |
| Floating point | Precision differences across platforms | Not used for decision logic |
| External I/O | Network calls, file reads | External inputs modeled as events |
| Language runtime | GC timing, async scheduling | Ordering enforced by CommandBus queues |
| Concurrency | Race conditions | Per-partition sequential execution |

## Testing Methodology

Synth uses multiple techniques to verify determinism:

### Execution Fingerprinting

Every command execution produces a SHA-256 fingerprint:

```
fingerprint = SHA-256( canonicalize({
    command: { actor, capability, payload },
    capability: capabilityName,
    partition: partitionKey,
    events: [{ type, payload }],
    result: output
}) )
```

**Properties:**
- Same inputs produce the same fingerprint
- Different inputs produce different fingerprints
- Fingerprints can be compared across replays

### Fingerprint Verification

After each batch of operations:

1. Compute fingerprints for all command executions
2. Verify all fingerprints are unique (no collisions)
3. Store fingerprints for future comparison

### Replay Comparison

1. Save the event log
2. Reconstruct state from the event log
3. Compute state hash
4. Compare with expected state hash
5. Any divergence indicates nondeterminism or tampering

## Replay Guarantees

Synth provides the following determinism guarantees:

| Guarantee | Description |
|-----------|-------------|
| Event-level | Same event always produces the same state change |
| Log-level | Same event log always produces the same state |
| Fingerprint-level | Same command always produces the same fingerprint |
| Chain-level | Same chain always validates the same way |

## Mitigation Strategies

### Key Sorting

All objects are canonicalized with sorted keys before hashing. This prevents hash differences due to object key ordering:

```
// Before hashing:
{ b: 1, a: 2 } → { a: 2, b: 1 }
```

### Timestamp Recording

Event timestamps are recorded at event creation time, not at replay time. This means:

- The same event log always has the same timestamps
- Replay does not depend on when it is run
- State derived from timestamps is deterministic

### Stable Array Ordering

Arrays are processed in index order. No array operations use unordered iteration.

### No External Calls in Domain

The domain layer contains no external calls, no I/O, no references to infrastructure. It is pure logic that depends only on its explicit inputs.

## When Determinism Fails

Determinism can fail in the following scenarios:

| Scenario | Detection | Resolution |
|----------|-----------|------------|
| Domain logic change | Fingerprint mismatch on replay | Domain logic must be versioned; old events use old logic |
| Event log corruption | Chain hash break | Restore from backup; investigate tampering |
| Nondeterministic input | Inconsistent fingerprints across runs | Identify and eliminate nondeterministic source |
| Serialization change | Hash mismatch | Serialization format must be stable across versions |

## Related Documents

- [09 - Event Model](09-event-model.md) -- How events support determinism
- [11 - Replay](11-replay.md) -- How replay verifies determinism
- [17 - Runtime Invariants](17-runtime-invariants.md) -- Invariants that enforce determinism
