# EXP-SMA-001 — Complete Single Mutation Authority

**Status:** Completed  
**Priority:** Highest  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**Depends On:** `docs/architecture/constitution.md` Article I, `docs/EXP-AUD-002-zero-trust-architecture-verification.md` AUD-001  
**Blocks:** EXP-DET-001, EXP-AUD-002, EXP-GOV-001

---

## Objective

Eliminate every mutation path except `ExecutionGate`. Genesis must commit events through the same authority as operational commands.

Current state:

```
Genesis
   ↓
rawEventStore.append(...)
```

Desired state:

```
Genesis
   ↓
ExecutionGate.executeGenesis()
   ↓
Runtime / Domain
   ↓
EventStore
```

When complete, the answer to "Who may mutate state?" is:

> Exactly one object: `ExecutionGate`.

---

## Scope

### In Scope

- Refactor `GenesisIntake` to build events and hand them to `ExecutionGate.executeGenesis()`.
- Remove `rawEventStore` from the public `Infra` interface.
- Ensure `EventStore.append()` is reachable only through `ExecutionGate`.
- Update bootstrap sequence so `ExecutionGate` exists before Genesis runs.
- Update audit scripts so they no longer exempt Genesis files.

### Out of Scope

- Deterministic ID or timestamp generation (EXP-DET-001).
- New auditor capabilities (EXP-AUD-002).
- CI/release governance (EXP-GOV-001).

---

## Acceptance Criteria

1. `Infra` interface has no `rawEventStore` member.
2. `GenesisIntake` never imports or calls `EventStore.append()`.
3. `ExecutionGate` exposes `executeGenesis(events: SynthEvent[]): Promise<TransactionResult>`.
4. `bootstrap()` routes all seed events through `ExecutionGate.executeGenesis()`.
5. `scripts/audit-bypass-map.js` does not exempt `bootstrap.ts`, `intake.ts`, or any Genesis-related file.
6. `npm run test:audit` passes **without** exemptions.
7. `npm run test:all` still reports 202 passing tests.
8. `npm start` from an empty `data/event-log.jsonl` still bootstraps successfully.

---

## Design

### `ExecutionGate.executeGenesis()`

A dedicated, single-use path for system initialization:

- Accepts a batch of pre-constructed seed events.
- Validates that the event log is empty (prevent double-Genesis).
- Appends all events in one transaction.
- Does not enforce actor capabilities or runtime policies (those systems are not yet active).
- Still uses the guarded `EventStore`, so the append is logged and replayable.

This is **not** a bypass; it is the one authorized Genesis path through the same gate.

### `GenesisIntake`

- Becomes a pure builder of seed events.
- Receives `ExecutionGate` instead of `EventStore`.
- Calls `gate.executeGenesis(events)` once with the complete seed batch.

### `Infra`

- Exposes only `eventStore` (guarded) and `stateStore`.
- Internal store construction remains encapsulated inside `createInfra()`.

---

## Verification Steps

1. **Static check:** grep for `rawEventStore` in `src/` and `scripts/` — expect zero matches.
2. **Static check:** grep for `EventStore\.append` in `src/` — expect matches only inside `ExecutionGate`.
3. **Run audit:** `npm run test:audit` must pass without file exemptions.
4. **Run tests:** `npm run test:all` must report 202 passing tests.
5. **Bootstrap check:**
   ```bash
   rm -f data/event-log.jsonl && touch data/event-log.jsonl
   npm start
   wc -l data/event-log.jsonl  # expect > 0
   ```
6. **Replay check:** replay the fresh event log and confirm state hash matches stored state hash.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Tests depend on `rawEventStore` | Update tests to use the guarded `eventStore` or mock `ExecutionGate`. |
| Genesis needs to run before policy freeze | `executeGenesis()` runs before `seal()`; policy is enforced only after seal. |
| Circular dependency between gate and genesis | Pass the gate into `GenesisIntake`; do not let the gate depend on Genesis. |

---

## Completion Notes

Completed on 2026-06-29.

- `rawEventStore` removed from `Infra`; only the guarded `eventStore` is exposed.
- `GenesisIntake` now builds seed events and commits them via `ExecutionGate.executeGenesis()`.
- `src/core/command-bus.ts` deleted; `IllegalMutationError` moved to `src/core/errors.ts`.
- `scripts/audit-bypass-map.js` no longer exempts Genesis files.
- `npm run test:audit` passes with zero exemptions.
- `npm run test:all` reports 202 passing tests.
- Fresh bootstrap from empty `data/event-log.jsonl` succeeds; replayed state hash matches stored state hash.

---

## Definition of Done

- [x] `rawEventStore` removed from `Infra`.
- [x] `GenesisIntake` uses `ExecutionGate.executeGenesis()`.
- [x] All tests pass.
- [x] Audit passes without exemptions.
- [x] Fresh bootstrap succeeds.
- [x] Audit report updated to mark SMA-001 resolved.
