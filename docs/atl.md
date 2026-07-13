# Architectural Trust Level (ATL)

**Version:** 1.0.0  
**Status:** Active

---

## Purpose

ATL is an internal maturity metric. It measures how much confidence Synth has in its own architecture. It is not a marketing label. It is a checklist for foundational readiness.

---

## Levels

| Level | Name | Requirement |
|-------|------|-------------|
| ATL-0 | Design | The architecture is documented. |
| ATL-1 | Implemented | The architecture is implemented in code. |
| ATL-2 | Enforced | Architectural invariants are enforced at runtime (e.g., Single Mutation Authority). |
| ATL-3 | Deterministic | Command execution is deterministic for identical inputs and state. |
| ATL-4 | Replay Verified | Operational state can be reconstructed from immutable history and compared bit-for-bit. |
| ATL-5 | Tamper Evident | The event log has a cryptographic hash-chain; tampering is detectable. |
| ATL-6 | Proof Generating | Every audit produces a machine-verifiable proof object. |
| ATL-7 | Continuously Governed | Proof generation is mandatory and enforced before merge. |

---

## Current Assessment

**Project:** Synth v2  
**Current ATL:** ATL-6  
**Target ATL:** ATL-7  
**Assessment Date:** 2026-06-29

| Level | Status | Evidence |
|-------|--------|----------|
| ATL-0 | ✅ | `docs/architecture/constitution.md` exists. |
| ATL-1 | ✅ | Modular `src/` implements all layers. |
| ATL-2 | ✅ | `ExecutionGate` is the sole mutation authority; `EventStore` requires auth token. |
| ATL-3 | ✅ | `ExecutionContext` replaces `Date.now()` / `randomUUID()` in operational paths. |
| ATL-4 | ✅ | `ReplayVerifier` compares operational and replayed state hashes. |
| ATL-5 | ✅ | Every new event carries `eventHash` and `previousHash`; chain is verified during replay. |
| ATL-6 | ✅ | `scripts/generate-proof.js` produces `proof/proof-*.json`. |
| ATL-7 | ⏳ | `npm run govern` exists; CI adapter and pre-commit hook are being added in EXP-GOV-001. |

---

## Regression Rule

A release must not lower ATL. If a change removes a proof class, it must be accompanied by an ADR and an explicit ATL downgrade decision.

---

## Proof Object Integration

The proof object includes:

```json
{
  "trust": {
    "level": "ATL-6",
    "target": "ATL-7",
    "assessmentDate": "..."
  }
}
```

When ATL-7 is reached, the proof object will report `"level": "ATL-7"`.
