# EXP-EXEC-005 — Pull Request Projection

**Status:** Completed and accepted  
**Merged:** PR #128
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-EXEC-001 (Execution Intent Model), EXP-EXEC-002 (Work Item Runtime), EXP-EXEC-003 (Branch-per-Expedition), EXP-EXEC-004 (Commit-as-Evidence)  
**Blocks:** None

---

## Purpose

Surface completed Expedition output as a pull request or equivalent review boundary, keeping human approval outside the automated execution path.

## Scope

- Use ForgeCapability to create pull requests.
- Generate PR title/body from Expedition and Objective metadata.
- Record PR locator in `EXPEDITION_EXECUTION_PROJECTED` event.
- Support alternative projections: patch file, diff.

## Acceptance

- A completed Expedition can produce a pull request.
- PR metadata is deterministic and replayable.
- Human review remains the final approval boundary.

## Definition of Done

- [x] Pull request creation implemented.
- [x] Projection metadata recorded in replay.
- [x] Regression tests pass.
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

## Completion Notes

Merged via PR #128. After a successful expedition commit, the runtime invokes the `ForgeCapability` to create a pull request with deterministic title and body derived from the expedition and its objectives. The PR locator is recorded in `EXPEDITION_EXECUTION_PROJECTED`, keeping human review as the final approval boundary.
