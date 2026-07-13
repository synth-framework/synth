---
Title: Testing Replay
Domain: developer
Audience: developers
Prerequisites: deterministic-code.md, philosophy/02-deterministic-engineering.md
Knowledge Establishes: How to test that replay produces consistent state
Depends On: deterministic-code.md, philosophy/02-deterministic-engineering.md
Builds Toward: none (terminal)
Version: 1.0.0
Status: stable
---

# Testing Replay

## What to Test

Replay testing ensures that:
1. Same events → same state (determinism)
2. State hash is consistent across replays
3. Chain integrity is maintained
4. Mixed genesis + operational events replay correctly

## Determinism Test

```javascript
test("Replay: same events = same state", () => {
  const events = [
    { type: "TICKET_CREATED", payload: { ticket: { id: "T-1", status: "idle" } } },
    { type: "TICKET_STARTED", payload: { ticketId: "T-1" } },
  ]
  const state1 = rebuildState(events)
  const state2 = rebuildState(events)
  assert.equal(state1.stateHash, state2.stateHash)
})
```

## State Hash Changes

```javascript
test("Replay: different events = different hash", () => {
  const events1 = [{ type: "TICKET_CREATED", payload: { ticket: { id: "T-1" } } }]
  const events2 = [
    { type: "TICKET_CREATED", payload: { ticket: { id: "T-1" } } },
    { type: "TICKET_STARTED", payload: { ticketId: "T-1" } },
  ]
  const state1 = rebuildState(events1)
  const state2 = rebuildState(events2)
  assert.notEqual(state1.stateHash, state2.stateHash)
})
```

## Chain Verification

```javascript
test("Chain: event links are valid", async () => {
  const chainCheck = await eventStore.verifyChain()
  assert.equal(chainCheck.valid, true)
})
```

## Mixed Genesis + Operational

```javascript
test("Replay: genesis + operational events", async () => {
  const events = await eventStore.loadAll()
  const state = rebuildState(events)
  // Should handle both hashed and unhashed events
  assert.ok(state.version > 0)
})
```

## Related Documents

- [Deterministic Code](deterministic-code.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
