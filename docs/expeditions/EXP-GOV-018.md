# EXP-GOV-018 — Governance Cache

**Status:** Completed and accepted  
**Kind:** Engineering Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **SYNTH already persists proofs, but the cache lifecycle is not yet explicit: cold, warm, corrupt, version-mismatch, and manual-rebuild states are not surfaced.**

This expedition formalizes the proof cache lifecycle and integrates it with the orchestrator. A corrupted cache is automatically discarded and rebuilt; a version mismatch invalidates only affected proofs.

---

## Acceptance Criteria

- The cache supports cold, warm, corrupt, version-mismatch, and manual-rebuild states.
- Corrupt proofs are detected by integrity hash and trigger revalidation.
- Validator version changes invalidate only proofs for that validator.
- Manual rebuild (`--full`) discards all cached decisions.
- The cache is stored in `.synth/cache/govern/proofs.jsonl`.

---

## Artifacts

- `scripts/governance/proof-store.js` — existing proof store, reused.
- `scripts/governance/incremental-engine.js` — existing engine, reused.
- `scripts/governance/orchestrator.js` — lifecycle surface.
- `tests/governance-orchestration.test.js` — cache lifecycle tests.

---

## Relationship

- Builds on `scripts/governance/proof-store.js` and `scripts/governance/incremental-engine.js` from EXP-PROGRAM-021.
- Feeds `EXP-GOV-017 Incremental Validator Engine`.
