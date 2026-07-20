# Project Structure

## Directory Layout

```
synth-v2/
  dist/                    -- Distribution / compiled output
    synth-v5.js            -- Single source of truth (complete kernel)
    main.js                -- Entrypoint

  tests/
    synth.test.js          -- Full test suite (67 tests)

  scripts/
    audit-bypass-map.js    -- Static scanner for illegal mutation paths
    verify-replay.js       -- Standalone L4 replay verification
    verify-determinism.js  -- Standalone L5 determinism check

  docs/
    README.md              -- Documentation overview
    architecture/          -- Architecture handbook (18 documents)
    developer/             -- Developer guide (6 documents)
    ai/                    -- AI contributor guide (4 documents)
    operations/            -- Operations manual (5 documents)
    reference/             -- Reference docs (4 documents)

  .synth/data/             -- Runtime data (created at runtime)
    event-log.jsonl        -- Append-only event log
    canonical-state.json   -- State snapshot with hash
    checkpoints.json       -- Consumer checkpoints
    event-stream/          -- Partitioned event streams
```

## Key Files

### synth-v5.js (Single Source of Truth)

The complete 5-layer kernel in one file. Contains:

| Section | Lines | Purpose |
|---------|-------|---------|
| Invariant Assertions | ~70 | I1-I8 runtime checks |
| InvocationPermit | ~40 | HMAC-SHA256 signed authorization |
| ExecutionCoordinator | ~30 | Permit validation before runtime |
| Domain Logic | ~120 | Pure entity lifecycle functions |
| Validation | ~40 | Intent schema validation |
| PolicyEngine | ~60 | Deterministic constraint evaluator |
| EventStore | ~80 | Append-only log with chain hashing |
| StateStore | ~40 | Hash-verified state snapshots |
| RuntimeEngine | ~50 | Pure execution operator |
| CommandBus | ~80 | Single mutation authority |
| SynthAPI | ~40 | Public request handler |
| Genesis | ~50 | Pre-bus initialization |
| Bootstrap | ~100 | System wiring and seal |
| Main Demo | ~100 | Full system demonstration |

### Module Organization

Within the single source file, code is organized by architectural layer:

```
P1: Cryptographic Attestation (InvocationPermit, ExecutionCoordinator)
L3: Domain (pure logic)
Validation (schema checking)
L2: Policy (constraint evaluation)
L2: Infrastructure (stores, guards)
L3: Runtime (execution operator)
Registry (capability catalog)
L4: ReplayVerifier
L5: ExecutionFingerprint
L1: CommandBus (mutation authority)
API (public interface)
Genesis (initialization)
Bootstrap (system wiring)
Main (demonstration)
```

## Component Responsibilities

### CommandBus (L1 Authority)
- Orchestrates the execution pipeline
- Activates guard for store writes
- Creates invocation permits
- Tracks mutation count

### RuntimeEngine (L3 Execution)
- Executes domain logic
- Produces events
- Reconstructs state from event log
- Never validates, never checks policy

### EventStore (L4 Persistence)
- Appends events with chain hashes
- Loads events in order
- Verifies chain integrity
- Rejects writes without guard token

### PolicyEngine (L2 Governance)
- Evaluates intents against policies
- Returns ALLOW/DENY with attestation
- Computes policy version hash
- Frozen after seal

### ExecutionCoordinator (P1 Attestation)
- Validates permit signatures
- Verifies permit-invocation match
- Delegates to RuntimeEngine

### ReplayVerifier (L4 Truth)
- Reconstructs state from events
- Compares state hash
- Reports inconsistencies

## Data Flow

All data flows unidirectionally:

```
Intent → Validation → Policy → Permit → Execute → Events → Store → Verify
```

There are no feedback loops. Each step transforms data and passes it forward.

## Extension Points

The system is designed for extension at three points:

1. **Capabilities** -- Register new capabilities during bootstrap (before seal)
2. **Policies** -- Register new policies during bootstrap (before seal)
3. **Entities** -- Add new entity types with their own events and state transitions

See [16 - Extension Model](../../architecture/16-extension-model.md) for details.

## Related Documents

- [Getting Started](getting-started.md) -- First steps
- [Coding Standards](coding-standards.md) -- Code conventions
