# EXP-EXPLAIN-001 — Actionable `synth explain status`

> Make `synth explain status` return concrete next actions instead of raw state differences.

**Status:** Draft  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CLI-002 (human-readable output mode)  
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

When an agent sees "Replay inconsistent: expedition.5f607c37d314268a.status", it cannot tell whether to revert, patch the event log, or wait for a CLI fix. `synth explain status` should analyze the current state and return an actionable diagnosis.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| E1 | Error messages are machine-correct but operator-vague | High | Fix planned |
| E2 | `synth explain status` does not suggest next command | Medium | Fix planned |

---

## Deliverables

### 1. Diagnostic classifier

`explain status` classifies the current situation into categories:

- `missing-capability`: a required CLI feature is not implemented.
- `replay-divergence`: live state differs from replay.
- `pending-approval`: a draft is waiting for approval.
- `blocked`: a gate blocks progress.
- `healthy`: no action needed.

### 2. Suggested next action

The output includes:

- `nextCommand`: the exact CLI command to run next.
- `reason`: why this action is recommended.
- `evidence`: paths to relevant evidence files, if any.

Example:

```json
{
  "status": "ok",
  "kind": "StatusExplanation",
  "situation": "missing-capability",
  "summary": "Expedition 13ab9c7 is executing but cannot complete because Convergence Certification is not exposed in the CLI.",
  "nextCommand": "synth expedition snapshot --id 13ab9c7",
  "evidence": ["proof/expeditions/exp-13ab9c7-evidence.md"],
  "blockers": ["Convergence Certification CLI not available"]
}
```

---

## Acceptance Criteria

1. `synth explain status` returns a `situation` and `nextCommand` when a blocker exists.
2. For the Convergence Certification gap, it suggests a safe fallback (snapshot/archive) or the certify command once available.
3. For replay divergence, it distinguishes hand-edited canonical state from event-log corruption.
4. Existing `synth explain replay` behavior remains unchanged.
5. `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Auto-repair of divergent state.
- Natural-language explanations beyond structured JSON.

---

## Governance

### Protected

- Replay semantics.
- Public vocabulary.

### Not included

- New state fields.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
