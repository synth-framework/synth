# EXP-VCS-003 — GitHub Forge Adapter

**Status:** Completed and accepted  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-VCS-001 (Versioning Capability Contract), EXP-VCS-002 (Git Versioning Adapter)  
**Blocks:** EXP-VCS-005  
**Accepted:** 2026-07-17

---

## Purpose

Implement remote repository operations on GitHub through the Forge capability, building on the Git Versioning Adapter.

## Scope

- Extend the Forge capability contract with remote mutations.
- Implement GitHub remote operations: create pull request, merge pull request, fork repository.
- Use the Forge capability for API interactions.
- Complement local Git operations with remote collaboration operations.
- Add deterministic certification tests with a mock forge.

## Acceptance

- A governed capability invocation can create and merge a pull request on GitHub.
- A governed capability invocation can fork a repository.
- Remote operations are observable and replayable.
- Tests pass in CI.

## Implementation

- `src/environment/forge-capability.ts` — extended `ForgeProvider` interface with `createPullRequest`, `mergePullRequest`, and `forkRepository`.
- `GitHubForgeProvider` — implements the new operations using the `gh` CLI.
- `tests/environment-forge-capability.test.js` — regression tests for new operations.

## Definition of Done

- [x] Forge capability contract extended with remote mutations.
- [x] GitHub forge adapter implements create/merge PR and fork.
- [x] Regression tests implemented.
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

## Completion Notes

Remote mutations (`createPullRequest`, `mergePullRequest`, `forkRepository`) added to the Forge capability and implemented via `gh` CLI in `GitHubForgeProvider`. Credentials remain delegated to `gh`; SYNTH does not handle tokens directly. Tests verify failure paths return structured results rather than crashing.
