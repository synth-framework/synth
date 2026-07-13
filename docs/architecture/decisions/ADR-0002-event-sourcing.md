# ADR-0002: Event Sourcing

## Status

Accepted

## Context

State-based persistence erases history. When a record is updated, the previous state is overwritten. The system forgets how it arrived at its current condition. This creates problems for debugging, auditing, reconstruction, and governance.

We needed a persistence model where:
- Complete history is always available
- State can be reconstructed from first principles
- Every state change is recorded as an explicit fact
- Temporal queries are natural and efficient
- Audit requirements are satisfied by construction

## Decision

All state changes shall be recorded as immutable events in an append-only log. State shall be derived by folding the event log through pure domain logic. The event log is the single source of truth; state is a cached projection.

There shall be no mechanism for modifying or deleting events after they are written.

## Alternatives

**Alternative A: State-based persistence with audit log**

Store state directly and maintain a separate audit log. Rejected: the audit log becomes secondary, optional, and potentially inconsistent with the state. Two sources of truth create divergence opportunities.

**Alternative B: Event sourcing with state snapshots**

Use event sourcing but also store snapshots for performance. Accepted in principle: snapshots are taken as cache only, never as truth. The event log remains authoritative.

**Alternative C: CRDT-based distributed state**

Use conflict-free replicated data types for distributed state management. Rejected: introduces complexity, requires convergence guarantees, and makes governance harder because policy evaluation must happen at every replica.

## Consequences

**Positive:**

- Complete history is preserved as an immutable audit trail
- State can be reconstructed at any point in time
- Debugging can work backwards from state to events
- Governance can inspect every state change
- Replay verifies system integrity

**Negative:**

- Event logs grow without bound
- State reconstruction has computational cost
- Schema evolution requires care (events are immutable)
- Storage requirements are larger than state-only approaches

**Invariants established:**

- History shall be immutable
- Every mutation shall produce at least one event

## Related Decisions

- [ADR-0003: Deterministic Replay](ADR-0003-deterministic-replay.md) — Replay is the mechanism for reconstructing state from events
- [ADR-0010: Event Hash Chain](ADR-0010-event-hash-chain.md) — Chain hashes protect the integrity of the event log
