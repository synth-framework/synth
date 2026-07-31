# EXP-EXPLAIN-001 — Actionable `synth explain status`

> Make `synth explain status` return concrete next actions instead of raw state differences.

**Status:** Completed  
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
| E1 | Error messages are machine-correct but operator-vague | High | Fixed |
| E2 | `synth explain status` does not suggest next command | Medium | Fixed |

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

## Design Notes

The classifier reuses the existing runtime projections instead of inventing a second diagnosis engine:

- `src/cli/status-briefing.ts` → `OperatorBriefing` provides `phase`, `blockers`, `warnings`, and `nextActions`.
- `src/core/replay-verifier.ts` → `ReplayCheckResult` provides cryptographic chain validity and state-hash divergence.
- `src/cli/capabilities-data.ts` → shared `EXPECTED_CAPABILITIES` catalog so `synth explain status` and `synth capabilities` agree on what is installed.

Divergence diagnosis priority:

1. Hash-chain break → event-log corruption.
2. Missing events / state lags events → incomplete event log.
3. State hash mismatch at the same offset → hand-edited `canonical-state.json`.
4. Other divergence → generic replay divergence.

For an executing expedition without a `CONVERGENCE_CERTIFIED` event, the situation is `missing-capability`:

- If `convergence-certification` is installed, the next command is `synth expedition certify --id <id> --evaluation <path>`.
- If the capability is unavailable, the safe fallback is `synth expedition snapshot --id <id>`.

All legacy `ExplainStatus` fields (`verdict`, `replay`, `graphIntegrity`, `snapshots`) are preserved, and `--summary` keeps its original single-line format.

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

## Snapshot

- Implemented in prior workstream: `synth explain status` now returns `situation`, `summary`, `nextCommand`, and `blockers`.
- Divergence diagnosis distinguishes hash-chain breaks, missing events, hand-edited canonical state, and missing capabilities.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
