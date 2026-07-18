# EXP-VCS-004 — Repository State Observations

**Status:** Active  
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

## Implementation

- `src/environment/rules.ts` — new `versioningRule` added to default discovery rules.
- Emits `versioning.repository`, `versioning.branch`, `versioning.commit`, `versioning.remote`, `versioning.divergence`, and `versioning.pullRequest` observations.
- Pull request observations discovered via `gh pr list` when available.
- `tests/environment-discovery.test.js` — regression tests for repository, branch, PR, and non-repository cases.

## Definition of Done

- [x] All versioning observation types emitted by the discovery rule.
- [x] Observations integrated with discovery evidence.
- [x] Regression tests implemented.
- [ ] PR opened and CI checks pass.
- [ ] Expedition accepted.
