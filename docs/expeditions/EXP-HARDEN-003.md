# EXP-HARDEN-003 — Genesis Hardening

**Status:** Completed  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-001, EXP-HARDEN-002  
**Blocks:** EXP-HARDEN-004, EXP-HARDEN-005

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Make Genesis defensive by validating snapshots before intake and certifying the seed event graph.

---

## Motivation

Genesis currently trusts the `ApprovedMissionModelSnapshot` it receives from Mission Studio via the snapshot bridge. It does not validate that parent references resolve, that identities are unique, or that the resulting event graph is connected. A defensive Genesis is necessary before SYNTH can guarantee constitutional correctness.

---

## Deliverables

1. **Snapshot acceptance validator**
   - Reject snapshots with invalid parent references.
   - Reject snapshots with duplicate identities.
   - Reject snapshots with missing required fields.

2. **Relationship validator**
   - Verify every expedition references an existing mission.
   - Verify every objective references an existing expedition.

3. **Genesis certification report**
   - Produce a report describing what Genesis validated and any warnings.

4. **Graph certification**
   - Confirm the seed event graph is connected and acyclic.

5. **Genesis integrity proofs**
   - Generate a proof artifact that certifies successful Genesis intake.

---

## Acceptance

Genesis rejects a snapshot with broken parent references and accepts a valid snapshot with a certification report.

---

## Phases

### Phase 1 — Design validator

Define the validation rules and error messages.

### Phase 2 — Implement snapshot acceptance

Add validation before `GenesisIntake.initialize` commits seed events.

### Phase 3 — Implement relationship validation

Check mission/expedition/objective parent references.

### Phase 4 — Certification report

Generate and persist a Genesis certification report.

---

## Risks

| Risk | Mitigation |
|---|---|
| Validator rejects valid snapshots | Start with warnings, escalate to errors after burn-in |
| Performance impact | Validate once at intake time |
| Error messages leak internals | Surface actionable messages without exposing implementation |

---

## Definition of Done

- [x] Snapshot acceptance validator implemented.
- [x] Relationship validator implemented.
- [x] Genesis certification report generated.
- [x] Graph certification implemented.
- [x] Integrity proof artifact produced.
- [x] Tests cover rejection and acceptance cases.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Add validation module in `src/genesis/`.
2. Integrate into `GenesisIntake.initialize`.
3. Add certification report generation.
4. Add tests in `tests/genesis-snapshot-bridge.test.js` or new file.

---

## Completion Notes

Completed via PR (see branch `feat/exp-harden-003`).

**Inventory.** `src/domain/planning.ts` (`validateMissionInvariants`, `validateExpeditionInvariants`) and `src/domain/graph.ts` (`buildGraph`, `validateGraphConnectivity`, `detectCycles`) operate on the CanonicalState project/plan/milestone/workItem graph only — they do not model the mission→expedition→objective hierarchy and were not reusable for graph certification. Reused instead: `validateProposalGraph` (EXP-HARDEN-001) for duplicate identities and parent references at proposal level, and `signSnapshot`/`SNAPSHOT_SCHEMA_VERSION` (EXP-HARDEN-002) for signature self-consistency on the snapshot object itself (works for in-memory handoffs that never touched the store).

**Phase 1–3 — Validators and certification.** New `src/genesis/certification.ts` (~430 lines): `validateSnapshotAcceptance` (required snapshot fields, per-proposal required fields honoring the bridge's fallback semantics, then delegates to `validateProposalGraph` — relationship validation is fully covered by that reuse, no duplication); `verifySnapshotSignature` (64-hex format + recomputation; lineage-parented snapshots produce a warning, not rejection, per the spec's burn-in risk mitigation); `certifySeedEventGraph` (malformed payloads, duplicate and cross-kind identities, parent resolution, cycle detection via parent-pointer walk, reachability from mission roots via BFS); `certifyGenesisIntake` (deterministic report — no wall-clock fields — with rules, counts, graph summary, warnings, violations, `result: "certified" | "rejected"`); `buildGenesisIntegrityProof` (chain digest over ordered event hashes, first/final event hash, graph summary, certification digest — in-process, no file writes).

**Seam decision.** Two commit paths exist and both are guarded: `SynthAPI.genesisFromSnapshot` (`src/api/index.ts:342`) certifies `{ snapshot, seedEvents }` before building or committing raw events — critical, because that path builds events itself and never calls `GenesisIntake.initialize`; and `GenesisIntake.initialize` (`src/genesis/intake.ts:181`) certifies the seed-event graph after hash-chaining, before `gate.executeGenesis`. Rejection always precedes the single mutation authority. The API result now surfaces `certification` and `integrityProof`; `GenesisResult` carries both fields as well.

**Acceptance verified.** 18/18 new tests cover the criterion both ways: a broken-parent snapshot is rejected with zero events committed; a valid snapshot is accepted with a certification report and integrity proof. Bootstrap integration tests redirect `eventLogPath` into `os.tmpdir()`.

**Validation.** Build + typecheck pass; genesis-hardening 18/18; genesis-snapshot-bridge 5/5; proposal-graph 11/11; snapshot-integrity 16/16; mission-studio 14/14; api-adapter-integration 6/6; synth 113/113; synth-cli pass; bypass audit clean. Full governance pipeline runs via the CI `proof` check on the PR.

**Deferred findings.**

1. **EXP-HARDEN-006 confirmed live:** `tests/api-adapter-integration.test.js` appends to the canonical `data/event-log.jsonl` on every run via `bootstrap({ persistence: "memory" })` without `eventLogPath` — the deferred memory-persistence bug is active in the existing suite, not theoretical. (Repo log was restored byte-identical, SHA-256 verified, after the test run.)
2. **EXP-HARDEN-004/005 candidate:** `SynthAPI.genesisFromSnapshot` duplicates hash-chain construction logic that also lives in `GenesisIntake.initialize` — two hand-rolled chain builders for the same gate entry point; a consolidation seam, out of scope here.
3. `tests/mission-studio-proposal-graph.test.js:118` re-implements orphan checking over seed events inline; it could now consume `certifySeedEventGraph` — left untouched per minimal-diff constraint.
