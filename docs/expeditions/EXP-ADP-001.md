# EXP-ADP-001 — Repository Adapter (Git Reference Implementation)

**Status:** Completed  
**Priority:** High  
**Depends On:** EXP-GOV-001, Constitutional Baseline  
**Blocks:** Future adapter specifications (GitHub, Docker, Kubernetes, etc.)

---

## Objective

Introduce the first official Synth Adapter using Git as the reference implementation. The adapter becomes the canonical example of how external systems integrate with Synth while remaining isolated from the core architecture.

The core must never execute Git commands directly. All repository operations flow exclusively through the Repository Adapter.

---

## Architectural Principles

- Adapter is optional.
- Adapter is replaceable.
- Adapter is self-contained.
- Adapter owns all Git interaction.
- Core depends only on adapter capabilities.
- No Git logic exists outside the adapter.

```
Synth Core
      │
      ▼
Repository Adapter Interface
      │
      ▼
Git Adapter
      │
      ▼
Local Git Repository
```

---

## Adapter Lifecycle

Every Synth adapter implements a common lifecycle:

```
Discover
    ↓
Configure
    ↓
Validate
    ↓
Enable
    ↓
Healthy
    ↓
Operational
    ↓
Disable
```

This lifecycle is part of the adapter constitution. Future adapters implement the same lifecycle without core changes.

---

## Responsibilities

The Repository Adapter is responsible for:

- Repository configuration
- Branch lifecycle
- Commit lifecycle
- Promotion workflow
- Hook execution
- Remote management
- Repository health
- Governance integration

Nothing else in the system performs these operations.

---

## Branch Strategy

Default workflow:

```
feature/*
fix/*
docs/*
gov/*
misc/*
        │
        ▼
      main
```

Optional workflow:

```
feature/*
fix/*
docs/*
gov/*
misc/*
        │
        ▼
    develop
        │
        ▼
      main
```

Configuration:

```yaml
promotion:
  mode: direct | staged

# direct: feature -> main
# staged: feature -> develop -> main
```

---

## Feature Lifecycle

Every feature must:

- create its own branch
- contain at least one commit
- generate proof before promotion
- merge only after governance approval

No direct work on main.

---

## Repository Configuration

The adapter manages:

- repository path
- remote origin
- default branch
- promotion branch
- username
- email
- signing key (optional)
- hooks
- merge strategy

Example:

```yaml
repository:
  path: .
  remote: origin
  username:
  email:
  defaultBranch: main
  promotionBranch: develop
  promotionMode: direct
```

---

## Hooks

Supported hooks:

- pre-init
- post-init
- pre-branch
- post-branch
- pre-commit
- post-commit
- pre-promote
- post-promote
- pre-merge
- post-merge

Hooks execute through Synth—not Git—allowing governance enforcement.

Example:

```yaml
hooks:
  preCommit:
    - build
    - tests
    - proof
```

---

## Governance Integration

Promotion is allowed only when:

- build succeeds
- tests succeed
- audit succeeds
- replay verification succeeds
- determinism verification succeeds
- proof generated
- proof accepted

Otherwise promotion is rejected.

---

## Repository Health

Adapter reports:

- repository initialized
- branch status
- uncommitted changes
- remote configured
- hooks installed
- proof status
- synchronization status

---

## Adapter CLI

```bash
synth adapter enable repository
synth adapter disable repository
synth adapter configure repository
synth adapter status repository
synth adapter health repository
```

---

## Required Capabilities

The adapter exposes capabilities:

- InitializeRepository
- ConfigureRepository
- CreateBranch
- SwitchBranch
- CommitChanges
- PromoteBranch
- MergeBranch
- PushRepository
- PullRepository
- InstallHooks
- RepositoryHealth
- RepositoryStatus

The rest of Synth depends only on these capabilities.

---

## Public Interface

```ts
interface RepositoryAdapter {
  initialize(): Promise<AdapterState>
  configure(config: RepositoryConfig): Promise<AdapterState>
  status(): Promise<RepositoryStatus>
  health(): Promise<RepositoryHealth>
  createBranch(name: string): Promise<AdapterState>
  checkout(name: string): Promise<AdapterState>
  commit(message: string): Promise<AdapterState>
  promote(branch: string): Promise<PromotionResult>
  merge(source: string, target: string): Promise<MergeResult>
  push(remote?: string): Promise<AdapterState>
  pull(remote?: string): Promise<AdapterState>
  installHooks(): Promise<AdapterState>
  enable(): Promise<AdapterState>
  disable(): Promise<AdapterState>
}
```

---

## Adapter State

```
Disabled
    │
    ▼
Configured
    │
    ▼
Healthy
    │
    ▼
Operational
```

Failure transitions return to **Configured** until health is restored.

---

## Proof Requirements

Every promotion generates evidence containing:

- branch
- commit
- proof identifier
- replay hash
- audit status
- determinism status
- ATL level

Promotion without proof is rejected.

---

## Success Criteria

- Git support is isolated to the adapter.
- Branch management is fully configurable.
- Promotion supports direct and staged workflows.
- Hooks are configurable.
- Repository configuration is managed by the adapter.
- Governance validates every promotion.
- Repository health is observable.
- Enable/disable is a single command.
- The adapter serves as the canonical reference implementation for all future Synth adapters.

---

## Definition of Done

- [x] Adapter lifecycle framework defined.
- [x] Repository Adapter interface defined.
- [x] Git Adapter reference implementation created.
- [x] Repository capabilities registered in Synth.
- [x] Adapter CLI commands implemented.
- [x] Promotion workflow integrates governance (`npm run govern`).
- [x] Repository health/status reporting implemented.
- [x] Tests cover adapter lifecycle and git operations.
- [x] `npm run govern` still passes.
