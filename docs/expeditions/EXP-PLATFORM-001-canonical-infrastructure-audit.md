# EXP-PLATFORM-001 — Canonical Infrastructure Audit

> Phase III of the SYNTH simplification program: find every infrastructure concern that lacks a single canonical owner.

## Authority

- Depends on: `EXP-SIMPLIFICATION-003` (extension model unification)
- Classification: **Application** (audit of application-level infrastructure)
- Kernel: **Protected**. The audit reads code and state; it does not modify the kernel.

## Objective

Produce a complete, permanent inventory of infrastructure operations in the repository and identify which ones lack a canonical owner.

The audit answers one question for every infrastructure concern:

> **Where is the canonical implementation?**

A concern is canonical when:

- It has exactly one implementation.
- Every consumer imports it from that implementation.
- No consumer inlines an alternative.

## Constraints

- Read-only. No code changes.
- No new concepts.
- No new abstractions.
- No kernel modifications.
- Evidence must be machine-readable (JSON) and human-readable (Markdown).

## Mandatory artifact

**Canonical Infrastructure Matrix:** `docs/expeditions/EXP-PLATFORM-001-infrastructure-matrix.md`

| Concern | Canonical Owner | Current Implementations | Consumers | Target | Status |
|---|---|---|---|---|---|
| Paths | TBD | N | list | 1 | audited |
| JSON read/write | TBD | N | list | 1 | audited |
| Hashing | TBD | N | list | 1 | audited |
| Temp directories | TBD | N | list | 1 | audited |
| Identity generation | TBD | N | list | 1 | audited |
| Workspace discovery | TBD | N | list | 1 | audited |
| Event log access | TBD | N | list | 1 | audited |
| State access | TBD | N | list | 1 | audited |
| Process execution | TBD | N | list | 1 | audited |
| Manifest read | TBD | N | list | 1 | audited |

## Methodology

1. Enumerate infrastructure concerns by scanning `src/` for repeated operations.
2. For each concern, find every implementation using grep and import analysis.
3. Count consumers of each implementation.
4. Determine whether a canonical owner already exists.
5. Produce the matrix and a prioritization for SDK creation.

## Categories

The audit covers at minimum:

```
Paths
Workspace
Filesystem
JSON
Hashing
Identity
Temp
Git
Configuration
Events
State
Logging
Environment
Process
```

## Output metrics

| Metric | Target |
|---|---|
| Infrastructure concerns audited | ≥12 |
| Concerns with a canonical owner | Baseline |
| Concerns without a canonical owner | Identified |
| Consumers per concern | Listed |
| Duplicate implementations per concern | Counted |

## Deliverables

1. ✅ `docs/expeditions/EXP-PLATFORM-001-infrastructure-matrix.md`
2. ✅ `docs/expeditions/EXP-PLATFORM-001-findings.json`
3. ✅ Recommendations for EXP-PLATFORM-002 scope

## Success criteria

- ✅ Every major infrastructure concern is inventoried (15 concerns).
- ✅ The matrix identifies the single canonical owner where one exists.
- ✅ The matrix flags every concern that needs canonicalization.
- ✅ EXP-PLATFORM-002 can be planned directly from this artifact.

## Non-goals

- Do not implement the SDK.
- Do not migrate any callers.
- Do not change file paths or names.
- Do not produce recommendations that cannot be expressed as KEEP, MERGE, MOVE, DELETE, or SPLIT.

---

## Approval

Approved and completed. EXP-PLATFORM-001 is a prerequisite for EXP-PLATFORM-002 because the SDK design must be driven by evidence, not by intuition.

**Recommended EXP-PLATFORM-002 module order:**

1. `sdk.paths` (P0)
2. `sdk.workspace` (P0)
3. `sdk.files` (P1)
4. `sdk.json` (P1)
5. `sdk.hashing` (P1)
6. `sdk.manifest` (P1)
7. `sdk.identity` (P2)
8. `sdk.temp` (P2)
9. `sdk.process` (P2)
10. `sdk.events` (P2)
11. `sdk.state` (P2)
