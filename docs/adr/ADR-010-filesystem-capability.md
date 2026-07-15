# ADR-010 — Filesystem Capability

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Filesystem` as a constitutional capability family. This ADR defines the `Filesystem` capability interface so that the SYNTH Core never depends directly on OS filesystem semantics.

Today, filesystem operations are scattered across `src/infra/filesystem.ts` and other modules. The Core should interact with files through a single capability interface.

## Decision

### 1. Filesystem Capability Interface

The `Filesystem` capability is satisfied by a provider implementing:

```text
FilesystemProvider {
  name: string
  version: string
  readFile(path: string): Promise<string | undefined>
  writeFile(path: string, content: string): Promise<void>
  listDirectory(path: string): Promise<string[]>
  pathExists(path: string): Promise<boolean>
  isDirectory(path: string): Promise<boolean>
  ensureDirectory(path: string): Promise<void>
  deleteFile(path: string): Promise<void>
}
```

### 2. Path Abstraction

Paths are represented as normalized strings. The provider is responsible for translating these into OS-specific paths. Consumers pass paths relative to a workspace root or as absolute paths; the provider resolves them.

### 3. Default Provider: POSIX Filesystem Provider

The default provider uses Node.js `fs/promises` to satisfy the interface on POSIX-like and Windows filesystems. It is the reference implementation.

### 4. Core Boundary Rule

No Core component may import `fs`, `path`, or other filesystem modules directly. All filesystem interaction flows through the `FilesystemProvider` interface.

## Consequences

- **Easier:** SYNTH becomes filesystem-agnostic.
- **Easier:** Tests can use in-memory filesystem providers.
- **Harder:** Existing filesystem-coupled components must migrate behind the interface.

## Proof Impact

- **P1 Structural:** Reinforced — filesystem dependency is isolated.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — filesystem operations are explicit and replaceable.

## Kernel Impact

No frozen kernel components are modified. The Filesystem capability provider is an Environment Layer artifact.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-005.md`
