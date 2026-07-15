# ADR-012 — Runtime & Package Capability

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Runtime` and `Package` as constitutional capability families. ADR-011 established the `Process` and `Tool` capabilities. This ADR defines the `Runtime` and `Package` capability interfaces so that the SYNTH Core never depends directly on Node.js, npm, or any specific language runtime or package manager.

Today, runtime detection and package operations are implicit assumptions scattered across the CLI, installer, and adapters. The Core should inspect runtimes and request package operations through capability interfaces.

## Decision

### 1. Runtime Capability Interface

The `Runtime` capability is satisfied by a provider implementing:

```text
RuntimeProvider {
  name: string
  version: string
  detectRuntime(runtime: string): Promise<RuntimeInfo | undefined>
  listRuntimes(runtimes?: string[]): Promise<RuntimeInfo[]>
}

RuntimeInfo {
  name: string
  version?: string
  path?: string
}
```

### 2. Package Capability Interface

The `Package` capability is satisfied by a provider implementing:

```text
PackageProvider {
  name: string
  version: string
  install(request: PackageRequest): Promise<ProcessResult>
  remove(request: PackageRequest): Promise<ProcessResult>
  listInstalled(cwd?: string): Promise<PackageInfo[]>
}

PackageRequest {
  packages: string[]
  cwd?: string
  timeoutMs?: number
}

PackageInfo {
  name: string
  version: string
}
```

Package operations reuse the `ProcessResult` data type from ADR-011 so that execution evidence is uniform across capabilities.

### 3. Capability Composition

Runtime and Package providers are implemented **on top of** the `ToolProvider` interface (ADR-011), not on top of `child_process` directly. This demonstrates the constitutional layering: higher-level capabilities compose lower-level capabilities, and only the lowest-level provider touches the operating system.

### 4. Default Providers: Node.js Runtime Provider & npm Package Provider

- `NodeRuntimeProvider` detects runtimes by locating the executable via `ToolProvider.locate()` and querying `--version` via `ToolProvider.runTool()`.
- `NpmPackageProvider` satisfies package operations by invoking `npm install` / `npm uninstall` / `npm ls --json` through `ToolProvider`.

### 5. Core Boundary Rule

No Core component may invoke `node`, `npm`, or other runtime/package-manager executables directly. All runtime inspection and package interaction flows through the `RuntimeProvider` and `PackageProvider` interfaces.

## Consequences

- **Easier:** SYNTH becomes runtime- and package-manager-agnostic.
- **Easier:** Alternative runtimes (Deno, Bun) and package managers (pnpm, yarn, pip) can be added as providers without Core changes.
- **Easier:** Runtime detection becomes capability evidence (supports EXP-ENV-010).
- **Harder:** Existing runtime-coupled components must migrate behind the interface.

## Proof Impact

- **P1 Structural:** Reinforced — runtime/package dependency is isolated.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged — execution still flows through the ADR-011 provider.
- **P5 Reproducibility:** Strengthened — runtime assumptions become explicit, discoverable data.

## Kernel Impact

No frozen kernel components are modified. The Runtime & Package capability providers are Environment Layer artifacts.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/adr/ADR-011-process-tool-capability.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-007.md`
