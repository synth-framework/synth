# ADR-009 — Revision Capability

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Revision` as a constitutional capability family. ADR-008 defined the `Workspace` capability. This ADR defines the `Revision` capability interface so that SYNTH can interact with revision control systems without the Core depending on Git.

Today, `src/infra/git-adapter.ts` and repository adapters embed Git-specific logic. The Core should reason about revisions through a capability interface, with Git as one possible provider.

## Decision

### 1. Revision Capability Interface

The `Revision` capability is satisfied by a provider implementing:

```text
RevisionProvider {
  name: string
  version: string
  discover(ctx: ObservationContext): Promise<RevisionDescriptor>
  isRepository(ctx: ObservationContext, root: string): Promise<boolean>
  getCurrentBranch(ctx: ObservationContext, root: string): Promise<string | undefined>
  getCommitHash(ctx: ObservationContext, root: string): Promise<string | undefined>
  getRemotes(ctx: ObservationContext, root: string): Promise<Remote[]>
  getStatus(ctx: ObservationContext, root: string): Promise<RevisionStatus>
}
```

### 2. Data Types

```text
RevisionDescriptor {
  system: string
  root: string
  present: boolean
  branch?: string
  commit?: string
  remotes: Remote[]
  clean: boolean
}

Remote {
  name: string
  url: string
}

RevisionStatus {
  clean: boolean
  ahead: number
  behind: number
  modified: string[]
  untracked: string[]
}
```

### 3. Default Provider: Git Revision Provider

The default provider detects `.git`, reads `.git/config` for remotes, and invokes `git` for branch, commit hash, and status. It is the reference implementation; future providers may implement Mercurial, Pijul, or other revision systems against the same interface.

### 4. Core Boundary Rule

No Core component may invoke Git commands or read Git-specific metadata directly. All revision interaction flows through the `RevisionProvider` interface.

## Consequences

- **Easier:** SYNTH becomes revision-system agnostic.
- **Easier:** Testing can use in-memory revision providers.
- **Harder:** Existing Git-coupled components must migrate behind the interface.

## Proof Impact

- **P1 Structural:** Reinforced — Git dependency is isolated.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — revision metadata is explicit evidence.

## Kernel Impact

No frozen kernel components are modified. The Revision capability provider is an Environment Layer artifact.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/adr/ADR-008-workspace-capability.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-004.md`
