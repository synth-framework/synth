# ADR-011 — Process & Tool Capability

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Process` and `Tool` as constitutional capability families. This ADR defines the `Process` and `Tool` capability interfaces so that the SYNTH Core never depends directly on shells or command-line tools.

Today, process execution is scattered across the codebase (`src/infra/git-adapter.ts`, `src/cli/`, `src/adapters/`, `src/workspace/`) via `child_process`, `execSync`, and `spawnSync`. The Core should request execution through a single capability interface.

## Decision

### 1. Process Capability Interface

The `Process` capability is satisfied by a provider implementing:

```text
ProcessProvider {
  name: string
  version: string
  run(request: ProcessRequest): Promise<ProcessResult>
}

ProcessRequest {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
  stdin?: string
  timeoutMs?: number
}

ProcessResult {
  command: string
  args: string[]
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}
```

### 2. Tool Capability Interface

The `Tool` capability is satisfied by a provider implementing:

```text
ToolProvider {
  name: string
  version: string
  isAvailable(tool: string): Promise<boolean>
  locate(tool: string): Promise<string | undefined>
  runTool(tool: string, args: string[], options?): Promise<ProcessResult>
}
```

Tool availability and location are discovery concerns; tool execution reuses the `ProcessResult` data type so evidence handling is uniform.

### 3. Errors as Data

Process execution failures (missing command, non-zero exit, timeout) are reported as `ProcessResult` values, never thrown as exceptions. A `ProcessResult` with `exitCode: -1` indicates the process could not be spawned or terminated without an exit code. This keeps the Core free of provider-specific error semantics.

### 4. Default Provider: Local Shell Provider

The default provider uses Node.js `child_process.spawn` to satisfy both interfaces on the local machine. Commands are executed with explicit argument arrays and no shell interpolation, keeping behavior deterministic across environments and avoiding shell-injection semantics. Tool location is resolved by scanning `PATH` (honoring `PATHEXT` on Windows).

### 5. Core Boundary Rule

No Core component may import `child_process` or invoke shells directly. All process and tool interaction flows through the `ProcessProvider` and `ToolProvider` interfaces.

## Consequences

- **Easier:** SYNTH becomes shell-agnostic.
- **Easier:** Tests can use scripted or in-memory process providers.
- **Easier:** Tool discovery becomes capability evidence (supports EXP-ENV-010).
- **Harder:** Existing `child_process`-coupled components must migrate behind the interface.

## Proof Impact

- **P1 Structural:** Reinforced — process/tool dependency is isolated.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Strengthened — no shell interpolation by default.
- **P5 Reproducibility:** Strengthened — process executions return structured, capturable results.

## Kernel Impact

No frozen kernel components are modified. The Process & Tool capability providers are Environment Layer artifacts.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-006.md`
