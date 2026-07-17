# EXP-GOV-005 — Verification Engine

**Status:** Completed and accepted  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-014 — Governance Maturation  
**Depends On:** EXP-PROGRAM-014, EXP-GOV-002, EXP-GOV-003, EXP-GOV-004  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (governed bootstrap E1)

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

Make every governance invariant executable. Throughout E1, the team manually checked replay continuity, knowledge-hash stability, provenance completeness, cross-file consistency, and JSON validity. These checks should be performed automatically by a `synth verify` command.

---

## Motivation

The E1 exercise validated SYNTH by inspection:

- Was the knowledge hash unchanged?
- Was replay continuous?
- Was provenance complete?
- Were cross-file references consistent?
- Was every JSON artifact valid?

Each of these is a deterministic property of the event log and its projections. Manual checking is slow, error-prone, and not reproducible across operators. An executable verification engine closes the governance loop: after `synth` records a transition, `synth verify` proves the transition preserved every invariant.

---

## Scope

In scope:

- Implement `synth verify` CLI command.
- Verify replay chain integrity.
- Verify projection consistency (state hash, cached projection provenance).
- Verify evidence referential integrity.
- Verify assertion provenance.
- Verify governance invariants defined by EXP-GOV-002, EXP-GOV-003, and EXP-GOV-004.
- Verify drift between expected and actual state.
- Return a structured, machine-parseable report.

Out of scope:

- Changing the event model.
- Changing the proof schema.
- Implementing the governance record schema (EXP-GOV-002).
- Documenting layer boundaries (EXP-GOV-003) or projection model (EXP-GOV-004) — those documents are inputs.

---

## Deliverables

1. **`synth verify` command** — runs all verification checks and emits a structured report.
2. **Check modules**:
   - `ReplayIntegrityCheck` — chain hash continuity, previousHash correctness, no gaps.
   - `ProjectionConsistencyCheck` — canonical state matches replay, cached projections carry valid provenance.
   - `EvidenceReferentialIntegrityCheck` — every evidence reference resolves to an existing event or artifact.
   - `AssertionProvenanceCheck` — every assertion is traceable to replayable evidence.
   - `GovernanceInvariantCheck` — programmable rules from the governance record, boundaries, and projection model.
   - `DriftCheck` — expected state vs. actual state divergence.
3. **Machine-readable report** — JSON output with `status`, `checks[]`, `violations[]`, and `nextStep`.
4. **Regression guards** — permanent tests in `test:all` covering each check module.
5. **Integration with governance pipeline** — `npm run govern` invokes `synth verify` as a final stage.

---

## Acceptance

```text
governed transition
        ↓
synth verify
        ↓
PASS / FAIL per check
        ↓
next remediation command
```

- `synth verify` runs all checks in under 30 seconds on the canonical project.
- Every manual check performed during E1 is now executable.
- A failing check returns a prescriptive `nextStep` command.
- New guards are wired into `test:all`.
- `npm run govern` passes in CI and includes `synth verify`.

---

## Phases

### Phase 1 — Check inventory

Map every manual E1 check to a verification module.

### Phase 2 — Core engine

Implement the `synth verify` dispatcher and report format.

### Phase 3 — Check modules

Implement each verification check independently.

### Phase 4 — Integration

Wire `synth verify` into `npm run govern` and add CLI tests.

### Phase 5 — Verify

Regression guards green; full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Verify overlaps with existing proof job | Proof verifies the pipeline; verify checks invariants. Keep responsibilities distinct; proof may invoke verify. |
| Checks become slow | Each check is bounded and incremental; fixtures use small event logs. |
| False positives | Every check is grounded in replayable evidence; violations include the offending event ids. |

---

## Definition of Done

- [x] `synth verify` command exists and emits a structured report.
- [x] All six check modules implemented.
- [x] Report includes status, per-check results, violations, and prescriptive `nextStep`.
- [x] Regression guards wired into `test:all`.
- [x] `npm run govern` invokes `synth verify` and passes in CI.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check).
- [x] Expedition is accepted.

---

## Implementation Plan

1. Inventory manual E1 checks.
2. Implement `synth verify` dispatcher and report schema.
3. Implement check modules.
4. Integrate with `npm run govern`.
5. Wire regression guards and request acceptance.

---

## Completion Notes

Implemented `synth verify` as a structured VerificationReport command with six checks: ReplayIntegrity, ProjectionConsistency, EvidenceReferentialIntegrity, AssertionProvenance, GovernanceInvariants, and Drift. Added `src/verification/` engine, context builder, checks, and types; wired the command into `src/cli/synth.ts`; added `tests/verify-engine.test.js`; and appended `test:verify-engine` to `test:all` so `npm run govern` executes it. Build, local checks, and regression tests pass; CI `proof` pending.
