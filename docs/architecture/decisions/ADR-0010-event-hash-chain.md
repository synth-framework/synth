# ADR-0010: Event Hash Chain

## Status

Accepted

## Context

An append-only event log guarantees that events are not modified through the normal API. But it does not protect against tampering at the persistence layer. An attacker with access to the event log file could modify historical events, and the system would have no mechanism to detect this.

We needed a mechanism that makes tampering detectable — not by preventing access to the log (which is impossible at the storage layer), but by making modifications detectable during replay.

## Decision

Every operational event shall contain two cryptographic hash fields that create a chain:

- **previousHash:** The hash of the preceding event (or "genesis" for the first event)
- **eventHash:** The SHA-256 hash of the event content including the previousHash

The chain shall be verified by the ReplayVerifier, which checks that every event's previousHash matches the preceding event's eventHash. Any mismatch indicates tampering.

Genesis events (written through the raw store during bootstrap) are exempt from chain hashing. Chain verification gracefully handles mixed logs containing both hashed (operational) and unhashed (genesis) events.

## Alternatives

**Alternative A: Merkle tree**

Use a Merkle tree instead of a linear chain. Rejected: a Merkle tree provides efficient subset verification, but adds complexity. A linear chain is simpler and sufficient for detecting tampering in a single log.

**Alternative B: Digital signatures per event**

Sign each event with an asymmetric key. Rejected: adds significant overhead (one signature per event) without proportional benefit. Chain hashing detects tampering; digital signatures would be needed only if third parties need to verify events independently.

**Alternative C: No chain hashing**

Rely on filesystem permissions and backup integrity. Rejected: these are operational controls, not architectural guarantees. Chain hashing is a structural property that survives operational failures.

## Consequences

**Positive:**

- Tampering with any event invalidates all subsequent chain hashes
- Chain verification is fast (linear scan, O(n))
- The chain is computed at write time, not at verification time
- Mixed logs (genesis + operational) are handled gracefully

**Negative:**

- Adds two hash fields per event (storage overhead)
- Adds one SHA-256 computation per event (minor CPU overhead)
- Does not prevent tampering — only detects it

**Invariants established:**

- I8: The event chain shall verify cryptographically
- History shall be tamper-evident

## Related Decisions

- [ADR-0002: Event Sourcing](ADR-0002-event-sourcing.md) — Chain hashing protects the event log
- [ADR-0003: Deterministic Replay](ADR-0003-deterministic-replay.md) — Chain verification is part of replay integrity
