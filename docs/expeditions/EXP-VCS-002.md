# EXP-VCS-002 — Git Versioning Adapter

**Status:** Draft  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-VCS-001 (Versioning Capability Contract)  
**Blocks:** EXP-VCS-004, EXP-VCS-005

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

## Definition of Done

- [ ] `GitVersioningProvider` implemented.
- [ ] Provider registered in the reference provider set.
- [ ] Certification tests pass.
- [ ] Expedition accepted.
