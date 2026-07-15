# Environment Layer Reference

The Environment Layer is the boundary between SYNTH Core and the execution environment. It observes the environment, classifies it, resolves capability providers, and produces replayable discovery evidence — so that Core logic never depends on a specific operating system, runtime, toolchain, or hosting platform.

This reference summarizes the layer as implemented in `src/environment/`. The governing decisions remain authoritative in [ADR-006](../adr/ADR-006-environment-discovery-framework.md) through [ADR-017](../adr/ADR-017-constitutional-compliance-core-boundary.md).

---

## Position in the Architecture

```text
SYNTH Core
    │  depends only on environment-agnostic contracts
    ▼
Environment Layer
    │  ObservationContext, capability contracts, discovery, evidence
    ▼
Execution Environment
    operating system · runtimes · tools · network · forge · identity
```

**Core boundary rule ([ADR-017](../adr/ADR-017-constitutional-compliance-core-boundary.md)):** SYNTH Core must never import platform-specific APIs (filesystem, process, network, environment variables) directly. All environmental interaction flows through Environment Layer contracts. `node-context.ts` is the only module in the layer that depends on Node.js APIs, and the Core never imports it — it receives an `ObservationContext` produced by the layer or by test fixtures.

---

## Module Map

| Module | Role |
|--------|------|
| `types.ts` | Environment-agnostic type definitions: capability families, observations, rules, providers, evidence. No platform-specific types. |
| `rules.ts` | Default discovery rules. Each rule observes one aspect of the environment without mutating it. |
| `orchestrator.ts` | Discovery orchestrator: runs rules, evaluates providers, resolves the best provider per family, produces `DiscoveryEvidence`. |
| `graph.ts` | The Capability Graph ([ADR-007](../adr/ADR-007-capability-graph-model.md)): canonical family catalog, dependency edges, deterministic provider resolution. |
| `evidence.ts` | Evidence canonicalization, content hashing, replay verification, persistence ([ADR-015](../adr/ADR-015-discovery-evidence-replay.md)). |
| `capability-report.ts` | Agent-facing Capability Report projection ([ADR-016](../adr/ADR-016-ai-environment-planning.md)). |
| `node-context.ts` | Node.js `ObservationContext` adapter — the only module touching Node.js APIs. |
| `providers/reference.ts` | Reference providers bridging the discovery model to concrete tools. |
| `workspace-capability.ts` | Workspace contract and filesystem implementation. |
| `filesystem-capability.ts` | Filesystem contract with POSIX and in-memory implementations. |
| `revision-capability.ts` | Revision control contract and Git implementation. |
| `process-capability.ts` | Process and Tool contracts with local shell implementation. |
| `runtime-capability.ts` | Runtime and Package contracts with Node.js and npm implementations. |
| `forge-capability.ts` | Forge contract and GitHub implementation. |
| `secrets-capability.ts` | Secrets and Identity contracts with environment-variable implementation. |

---

## The Discovery Pipeline

```text
Discovery Rules
    │  observe without mutating
    ▼
Discovery Observations (confidence-tagged)
    │
    ▼
Discovery Orchestrator
    │  classifies environment · evaluates providers · resolves per family
    ▼
DiscoveryEvidence (canonical, hashed, replayable)
    │
    ├──► Capability Report (agent-facing projection)
    └──► data/discovery-evidence.json (persisted artifact)
```

1. **Observe** — discovery rules produce `DiscoveryObservation` values tagged with confidence (`none` → `certain`) through the `ObservationContext`.
2. **Classify** — the orchestrator derives the environment classification: `ci`, `repository`, `project`, or `bare`.
3. **Resolve** — capability providers evaluate their own suitability against the observations; the orchestrator deterministically selects the best provider per family.
4. **Persist** — the result is a single `DiscoveryEvidence` artifact.

---

## Discovery Evidence Model ([ADR-015](../adr/ADR-015-discovery-evidence-replay.md))

`DiscoveryEvidence` is a canonical artifact:

- **Deterministic serialization** — JSON with recursively sorted keys; identical discoveries produce byte-identical artifacts.
- **Content hashed** — integrity is verifiable by hash.
- **Replayable** — replay re-derives the environment classification, capability summaries, assumptions, and compatibility sections from recorded inputs and compares them against the artifact; divergences are reported explicitly.
- **Persisted** at `data/discovery-evidence.json`.

Replay integration lives entirely inside the Environment Layer. The frozen Replay engine, Event Model, and the `synth-proof-v1` proof object are not modified.

---

## The Capability Report ([ADR-016](../adr/ADR-016-ai-environment-planning.md))

The Capability Report is the agent-facing projection of discovery evidence. Every constitutional capability family appears explicitly with a planning-relevant status:

| Status | Meaning for planning |
|--------|---------------------|
| `supported` | A provider is resolved; plan may rely on this family. |
| `degraded` | A provider exists with reduced confidence; plan with caution or a fallback. |
| `unsupported` | No provider resolved; the plan must not assume this family. |

Unsupported families are **stated, never omitted** — agents plan against evidence instead of environmental assumptions.

Generate it with:

```bash
node scripts/generate-capability-report.js          # markdown
node scripts/generate-capability-report.js --json   # machine format
```

---

## Provider Registration Status

The orchestrator receives providers from its caller; there is no implicit global registry. The canonical entry point (`scripts/generate-capability-report.js`) constructs discovery with the reference providers.

| Family | ADR | Contract | Default Provider(s) | Discovery Rule | Reference Provider |
|--------|-----|----------|--------------------|----------------|--------------------|
| Environment | [ADR-006](../adr/ADR-006-environment-discovery-framework.md) | — (classification only) | — | Yes | — |
| Workspace | [ADR-008](../adr/ADR-008-workspace-capability.md) | `WorkspaceProvider` | `FilesystemWorkspaceProvider` | Yes | — |
| Filesystem | [ADR-010](../adr/ADR-010-filesystem-capability.md) | `FilesystemProvider` | `PosixFilesystemProvider`, `InMemoryFilesystemProvider` | Yes | `node-filesystem` |
| Revision | [ADR-009](../adr/ADR-009-revision-capability.md) | `RevisionProvider` | `GitRevisionProvider` | Yes | `git-revision` |
| Process | [ADR-011](../adr/ADR-011-process-tool-capability.md) | `ProcessProvider` | `LocalShellProvider` | Yes | — |
| Tool | [ADR-011](../adr/ADR-011-process-tool-capability.md) | `ToolProvider` | `LocalShellProvider` | Yes | — |
| Runtime | [ADR-012](../adr/ADR-012-runtime-package-capability.md) | `RuntimeProvider` | `NodeRuntimeProvider` | Yes | `node-runtime` |
| Package | [ADR-012](../adr/ADR-012-runtime-package-capability.md) | `PackageProvider` | `NpmPackageProvider` | Yes | `npm-package` |
| Network | [ADR-007](../adr/ADR-007-capability-graph-model.md) | — (graph node only) | — | No | — |
| Forge | [ADR-013](../adr/ADR-013-forge-capability.md) | `ForgeProvider` | `GitHubForgeProvider` | Yes | `github-forge` |
| Secrets | [ADR-014](../adr/ADR-014-secrets-identity-capability.md) | `SecretsProvider` | `EnvVarProvider` | No (by design) | — |
| Identity | [ADR-014](../adr/ADR-014-secrets-identity-capability.md) | `IdentityProvider` | `EnvVarProvider` | No (by design) | — |

---

## Known Gaps and Deferred Work

These gaps are recorded status, not defects; each has a planned home in follow-up hardening work:

1. **Network family** — exists as a Capability Graph node and as a dependency target (Forge requires Network), but has no provider contract, implementation, or discovery rule yet.
2. **Secrets and Identity discovery** — contracts and the `EnvVarProvider` exist, but no discovery rules observe these families. This is deliberate: secrets must not be probed by discovery.
3. **Bootstrap adoption** — the Environment Layer is not yet wired into CLI bootstrap. The only Core-side consumer today is Mission Studio's snapshot store, which uses the `FilesystemProvider`. Broader adoption is deferred to the Constitutional Hardening Program.

---

## Related Documents

- [Capability Reference](capability-reference.md) — domain and environment capability families
- [07 - Capability Model](../architecture/07-capability-model.md) — capability model and Capability Graph
- [ADR-006](../adr/ADR-006-environment-discovery-framework.md) — Environment Discovery Framework
- [ADR-007](../adr/ADR-007-capability-graph-model.md) — Capability Graph Model
- [ADR-015](../adr/ADR-015-discovery-evidence-replay.md) — Discovery Evidence and Replay
- [ADR-016](../adr/ADR-016-ai-environment-planning.md) — AI Environment Planning
- [ADR-017](../adr/ADR-017-constitutional-compliance-core-boundary.md) — Constitutional Compliance and Core Boundary
- [EXP-PROGRAM-007](../expeditions/EXP-PROGRAM-007.md) — Environment Independence Program
