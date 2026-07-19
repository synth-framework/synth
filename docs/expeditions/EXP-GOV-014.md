# EXP-GOV-014 — Artifact Fingerprinting

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **SYNTH already fingerprints check inputs using content hashes, but the strategy is not yet formalized as a swappable semantic fingerprint layer for artifacts.**

This expedition separates semantic fingerprints from content hashes. The default strategy remains content hashing, but the architecture supports AST, canonical JSON, and other semantic strategies without changing the proof model.

---

## Acceptance Criteria

- Fingerprints are keyed by artifact identity and strategy.
- The default strategy is deterministic SHA-256 over sorted file hashes.
- Strategy selection is explicit and recorded in the proof.
- A future semantic strategy can be introduced without changing `ValidationProof`.

---

## Artifacts

- `scripts/governance/fingerprint.js` — existing fingerprint engine, reused.
- `scripts/governance/orchestrator.js` — formalizes artifact-level fingerprinting.
- `tests/governance-orchestration.test.js` — verifies fingerprint stability.

---

## Relationship

- Builds on `scripts/governance/fingerprint.js` from EXP-PROGRAM-021.
- Feeds `EXP-GOV-018 Governance Cache`.
