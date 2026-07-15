# ADR-006 — Environment Discovery Framework

**Status:** Proposed
**Date:** 2026-07-15
**Author:** Synth Architecture
**Deciders:** Synth Architecture

---

## Context

SYNTH v2 has frozen its kernel, established its public boundary, and certified its architecture (ADR-001 through ADR-005). The Core now enters the Adoption Era, where the primary risk shifts from architectural correctness to architectural drift caused by implicit environmental coupling.

Today, several Core components embed assumptions about the execution environment directly into initialization and execution paths. Examples include:

- `createInfra()` selecting `NodeFilesystemAdapter` versus `InMemoryFilesystemAdapter` based on a configuration flag.
- `GitAdapterImpl` being instantiated when `gitEnabled` is true.
- Bootstrap choosing persistence modes without first observing the environment.

These assumptions are acceptable for a single supported environment, but they conflict with the constitutional objective that the SYNTH Core remain deterministic, portable, and environment independent. As the platform matures, it must support multiple revision systems, package managers, runtimes, forges, and operating systems without the Core learning their specifics.

The project therefore needs a canonical mechanism that observes the environment before execution, describes it in terms of capabilities, selects providers that satisfy those capabilities, and records the result as replayable evidence.

## Decision

### 1. Introduce the Environment Layer

A new architectural layer, the **Environment Layer**, is positioned between execution planning and external implementations.

```text
Constitution
        ↓
Execution Planning
        ↓
Capability Resolution
        ↓
Environment Layer
        ↓
Capability Providers
        ↓
External Systems
```

The Environment Layer becomes the exclusive boundary through which the SYNTH Core learns about the world outside itself. The Core may not directly depend on operating systems, filesystems, revision systems, package managers, forges, shells, language runtimes, container platforms, or external tools. All such interaction must flow through capability providers discovered by the Environment Layer.

### 2. Define Capability Families

The Environment Layer shall support, at minimum, the following capability families:

| Family | Describes |
|---|---|
| `Environment` | The execution environment itself: OS, platform, constraints. |
| `Workspace` | The current project workspace and its structure. |
| `Filesystem` | File reading, writing, and path operations. |
| `Revision` | Revision control systems such as Git, Mercurial, or Pijul. |
| `Process` | Subprocess and tool invocation. |
| `Tool` | External tools available to the environment. |
| `Runtime` | Language runtimes such as Node.js, Python, or Deno. |
| `Package` | Package managers such as npm, pnpm, yarn, pip, or cargo. |
| `Network` | Network reachability and transport. |
| `Forge` | Hosting platforms such as GitHub, GitLab, or Gitea. |
| `Secrets` | Secret storage and retrieval. |
| `Identity` | Authentication and authorization context. |

Additional capability families may be introduced provided they preserve constitutional principles.

### 3. Autonomous Discovery Orchestrator

Execution shall begin with autonomous discovery.

```text
Initialize
        ↓
Discover Environment
        ↓
Build Capability Graph
        ↓
Resolve Providers
        ↓
Generate Discovery Evidence
        ↓
Execute Mission
        ↓
Produce Replay
```

The **discovery orchestrator** is responsible for:

1. Running a fixed set of discovery rules.
2. Observing the environment without mutating it.
3. Building a canonical capability graph.
4. Selecting the best provider for each capability.
5. Producing a discovery evidence artifact.

Discovery runs before execution planning. Its output is read-only evidence consumed by planning and execution.

### 4. Discovery Rules

Discovery rules are small, deterministic, observable tests that answer questions such as:

- Does the workspace contain a `.git` directory?
- Is a `package.json` present?
- Which version of Node.js is available?
- Is `npm` on the process PATH?
- Is a GitHub remote configured?
- Are required environment variables present?

Each rule declares:

- `id` — unique rule identifier.
- `capability` — the capability family it informs.
- `observation` — what it observes.
- `test` — how it observes without mutation.
- `confidence` — how reliable the observation is.

Rules are autonomous by default. Explicit configuration exists only as an override.

### 5. Discovery Evidence Artifact

The discovery orchestrator produces a canonical **Discovery Evidence Artifact**.

The artifact contains:

- `version` — schema version.
- `timestamp` — when discovery occurred.
- `environment` — high-level environment classification.
- `capabilities` — detected capabilities with selected providers.
- `providers` — provider metadata and configuration.
- `assumptions` — environmental assumptions discovered or configured.
- `compatibility` — compatibility decisions made by the resolver.
- `provenance` — rule identifiers that produced each observation.

The artifact is machine-readable, versioned, and replayable. It becomes part of the constitutional evidence for every Mission execution.

### 6. Provider Selection

Providers are concrete implementations of capability families. The resolver selects providers by:

1. Discovering all available providers.
2. Evaluating each provider against discovery evidence.
3. Selecting the highest-confidence provider for each capability.
4. Recording the selection rationale.

A provider may be replaced by another provider satisfying the same capability family without modifying the Core.

### 7. Core Boundary Rule

No component in `src/core`, `src/runtime`, `src/control`, `src/domain`, `src/mission-studio`, `src/genesis`, or `src/planning` may directly import environment-specific modules such as `fs`, `child_process`, `os`, `path` from Node.js, or Git-specific libraries, except through the Environment Layer.

This rule is enforced by:

- Static import audits.
- Expedition acceptance tests.
- The constitutional compliance expedition (EXP-ENV-012).

## Consequences

- **Easier:** The Core becomes portable across environments.
- **Easier:** New environments are supported by adding providers, not by modifying the Core.
- **Easier:** AI agents can plan across environments because the environment is described in a canonical form.
- **Easier:** Execution becomes more deterministic because environmental assumptions are explicit and recorded.
- **Harder:** Existing direct environment dependencies must be migrated behind the Environment Layer.
- **Harder:** Provider selection requires careful confidence scoring and fallback logic.
- **Harder:** Tests must cover multiple provider configurations and in-memory environments.

## Proof Impact

- **P1 Structural:** Reinforced — the Core boundary is tightened and environmental dependencies are isolated behind the Environment Layer.
- **P2 Behavioral:** Strengthened — environmental assumptions become explicit evidence, reducing hidden behavioral variance.
- **P3 Historical:** Strengthened — discovery evidence becomes part of the replay artifact and is preserved for future reconstruction.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — identical environments produce identical discovery evidence, supporting reproducible execution.

## Kernel Impact

No frozen kernel components are modified by this decision. This ADR introduces a new architectural layer that sits outside the kernel and feeds it with environment descriptions. The kernel's mutation authority, event schema, replay semantics, and proof obligations remain untouched.

The following components are affected only as consumers of the Environment Layer:

- `src/core/bootstrap.ts` — will receive environment description from the orchestrator rather than constructing environment-specific adapters directly.
- `src/infra/index.ts` — will become a consumer of Environment Layer providers rather than the source of environment assumptions.

These changes are migrations within the Allowed column of ADR-004.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md` as a governance policy governing environmental independence.

## Related

- `docs/adr/ADR-004-synth-eras-and-protected-assets.md`
- `docs/adr/ADR-005-architecture-era-closure.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-001.md`
- `docs/architecture/constitutional-baseline.md`
