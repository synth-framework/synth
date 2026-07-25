# EXP-PLATFORM-004 — Utility Extraction Matrix

> Decisions for consolidating duplicated utility functions into the Internal Platform SDK.

**Status:** Completed  
**Expedition:** EXP-PLATFORM-004  
**Program:** EXP-PROGRAM-041 — Platform Canonicalization

---

## Extraction rule

A function is extracted into `src/sdk/` only when all three hold:

1. **Same responsibility** across every current location.
2. **Same contract** (inputs, outputs, edge-case behavior).
3. **Same semantics** (no location-dependent behavior).

---

## Decisions

| Function | Current locations | Responsibility | Contract | Semantics | Decision |
|---|---|---|---|---|---|
| `sortKeys(value: unknown): unknown` | `src/core/hash.ts`, `src/control/execution-gate.ts`, `src/core/execution-fingerprint.ts`, `src/environment/evidence.ts`, `src/first-contact/artifact/canonical.ts` | Recursive key sorting for deterministic serialization | Identical: null/undefined pass-through, arrays mapped, object keys sorted recursively | Identical across all five locations | **EXTRACT** → `src/sdk/json/index.ts` |
| `stableStringify(obj: unknown): string` | `src/core/hash.ts` | Deterministic JSON stringify via sorted keys | Single implementation used by `sha256` | N/A | **EXTRACT** → `src/sdk/json/index.ts`; `core/hash` re-exports for compatibility |
| `canonicalizeEvidence(evidence)` | `src/environment/evidence.ts` | Evidence-specific canonical serialization (excludes volatile fields, wraps `sortKeys`) | Domain-specific | N/A | **KEEP LOCAL** — business logic, not generic utility |
| `canonicalizeArtifact(artifact)` | `src/first-contact/artifact/canonical.ts` | Artifact-specific canonical serialization (strips volatile fields, wraps `sortKeys`) | Domain-specific | N/A | **KEEP LOCAL** — business logic, not generic utility |
| `stripVolatileFields(value)` | `src/first-contact/artifact/canonical.ts` | Removes artifact-specific volatile metadata | Domain-specific | N/A | **KEEP LOCAL** — single consumer, domain rule |
| `contentView(evidence)` | `src/environment/evidence.ts` | Builds the hashable content view of discovery evidence | Domain-specific | N/A | **KEEP LOCAL** — single consumer, domain rule |
| `sha256(obj)` | `src/core/hash.ts` | SHA-256 of stable-serialized value | Stable hash primitive | N/A | **KEEP LOCAL** in `core/hash` — consumes `stableStringify` from SDK |
| `eventContentForHash(event)` | `src/core/hash.ts` | Canonical event field projection for hashing | Domain-specific (event model) | N/A | **KEEP LOCAL** — event-model logic |
| `computeEventHash(event)` | `src/core/hash.ts` | Event hash computation | Domain-specific | N/A | **KEEP LOCAL** — event-model logic |

---

## Migration summary

- `src/sdk/json/index.ts` now owns `sortKeys` and `stableStringify`.
- `src/core/hash.ts` imports `sortKeys` / `stableStringify` from the SDK and re-exports `stableStringify` to preserve existing consumers.
- `src/control/execution-gate.ts`, `src/core/execution-fingerprint.ts`, `src/environment/evidence.ts`, and `src/first-contact/artifact/canonical.ts` import `sortKeys` from `src/sdk/json` and delete their local copies.

---

## Verification

- [x] No behavioral change.
- [x] No kernel modifications.
- [x] Existing tests continue to pass.
- [x] SDK utility module is stateless.

---

## Remaining candidates

After this pass, no additional duplicated utilities with identical responsibility, contract, and semantics were identified. If new duplication is discovered during Program 041 closeout, it will be added to this matrix before extraction.
