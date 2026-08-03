# EXP-GOV-025 — Safe State Repair & Divergence Recovery

> **Operational readiness expedition.** Provide a governed, replay-safe CLI path to recover from canonical-state divergences without hand-editing JSON.

**Status:** Completed and accepted  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-044 — Operational Readiness & Self-Hosting  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-BOOTSTRAP-002 (Framework Self-Hosting)  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

When the persisted `canonical-state.json` drifts from the authoritative event-log replay, operators currently have to hand-edit derived JSON or delete state files. This expedition adds `synth repair state`, a CLI command that:

1. Diagnoses the divergence (`--dry-run`).
2. Proposes a safe repair.
3. Applies the repair through the ExecutionGate by emitting a `REPAIR_ACCEPTED` audit event, which causes the runtime to regenerate `canonical-state.json` from replay.

The command never edits the event log or state files directly.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| R1 | No CLI path exists to fix a stale or divergent `canonical-state.json` | High | Fix planned |
| R2 | Operators must hand-edit derived state to recover from replay mismatches | High | Fix planned |
| R3 | `synth repair replay` only repairs missing mission snapshots, not state-level divergences | Medium | Fix planned |

---

## Deliverables

### 1. `synth repair state` command

Detects and repairs these divergence classes from `src/runtime/state-consistency-validator.ts`:

- `state-lags-events` — canonical state is behind the event log.
- `replayed-state-mismatch` — persisted hash differs from replayed hash at the same offset.
- `missing-events` — canonical state references events no longer in the log.

For all three, the safe repair is to regenerate `canonical-state.json` from the current event-log replay and emit a `REPAIR_ACCEPTED` audit event.

### 2. Dry-run and apply modes

```bash
synth repair state          # diagnose only
synth repair state --approve # apply repair
```

Dry-run output includes:

- The list of detected divergences.
- The proposed action (`regenerate-canonical-state-from-replay`).
- A warning if the event log itself has graph violations (unrepairable by this command).

Apply mode:

- Emits `REPAIR_ACCEPTED` through `RecordRepair`.
- The runtime commit rewrites `canonical-state.json` with the replayed state.
- Reports `consistent: true` after repair.

### 3. Help and safety classification

- Add `synth repair state` to the `repair` namespace help.
- Classify it as `POTENTIALLY_MUTATING` in `command-safety.ts` (mutating only with `--approve`).

### 4. Tests

- `tests/repair-state.test.js`: create a project, corrupt `canonical-state.json`, run dry-run, apply repair, verify consistency.
- Ensure `synth repair state` reports healthy when no divergences exist.

---

## Acceptance Criteria

1. `synth repair state --dry-run` returns a `RepairReport` listing divergences and proposed actions.
2. `synth repair state --approve` regenerates `canonical-state.json` and emits a `REPAIR_ACCEPTED` event.
3. After repair, `synth explain replay` reports `consistent: true`.
4. The command refuses to repair when the event log has graph violations (reports `unrepairable`).
5. Existing `synth repair replay` behavior is unchanged.
6. `synth validate` passes before merge.

---

## Out of Scope

- Repairing graph violations or broken event logs.
- Restoring missing events from backups.
- Repairing decision-log or snapshot conflicts.
- Changing Mission/Expedition lifecycle semantics.

---

## Governance

### Protected

- Event log append-only semantics.
- Replay semantics.
- ExecutionGate mutation authority.
- Public vocabulary.

### Not included

- New governance lifecycle phases.
- Changes to the `SynthEvent` envelope.
- Direct file writes outside the ExecutionGate/state-store path.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-044.md`
- `docs/expeditions/EXP-BOOTSTRAP-002.md`
- `src/runtime/state-consistency-validator.ts`
- `src/runtime/governance-resolver.ts`
- `src/cli/synth.ts`
- `src/cli/command-safety.ts`
