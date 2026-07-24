# EXP-PLATFORM-004 — Utility Extraction

> Phase III of the SYNTH simplification program: extract duplicated utilities only after canonical ownership exists.

## Authority

- Depends on: `EXP-PLATFORM-002`
- Classification: **Application**
- Kernel: **Protected**. Utility extraction does not modify the kernel.

## Objective

Extract duplicated utility functions into the SDK where they have identical responsibility, contract, and semantics.

This expedition runs last in Phase III because extraction without ownership produces a junk drawer.

## Extraction rule

Extract only when all three hold:

1. **Same responsibility**
2. **Same contract**
3. **Same semantics**

## Examples of valid extractions

| Function | Current locations | SDK owner |
|---|---|---|
| `stableId(...parts: string[]): string` | 4 rule-based adapters | `sdk.hashing` |
| `sortKeys(value)` | `core/hash.ts`, `environment/evidence.ts` | `sdk.json` |
| `canonicalizeEvidence(evidence)` | `environment/evidence.ts` | `sdk.json` |
| `hashObject(obj)` | adapters, mission-studio | `sdk.hashing` |
| `normalizePath(p)` | CLI, adapters | `sdk.paths` |

## Examples of invalid extractions

| Function | Reason |
|---|---|
| `computeConfidence(...)` | Different semantics in governance, validation, first-contact, and filesystem-init. |
| `normalizeInput(...)` | Single-domain heuristic; no reuse value. |
| Adapter-specific lifecycle helpers | Different responsibilities across adapter kinds. |

## Constraints

- No new concepts.
- No new abstractions beyond moving existing functions.
- No kernel modifications.
- No behavioral changes.
- Extracted utilities must be stateless.

## Mandatory artifact

**Utility Extraction Matrix:** `docs/expeditions/EXP-PLATFORM-004-utility-matrix.md`

| Function | Current locations | Responsibility | Contract | Semantics | Decision |
|---|---|---|---|---|---|
| `stableId` | 4 files | same | same | same | EXTRACT |
| `computeConfidence` | 5 files | different | different | different | KEEP LOCAL |

## Success metrics

| Metric | Before | After target |
|---|---|---|
| Duplicate utility implementations | Baseline | ≥50% reduction |
| SDK utility modules | 0 | N |
| Behavioral changes | — | 0 |
| Kernel files touched | — | 0 |
| Test failures | — | 0 |

## Deliverables

1. `docs/expeditions/EXP-PLATFORM-004-utility-matrix.md`
2. Extracted utility modules in `sdk/`
3. Migrated consumers
4. Deletion list of obsolete local helpers

## Non-goals

- Do not force extraction where semantics differ.
- Do not create generic helpers that only have one consumer.
- Do not extract business logic.

---

## Approval

Approve after EXP-PLATFORM-002. Utility extraction is a cleanup expedition, not an architecture expedition. It succeeds if it reduces duplication without changing behavior.
