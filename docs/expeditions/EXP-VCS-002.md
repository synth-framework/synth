# EXP-VCS-002 — Git Versioning Adapter

**Status:** Completed and accepted  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-VCS-001 (Versioning Capability Contract)  
**Blocks:** EXP-VCS-004, EXP-VCS-005  
**Accepted:** 2026-07-17

---

## Purpose

Implement the `VersioningCapability` contract using Git as the reference provider.

## Scope

- Implement `GitVersioningProvider` satisfying `VersioningCapability`.
- Route every mutating operation through the Environment Process capability.
- Emit the versioning observations defined in EXP-VCS-001.
- Add deterministic certification tests.

## Acceptance

- All `VersioningCapability` operations are implemented for Git.
- Operations are deterministic and replayable.
- Tests pass in CI.

## Implementation

- `src/environment/git-versioning-provider.ts` — `GitVersioningProvider` implementing all `VersioningCapability` operations.
- `src/environment/providers/reference.ts` — `gitVersioningProvider` registered in the reference provider set.
- `src/environment/index.ts` — exports the new provider.
- `tests/environment-versioning-capability.test.js` — regression tests for all operations.
- `package.json` — `test:environment-versioning` script wired into `test:all`.

## Definition of Done

- [x] `GitVersioningProvider` implemented.
- [x] Provider registered in the reference provider set.
- [x] Regression tests implemented and wired into `test:all`.
- [x] Certification tests pass (EXP-VCS-005 accepted).
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

## Completion Notes

Reference Git adapter implemented in `src/environment/git-versioning-provider.ts` and registered as `git-versioning`. All `VersioningCapability` operations execute through the Environment Process capability with `git -C <root>` invocation. Deterministic certification tests in EXP-VCS-005 pass in CI.
