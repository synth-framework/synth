# EXP-HARDEN-005 — Graph Integrity

**Status:** Completed  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-003, EXP-HARDEN-004  
**Blocks:** EXP-HARDEN-006

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

Introduce Graph Integrity as a first-class constitutional proof, equal in importance to Replay Integrity.

---

## Motivation

SYNTH's execution model is a graph: Missions contain Expeditions, Expeditions contain Objectives, and Objectives produce Work Items. If this graph is broken, Replay may still pass while the system is semantically invalid. Graph Integrity must be provable independently.

---

## Deliverables

1. **Graph Integrity model**
   - Formal definition of a valid SYNTH aggregate graph.

2. **Graph Integrity validator**
   - Every Mission is reachable from the project root.
   - Every Expedition belongs to exactly one Mission.
   - Every Objective belongs to exactly one Expedition.
   - Every Work Item belongs to exactly one Objective.
   - No orphan nodes exist.
   - No cycles exist.
   - Every parent reference resolves.
   - Every root is reachable.

3. **Graph Integrity proof artifact**
   - A proof report certifying graph validity.

4. **CI integration**
   - Graph Integrity checks run in `npm run govern`.

---

## Acceptance

A broken event log with orphan aggregates or invalid parent references fails Graph Integrity, while a valid event log produces a Graph Integrity proof.

---

## Phases

### Phase 1 — Define graph invariants

Write the formal definition and add it to reference documentation.

### Phase 2 — Implement validator

Build a standalone graph integrity validator.

### Phase 3 — Generate proofs

Produce proof artifacts after validation.

### Phase 4 — CI integration

Wire the validator into the governance pipeline.

---

## Risks

| Risk | Mitigation |
|---|---|
| Overly strict rules | Start with core invariants, expand iteratively |
| Performance on large graphs | Cache graph state and validate incrementally |
| Incompatible with legacy data | Document exceptions and migration path |

---

## Definition of Done

- [x] Graph invariants documented.
- [x] Graph Integrity validator implemented.
- [x] Proof artifact generated.
- [x] Validator integrated into CI.
- [x] Tests cover valid and invalid graphs.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Add `src/core/graph-integrity.ts` module.
2. Define validation rules.
3. Integrate with `src/core/replay-verifier.ts`.
4. Add proof generation.
5. Add tests and CI wiring.

---

## Completion Notes

Implemented on branch `feat/exp-harden-005`. The full governance pipeline runs via the CI `proof` check on the PR; acceptance is recorded through PR merge. Everything else is done and verified by targeted validation.

**Phase 1 — Invariants.** The formal model lives in a new reference doc, `docs/reference/graph-integrity.md` (v1.0.0): the aggregate-graph definition (nodes, parent-reference edges, mission roots), nine invariants with stable identifiers, the provability boundary, the proof artifact contract, and the enforcement model. `docs/reference/replay-specification.md` (v1.2.0) keeps the original six Graph Invariants and now points to the new doc for the full model; `docs/reference/README.md` links it. A dedicated doc was chosen over extending the replay specification because Graph Integrity is now a peer proof of Replay, not a subsection of it.

**Phase 2 — Validator.** `src/core/graph-integrity.ts` exports `validateGraphIntegrity(events, state?)` → a deterministic `graph-integrity-report` (result, per-invariant verdicts with bucketed violation messages, per-kind graph stats, structured violations). It **imports** `validateAggregateGraph` from the replay engine (EXP-HARDEN-004) rather than duplicating or moving it — zero churn to the Protected-Asset-adjacent replay path — and extends it with the work-item tier. When no state is given it rebuilds via `rebuildState`, so navigation invariants always run. Implementation-plan item 3 ("integrate with `src/core/replay-verifier.ts`") was already satisfied by EXP-HARDEN-004 (the verifier reports `graphValid`/`graphViolations`); the verifier is deliberately untouched. Core-boundary rules hold: the module is pure, imports only `runtime/replay` and types, no IO, no environment modules.

**The invariant set, and what is event-provable today.** Event-provable (8): `well-formed-creation`, `unique-identity`, `parent-presence` (exactly-one-parent semantics), `parent-resolution`, `acyclicity`, `connectivity` (no orphans; every aggregate reaches a mission root), `navigation`, and `generated-work-item-membership` (`WORK_ITEM_GENERATED` payloads carry `objectiveId`/`expeditionId` — validated, including duplicates). **Documented gap (1):** `work-item-objective-membership` — "every Work Item belongs to exactly one Objective" is **not event-provable** for canonical work items: `WORK_ITEM_CREATED` payloads carry a canonical `WorkItem` with **no `objectiveId`** (verified at `src/genesis/snapshot-bridge.ts:158-166`, `src/genesis/intake.ts:128-153`, and the replay handler at `src/runtime/replay.ts:45`). The edge exists in the type system only on `GeneratedWorkItem` (`src/types/state.ts:115-126`), and nothing emits `WORK_ITEM_GENERATED` today (replay handler exists at `src/runtime/replay.ts:305`; no producers in `src/`). Per the expedition's constraints this is reported as `not-event-provable` — a **constitutional finding and candidate for a future ADR**, never a schema change (the event model is a Protected Asset) and never a silent skip; it never fails a report.

**Phase 3 — Proof.** `scripts/verify-graph-integrity.js` certifies a **freshly generated reference execution**, not the canonical log: `data/event-log.jsonl` is gitignored local runtime state (absent in CI) carrying 206 pre-HARDEN-001 violations preserved as immutable forensic evidence. The script runs the real pipeline through `dist/` — Mission Studio session → `approve` → `api.genesisFromSnapshot` → ExecutionGate → event log — sandboxed in `os.tmpdir()` with explicit `eventLogPath`/`statePath`/`checkpointPath`/`streamDir` and `gitEnabled: false` (sidestepping the known `persistence: "memory"` fallback bug at `src/infra/index.ts:45`), then validates the resulting graph, which must be 100% valid. This proves the *current* system produces valid graphs (the regression ratchet for HARDEN-001…004) and is environment-independent. The artifact (`synth-graph-integrity-proof-v1`) carries validator name/version, per-invariant results, graph stats, the reference-execution digest (SHA-256 over ordered event hashes + replay hash + projection counts), timestamp, and commit/source/build hashes following `proof/proof-*.json` conventions. Output defaults to `proof/graph-integrity-proof-<timestamp>.json` (`proof/` is gitignored) and is overridable with `--out <path>`; exits non-zero on any violation.

**Phase 4 — CI.** The proof is wired into `npm run govern` as the **`p6GraphIntegrity`** dimension of the canonical proof object: `scripts/generate-proof.js` execSyncs the standalone script (the exact idiom of `p2Determinism`/`p4Adversarial`), folds it into `overall.passed` and the summary, and `scripts/verify-proof.js` requires `proofs.p6GraphIntegrity.passed`. A standalone-script-plus-dimension seam was chosen over in-process validation because that is the established convention for proof dimensions that need isolation — and it keeps the full artifact available independent of the canonical proof. **Naming:** `P6`, not `P3`/`P5` — `docs/governance.md`'s audit-pipeline taxonomy already assigns P3 to Historical (SKR) and P5 to Reproducibility; the proof artifact mirrors that taxonomy, so Graph Integrity takes the next free class (governance.md updated: diagram + pipeline row). The expedition spec's `Requires ADR: No` covers the new proof class. Legacy/polluted logs remain checkable via `verify-replay.js --strict-graph --log`. Local `npm run govern` cannot break on a polluted legacy log *by construction* — the proof never reads the canonical log — and a test proves it (below).

**Tests.** `tests/graph-integrity.test.js` (15 tests): valid log → valid report (8 pass + 1 not-event-provable, exact graph stats); broken logs fail — orphan expedition/objective (parent-resolution + connectivity + navigation), missing parent (parent-presence), duplicates (unique-identity), cycle (acyclicity), malformed payload (well-formed-creation); work-item tier — `WORK_ITEM_GENERATED` with unknown/missing objective fails membership, resolved objective passes and joins graph stats, duplicate generated identity fails unique-identity, canonical `WORK_ITEM_CREATED` marks the gap not-event-provable without failing; the first-contact archive fails with the documented 36-violation profile (12/12/12); the proof script certifies the reference execution (exit 0, artifact shape: schema, hashes, 7 events, 4 nodes/3 edges/1 root); **CI-safety** — with `--out` redirected, the repo `proof/` listing and `data/event-log.jsonl` SHA-256 are byte-identical before/after and the sandbox lives under `os.tmpdir()`. Wired as `test:graph-integrity` into `test:all` next to `test:replay-graph-integrity`.

**Validation.** Build + typecheck pass; graph-integrity 15/15; replay-graph-integrity 19/19; genesis-hardening 18/18; mission-studio-proposal-graph 11/11; mission-studio-snapshot-integrity 16/16; synth 113/113; bypass audit clean; core-boundary audit clean (new core module); `verify-replay.js` exit 0 (206 known legacy violations as warnings); `verify-expedition-governance.js` exit 0; proof script run against tmpdir output twice (proof artifact inspected). `data/event-log.jsonl` verified byte-identical (SHA-256) after all runs. `npm run govern` intentionally not run in-session (runs via CI on the PR).

**Deferred findings.**

1. **EXP-HARDEN-006 candidate (validation expansion):** the `work-item-objective-membership` gap above — closing it requires an event-model decision (emit `WORK_ITEM_GENERATED` from the planning layer, or carry the objective edge on creation). That is an ADR-level schema decision, deliberately not made here.
2. **EXP-HARDEN-006 candidate:** `generated-work-item-membership` validates the objective edge and the expedition edge only when present; cross-kind identity clash detection between generated work items and the mission/expedition/objective identity space is not enforced (separate projections today).
3. **EXP-HARDEN-007 candidate (observability):** the proof artifact embeds the reference-execution sandbox path; a `--json`/quiet mode for machine consumption and per-invariant violation counts in CI logs would improve scannability without opening the artifact.

