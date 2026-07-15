# EXP-HARDEN-002 — Snapshot Integrity

**Status:** Proposed  
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

- [ ] Snapshot storage contract documented.
- [ ] Snapshots persisted during approval.
- [ ] Signature verification implemented.
- [ ] Structural certification implemented.
- [ ] Migration path defined.
- [ ] CLI inspection command added.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Extend `src/mission-studio/snapshot-store.ts`.
2. Update approval flow to persist snapshots.
3. Add certification utilities.
4. Add CLI subcommand.
5. Add tests.

---

## Completion Notes

Pending.
