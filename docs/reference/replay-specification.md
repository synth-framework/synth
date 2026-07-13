---
Title: Replay Specification
Domain: reference
Audience: developers, architects
Prerequisites: none
Knowledge Establishes: The formal specification of the Synth replay algorithm
Depends On: none
Builds Toward: none (terminal reference)
Version: 1.0.0
Status: stable
---

# Replay Specification

## Algorithm

```
function replay(events):
  state = createEmptyState()
  for event in events:
    state = applyEvent(state, event)
  state.stateHash = computeStateHash(state)
  return state
```

## Properties

1. **Deterministic:** Same events → same state. Always.
2. **Order-dependent:** Event order matters. Last event wins for same entity.
3. **Pure:** No side effects. No external dependencies.
4. **Total:** Every event increments version. Unknown events are no-ops.

## State Hash

```
computeStateHash(state):
  str = JSON.stringify({
    v: state.version,
    t: sortedKeys(state.tickets),
    p: sortedKeys(state.plans),
    m: sortedKeys(state.missions),
    e: sortedKeys(state.expeditions),
    o: sortedKeys(state.objectives),
    d: sortedKeys(state.discoveries),
    dc: sortedKeys(state.decisions),
    w: sortedKeys(state.workItems),
  })
  return djb2Hash(str)
```

## Chain Hashing

```
hashEvent(event):
  previousHash = lastHash || "genesis"
  eventData = JSON.stringify(sortKeys({ ...event, previousHash }))
  eventHash = SHA256(eventData)
  return { ...event, previousHash, eventHash }
```

## Verification

```
verifyChain(events):
  hashed = events.filter(e => e.eventHash)
  for i = 1 to hashed.length - 1:
    if hashed[i].previousHash != hashed[i-1].eventHash:
      return { valid: false, breakAt: i }
  return { valid: true }
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
