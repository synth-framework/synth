# EXP-DET-001 — Deterministic Execution

**Status:** Completed  
**Priority:** High  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**Depends On:** `docs/architecture/constitution.md` Article II, `docs/EXP-AUD-002-zero-trust-architecture-verification.md` AUD-009, EXP-SMA-001  
**Blocks:** EXP-AUD-002, EXP-GOV-001

---

## Objective

Remove every nondeterministic input from execution logic and domain state generation. Two identical commands must produce identical canonical events and identical state fingerprints.

Current state:

- `Date.now()` used for event timestamps and entity `createdAt` / `updatedAt`.
- `crypto.randomUUID()` used for event IDs and transaction IDs.
- Domain functions read global time and randomness directly.

Desired state:

- All execution receives a deterministic `ExecutionContext`.
- Domain functions derive IDs and timestamps from the context.
- Replay, fingerprints, tests, and audits are reproducible.

---

## Scope

### In Scope

- Introduce `ExecutionContext` containing: `timestamp`, `commandId`, `correlationId`, `actor`, `sequence`.
- Refactor `ExecutionGate.execute()` to construct and pass the context.
- Refactor `RuntimeExecutor.execute()` to use the context instead of global functions.
- Refactor domain factories and transitions to use context timestamps.
- Update `rebuildState` to reconstruct context-consistent state.
- Update `verify-determinism.js` to execute identical commands twice and compare fingerprints.

### Out of Scope

- Genesis determinism unless explicitly required by Constitution.
- External I/O nondeterminism (network, filesystem ordering).
- Cryptographic randomness used for security (e.g., secrets).

---

## Acceptance Criteria

1. `Date.now()` and `crypto.randomUUID()` do not appear in `src/runtime/`, `src/domain/`, or `src/control/` except in observational logging.
2. `ExecutionContext` is the sole source of time and identity for command execution.
3. `ExecutionGate.execute()` produces deterministic `transactionId` for a given `(actor, capability, payload, sequence)` tuple.
4. Domain events derive `timestamp`, `id`, and entity timestamps from the context.
5. `scripts/verify-determinism.js` runs the same command twice and reports identical fingerprints.
6. `npm run test:all` reports 202 passing tests.
7. `npm start` from an empty log twice produces event logs with identical logical structure (sequence, types, payloads) — event IDs and timestamps may differ only if Genesis is exempt.

---

## Design

### `ExecutionContext`

```typescript
interface ExecutionContext {
  timestamp: number;        // deterministic clock tick
  commandId: string;        // deterministic hash of intent + sequence
  correlationId: string;    // propagated from caller or generated deterministically
  actor: string;
  sequence: number;         // monotonic offset within transaction / log
}
```

### Context Construction

- `ExecutionGate.execute()` builds the context at command entry.
- `timestamp` comes from a deterministic clock source (e.g., `Date.now()` at gate entry is acceptable if captured once per command, not per event).
- `commandId` is a deterministic hash of `(actor, capability, payload, sequence)`.
- `sequence` is sourced from the next event log offset.

### Domain Functions

- Every domain factory and transition accepts `ExecutionContext`.
- `createdAt` / `updatedAt` use `ctx.timestamp`.
- Event `id` uses `ctx.commandId` or a deterministic derivative.

### Replay

- `rebuildState` ignores replay-time wall clock.
- State hash depends only on event payloads and sequence.

---

## Verification Steps

1. **Static check:** grep for `Date\.now\(\)`, `crypto\.randomUUID\(\)`, `Math\.random\(\)` in `src/` — expect zero matches outside logging/observability code.
2. **Determinism script:** `npm run test:determinism` runs identical commands twice and passes.
3. **Fingerprint check:** execute `CreateWorkItem {id:"W-DET"}` twice; compare fingerprints; expect equality.
4. **Replay check:** replay event log twice; expect identical state hashes.
5. **Regression:** `npm run test:all` passes.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Tests assume unique random IDs | Update tests to assert deterministic IDs or use fixed test sequences. |
| Event `id` collision | Use sequence-based deterministic IDs; collisions indicate a bug. |
| Breaking change to event log format | Event shape remains the same; only ID/timestamp generation changes. |

---

## Completion Notes

Completed on 2026-06-29.

- Added `ExecutionContext` and `DomainContext` types in `src/types/context.ts`.
- `ExecutionGate.execute()` now builds a deterministic context:
  - `timestamp` = event log sequence number.
  - `commandId` = SHA-256 of `(actor, capability, payload, priorStateHash)`.
  - `sequence` = current event count.
- `RuntimeEngine.execute()` and `RuntimeExecutor.execute()` accept and propagate the context.
- All domain factories and transitions in `src/domain/` receive `DomainContext` and use `ctx.timestamp` instead of `Date.now()`.
- `toEvents()` generates event IDs as `${commandId}-${index}` and timestamps from context.
- `src/runtime/replay.ts` uses `event.timestamp` for all replay-time timestamps.
- Removed `Date.now()` and `crypto.randomUUID()` from `src/runtime/`, `src/domain/`, `src/control/`, `src/command/`, and `src/core/` (except observational logging).
- Rewrote `scripts/verify-determinism.js` to perform a paired-execution check.
- Verified: identical commands produce identical event IDs, transaction IDs, timestamps, and state hashes.

---

## Definition of Done

- [x] No nondeterministic calls remain in execution/domain paths.
- [x] `ExecutionContext` threaded through `ExecutionGate` → `RuntimeExecutor` → Domain.
- [x] `verify-determinism.js` verifies identical-command reproducibility.
- [x] All tests pass.
- [x] Audit report updated to mark determinism resolved.
