# EXP-ENV-010 — Discovery Evidence & Replay Integration

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-003, EXP-ENV-004, EXP-ENV-005, EXP-ENV-006, EXP-ENV-007, EXP-ENV-008, EXP-ENV-009  
**Blocks:** EXP-ENV-011, EXP-ENV-012

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

Make discovery artifacts replayable constitutional evidence.

---

## Motivation

Discovery is not a side effect. It is evidence. The artifacts it produces must be replayable and auditable.

---

## Deliverables

1. **Discovery evidence schema**
2. **Replay integration**
3. **Proof inclusion**

---

## Acceptance

SYNTH can replay a Mission using only the discovery evidence and produce the same result.

---

## Definition of Done

- [x] Discovery evidence schema defined.
- [x] Replay consumes discovery evidence.
- [x] Proofs include discovery evidence.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- **ADR:** [ADR-015 — Discovery Evidence & Replay Integration](../adr/ADR-015-discovery-evidence-replay.md) (Accepted). Documents the freeze-preserving integration: no new event types, no Replay reducer changes, no `synth-proof-v1` object changes.
- **Schema:** `synth-discovery-evidence-v1` (from ADR-006 / EXP-ENV-001) confirmed canonical; no schema change required.
- **Implementation:** `src/environment/evidence.ts` — `canonicalizeEvidence` (sorted-key JSON), `hashDiscoveryEvidence` (SHA-256 over content excluding volatile timestamps), `replayDiscoveryEvidence` (pure re-derivation of classification/platform/capabilities/assumptions/compatibility from recorded observations + provider selections), `verifyDiscoveryReplay` (divergence reporting), `persistDiscoveryEvidence` / `loadDiscoveryEvidence` (through the Filesystem capability). The derivation helpers in `orchestrator.ts` are now exported so replay reuses the exact same code. Exported via `src/environment/index.ts`.
- **Replay integration:** implemented inside the Environment Layer. Provider selections are treated as recorded decisions (inputs); all derived sections must reproduce exactly. The frozen Replay engine and Event Model are untouched.
- **Proof inclusion:** `scripts/verify-discovery-evidence.js` runs determinism (double-run identical hashes), round-trip persistence, and replay consistency; wired into the proof gate as `node scripts/verify-discovery-evidence.js && node scripts/generate-proof.js`. The `synth-proof-v1` object shape is unchanged.
- **Test coverage:** `tests/environment-discovery-evidence.test.js` — 9 tests covering canonicalization determinism, timestamp-insensitive hashing, tamper detection (hash + replay divergence), derived-section reproduction, persistence round-trip, and invalid-artifact handling.
- **npm script:** `test:environment-discovery-evidence`, included in `test:all`.
- Expedition accepted via PR #64.
