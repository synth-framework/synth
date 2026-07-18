# EXP-EXEC-003 — Branch-per-Expedition Workflow

**Status:** Accepted  
**Merged:** PR #126
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-EXEC-001 (Execution Intent Model), EXP-EXEC-002 (Work Item Runtime), EXP-PROGRAM-015  
**Blocks:** EXP-EXEC-004, EXP-EXEC-005

---

## Purpose

Use the VersioningCapability to create an isolated branch for each approved Expedition and switch to it before execution.

## Scope

- Deterministic branch naming from Expedition identity.
- Base commit selection.
- Branch creation and checkout through VersioningCapability.
- Cleanup policy for failed expeditions.

## Acceptance

- Each approved Expedition receives a unique, deterministic branch.
- Execution runs on the Expedition branch.
- Base commit is recorded in replay.

## Definition of Done

- [x] Branch naming scheme implemented.
- [x] Branch creation integrated with runtime.
- [x] Regression tests pass.
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

## Completion Notes

Merged via PR #126. Deterministic `exp/<expedition-id>` branch creation is now part of the execution runtime, recording the base commit in replay through `EXPEDITION_BRANCH_CREATED`.
