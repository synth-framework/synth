# EXP-VCS-005 — Versioning Certification

**Status:** Active  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-VCS-002, EXP-VCS-003, EXP-VCS-004  
**Blocks:** None

---

## Purpose

Prove that the Repository Versioning Capability produces deterministic, repeatable repository state across environments.

## Scope

- Deterministic certification tests for each versioning operation using real Git repositories.
- Cross-environment parity checks (same logical history across isolated runs).
- Final acceptance of EXP-PROGRAM-015.

## Acceptance

- The same sequence of versioning invocations produces the same repository state on every supported environment.
- All governance, replay, determinism, and graph integrity proofs pass.

## Implementation

- `tests/environment-versioning-certification.test.js` — certification suite exercising real Git operations through `GitVersioningProvider`.
- Tests cover: initialization, revision creation, branch switching, comparison, snapshot, merge integration, determinism, and non-repository rejection.
- `package.json` — `test:environment-versioning-certification` script wired into `test:all`.

## Definition of Done

- [x] Certification test suite implemented.
- [ ] Tests pass in CI.
- [x] Program acceptance evidence recorded.
- [ ] Expedition accepted.
