# ADR-008 — Workspace Capability

**Status:** Proposed
**Date:** 2026-07-15
**Author:** Synth Architecture
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Workspace` as one of the constitutional capability families. The next step is to define the concrete interface through which the SYNTH Core interacts with workspaces.

Today, several Core components embed assumptions about workspace layout directly into their logic. Examples include:

- `createNodeObservationContext` resolving paths against `process.cwd()`.
- `createFileSystemSnapshotStore` using a hardcoded `./data/snapshots` path.
- Bootstrap and API layers assuming the current working directory is the project root.

These assumptions make SYNTH fragile in environments where the workspace root differs from the process working directory, where multiple workspaces coexist, or where workspace metadata lives in non-standard locations.

## Decision

### 1. Workspace Capability Interface

The `Workspace` capability is satisfied by a provider implementing the following interface:

```text
WorkspaceProvider {
  name: string
  version: string
  discover(ctx: ObservationContext): Promise<WorkspaceDescriptor>
  locateRoot(startPath: string): Promise<string | undefined>
  listProjects(root: string): Promise<ProjectLocator[]>
  readManifest(root: string): Promise<WorkspaceManifest | undefined>
  prepare(root: string): Promise<WorkspacePrepared>
}
```

### 2. Workspace Descriptor

A `WorkspaceDescriptor` describes a discovered workspace without mutating it:

```text
WorkspaceDescriptor {
  root: string
  exists: boolean
  hasSynthManifest: boolean
  hasPackageManifest: boolean
  projects: ProjectLocator[]
  metadata: object
}
```

### 3. Default Provider: Filesystem Workspace Provider

The default provider uses the Filesystem capability to locate workspace roots by searching upward from a start path for markers such as `.synth/manifest.json` or `package.json`. It does not depend on `process.cwd()` directly; it receives the start path as an argument.

### 4. Core Boundary Rule

No Core component may assume that the process working directory is the workspace root. All workspace location, inspection, and preparation must flow through the Workspace capability provider.

### 5. Integration with Discovery

Workspace discovery rules already exist in the discovery framework. They are now backed by the Workspace capability provider rather than direct filesystem inspection.

## Consequences

- **Easier:** SYNTH can operate on workspaces outside the current working directory.
- **Easier:** Tests can use in-memory workspace providers.
- **Easier:** Multi-workspace scenarios become possible without Core changes.
- **Harder:** Existing Core components that assume `process.cwd()` must be migrated.

## Proof Impact

- **P1 Structural:** Reinforced — workspace assumptions are isolated behind a provider interface.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — workspace location is explicit and recorded.

## Kernel Impact

No frozen kernel components are modified. The Workspace capability provider is an Environment Layer artifact.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-003.md`
