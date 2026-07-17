# EXP-VCS-003 — GitHub Forge Adapter

**Status:** Draft  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-VCS-001 (Versioning Capability Contract), EXP-VCS-002 (Git Versioning Adapter)  
**Blocks:** EXP-VCS-005

---

## Purpose

Implement remote repository operations on GitHub through the Forge capability, building on the Git Versioning Adapter.

## Scope

- Implement GitHub remote operations: fork, pull request, merge.
- Use the Forge capability for API interactions.
- Complement local Git operations with remote collaboration operations.
- Add deterministic certification tests where feasible (with mock forge).

## Acceptance

- A governed capability invocation can create and merge a pull request on GitHub.
- Remote operations are observable and replayable.
- Tests pass in CI.

## Definition of Done

- [ ] GitHub forge adapter implemented.
- [ ] Remote operations wired through the ExecutionGate.
- [ ] Certification tests pass.
- [ ] Expedition accepted.
