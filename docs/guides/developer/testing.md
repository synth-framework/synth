# Testing

## Testing Philosophy

Synth's test strategy is built on three layers:

1. **Unit Tests** -- Pure domain logic, isolated
2. **Integration Tests** -- Component interaction, bootstrap, seal
3. **Verification Scripts** -- Standalone integrity checks

All tests must be deterministic. A test that produces different results on different runs is a bug.

## Test Categories

### Domain Tests (8 tests)

Test pure entity lifecycle functions:
- WorkItem creation, start, complete, block
- Plan creation, activation, completion
- Milestone creation, start, completion
- Project creation

These tests verify that domain logic is pure and correct.

### Event Store Tests (3 tests)

Test the append-only event store:
- Append and load order preservation
- Append-only invariant (no update/delete)
- Batch append

### Replay/State Tests (7 tests)

Test state reconstruction:
- Empty state reconstruction
- WorkItem CRUD replay
- Multi-ticket replay
- Determinism (same events produce same state)

### Validation Tests (4 tests)

Test intent validation:
- Missing actor
- Missing capability
- Missing payload.id
- Valid intent passes

### Policy Tests (3 tests)

Test policy evaluation:
- Default allow (no matching policy)
- System protection (DENY)
- Completed work protection (DENY)

### Integration Tests (5 tests)

Test component wiring:
- Bootstrap produces functional system
- 7 default capabilities registered
- Empty event log replay
- State is pure function of events

### Edge Case Tests (6 tests)

Test boundary conditions:
- Unknown events (no handler)
- Null payload
- Duplicate start attempts
- Block without reason
- Invalid state transitions

### Layer 4 Tests (2 tests)

Test replay verification:
- Consistency check passes
- Structural issue detection

### Layer 5 Tests (3 tests)

Test execution fingerprinting:
- Same input produces same hash
- Different input produces different hash
- Field coverage

### P0 Structural Tests (10 tests)

Test structural boundary enforcement:
- Runtime not exported from bootstrap
- Seal is one-way transition
- Seal freezes capability registry
- Seal freezes policy engine
- Frozen registry blocks registration
- Frozen policy blocks registration
- Double-seal throws
- System operates after seal
- CommandBus remains sole authority
- Guard blocks direct writes

### P1 Attestation Tests (6 tests)

Test cryptographic attestation:
- Policy attestation returns hash
- Policy hash is deterministic
- API response includes attestation
- Event chain is valid after operations
- Hashed events have hash fields
- Mixed genesis/hashed events coexist

### P2 Hardening Tests (5 tests)

Test production hardening:
- API object frozen after seal
- CommandBus not frozen (operational state)
- Frozen API rejects mutation
- State store hash integrity on save/load

### Ordering Tests (2 tests)

Test event ordering:
- Log order preservation
- Out-of-order replay handling

## Verification Scripts

Three standalone scripts verify system integrity:

### audit-bypass-map.js

Scans for illegal mutation paths. Exempts:
- CommandBus (the authority)
- Bootstrap (initial wiring)
- EventStore guard mechanism
- Genesis intake
- StateStore (read-only operational)

### verify-replay.js

Standalone L4 check:
- Reads event log directly
- Reconstructs state
- Reports consistency

### verify-determinism.js

Standalone L5 check:
- Recomputes fingerprints
- Verifies uniqueness
- Reports determinism status

## Writing New Tests

When adding a test:

1. **Identify the layer** -- domain, integration, structural
2. **Name clearly** -- what is being tested and expected outcome
3. **Test one thing** -- each test verifies one behavior
4. **Include edge cases** -- boundary conditions and error paths
5. **Verify invariants** -- architectural constraints, not just behavior
6. **Run the full suite** -- new tests must not break existing tests

## Test Invariants

| Property | Requirement |
|----------|-------------|
| Determinism | Same test always produces same result |
| Isolation | Tests do not depend on each other |
| Completeness | Every behavior has a test |
| Invariant coverage | Every invariant has a test |

## Related Documents

- [Coding Standards](coding-standards.md) -- Code conventions for tests
- [Contributing](contributing.md) -- Contribution workflow including test requirements
