# EXP-GOVERN-003 — Fingerprint and Proof Cache

> **Architecture expedition.** Introduce semantic fingerprints per dependency set and a persistent proof cache so unchanged checks reuse previously certified validation proofs.

**Status:** Proposed  
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

Make validation proofs reusable. When a check's input fingerprint has not changed, the system reuses the previously recorded proof instead of re-running the check.

The cache stores proof validity, not raw command output. A cached proof means: "Given these equivalent inputs, the check previously passed."

---

## Required Change

### 3.1 Define fingerprint semantics

A fingerprint is a deterministic hash over a check's declared input set:

```text
fingerprint(check) = hash(
  check.id
  check.inputs content
  check.version
  tool versions (when relevant)
)
```

Inputs include:

- file content for matched globs.
- event-log segments when the check depends on runtime state.
- capability versions or adapter metadata when relevant.

### 3.2 Implement a proof cache

Store cached proofs in `.synth/cache/govern/`:

```json
{
  "schema": "synth-govern-proof-cache-v1",
  "checkId": "mission-integrity",
  "fingerprint": "8f31...",
  "status": "pass",
  "producedAt": "2026-07-19T01:00:00Z",
  "governRunId": "...",
  "proofHash": "..."
}
```

The cache:

- is keyed by `(checkId, fingerprint)`.
- records pass/fail status and proof hash.
- is invalidated when the check definition or inputs change.
- is never consulted for non-deterministic checks.

### 3.3 Classify determinism

Every check declares its determinism class:

```text
deterministic   → safe to cache
contextual      → cache with environment marker
non-deterministic → never cache
```

### 3.4 Cache integrity

- Cached proofs must be replay-verifiable: given the same inputs, the check would produce the same result.
- Cache corruption is detected by hash mismatch and falls back to re-execution.
- The cache is local by default; remote cache is out of scope until EXP-GOVERN-005.

---

## Deliverables

1. **Fingerprinting engine** for file globs, event segments, and metadata.
2. **Proof cache storage** under `.synth/cache/govern/`.
3. **Determinism classification** integrated with check registration.
4. **Cache hit/miss reporting** in GovernSummary.
5. **ADR** on fingerprint and proof-cache semantics.

---

## Acceptance Criteria

- A check with an unchanged input fingerprint reads from cache instead of executing.
- A check with a changed input fingerprint executes and updates the cache.
- Non-deterministic checks never use the cache.
- Cache corruption is detected and triggers re-execution.
- GovernSummary reports cache hits, misses, and skipped checks.

---

## Out of Scope

- Incremental scheduling (EXP-GOVERN-004).
- Parallel execution (EXP-GOVERN-005).
- Remote or shared cache (EXP-GOVERN-005).
- Changing what any check validates.

---

## Success Criteria

The expedition succeeds when a second `npm run govern` on an unchanged repository reuses every deterministic proof and completes significantly faster than a cold run.
