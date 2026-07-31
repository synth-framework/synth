# EXP-DRYRUN-001 — Pre-Flight Dry-Run for Lifecycle Commands

> Add `--dry-run` support to state-changing lifecycle commands so operators can preview the event that will be appended.

**Status:** Executing  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CLI-002 (clean output)  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Agents currently mutate state without a preview. A `--dry-run` flag on lifecycle commands would show exactly what event would be appended and what verification checks would run, preventing mistakes like the hand-edited `canonical-state.json` incident.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| D1 | No preview before state-changing commands | High | Fixed |
| D2 | Agent edited canonical-state.json directly | Critical | Mitigated by dry-run preview |

---

## Deliverables

### 1. `--dry-run` on lifecycle commands

Support for:

- `synth mission approve --draft-id <id> --dry-run`
- `synth expedition approve --draft-id <id> --dry-run`
- `synth expedition commit --proposal-id <id> --dry-run`
- `synth expedition start --id <id> --dry-run`
- `synth expedition complete --id <id> --evidence <path> --dry-run`

### 2. Preview output

The response includes:

- `wouldAppend`: the event object that would be written.
- `verifyResult`: result of `synth verify --scope=draft`.
- `stateDelta`: a description of what would change in canonical state.

Example:

```json
{
  "status": "ok",
  "kind": "LifecycleDryRun",
  "wouldAppend": {
    "type": "EXPEDITION_APPROVED",
    "payload": { "id": "13ab9c79dcf6552c" }
  },
  "verifyResult": { "pass": 5, "fail": 0, "warn": 0 },
  "stateDelta": "expedition 13ab9c7 status: draft → approved"
}
```

---

## Design Notes

### Execution strategy

Each lifecycle command handler checks `flags["dry-run"]` after validating inputs and gate decisions. In dry-run mode the handler:

1. Builds the same capability invocation it would execute.
2. Computes the event that would be appended by inspecting the command's intended transition.
3. Runs `synth verify --scope=draft` via the existing verification engine.
4. Computes a textual `stateDelta` from the current canonical state.
5. Prints a `LifecycleDryRun` result and exits 0 without calling `ExecutionGate.execute()`.

No event is appended and no filesystem mutation occurs in dry-run mode.

### Scope of verification

The dry-run verification is scoped to the draft or expedition under review. It reuses the existing `cmdVerify` / `runVerification` path so the checks are identical to the real command's preconditions.

### State delta

`stateDelta` is a human-readable sentence describing the single field that would change (e.g., `expedition 13ab9c7 status: draft → approved`). It is intended for operator review, not machine diffing.

---

## Acceptance Criteria

1. Each lifecycle command above supports `--dry-run` and exits 0 without mutating state.
2. `--dry-run` runs `synth verify` scoped to the draft/event and reports results.
3. The event log is unchanged after a dry-run invocation.
4. Existing commands without `--dry-run` behave exactly as before.
5. `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Dry-run for read-only commands.
- Batch dry-run across multiple commands.

---

## Governance

### Protected

- Event model.
- ExecutionGate as sole mutation authority.

### Not included

- New event types.

---

## Snapshot

- PR #222 opened with implementation and tests.
- Deferred: `synth mission approve --dry-run` (Mission Studio / runtime materialization scope).

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
