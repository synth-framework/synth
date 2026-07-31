# EXP-GATE-014 — Mandatory Verification Gates Before Expedition Completion

> Prevent expeditions from completing while verification is failing, evidence is missing, or required certifications are absent.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective, bulletproof-agent-governance requirements  
**Depends On:** EXP-GUARD-001 (derived-state protection), EXP-CAPTRANS-002 (missing-capability handling), EXP-EVIDENCE-001 (automatic evidence capture)  
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

Today an agent can run `synth expedition complete` as soon as the expedition status is `executing`. In practice, completion should require:

1. `synth verify` passes (no failing checks).
2. Evidence has been attached to the expedition.
3. Convergence Certification is present when the capability is available.

Without these gates, agents can declare victory while tests are red or proof is missing. This expedition adds mandatory verification gates to `synth expedition complete` and returns structured, actionable errors when a gate blocks completion.

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| G1 | `synth expedition complete` does not verify checks pass | Critical | Proposed |
| G2 | `synth expedition complete` does not require attached evidence | High | Proposed |
| G3 | Missing Convergence Certification silently blocks completion | High | Proposed |

## Deliverables

### 1. Verification gate

Before `synth expedition complete` appends `EXPEDITION_COMPLETED`, run `synth verify` (the same verification engine used by `synth verify` and `synth validate`).

- If any check fails, block completion and return a structured error:

```json
{
  "status": "error",
  "code": "VerificationFailedBlocksCompletion",
  "expeditionId": "...",
  "verifySummary": { "total": 12, "pass": 10, "fail": 2 },
  "nextStep": "Run `synth verify` and resolve the failing checks before completing the expedition."
}
```

### 2. Evidence gate

Before completion, require at least one `EVIDENCE_ATTACHED` event for the expedition. The replay-derived expedition state already carries `attachments`; the gate checks that the array is non-empty.

- If no evidence is attached, block completion:

```json
{
  "status": "error",
  "code": "MissingEvidenceBlocksCompletion",
  "expeditionId": "...",
  "nextStep": "Run `synth expedition evidence --id <id> --git-diff` to capture proof before completing."
}
```

### 3. Capability-aware certification gate

Keep the existing Convergence Certification check, but ensure it emits the structured `MissingCapabilityBlocksCompletion` error from EXP-CAPTRANS-002 when the certification capability is unavailable.

### 4. Human override

Add a `--force` flag to `synth expedition complete` that allows an operator (not an autonomous agent) to bypass verification and evidence gates. The event must record the override in the payload so replay shows the deliberate bypass.

```bash
synth expedition complete --id <id> --force --reason "emergency hotfix"
```

This is intentionally strict: `--force` requires both `--reason` and human actor context.

### 5. Tests

`tests/expedition-completion-gates.test.js` covering:

- Completion blocked when `synth verify` fails.
- Completion blocked when no evidence is attached.
- Completion blocked when Convergence Certification is missing.
- Completion succeeds when all gates pass.
- `--force` records an override reason and bypasses verification/evidence gates.

## Acceptance Criteria

1. `synth expedition complete --id <id>` runs verification and blocks on failure.
2. `synth expedition complete --id <id>` blocks when the expedition has no attached evidence.
3. `synth expedition complete --id <id>` blocks when Convergence Certification is unavailable or missing.
4. Each blocker returns a structured error with a distinct `code` and a `nextStep`.
5. `--force --reason <text>` allows an operator to complete despite verification/evidence blockers.
6. `npm run build` succeeds and targeted tests pass.

## Out of Scope

- New event types (reuse `EXPEDITION_COMPLETED` with optional override metadata).
- Changing the Convergence Certification evaluation engine.
- Automatic verification on every file change.

## Governance

### Protected

- ExecutionGate as sole mutation authority.
- Event model (no new event types).
- Public vocabulary.

### Not included

- New constitutional rules.
- Changes to replay semantics beyond existing handlers.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GUARD-001.md`
- `docs/expeditions/EXP-CAPTRANS-002.md`
- `docs/expeditions/EXP-EVIDENCE-001.md`
- `docs/expeditions/EXP-GATE-001.md` — review-lifecycle gate (Program 035; distinct from this operational completion gate)
