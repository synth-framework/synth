# ADR-0003: Deterministic Replay

## Status

Accepted

## Context

If state is derived from an event log, the system must guarantee that the same event log always produces the same state. Without this guarantee, replay is not a verification mechanism — it is a source of uncertainty.

The question is not whether determinism is desirable. The question is what mechanisms ensure it structurally, so that no accidental change — by a human developer or an automated agent — can introduce nondeterminism without being detected.

## Decision

Replaying the event log through the domain logic shall always produce the same canonical state. This is not a tested-for property. It is a structural guarantee enforced by architectural constraints.

Domain logic shall be pure: no side effects, no external I/O, no hidden state. All inputs shall be explicit. All state transitions shall be deterministic functions of (intent, current_state).

The system shall include a ReplayVerifier that reconstructs state from events and compares the resulting hash against the expected hash. Any divergence indicates tampering, corruption, or nondeterministic execution.

## Alternatives

**Alternative A: Testing for determinism**

Write tests that exercise the system and check for consistent results. Rejected: tests can miss edge cases. Determinism must be a structural property, not a tested-for behavior.

**Alternative B: Accept nondeterminism with reconciliation**

Allow nondeterministic execution and provide reconciliation mechanisms. Rejected: this violates the fundamental guarantee of event sourcing. If replay can produce different results, the event log is not the source of truth.

**Alternative C: Version domain logic per event**

Store the version of domain logic used for each event, allowing logic changes without breaking replay. Accepted as a future consideration: current design assumes stable domain logic. If logic must change, the system can be versioned.

## Consequences

**Positive:**

- Replay becomes a reliable verification mechanism
- Tests are deterministic and repeatable
- Debugging can reproduce exact system states
- Distributed systems can verify consistency independently

**Negative:**

- Domain logic must not change incompatibly
- Time-based operations must use recorded timestamps
- External inputs must be modeled as events, not as logic

**Invariants established:**

- I4: Replay shall produce identical state
- ExecutionFingerprint shall detect any deviation

## Related Decisions

- [ADR-0002: Event Sourcing](ADR-0002-event-sourcing.md) — Event sourcing makes replay possible
- [ADR-0010: Event Hash Chain](ADR-0010-event-hash-chain.md) — Chain hashes detect tampering that would affect replay
