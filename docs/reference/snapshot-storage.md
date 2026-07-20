---
Title: Snapshot Storage
Domain: reference
Audience: developers, architects
Prerequisites: none
Knowledge Establishes: ApprovedMissionModelSnapshot storage contract, signatures, and certification
Depends On: planning-permits.md
Builds Toward: none (terminal reference)
Version: 1.0.0
Status: stable
---

# Snapshot Storage

## Purpose

An approved Mission Model Snapshot is a permanent, immutable, certified planning artifact. This document defines where snapshots live, how they are named, and how their integrity is verified.

## Location and Filename

- Directory: `.synth/data/snapshots/` (wired at bootstrap via `createFileSystemSnapshotStore`).
- Filename: `<snapshot-id>.json` — one file per snapshot, named by its ID. Characters outside `[a-zA-Z0-9_-]` are replaced with `_`.
- Snapshots are immutable: saving an existing ID is rejected with `INVARIANT_VIOLATION`.

## Record Shape

```javascript
{
  snapshot: {
    id: string,             // Snapshot ID (content-derived)
    version: string,        // Schema version — currently "1.0.0"
    signature: string,      // SHA-256 hex over the canonical content (see below)
    sessionId: string,      // ID of the PlanningSession that produced it
    worldModel: object,     // Planning world model (Maps stored as { __type: "Map", value: [...] })
    proposals: array,       // Mission / Expedition / Objective proposals
    timestamp: number,      // Approval wall-clock time (not signed)
    lineage: {              // Optional lineage metadata
      lineageId: string,
      version: number,      // Monotonic version within the lineage
      parentId: string,     // Previous snapshot ID, if any
      approvedAt: number,
      approvedBy: string
    }
  },
  session: object           // The PlanningSession that produced the snapshot
}
```

Snapshots contain planning data only — never secrets.

## Signature

`signature` is SHA-256 over a deterministic canonical serialization (sorted object keys, Maps encoded as key-sorted tagged entry lists, `undefined` dropped) of:

- `id`, `version`, `sessionId`, `worldModel`, `proposals`
- structural lineage fields: `lineage.version`, `lineage.parentId`, `lineage.approvedBy`
- `parentSignature` — the parent snapshot's signature, when the snapshot has a lineage parent

Wall-clock approval metadata (`timestamp`, `lineage.approvedAt`, and the `lineageId` derived from them) is excluded so that approving the same session twice yields the same signature.

**Lineage chaining:** a child's signature input mixes in the parent's signature. A tampered ancestor therefore fails its own certification and invalidates every descendant.

## Certification

`certifySnapshot(stored, parent?)` returns a list of violations; empty means certified. Checks:

1. Known schema version (`1.0.0`).
2. Required fields present and well-formed (`id`, `sessionId`, `signature` as SHA-256 hex, `timestamp`, `worldModel`, `proposals`).
3. Stored session ID matches the snapshot's `sessionId`.
4. Proposal graph validity (`validateProposalGraph`): expeditions reference mission proposals, objectives reference expedition proposals, no duplicate IDs.
5. Lineage structure consistent with the supplied parent (`parentId`, `lineageId`, `version` succession).
6. Signature recomputation match, including the ancestry chain input.

The filesystem store certifies on every load (`get` / `list`), verifying the full ancestor chain first. A tampered or malformed file is rejected loudly with `INVARIANT_VIOLATION: ... failed certification: <violations>`.

## Migration Policy

`SNAPSHOT_SCHEMA_VERSION` (currently `"1.0.0"`) is the only known version. `migrateStoredSnapshot` is the migration seam: known versions load (identity today; conversions are added here if a future version is ever introduced). Unknown or future versions are rejected loudly.

## Inspection

```bash
synth mission snapshot <snapshot-id>   # inspect and verify one snapshot
synth mission snapshot list            # list all persisted snapshots
```

## Genesis Compatibility

A certified snapshot is consumable by the current Genesis intake: certification guarantees the schema version is known, the proposal graph is connected, and the content is untampered — the exact properties the snapshot-to-Genesis bridge relies on.
