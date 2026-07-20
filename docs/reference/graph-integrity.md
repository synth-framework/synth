---
Title: Graph Integrity
Domain: reference
Audience: developers, architects
Prerequisites: Replay Specification
Knowledge Establishes: The formal definition of a valid SYNTH aggregate graph and its proof contract
Depends On: replay-specification.md
Builds Toward: none (terminal reference)
Version: 1.0.0
Status: stable
---

# Graph Integrity

Graph Integrity is a first-class constitutional proof, **equal in
importance to Replay Integrity** (EXP-HARDEN-005). Replay proves the
state is a pure, deterministic fold of history; Graph Integrity proves
the aggregate graph that history carries is semantically valid. A log
can replay deterministically and still carry a broken graph — both
proofs are required.

## The aggregate graph

SYNTH's execution model is a rooted, directed graph:

```
Mission ──contains──▶ Expedition ──contains──▶ Objective
                                                    │
                                                    └─produces──▶ Work Item
```

- **Nodes** are aggregates: missions, expeditions, objectives, and work
  items.
- **Edges** are parent references carried by creation events:
  `EXPEDITION_CREATED.expedition.missionId`,
  `OBJECTIVE_ADDED.objective.expeditionId`, and — where present —
  `WORK_ITEM_GENERATED.workItem.objectiveId`.
- **Roots** are missions. The project root is the log itself: every
  aggregate must reach a mission root.

## Invariants

Validated by `src/core/graph-integrity.ts` (`validateGraphIntegrity`),
which reuses the replay engine's `validateAggregateGraph`
(EXP-HARDEN-004) and extends it to work items. The mission, expedition,
and objective tiers map to the
[Replay Specification](replay-specification.md#graph-invariants)
invariants.

| # | Invariant | Identifier | Status |
|---|-----------|------------|--------|
| 1 | Every creation event carries a well-formed aggregate id. | `well-formed-creation` | event-provable |
| 2 | No aggregate identity is created more than once or shared across kinds. | `unique-identity` | event-provable |
| 3 | Every expedition has exactly one mission parent; every objective has exactly one expedition parent. | `parent-presence` | event-provable |
| 4 | Every parent reference resolves to an aggregate of the expected kind. | `parent-resolution` | event-provable |
| 5 | No cycles exist. | `acyclicity` | event-provable |
| 6 | No orphan nodes exist; every aggregate is reachable from a mission root, and every root is reachable from the project root. | `connectivity` | event-provable |
| 7 | Post-replay navigation resolves: `state.missions[expedition.missionId]` and `state.expeditions[objective.expeditionId]` exist. | `navigation` | event-provable |
| 8 | Every `WORK_ITEM_GENERATED` work item belongs to exactly one objective (`objectiveId` resolves; `expeditionId` resolves when present). | `generated-work-item-membership` | event-provable |
| 9 | Every canonical Work Item belongs to exactly one objective. | `work-item-objective-membership` | **not event-provable** — documented gap |

### The Work Item provability gap (constitutional finding)

Invariant 9 cannot be proven from events today. Canonical
`WORK_ITEM_CREATED` payloads carry a `WorkItem` (`id`, `status`,
`dependencies`, `metadata`, timestamps) — **no `objectiveId`**. The
edge exists in the type system only on `GeneratedWorkItem`
(`expeditionId` and `objectiveId`, `src/types/state.ts`), consumed by
the replay engine's `WORK_ITEM_GENERATED` handler — but no component
emits `WORK_ITEM_GENERATED` today. The objective proposals bridged by
Genesis (`src/genesis/snapshot-bridge.ts`) emit both a canonical
`WORK_ITEM_CREATED` and an `OBJECTIVE_ADDED` sharing one identity; the
edge between them exists only by convention, not in any event payload.

This is a **documented model gap**, reported by the validator as
`not-event-provable` — never silently skipped, never a failure. It is a
candidate for a future ADR (e.g. emitting `WORK_ITEM_GENERATED` or
carrying the edge on creation). The event model is a Protected Asset,
so no event payload schema was changed to close this gap.

## Validator

`validateGraphIntegrity(events, state?)` is pure and deterministic. It
rebuilds the state from the events when none is given (so navigation
invariants always run) and returns a structured
`graph-integrity-report`:

- `result`: `"valid"` when no violation was found, else `"invalid"`.
  A `not-event-provable` invariant never makes a report invalid.
- `invariants`: one entry per invariant above — `status`
  (`pass` / `fail` / `not-event-provable`), `detail`, and the
  violation messages bucketed to it.
- `graph`: per-kind counts plus `nodes`, resolved `edges`, and `roots`.
- `violations`: every structured violation (kind, message, aggregate
  kind/id, optional parent id).

## Proof artifact

`scripts/verify-graph-integrity.js` produces the Graph Integrity proof
(`synth-graph-integrity-proof-v1`). It does **not** validate the
repository's canonical `.synth/data/event-log.jsonl`: that log is gitignored
local runtime state, absent in CI, and may carry pre-HARDEN-001
pollution preserved as immutable forensic evidence. Instead the proof
certifies a **freshly generated reference execution** — the real
pipeline (Mission Studio session → approval → `genesisFromSnapshot` →
ExecutionGate → event log) run in an `os.tmpdir()` sandbox with its own
event log. A valid reference execution proves the *current* system
produces valid aggregate graphs (the regression ratchet for
EXP-HARDEN-001…004) and is environment-independent.

The artifact carries the validator name/version, the per-invariant
results, the graph statistics, the reference-execution digest
(SHA-256 over the ordered event hashes, plus the replay hash), the
timestamp, and the commit/source/build hashes following the
`proof/proof-*.json` conventions. The script exits non-zero on any
violation. Output defaults to
`proof/graph-integrity-proof-<timestamp>.json` and is overridable with
`--out <path>` (tests and local runs redirect it to `os.tmpdir()`).

## Enforcement

- **CI / `npm run govern`:** the proof runs as the
  **P6 Graph Integrity** dimension of the canonical proof object
  (`scripts/generate-proof.js`, invoked by `npm run proof`). Any
  violation fails the pipeline.
- **Historical and archived logs:** `scripts/verify-replay.js
  --strict-graph --log <path>` checks any concrete log, including the
  polluted legacy log and the first-contact archive (36 violations:
  12 broken parent references, 12 orphans, 12 broken navigations).
- **Genesis intake:** the seed event graph is certified before commit
  (`src/genesis/certification.ts`, EXP-HARDEN-003), so invalid graphs
  never enter the log through the constitutional bridge.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-16 | Formal model, provability boundary, and proof contract (EXP-HARDEN-005) |
