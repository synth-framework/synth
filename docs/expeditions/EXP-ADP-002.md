# EXP-ADP-002 — GitHub Adapter

**Status:** Completed  
**Kind:** Integration Adapter  
**External System:** Yes  
**Priority:** Medium  
**Depends On:** EXP-ADP-000, EXP-GOV-001  
**Blocks:** Future collaboration-platform adapters

---

## Purpose

Provide governance-aware integration with GitHub while keeping the Kernel completely independent from GitHub concepts.

The Kernel never knows what a Pull Request is. The adapter translates GitHub concepts into Synth capabilities.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Integration Adapter |
| External system | GitHub platform |
| Kernel dependency | None |
| Primary value | Collaboration + governance enforcement |

---

## Responsibilities

- Repository synchronization
- Pull Request lifecycle
- Issue lifecycle
- Labels
- Reviews
- Milestones
- Releases
- GitHub Actions interaction
- Discussions (optional)

---

## Canonical Capabilities

```
CreateIssue
UpdateIssue
CloseIssue

CreatePullRequest
ReviewPullRequest
MergePullRequest

CreateRelease

SyncRepository

RepositoryStatus
```

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

---

## Governance

Merge is allowed only when:

- Proof exists
- ATL accepted
- Required reviews passed
- Branch policy satisfied

GitHub never decides. Synth decides. GitHub executes.

---

## Evidence

Every promotion produces:

- PR URL
- Review status
- CI status
- Merge SHA
- Replay hash
- Proof identifier

---

## Completion Notes

Completed on 2026-06-30.

- Implemented `src/adapters/github/client.ts` — thin, mockable fetch-based GitHub API client.
- Implemented `src/adapters/github/adapter.ts` — `GitHubAdapterImpl` with canonical lifecycle and capabilities:
  - `createIssue`, `updateIssue`, `closeIssue`
  - `createPullRequest`, `reviewPullRequest`, `mergePullRequest`
  - `createRelease`
  - `syncRepository`, `status`, `checkHealth`
- Registered the adapter in `src/adapters/registry.ts`.
- Added CLI commands: `github-create-issue`, `github-create-pr`, `github-merge-pr`.
- Added `tests/github-adapter.test.js` with mocked GitHub API responses (9 tests, all passing).
- No GitHub concepts leak into the Kernel; the adapter is the only GitHub-aware module.

---

## Success Criteria

- [x] The Kernel can operate without GitHub.
- [x] Removing the adapter changes no Kernel behavior.
- [x] All GitHub API logic is isolated to the adapter.
- [x] No GitHub-specific concepts leak into core code.
- [x] Governance gates are enforced before any GitHub merge operation.
