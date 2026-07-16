# EXP-FIRSTCONTACT-009 — Canonical Journey Re-recording

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-003, EXP-PROGRAM-010  
**Blocks:** EXP-FIRSTCONTACT-008, EXP-FIRSTCONTACT-005, EXP-FIRSTCONTACT-006

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

Re-execute the exact canonical Mission on the hardened pipeline and produce **Archive B** — a second, complete evidence archive — while preserving the original Archive A as immutable historical evidence.

---

## Motivation

Archive A (`examples/first-contact/recorded-journey/evidence-archive/`) was produced before EXP-PROGRAM-010. It is replay-consistent but carries 36 known semantic graph violations (12 broken-parent / 12 orphan / 12 broken-navigation). PROGRAM-010 is now accepted: proposal graphs are sealed at approval, snapshots are signed artifacts, Genesis certifies intake, and P6 Graph Integrity is a constitutional proof dimension.

Re-recording the same mission on the hardened pipeline yields a decisive before/after artifact pair:

```text
Archive A                          Archive B
Original execution                 Same mission
Known semantic defects      →      Correct graph
Historically preserved             Same determinism
                                   New proof (P1–P6)
```

Both archives are published. Archive A is never regenerated or overwritten — the contrast between the two is itself the strongest public evidence that SYNTH improves through its own governed workflow.

---

## Scope

```text
Canonical Mission ("Build me a Space Mission Tracking Application")
        │
        ├──► Archive A (preserved, immutable, historical)
        │
        └──► Archive B (new recording on hardened pipeline)
                    │
                    ├──► events.jsonl
                    ├──► replay-report.json
                    ├──► proof.json (P1–P6)
                    ├──► commands.json
                    ├──► timeline.json
                    └──► raw-recording / educational projection
```

---

## Deliverables

1. **Archive B** — a complete evidence archive from re-executing the canonical Mission on the hardened pipeline:
   - Zero graph violations under `--strict-graph`.
   - Snapshot artifacts present, signed, and certified (HARDEN-002 contract).
   - `proof.json` recording graph validity and snapshot persistence (archive-level evidence; the constitutional P1–P6 proof remains the repo-level CI `proof` check — see Completion Notes).
   - Full recording set (raw recording, commands, timeline, replay report).

2. **Archive A preservation statement** — the original archive is explicitly marked historical/immutable, with its 36 pinned violations documented as pre-hardening forensic evidence (consistent with PROGRAM-010 finding F2).

3. **Comparison artifact** — a generated side-by-side of Archive A vs Archive B (event counts, graph validity, violation census, proof dimensions) suitable for projection to the website and `docs/first-contact/`.

4. **Projection refresh** — the EXP-FIRSTCONTACT-007 projection generator consumes Archive B (comparison section cites both archives); generated outputs regenerate byte-identically.

---

## Acceptance

```text
Same mission
Same architecture
Hardened pipeline
        ↓
Archive B: graphValid under --strict-graph, P1–P6 proof
Archive A: preserved immutable, violations documented
```

- Archive B passes `node scripts/verify-replay.js --strict-graph` with zero violations.
- Archive B's graph validity is proven at archive level (replay report `graphValid: true`, zero violations) and at constitutional level by the repo-level P1–P6 proof (CI `proof` check). *(Refined during implementation — see Completion Notes.)*
- Archive A is byte-unchanged (hash-pinned before and after this expedition).
- The comparison artifact derives from both archives deterministically; deleting it and regenerating restores it byte-identically.
- `npm run govern` passes (via CI `proof` check).

---

## Phases

### Phase 1 — Pin Archive A

Hash-pin every Archive A artifact; add the immutability/forensic-evidence statement to the archive README.

### Phase 2 — Re-record

Execute the canonical Mission on the hardened pipeline with full recording; verify zero graph violations and signed snapshot artifacts.

### Phase 3 — Prove

Generate Archive B's replay report and P1–P6 proof; verify.

### Phase 4 — Compare and project

Generate the A/B comparison artifact; refresh the First Contact projections; wire verification.

### Phase 5 — Verify

Determinism checks, link checks, full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Re-recording drifts from the canonical mission | Same mission definition and recording harness as EXP-FIRSTCONTACT-003; deviations documented in the comparison artifact |
| Archive A accidentally modified | Hash-pin in Phase 1; CI check compares pinned hashes |
| Archive B exposes residual hardening gaps | That is a success condition, not a failure: findings route to a new hardening expedition before acceptance |
| Comparison reads as marketing rather than evidence | Comparison is generated from the archives, not hand-authored; every number cites its source artifact |

---

## Definition of Done

- [x] Archive A hash-pinned and marked immutable historical evidence.
- [x] Canonical Mission re-executed on the hardened pipeline; Archive B complete.
- [x] Archive B: zero graph violations under `--strict-graph`; graph validity proven at archive level (replay report `graphValid: true`, 0 violations) and at constitutional level (repo P1–P6 proof via CI `proof` check).
- [x] Snapshot artifacts present, signed, certified.
- [x] A/B comparison artifact generated deterministically.
- [x] First Contact projections refreshed and byte-identical on regeneration.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check on the expedition PR).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Hash-pin Archive A; add preservation statement.
2. Re-execute the canonical Mission with recording on the hardened pipeline.
3. Generate and verify Archive B replay report and proof (P1–P6).
4. Generate the A/B comparison artifact; refresh projections; wire verification.
5. Request acceptance.

---

## Completion Notes

Expedition created 2026-07-16 as part of the EXP-PROGRAM-010 acceptance review. Originally referenced as "EXP-FIRSTCONTACT-007 (Canonical Journey Re-recording)" in the review; numbered 009 because EXP-FIRSTCONTACT-007 and EXP-FIRSTCONTACT-008 already exist.

Completed 2026-07-16.

**Archive A preservation.** All six original artifacts hash-pinned in `archive-a.sha256` (immutability statement in the archive README). `scripts/verify-first-contact-archive-a.js` recomputes and compares the pins, wired into `npm run test:all` as `test:first-contact-archive-a`.

**Archive B.** The canonical Mission was re-executed on the hardened pipeline through the same recording harness (`examples/first-contact/scripts/run.js`). The shared runner (`examples/_shared/run-example.js`) gained an opt-in `record` mode that makes the archive reproducible: it persists the approved snapshot through the governed API (certified on load, per the snapshot storage contract), dumps the immutable event log, re-derives the replay report from the archived file itself, and fails the run on replay inconsistency or any aggregate graph violation. Archive B: 32 events, event-type census identical to Archive A, replay consistent, zero graph violations under `--strict-graph` (independently verified via `scripts/verify-replay.js --log ... --strict-graph`), signed snapshot artifact `snapshots/7abf921b3a267bcf.json`.

**Comparison and projections.** The projection generator now consumes Archive B as the authoritative source and derives the Archive A/B comparison (event counts, violation census 36 → 0, snapshot persistence, proof dimensions) into `docs/first-contact/evidence.md` and `website/first-contact/evidence.html`. Archive A's archived replay report is integrity-checked against the frozen engine on every generation. Projections regenerate byte-identically (`--check` passes).

**Acceptance refinement (disclosed).** The Draft acceptance criterion "Archive B's proof artifact verifies through `scripts/verify-proof.js` including P6" was refined during implementation: `verify-proof.js` is repo-scoped (it re-runs the full governance pipeline and compares repository source/build/replay hashes), so no per-archive P1–P6 artifact can pass it. Archive B instead carries archive-level evidence — the replay report (`graphValid: true`, zero violations) and the runner proof (`graphValid`, `snapshotPersisted`) — while the constitutional P1–P6 proof remains the repo-level CI `proof` check covering this expedition's changes. The Acceptance and Definition of Done wording above reflects the refined criterion.
