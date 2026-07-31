# EXP-DRYRUN-001 — Pre-Flight Dry-Run for Lifecycle Commands

> Add `--dry-run` support to state-changing lifecycle commands so operators can preview the event that will be appended.

**Status:** Draft  
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
| D1 | No preview before state-changing commands | High | Fix planned |
| D2 | Agent edited canonical-state.json directly | Critical | Mitigation planned |

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

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
