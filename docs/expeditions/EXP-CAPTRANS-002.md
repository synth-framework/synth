# EXP-CAPTRANS-002 — Graceful Missing-Capability Handling

> Prevent expeditions from getting stuck silently when a required capability is unavailable, and provide a safe archive fallback.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CAPTRANS-001 (`synth capabilities`), EXP-EVENTLOG-001, EXP-EVIDENCE-001  
**Blocks:** EXP-GATE-001 (mandatory verification gates before completion)

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

The TaskPRO migration hit a hard stop when `synth expedition complete` returned only:

```text
Convergence Certification required before closing expedition
```

There was no CLI command to create that certification, no indication of whether the capability was supposed to exist, and no safe way to unwind the expedition. The only escape hatch was manual event-log editing, which violates the derived-state rule.

This expedition makes missing capabilities transparent and provides a safe fallback:

1. `synth capabilities` explicitly reports unavailable capabilities with a reason.
2. `synth status` surfaces the missing capability as a blocker with a suggested command.
3. `synth expedition archive --id <id> --reason <reason>` gives operators and agents a governed way to close an expedition that cannot complete due to a missing capability.

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| C1 | Expedition gets stuck silently when a required capability is missing | Critical | Proposed |
| C2 | No safe fallback to archive a blocked expedition | High | Proposed |
| C3 | `synth status` does not list missing capabilities as blockers | Medium | Proposed |

## Deliverables

### 1. Missing-capability reporting in `synth capabilities`

`synth capabilities` already lists installed and missing capabilities (EXP-CAPTRANS-001). This expedition adds a `reason` field for each unavailable capability:

```json
{
  "id": "convergence-certification",
  "title": "Convergence Certification",
  "available": false,
  "reason": "ConvergenceCertification capability not registered; run `synth expedition certify` once the evaluation CLI is implemented."
}
```

### 2. Blocker surfacing in `synth status`

For the active expedition, `synth status` (and `synth status --human`) checks whether any capability required to finish the expedition is unavailable. If so, it reports:

```text
Project: TaskPRO
Phase: executing
Active expedition: Fix mobile runtime defects (13ab9c7) — executing
Blocker: Convergence Certification is not available.
Suggested action: archive the expedition with `synth expedition archive --id 13ab9c7 --reason "convergence-certification unavailable"`.
```

### 3. `synth expedition archive` command

```bash
synth expedition archive --id <expedition-id> --reason <reason>
```

Behavior:

- Only `executing` expeditions can be archived. (Already `completed` or `cancelled` expeditions are idempotent no-ops.)
- Appends an `EXPEDITION_ARCHIVED` event to the event log with the reason.
- Records the missing capability ID when the reason matches a known unavailable capability.
- Updates expedition status to `cancelled`.
- Returns the next step: either resume with a replacement expedition or re-charter once the capability is available.

### 4. Capability-aware completion guard

`synth expedition complete` checks for unavailable required capabilities before attempting completion. If one is missing, it returns a structured error:

```json
{
  "status": "error",
  "code": "MissingCapabilityBlocksCompletion",
  "missingCapability": "convergence-certification",
  "nextStep": "synth expedition archive --id <id> --reason \"convergence-certification unavailable\""
}
```

This replaces the current silent "Convergence Certification required" message.

### 5. Tests

- `tests/captrans-missing-capability.test.js` covering:
  - `synth capabilities` reports unavailable capability with reason.
  - `synth status` surfaces the blocker and suggests archive.
  - `synth expedition complete` returns structured error when capability is missing.
  - `synth expedition archive` appends `EXPEDITION_ARCHIVED` and transitions status.
  - Re-archiving an already-archived expedition is idempotent.

## Acceptance Criteria

1. `synth capabilities` includes unavailable capabilities with human-readable reasons.
2. `synth status` reports a blocker when the active expedition requires a missing capability.
3. `synth expedition archive --id <id> --reason <reason>` appends an `EXPEDITION_ARCHIVED` event.
4. `synth expedition complete` returns a structured `MissingCapabilityBlocksCompletion` error instead of silently blocking.
5. `npm run build` succeeds and targeted tests pass.

## Out of Scope

- Implementing the actual Convergence Certification CLI (`synth expedition certify` already exists; the missing capability is the evaluation engine).
- Automatic archival without operator approval.
- Email or external notification when a capability is missing.

## Governance

### Protected

- ExecutionGate as sole mutation authority.
- Event model.
- Public vocabulary.

### Not included

- New constitutional rules.
- Changes to replay semantics beyond handling `EXPEDITION_ARCHIVED`.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-CAPTRANS-001.md`
- `docs/expeditions/EXP-GATE-001.md`
- `docs/expeditions/EXP-EVIDENCE-001.md`
