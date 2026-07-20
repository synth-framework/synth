# Debugging

## Diagnostic Approach

Synth's architecture provides multiple diagnostic layers. When something goes wrong, use these techniques in order.

## 1. Check the Event Log

The event log is the primary diagnostic tool. Every mutation is recorded:

```
Read .synth/data/event-log.jsonl
Look for:
  - Event ordering
  - Transaction IDs
  - Chain hash integrity
  - Actor and capability fields
```

## 2. Run Replay Verification

```
node scripts/verify-replay.js
```

This reports:
- Event count
- Consistency status
- State hash
- Any issues found

## 3. Run Determinism Check

```
node scripts/verify-determinism.js
```

This reports:
- Fingerprint count
- Uniqueness ratio
- Determinism status

## 4. Run Audit Bypass Map

```
node scripts/audit-bypass-map.js
```

This scans for illegal mutation paths in the source code.

## Common Issues

### Chain Hash Mismatch

**Symptom:** `verifyChain()` reports a break.

**Causes:**
- Event log tampering
- Storage corruption
- Concurrent writes (should not happen with per-partition queues)

**Resolution:**
- Check event log for unexpected modifications
- Restore from backup if corrupted
- Verify no external process is writing to the log

### State Hash Mismatch

**Symptom:** Replay hash does not match expected hash.

**Causes:**
- Domain logic changed
- Event log corrupted
- Nondeterministic execution

**Resolution:**
- Check if domain logic was modified
- Run determinism check
- Restore event log from backup

### Policy Denial

**Symptom:** Intent rejected with POLICY_BLOCKED.

**Causes:**
- Intent matches a DENY policy
- Preconditions not met

**Resolution:**
- Check the rejection reason for the policy ID
- Review the policy's condition and scope
- Check entity state (e.g., ticket status)

### Guard Rejection

**Symptom:** ILLEGAL_EVENTSTORE_WRITE error.

**Causes:**
- Direct write to EventStore outside CommandBus.dispatch
- Guard token not activated

**Resolution:**
- Ensure all writes go through CommandBus.dispatch
- Check that guard activation/deactivation is balanced

### Seal Violation

**Symptom:** InvariantViolation I5 or I5 when registering capability/policy.

**Causes:**
- Attempting to register after seal
- Double-seal

**Resolution:**
- Register all capabilities and policies before seal
- Check isSealed before registration attempts

## Diagnostic Checklist

When investigating an issue:

1. [ ] Check event log for unexpected events
2. [ ] Run verify-replay.js
3. [ ] Run verify-determinism.js
4. [ ] Run audit-bypass-map.js
5. [ ] Check system is sealed (if applicable)
6. [ ] Verify no direct store writes
7. [ ] Check domain logic for changes
8. [ ] Review policy configuration

## Related Documents

- [Testing](testing.md) -- Test-driven debugging
