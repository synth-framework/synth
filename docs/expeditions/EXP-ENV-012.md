# EXP-ENV-012 — Constitutional Compliance & Migration

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-010, EXP-ENV-011  
**Blocks:** none

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

Verify that the SYNTH Core contains no direct environmental dependencies and migrate any remaining assumptions behind capability interfaces.

---

## Motivation

The program is only complete when the Core is genuinely environment-independent. This expedition performs the final audit and migration.

---

## Deliverables

1. **Compliance audit**
2. **Migration plan for remaining dependencies**
3. **Governance check**

---

## Acceptance

`npm run govern` passes with no direct environment dependencies in the Core.

---

## Definition of Done

- [x] Compliance audit completed.
- [x] Remaining dependencies migrated.
- [x] Governance check passes.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- **ADR:** [ADR-017 — Constitutional Compliance & Core Boundary Enforcement](../adr/ADR-017-constitutional-compliance-core-boundary.md) (Accepted).
- **Compliance audit:** wide-pattern inventory across all seven directories named in ADR-006 §7 (`core`, `runtime`, `control`, `domain`, `mission-studio`, `genesis`, `planning`). Exactly one violating file found: `src/mission-studio/snapshot-store.ts` (`fs/promises` + `path`). Core `crypto` imports confirmed as pure computation (hashing/HMAC) and explicitly allowed by the ADR.
- **Migration:** `FileSystemSnapshotStore` now persists through the `FilesystemProvider` capability (ADR-010), defaulting to a `PosixFilesystemProvider` rooted at `dir`; optional provider injection supported. Constructor signature and store guarantees unchanged (immutability invariant, absent-snapshot semantics, lineage filtering/ordering, Map serialization). Modification of the Mission Studio Protected Asset is sanctioned by this approved Architecture Expedition per ADR-004 and documented in ADR-017; existing snapshot-lineage tests pass unchanged (7/7).
- **Governance check:** `scripts/audit-core-boundary.js` enforces ADR-006 §7 mechanically — forbidden modules (`fs`, `fs/promises`, `child_process`, `os`, `path`, `net`, `http`, `https`, `process`, `worker_threads`, `cluster`, `dgram`, `dns`, `tls`, plus `node:`-prefixed forms) in the seven Core directories fail governance. Wired into `test:all` (therefore `npm run govern` and the Proof Gate) as `test:core-boundary`.
- **Test coverage:** `tests/core-boundary.test.js` — 6 tests: repo clean, violation detection (plain + `node:`-prefixed), crypto allowed, non-Core directories ignored, missing directories tolerated.
- Out-of-Core layers (`src/infra`, `src/cli`, `src/adapters`, `src/workspace`, `src/documentation`) are environment-facing by design and unchanged; per ADR-017 their incremental migration behind capability providers is an optimization, not a compliance requirement.
- Expedition accepted via PR #66.
