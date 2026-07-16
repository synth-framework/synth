# EXP-FIRSTCONTACT-009 — Canonical Journey Re-recording

**Status:** Draft  
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
   - `proof.json` covering P1–P6 including Graph Integrity.
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
- Archive B's proof artifact verifies through `scripts/verify-proof.js` including P6.
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

- [ ] Archive A hash-pinned and marked immutable historical evidence.
- [ ] Canonical Mission re-executed on the hardened pipeline; Archive B complete.
- [ ] Archive B: zero graph violations under `--strict-graph`; P1–P6 proof verified.
- [ ] Snapshot artifacts present, signed, certified.
- [ ] A/B comparison artifact generated deterministically.
- [ ] First Contact projections refreshed and byte-identical on regeneration.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes.
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
