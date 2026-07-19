# ADR-038 — Repository Governance Model

**Status:** Accepted  
**Date:** 2026-07-19  
**Deciders:** EXP-REPO-001  
**Authority:** EXP-PROGRAM-028 — Repository & Release Governance  

---

## Context

SYNTH relies on Git and hosting platforms (forges) for repository evolution, but these interactions are currently manual and outside the governed event model. Branch creation, pull requests, merges, versioning, and releases are not recorded as SYNTH events, making them non-replayable and non-auditable.

## Decision

We will treat the repository as a governed state machine and forges as adapter-bound subsystems. Every repository-level transition is recorded as an event and replayable.

## Core Concepts

### Repository

A governed container of project history. It has a lifecycle state, branch taxonomy, and associated forge metadata.

### Forge

An abstract platform that provides repository services. GitHub, GitLab, Bitbucket, Azure DevOps, and Forgejo are forge implementations.

### Branch

A named line of development with a deterministic purpose within the branch taxonomy.

### Promotion

A governed transition from one lifecycle stage to another, requiring evidence and approval.

### Pull Request

A governance artifact containing Mission, Expedition, Evidence, Replay, and Risk. It is the primary mechanism for proposing promotions.

### Release

A governed publication event tied to a version, evidence, and deployment target.

## State Machine

```text
uninitialized
      ↓
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

## Events

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

## Forge Adapter Contract

Every forge adapter implements:

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

## Consequences

### Positive

- Repository evolution becomes replayable and auditable.
- Forge interactions are portable across hosting platforms.
- Promotion and release become governed events with required evidence.

### Negative

- Adds a new event family and state to the canonical model.
- Requires adapters for each supported forge.

## Compliance

A SYNTH repository is compliant when:

1. Branch creation follows the branch taxonomy.
2. Pull requests are created through the forge adapter contract.
3. Promotions and releases are recorded as events.
4. Replay reconstructs repository state correctly.
