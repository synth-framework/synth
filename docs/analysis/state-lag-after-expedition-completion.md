# Root Cause Analysis: Canonical State Lags Event Log After Expedition Completion

## Symptom

After every `synth expedition complete --id <id>` invocation, `synth status` reports:

```
warning: state-lags-events
  Canonical state (N events) lags the event log (N+1 events).
```

Running `synth repair state --approve` regenerates `canonical-state.json` from replay and resolves the warning. The next expedition completion reproduces the lag.

## Evidence

Observed after these expedition completions in the current event log:

- `19c135429945b5e8` — SYNTH State Consistency & Lifecycle Safety fixes
- `3cca8893459b903f` — Add synth mission list command
- `1c46be8692d08917` — Fix synth expedition complete --force
- `3659783d89a7421f` — Validate expedition evaluation files
- `fc2599535bf6b66d` — Deduplicate expedition evidence attachments

Each completion is followed by a `GOVERNANCE_SNAPSHOT_FAILED` event and then a `REPAIR_ACCEPTED` event.

## Root Cause

The ExecutionGate commits the canonical state at the end of the main transaction, then appends auxiliary snapshot events **without** updating the canonical state.

File: `src/control/execution-gate.ts`

Sequence:

1. `PHASE 6: PERSIST EVENTS` — `EXPEDITION_COMPLETED` (and any lifecycle events) are appended to `event-log.jsonl`.
2. `PHASE 7: REBUILD STATE` — state is rebuilt from the event log.
3. `PHASE 8: COMMIT TRANSACTION` — `stateStore.commit(tx, newState)` writes `canonical-state.json` at version `N`.
4. `GOVERNANCE SNAPSHOT` — `maybeCreateSnapshot()` checks the working tree. When uncommitted source changes exist outside the snapshot set, it appends a `GOVERNANCE_SNAPSHOT_FAILED` event to the event log.
5. The event log now contains `N+1` events, but `canonical-state.json` remains at version `N`.

Because `GOVERNANCE_SNAPSHOT_FAILED` is an event in the log, the state consistency validator expects `canonical-state.json` to reflect the same number of events. The state does not, so it reports a lag.

## Why It Repeats

The snapshot phase runs on every `EXPEDITION_COMPLETED`. As long as the working tree has uncommitted changes outside the expedition's snapshot set, the snapshot fails and appends an event, creating the lag.

## Fix Options

1. **Re-commit state after snapshot events** (recommended minimal fix).
   After `eventStore.appendBatch(snapshotEvents, ...)` in `src/control/execution-gate.ts`, rebuild state and save it:

   ```ts
   if (snapshotEvents.length > 0) {
     await this.eventStore.appendBatch(snapshotEvents, EVENT_STORE_WRITE_TOKEN)
     const updatedState = await this.runtime.getState()
     await this.stateStore.save(updatedState)
   }
   ```

   This keeps snapshot events in the audit log while keeping canonical state consistent.

2. **Include snapshot events in the main transaction commit**.
   Move snapshot creation before `COMMIT_TRANSACTION` so the state is committed with snapshot events included. This is more invasive because snapshot logic depends on the committed state and git working tree.

3. **Stop persisting snapshot failures as governance events**.
   Write snapshot diagnostics to a separate audit log that is not part of replay. This is a larger architectural change and reduces auditability.

## Recommended Next Step

Create an expedition under Mission `a4c3448c7f268d06` (SYNTH State Consistency & Lifecycle Safety) to implement option 1 and add a regression test that completes an expedition in a dirty working tree and asserts `synth explain replay` remains consistent without requiring repair.
