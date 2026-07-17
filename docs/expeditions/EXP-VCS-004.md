# EXP-VCS-004 — Repository State Observations

**Status:** Draft  
**Kind:** Implementation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-VCS-001 (Versioning Capability Contract), EXP-VCS-002 (Git Versioning Adapter)  
**Blocks:** EXP-VCS-005

---

## Purpose

Make repository state observable to Mission Studio by emitting read-only versioning observations from the Git adapter.

## Scope

- Emit observations for branch, commit, remote, open pull requests, and divergence.
- Integrate observations with the discovery orchestrator.
- Ensure observations are deterministic and replay-consistent.

## Acceptance

- Mission Studio can receive `versioning.*` observations.
- Observations reflect actual repository state.
- No mutation occurs during observation.

## Definition of Done

- [ ] All versioning observation types emitted by the Git adapter.
- [ ] Observations integrated with discovery evidence.
- [ ] Regression tests pass.
- [ ] Expedition accepted.
