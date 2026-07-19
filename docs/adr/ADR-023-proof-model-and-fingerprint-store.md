# ADR-023 — Validation Proof Model and Fingerprint Store

**Status:** Accepted
**Date:** 2026-07-19
**Author:** SYNTH Core Team
**Deciders:** Program 021 Architecture Review

---

## Context

`npm run govern` runs the same validation checks on every invocation. Many checks are deterministic: given identical inputs, they produce identical results. Re-running them wastes time and provides no new information. The solution is to memoize deterministic validation results as reusable proofs keyed by semantic fingerprints.

## Decision

Introduce a **ValidationProof** model and a local **proof store** under `.synth/cache/govern/`.

A proof is a deterministic artifact asserting that a governance property holds for a specific dependency fingerprint. It is not raw command output. Proofs are keyed by `(checkId, fingerprint)` and invalidated by changes to inputs, validator version, algorithm version, or upstream proofs.

## Consequences

### Positive

- Deterministic checks run once and reuse results until inputs change.
- Validator evolution is safe: version changes invalidate affected proofs automatically.
- Cache corruption is detected and recovered from by re-execution.
- The model is independent of the fingerprint strategy, allowing future semantic fingerprints.

### Negative

- Requires every check to declare determinism classification and version metadata.
- Assumes skipped check outputs remain valid on disk.

## Proof Model

```ts
interface ValidationProof {
  id: string
  check: string
  fingerprint: string
  dependencies: string[]
  result: "PASS" | "FAIL"
  validatorVersion: string
  algorithmVersion?: string
  timestamp: string
  proofHash: string
}
```

## Fingerprint Semantics

A fingerprint is a deterministic hash over:

- check id
- semantic content of declared inputs
- validator version
- algorithm version
- relevant tool versions

The first implementation uses content hashes. The strategy is swappable without changing the proof model.

## Determinism Classification

- **deterministic** — safe to cache (default for most checks).
- **contextual** — cache with environment marker.
- **non-deterministic** — never cached.

## Cache Lifecycle

| State | Behavior |
|---|---|
| Cold | No proofs; every check executes. |
| Warm | Matching fingerprint and versions reuse proof. |
| Corrupt | `proofHash` mismatch discards entry and re-executes. |
| Version mismatch | Validator or algorithm change invalidates affected proofs. |
| Manual rebuild | Operator can force clean proof set. |

## Storage

Proofs are stored in `.synth/cache/govern/proofs.jsonl`, one JSON object per line, keyed by `(checkId, fingerprint)`.
