# EXP-REPO-001 — Repository Governance Model

> **Architecture expedition.** Define how SYNTH treats a version control repository as a governed state machine and forges as adapter-bound subsystems.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-RUNTIME-001 (Runtime Correctness and Recovery)  
**Blocks:** To be defined as downstream expeditions are chartered

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Establish the canonical model for repository governance in SYNTH. This includes the repository state machine, forge abstraction, branch semantics, and the events that record repository-level transitions.

---

## Origin Evidence

Today SYNTH relies on Git and GitHub as external tools. Operators run `git branch`, `gh pr create`, and `npm version` manually. These actions are not recorded as SYNTH events, are not replayable, and are not portable across hosting platforms. The PR #201 backtick incident also showed that SYNTH-generated forge commands lack a safety contract.

---

## Required Change

### 1.1 Repository as state machine

A repository has governed states:

```text
initialized
      ↓
branch-created
      ↓
promotion-proposed
      ↓
promotion-approved
      ↓
merged
      ↓
released
```

Every transition is recorded as an event.

### 1.2 Forge abstraction

Define a `Forge` interface:

```text
openPullRequest(request)
updatePullRequest(id, request)
closePullRequest(id)
mergePullRequest(id, strategy)
createRelease(request)
listChecks(id)
addComment(id, body)
listReviews(id)
```

Implementations: GitHub, GitLab, Bitbucket, Azure DevOps, Forgejo.

### 1.3 Repository events

New event types:

```text
REPOSITORY_INITIALIZED
BRANCH_CREATED
PULL_REQUEST_OPENED
PULL_REQUEST_UPDATED
PULL_REQUEST_MERGED
PROMOTION_PROPOSED
PROMOTION_APPROVED
RELEASE_CREATED
```

### 1.4 Repository metadata

Extend `.synth/ai/` and manifest with:

```text
repositoryStrategy
defaultBranch
branchTaxonomy
forgeProvider
versioningAdapter
promotionPipeline
```

---

## Deliverables

1. **ADR** defining the Repository Governance Model.
2. **Repository state machine** documented in `docs/reference/repository-state-machine.md`.
3. **Forge adapter interface** in `docs/reference/forge-adapter-contract.md`.
4. **Event taxonomy** for repository-level transitions.
5. **Reference implementation skeleton** for the GitHub forge adapter.

---

## Acceptance Criteria

- A repository has a deterministic lifecycle state.
- Forge interactions are abstracted behind a common interface.
- Every repository-level transition can be replayed from events.
- The model supports at least GitHub and GitLab semantics.

---

## Out of Scope

- Specific branch naming rules (EXP-REPO-002).
- Promotion pipeline semantics (EXP-REPO-003).
- Version inference (EXP-REPO-004).
- Pull request UI or automation (EXP-REPO-006).

---

## Success Criteria

The expedition succeeds when SYNTH can describe a repository's governed state and interact with a forge through an adapter without Git-specific leakage into the core model.
