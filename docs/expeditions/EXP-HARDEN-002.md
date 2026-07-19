# EXP-HARDEN-002 — Snapshot Integrity

**Status:** Completed and accepted
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-001  
**Blocks:** EXP-HARDEN-003

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

Make `ApprovedMissionModelSnapshot` a permanent, certified, and replayable constitutional artifact.

---

## Motivation

Today the approved snapshot is held in memory and passed to Genesis. It is not persisted as a standalone artifact. This makes forensic analysis, lineage tracing, and reproducibility harder than they should be. The snapshot is the authoritative planning artifact and deserves first-class persistence and certification.

---

## Deliverables

1. **Snapshot persistence**
   - Store approved snapshots in `data/snapshots/` or equivalent.
   - Each snapshot is immutable and named by its ID.

2. **Snapshot certification**
   - Validate that a snapshot is structurally sound before accepting it.
   - Verify signature integrity.

3. **Snapshot signatures**
   - Include a cryptographic signature over the snapshot content.
   - Support lineage chaining.

4. **Snapshot migration**
   - Define how older snapshot versions are loaded or converted.

5. **Snapshot compatibility validation**
   - Ensure a snapshot can be consumed by the current Genesis intake.

---

## Acceptance

Any approved Mission can be reconstructed from its persisted snapshot, and the snapshot's signature validates successfully.

---

## Phases

### Phase 1 — Define snapshot storage contract

Choose location, filename, and schema version.

### Phase 2 — Persist snapshots

Modify Mission Studio approval to write the snapshot to disk.

### Phase 3 — Add certification

Implement signature verification and structural checks.

### Phase 4 — CLI integration

Add `synth mission snapshot` or similar command to inspect persisted snapshots.

---

## Risks

| Risk | Mitigation |
|---|---|
| Snapshot format changes | Version the schema and provide migration |
| Sensitive data in snapshots | Store only planning data, never secrets |
| Large snapshots | Compress or shard if necessary |

---

## Definition of Done

- [x] Snapshot storage contract documented.
- [x] Snapshots persisted during approval.
- [x] Signature verification implemented.
- [x] Structural certification implemented.
- [x] Migration path defined.
- [x] CLI inspection command added.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Extend `src/mission-studio/snapshot-store.ts`.
2. Update approval flow to persist snapshots.
3. Add certification utilities.
4. Add CLI subcommand.
5. Add tests.

---

## Completion Notes

Completed via PR (see branch `feat/exp-harden-002`).

**Inventory finding.** More of this expedition pre-existed than the motivation assumed: the `SnapshotStore` contract, `FileSystemSnapshotStore` (writing through the environment FilesystemProvider capability), bootstrap wiring to `./data/snapshots`, and API ops for save/get/list/diff/lineage/reconstruct were already in place. However, approval-time persistence was only half-wired — the `saveSnapshot` API op existed but `synth mission approve` never called it — and the old `signature` was a session-summary hash, not a content signature, with no chaining.

**Phase 1 — Storage contract.** Documented in `docs/reference/snapshot-storage.md`: location, filename scheme, record shape, schema version, signature and chaining rules, certification rules, migration policy. Planning data only, never secrets.

**Phase 2 — Persistence.** `cmdMissionApprove` now persists via `saveSnapshot` after approval (`snapshotPersisted: true`); re-approval of the same draft is tolerated (`note: "snapshot already persisted"`).

**Phase 3 — Certification and signatures.** New `src/mission-studio/snapshot-integrity.ts`: `SNAPSHOT_SCHEMA_VERSION`, `canonicalizeSnapshot` (deterministic recursive serialization — sorted keys, Map-aware, `undefined` dropped to match JSON round-trip), `signSnapshot` (SHA-256 over id, version, sessionId, worldModel, proposals, structural lineage, plus `parentSignature` when chained; wall-clock fields excluded to preserve the determinism contract), `certifySnapshot` (schema version, required fields, session↔snapshot binding, `validateProposalGraph`, lineage↔parent consistency, signature recomputation), `migrateStoredSnapshot` (identity for 1.0.0, loud rejection of unknown versions). `FileSystemSnapshotStore.get`/`list` route through `loadVerified()`: ancestors verified first (cycle-guarded), tampered/malformed/unknown-version files throw `INVARIANT_VIOLATION` on load. `MissionStudio.approve()` now stamps the schema version and signs with parent chaining; the obsolete session-summary `sign()` was removed.

**Phase 4 — CLI.** `synth mission snapshot <id>` (inspect + verify: version, lineage, signature validity, certification violations) and `synth mission snapshot list`. Tampered files exit 1 with a structured certification error.

**Acceptance verified.** An approved Mission reconstructs from its persisted snapshot and its signature validates (16/16 tests, including tamper detection and ancestor-chain invalidation: even a re-signed forged ancestor invalidates descendants because their chain input used the original parent signature).

**Validation.** Build + typecheck pass; new tests 16/16; proposal-graph 11/11; mission-studio 14/14; snapshot-lineage 7/7; genesis-snapshot-bridge 5/5; api-adapter-integration 6/6; synth-cli 8/8; operator-journey 1/1; bypass audit, check-links, replay, expedition governance all pass. Full governance pipeline runs via the CI `proof` check on the PR.

**Deferred findings.**

1. `synth mission create` produces drafts at confidence 0.67 < 0.7 approval threshold, so a bare create→approve CLI flow deterministically rejects — approval requires a richer session. Pre-existing Mission Studio behavior; noted for EXP-HARDEN-006 (Validation Expansion) consideration.
2. Known limitation recorded in the storage contract: keyless SHA-256 provides tamper-evidence, not authenticity — a forged root re-signed in isolation is self-consistent; the lineage chain is what catches ancestor forgery.
