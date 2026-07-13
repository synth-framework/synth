---
Title: Event-Sourced Engineering
Domain: philosophy
Audience: everyone
Prerequisites: 00-introduction.md, 01-engineering-philosophy.md, 02-deterministic-engineering.md
Knowledge Establishes: Why event sourcing is the correct model for engineering knowledge systems
Depends On: 00-introduction.md, 01-engineering-philosophy.md, 02-deterministic-engineering.md
Builds Toward: 05-governance-philosophy.md, 07-canonical-knowledge.md, architecture/event-sourcing.md
Version: 1.0.0
Status: stable
---

# Event-Sourced Engineering

## The Wrong Default

Most software systems store state. They maintain databases of current values. When something changes, they update the record. The previous value is lost.

This is the wrong default for engineering systems.

When you update a record, you destroy knowledge. You lose what the value was, when it changed, and why it changed. You are left with only the current value, stripped of all context.

Event sourcing inverts this. Instead of storing state, you store events. State is derived. The event log is the source of truth.

## What Event Sourcing Means

In an event-sourced system:

- **Events are facts.** They describe things that happened.
- **Events are immutable.** Once written, they never change.
- **Events are append-only.** New events are added to the log. Old events are never modified or deleted.
- **State is a view.** Current state is computed by replaying all events.

Example:

```
Traditional:   tickets table → UPDATE status='active' WHERE id='T-1'
Event-sourced: TICKET_STARTED { id: 'T-1' } → append to log → derive state
```

In the traditional model, the old status is gone. In the event-sourced model, every status change is preserved.

## Why Immutable History Matters

Immutable history is not a technical preference. It is an epistemological stance.

Engineering knowledge is historical. It accumulates over time. Decisions are made in context. That context includes what was known at the time, what was uncertain, and what was assumed.

If you can modify history, you can rewrite the context. You can pretend that decisions were made with knowledge that did not yet exist. You can hide mistakes. You can erase discoveries.

Immutable history prevents this. It ensures that:

1. **The record is complete.** Nothing is lost.
2. **The record is honest.** Nothing is rewritten.
3. **The record is auditable.** Anyone can trace from present to past.
4. **The record is recoverable.** Any past state can be reconstructed.

## Events as Knowledge

In Synth, events are not just technical artifacts. They are knowledge artifacts.

Each event type represents a category of engineering knowledge:

| Event Type | Knowledge Category |
|------------|-------------------|
| TICKET_CREATED | Work item identified |
| MISSION_CREATED | Strategic direction established |
| EXPEDITION_CREATED | Engineering objective defined |
| DISCOVERY_RECORDED | New knowledge learned |
| DECISION_ACCEPTED | Direction chosen |
| OBJECTIVE_ADDED | Outcome defined |
| SYSTEM_GENESIS | System initialized |

The event log is therefore a knowledge graph. It records not just what happened, but what was learned, what was decided, and what was attempted.

## The Event Log as Audit Trail

In regulated environments, audit trails are mandatory. Event sourcing provides audit trails for free. Every change is recorded with:
- Who made it (actor)
- What was done (capability)
- When it happened (timestamp)
- Why it was authorized (permit)
- What came before (previous hash)

This is not audit logging as an afterthought. This is audit logging as architecture.

## Chain Hashing: Tamper Evidence

Synth cryptographically links events. Each event contains:
- `previousHash` — the hash of the previous event
- `eventHash` — the hash of this event (including previousHash)

This creates a chain. If any event is modified, its hash changes. The next event's previousHash no longer matches. The break is detected.

Chain hashing transforms the event log from a convenient record into a **tamper-evident ledger**. It becomes a trustworthy historical document.

## The Cost of Event Sourcing

Event sourcing has costs:

1. **Storage.** The event log grows monotonically. Storage is proportional to history, not state size.
2. **Query complexity.** Current state must be derived. Snapshots can mitigate this.
3. **Mental model.** Developers must think in events, not state.

These costs are real. They are also the price of trustworthy knowledge preservation.

Synth mitigates these costs:
- Snapshots provide fast state access
- Partitioning distributes the event log
- Deterministic replay enables verification
- Chain hashing ensures integrity

## Event Sourcing and Determinism

Event sourcing and determinism are natural partners.

Event sourcing provides the immutable sequence. Determinism provides the guarantee that replaying that sequence always produces the same state.

Together, they create a system where:
- History is fixed (event sourcing)
- State is explainable (determinism)
- Verification is automatic (replay)
- Trust is justified (both)

## Related Documents

- [Deterministic Engineering](02-deterministic-engineering.md) — Determinism in depth
- [Engineering Philosophy](01-engineering-philosophy.md) — Engineering as knowledge
- [Governance Philosophy](05-governance-philosophy.md) — Enforcing rules on immutable history
- [Architecture Handbook](../../architecture/) — Technical implementation

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
