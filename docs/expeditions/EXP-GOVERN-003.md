# EXP-GOVERN-003 — Proof Model and Fingerprint Store

> **Architecture expedition.** Define the Validation Proof model, implement semantic fingerprints, and provide a persistent proof store. Caching is built on top of the proof model; the model is the architecture.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-021 — Incremental Governance  
**Depends On:** EXP-GOVERN-002 (Validation Dependency Graph)

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Establish the canonical proof model and a fingerprint store that make validation proofs reusable.

A proof is not raw command output. It is a deterministic artifact asserting that a governance property holds for a specific dependency fingerprint. When a check's input fingerprint has not changed and the validator version is still current, the system reuses the previously recorded proof instead of re-running the check.

The expedition focuses on the proof model first; caching is an implementation detail built on top of it.

---

## Proof Model

A Validation Proof is the unit of incrementality.

```ts
interface ValidationProof {
  id: string
  check: string
  fingerprint: Fingerprint
  dependencies: Fingerprint[]
  result: "PASS" | "FAIL"
  validatorVersion: string
  algorithmVersion?: string
  timestamp: Date
  proofHash: string
}
```

Fields:

- `check` — the governance property being validated.
- `fingerprint` — semantic hash of the inputs the proof applies to.
- `dependencies` — upstream proof fingerprints; invalidating an upstream proof invalidates this one.
- `result` — the deterministic outcome.
- `validatorVersion` — version of the validator implementation; changing it invalidates existing proofs.
- `algorithmVersion` — version of the underlying algorithm or heuristic, when distinct from the validator.
- `timestamp` — when the proof was produced (not part of the proof identity).
- `proofHash` — integrity hash over the proof object itself.

---

## Required Change

### 3.1 Define fingerprint semantics

A fingerprint is a deterministic, semantic hash over a check's declared input set:

```text
fingerprint(check) = hash(
  check.id
  semantic inputs
  check.version
  validatorVersion
  algorithmVersion
  tool versions (when relevant)
)
```

Fingerprints are **semantic**, not byte-for-byte. The goal is to treat meaningful changes as changes and incidental changes (whitespace, key ordering, formatting) as unchanged. Example strategies:

| Input | Default strategy |
|---|---|
| Markdown file | AST or normalized structure |
| JSON file | Canonical normalized form |
| Source file | AST or normalized token stream |
| Event log | Canonical event segment hash |

Inputs include:

- semantic content for matched globs.
- event-log segments when the check depends on runtime state.
- capability versions or adapter metadata when relevant.

The fingerprinting engine must expose a **strategy selector** so the default strategy can be swapped (for example, from content hashes to AST-based fingerprints) without changing the proof model or the rest of the architecture. The first implementation may use content hashes; the architecture must not hardcode that choice.

### 3.2 Implement a proof store

Store cached proofs in `.synth/cache/govern/`:

```json
{
  "schema": "synth-govern-proof-cache-v1",
  "id": "mission-integrity:8f31...",
  "check": "mission-integrity",
  "fingerprint": "8f31...",
  "dependencies": ["runtime-integrity:9a2b...", "event-chain:4c7d..."],
  "result": "PASS",
  "validatorVersion": "1.0.0",
  "algorithmVersion": "1.0.0",
  "timestamp": "2026-07-19T01:00:00Z",
  "proofHash": "a3f9..."
}
```

The cache:

- is keyed by `(checkId, fingerprint)`.
- records `PASS`/`FAIL` result and proof hash.
- records `validatorVersion` and `algorithmVersion`; either change invalidates the proof.
- records upstream `dependencies` so invalidating an upstream proof invalidates this one.
- is invalidated when the check definition, inputs, or fingerprint strategy change.
- is never consulted for non-deterministic checks.

### 3.3 Classify determinism

Every check declares its determinism class:

```text
deterministic   → safe to cache
contextual      → cache with environment marker
non-deterministic → never cache
```

### 3.4 Cache integrity and lifecycle

- Cached proofs must be replay-verifiable: given the same inputs and validator versions, the check would produce the same result.
- Cache corruption is detected by `proofHash` mismatch and falls back to re-execution.
- A `validatorVersion` or `algorithmVersion` mismatch invalidates affected proofs automatically.
- The operator can force a clean proof set (manual rebuild) without changing the underlying checks.
- The cache is local by default; remote cache is out of scope until EXP-GOVERN-005.

---

## Deliverables

1. **ValidationProof model** formalized as the canonical unit of incrementality.
2. **Fingerprinting engine** for file globs, event segments, and metadata, with a swappable semantic-fingerprint strategy.
3. **Proof store** under `.synth/cache/govern/` keyed by `(checkId, fingerprint)` and versioned by validator and algorithm versions.
4. **Determinism classification** integrated with check registration.
5. **Cache lifecycle handling** for cold, warm, corrupt, version-mismatch, and manual-rebuild states.
6. **Cache hit/miss/invalidation reporting** in GovernSummary, including a deterministic reason for each decision.
7. **ADR** on the proof model, fingerprint semantics, and cache lifecycle.

---

## Acceptance Criteria

- A check with an unchanged input fingerprint and matching `validatorVersion`/`algorithmVersion` reuses its cached proof instead of executing.
- A check with a changed input fingerprint executes and produces a new proof entry.
- A check whose `validatorVersion` or `algorithmVersion` changed invalidates all existing proofs for that check and re-executes.
- Non-deterministic checks never read from or write to the proof store.
- Corrupt or tampered proof entries are detected via `proofHash` mismatch and trigger re-execution.
- Upstream proof invalidation cascades to dependent proofs.
- GovernSummary reports cache hits, misses, invalidations, and the deterministic reason for each decision.
- The fingerprint strategy can be replaced without changing the `ValidationProof` model or the proof-store format.

---

## Out of Scope

- Incremental scheduling (EXP-GOVERN-004).
- Parallel execution (EXP-GOVERN-005).
- Remote or shared cache (EXP-GOVERN-005).
- Changing what any check validates.

---

## Success Criteria

The expedition succeeds when a second `npm run govern` on an unchanged repository reuses every deterministic proof and completes significantly faster than a cold run.
