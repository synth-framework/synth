> Part of **EXP-REPO-001 — Repository Governance Model**.

# Repository State Machine

This document defines the governed lifecycle of a SYNTH repository.

---

## States

| State | Description |
| --- | --- |
| `uninitialized` | The directory is not yet a SYNTH repository. |
| `initialized` | `synth init` has completed; `.synth/` exists. |
| `branch-created` | A governed branch has been created for work. |
| `promotion-proposed` | A pull request or promotion request exists. |
| `promotion-approved` | The promotion has been approved by governance. |
| `merged` | The promotion has been merged into the target branch. |
| `released` | A release has been created from the merged state. |

## Transitions

```text
uninitialized
      │ synth init
      ▼
initialized
      │ create branch
      ▼
branch-created
      │ open pull request
      ▼
promotion-proposed
      │ approve promotion
      ▼
promotion-approved
      │ merge
      ▼
merged
      │ create release
      ▼
released
```

## Events

Each transition emits an event:

| Event | Transition |
| --- | --- |
| `REPOSITORY_INITIALIZED` | `uninitialized` → `initialized` |
| `BRANCH_CREATED` | `initialized` → `branch-created` |
| `PULL_REQUEST_OPENED` | `branch-created` → `promotion-proposed` |
| `PROMOTION_APPROVED` | `promotion-proposed` → `promotion-approved` |
| `PULL_REQUEST_MERGED` | `promotion-approved` → `merged` |
| `RELEASE_CREATED` | `merged` → `released` |

## Compliance

A repository transition is valid only when:

1. The source state matches the expected precondition.
2. The actor has authority to perform the transition.
3. Required evidence is attached.
4. The transition is recorded as an event.
