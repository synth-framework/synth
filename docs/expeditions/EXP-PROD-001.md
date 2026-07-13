# EXP-PROD-001 — Mission Snapshot Lineage

**Status:** Completed  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-001 — SYNTH Productization Program  
**Depends On:** EXP-MST-001  
**Blocks:** EXP-PROD-002, EXP-PROD-005  

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

Complete the planning persistence model. Mission Studio currently produces an immutable `ApprovedMissionModelSnapshot`, but the snapshot is a point-in-time artifact with no durable history, versioning, lineage, diffing, or provenance. This Expedition makes snapshots first-class durable artifacts and enables Mission Studio to reconstruct itself from Snapshot History.

This replaces the earlier "Planning Ledger" idea with a simpler, snapshot-centric lineage model.

---

## Deliverables

1. **Immutable ApprovedMissionModelSnapshot**
   - Snapshots remain immutable once approved.
   - Cryptographic signature is preserved and verified.

2. **Snapshot Versioning**
   - Every snapshot carries a monotonic version within its session lineage.
   - Versions are deterministic and reproducible.

3. **Snapshot Lineage**
   - Snapshots are linked to their predecessor.
   - A session can be replayed from its initial observations through each approved version.

4. **Snapshot Diffing**
   - Given two snapshots, produce a canonical diff of:
     - nodes added/removed/changed
     - edges added/removed
     - planning decisions added/removed
     - confidence changes
     - unknowns resolved or introduced

5. **Snapshot Provenance**
   - Every snapshot records:
     - session identifier
     - parent snapshot identifier (if any)
     - observations consumed
     - planning decisions applied
     - approval timestamp
     - approving actor

---

## Acceptance

Mission Studio can reconstruct itself from Snapshot History.

Specifically:

- Given a sequence of snapshots, Mission Studio can rebuild any prior `PlanningSession`.
- Given observations + decisions, Mission Studio can regenerate an identical snapshot.
- Diffing two snapshots produces a deterministic, reviewable change description.
- Snapshot lineage is tamper-evident.

---

## Phases

### Phase 1 — Snapshot Store

Introduce a durable snapshot store interface and a default filesystem implementation.

- `src/mission-studio/snapshot-store.ts`
- Store, retrieve, and list snapshots by session.
- Enforce immutability at the store boundary.

### Phase 2 — Versioning & Lineage

Add version and parent references to `ApprovedMissionModelSnapshot`.

- `version` becomes `{ major, minor, lineage }` or a simple lineage counter.
- `parentId` references the previous approved snapshot in the same session.

### Phase 3 — Diff Engine

Implement canonical snapshot diffing.

- `src/mission-studio/snapshot-diff.ts`
- Output is itself a deterministic, serializable artifact.

### Phase 4 — Reconstruction

Implement `reconstructSessionFromSnapshot(snapshotId)`.

- Walks lineage back to root.
- Replays observations and decisions through `MissionStudio`.
- Produces the original `PlanningSession` and `WorldModel`.

### Phase 5 — Integration & Verification

- Wire snapshot store into `SynthAPI`.
- Add tests for store, versioning, diff, and reconstruction.
- Update `EXP-MST-001` to reflect snapshot lineage.

---

## Risks

| Risk | Mitigation |
|---|---|
| Snapshot store couples Mission Studio to filesystem | Define an interface; filesystem is just the default adapter |
| Reconstruction requires non-deterministic IDs | Derive snapshot IDs deterministically from content + lineage |
| Diff output becomes large | Support summary and detailed modes |

---

## Definition of Done

- [x] Snapshot store interface and default filesystem implementation exist.
- [x] Snapshots carry version and parent lineage.
- [x] Snapshot diff produces deterministic, reviewable output.
- [x] Mission Studio can reconstruct a session from snapshot lineage.
- [x] Reconstruction is covered by replay-style tests.
- [x] `npm run govern` passes.
- [x] `EXP-PROD-001` is accepted.
