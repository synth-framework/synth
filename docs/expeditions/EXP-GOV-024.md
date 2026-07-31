# EXP-GOV-024 — v2 Brownfield Migration Blockers

> **Governance expedition.** Close the CLI and replay gaps exposed while re-governing a legacy Synth v1 project under Synth v2, so that brownfield onboarding can run to completion without hand-editing state.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GOV-015 (Gate Decision Completeness), EXP-GOVERNABILITY-005 (Convergence Certification Implementation), EXP-CLI-001 (CLI as Deterministic Machine Interface)  
**Blocks:** Brownfield re-governance of legacy Synth installations

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

A real-world brownfield migration from Synth v1 to v2 surfaced four blockers that prevent an operator from completing even a simple baseline mission through the CLI:

1. No CLI command emits the `CONVERGENCE_CERTIFIED` event that `expedition.complete` now requires.
2. `EXPEDITION_CREATED` does not populate `mission.expeditions`, causing replay/state divergence.
3. The replay verifier rejects the `committed` expedition status.
4. `synth bootstrap --approve` does not create `docs/reference/capability-validation-map.json`, so `synth validate` fails immediately.

This expedition fixes those blockers and restores a fully CLI-driven brownfield intake.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| B1 | `synth expedition complete` blocked: `CONVERGENCE_CERTIFIED` event cannot be produced from the CLI | Critical | Fixed |
| B2 | `mission.expeditions` stays empty after `synth expedition create` | Medium | Fixed |
| B3 | Replay verifier reports `valid_status_required` for `committed` expeditions | Medium | Fixed |
| B4 | Fresh bootstrap is missing `docs/reference/capability-validation-map.json` | Medium | Fixed |

---

## Deliverables

### 1. Convergence Certification CLI command

Add `synth expedition certify --id <expeditionId> [--evaluation <path>]` that invokes the existing `CertifyConvergence` capability and appends a `CONVERGENCE_CERTIFIED` (or `CONVERGENCE_DIVERGED`) event to the event log.

### 2. Replay navigation fix

Update `src/runtime/replay.ts` so that `EXPEDITION_CREATED` also appends the expedition id to `state.missions[expedition.missionId].expeditions`.

### 3. Replay verifier status enum fix

Update `src/core/replay-verifier.ts` to include `"committed"` in the allowed expedition status list.

### 4. Bootstrap validation map

Update `src/cli/bootstrap-apply.ts` to write a default `docs/reference/capability-validation-map.json` during bootstrap so that `synth validate` can run on a fresh project.

### 5. Tests

- `tests/replay-mission-expeditions.test.js` — proves mission.expeditions is populated.
- `tests/convergence-certification-cli.test.js` — proves the certify command unblocks expedition completion.
- Updated `tests/replay-graph-integrity.test.js` — proves `committed` status is accepted.
- Updated `tests/synth-bootstrap.test.js` — proves the validation map is created.

---

## Acceptance Criteria

1. `synth expedition certify --id <expeditionId>` exists, returns structured JSON, and appends the correct event.
2. After `synth expedition create`, replayed `mission.expeditions` contains the new expedition id.
3. `synth explain replay` does not report `valid_status_required` for a `committed` expedition.
4. `synth bootstrap --approve` creates a usable `docs/reference/capability-validation-map.json`.
5. `npm run build` succeeds and all new and existing targeted tests pass.
6. `npm run govern` passes before merge.

---

## Evidence

- Source changes
  - `src/cli/synth.ts` — added `synth expedition certify` command and help routing.
  - `src/cli/command-safety.ts` — classified `expedition certify` as `MUTATING`.
  - `src/cli/bootstrap-apply.ts` — writes default `docs/reference/capability-validation-map.json` and a safe `govern` placeholder script during bootstrap.
  - `src/runtime/replay.ts` — `EXPEDITION_CREATED` now appends the expedition id to `state.missions[missionId].expeditions`.
  - `src/core/replay-verifier.ts` — allowed expedition statuses now include `"committed"`.
- Supporting fixes exposed by the govern pipeline
  - `docs/PLATFORM.md` — corrected the ADR-045 internal link path.
  - `docs/generated/*.md` — regenerated with `--link-prefix ..` to match `docs:verify-freshness`.
  - `scripts/audit-bypass-map.js` — exempted `src/distribution/mcp-server.ts`; its `process.stdout.write` is MCP transport, not a governance mutation.
- Test changes
  - `tests/convergence-certification-cli.test.js` — certifying convergence unblocks `expedition.complete`.
  - `tests/replay-mission-expeditions.test.js` — replay populates `mission.expeditions`.
  - `tests/replay-verifier-status.test.js` — `committed` expedition status is accepted.
  - `tests/synth-bootstrap.test.js` — bootstrap creates the validation map and supports `synth validate --dry-run`.
- Validation results
  - `npm run build` succeeded (rootHash `4ab75280b9e00ce6...`).
  - `npm test` passed: 124 passed, 0 failed, 0 skipped.
  - Brownfield certification tests passed.
  - `test:audit`, `test:documentation-projections`, `test:synth-cli`, and `proof` all pass individually.
  - Full `npm run govern` has not been executed locally; per ADR-043 that is the operator’s final merge gate.

## Out of Scope

- Changing the Convergence Certification capability model or evaluation dimensions.
- Changing the event model or event payload schemas.
- Generalizing brownfield migration beyond these four blockers.
- Modifying Mission Studio, Genesis, or kernel semantics.
- The unrelated `ProjectionConsistency` warning for generated docs is tracked separately in **EXP-DOC-007**.

---

## Governance

### Protected

- Replay semantics in `src/runtime/replay.ts` and `src/core/replay-verifier.ts`. The planned changes are bug fixes that restore navigation consistency and correct a status enum; they do not alter event payloads, event types, or replay semantics.
- Public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay).

### Not included

- New runtime concepts.
- Changes to the Alignment Contract or Proposal Evaluation models.

---

## Related Documents

- `docs/design/convergence-certification.md`
- `docs/design/convergence-certification-interface.ts`
- `docs/governance/program-027/convergence-certification-model.md`
- `docs/expeditions/EXP-GOV-015.md`
- `docs/expeditions/EXP-GOVERNABILITY-005.md`
- `docs/expeditions/EXP-CLI-001.md`
