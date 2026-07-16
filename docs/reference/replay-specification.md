---
Title: Replay Specification
Domain: reference
Audience: developers, architects
Prerequisites: none
Knowledge Establishes: The formal specification of the Synth replay algorithm
Depends On: none
Builds Toward: none (terminal reference)
Version: 1.2.0
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

## Graph Invariants

Replay proves determinism; these invariants prove correctness of the
mission/expedition/objective aggregate graph. They are validated by
`validateAggregateGraph` (replay engine) and reported by the Replay
Verifier as `graphValid` / `graphViolations` (EXP-HARDEN-004). The full
formal model — including work-item membership, the provability
boundary, and the proof artifact contract — lives in
[Graph Integrity](graph-integrity.md) (EXP-HARDEN-005).

1. **Parent resolution.** Every expedition's `missionId` resolves to a
   mission created in the log; every objective's `expeditionId` resolves
   to an expedition created in the log. Resolution is
   order-insensitive: the parent may be created anywhere in the log.
2. **Parent presence.** Every expedition has a `missionId`; every
   objective has an `expeditionId`.
3. **Unique identity.** No aggregate identity is created more than once,
   and no identity is shared across aggregate kinds.
4. **Acyclicity.** Parent chains never loop.
5. **Connectivity.** Every aggregate is reachable from a mission root;
   no orphan aggregates exist.
6. **Navigation.** After replay, `state.missions[expedition.missionId]`
   exists for every expedition and `state.expeditions[objective.expeditionId]`
   exists for every objective.

### Enforcement model

Graph violations are **reported separately** from the legacy
consistency verdict:

- `consistent` remains `chainValid && divergences.length === 0` and is
  unaffected by graph violations.
- `graphValid` / `graphViolations` carry graph correctness. Default
  tooling (`scripts/verify-replay.js`, `npm run verify`) prints them as
  warnings and exits 0, because historical logs polluted before
  EXP-HARDEN-001 are preserved as immutable forensic evidence.
- `scripts/verify-replay.js --strict-graph` exits 1 when the graph is
  invalid. Strict mode is the enforcement path; default mode is the
  deliberate, documented grandfathering of legacy logs.
- `scripts/verify-replay.js --log <path>` verifies an alternate event log
  instead of the repository's canonical `data/event-log.jsonl`, so any
  archived or fixture log can be checked in either mode.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
| 1.1.0 | 2026-07-15 | Graph invariants and enforcement model (EXP-HARDEN-004) |
| 1.2.0 | 2026-07-16 | Pointer to the first-class Graph Integrity model (EXP-HARDEN-005) |
