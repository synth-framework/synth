# EXP-EXEC-004 — Commit-as-Evidence

**Status:** Completed and accepted  
**Merged:** PR #127
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-EXEC-001 (Execution Intent Model), EXP-EXEC-002 (Work Item Runtime), EXP-EXEC-003 (Branch-per-Expedition)  
**Blocks:** EXP-EXEC-005

---

## Purpose

Map completed Work Items to VersioningCapability revisions, ensuring every commit is replayable from events.

## Scope

- Decide commit granularity (per-intent, per-objective, per-expedition).
- Author commits through VersioningCapability.
- Record commit hash in `EXPEDITION_EXECUTION_COMMITTED` event.
- Correlate commit messages with Expedition/Objectives.

## Acceptance

- Completed intents result in deterministic commits.
- Commit hash is preserved in replay state.
- Commit history reflects Expedition structure.

## Definition of Done

- [x] Commit strategy selected and documented.
- [x] Commit integration implemented.
- [x] Regression tests pass.
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

## Completion Notes

Merged via PR #127. The runtime creates one revision per expedition after all intents succeed, using a commit message that correlates the expedition and its objectives. The resulting commit hash is recorded in `EXPEDITION_EXECUTION_COMMITTED`.
