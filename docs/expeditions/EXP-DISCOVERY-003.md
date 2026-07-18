# EXP-DISCOVERY-003 — First Observation Capabilities

> **Discovery expedition.** Establish the canonical acquisition extension point for the Discovery compiler by implementing the first Observation Capabilities: Filesystem and Git.

**Status:** Completed  
**Started:** 2026-07-18  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-001, EXP-DISCOVERY-002

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Implement the first Observation Capabilities for the Discovery compiler. An Observation Capability produces immutable observations from an external source, contributes optional correlation rules, and declares its own provenance so that every Discovery session remains replayable.

This expedition creates the symmetric extension architecture:

```text
Observation Capabilities
            │
            ▼
      Observations
            │
            ▼
Correlation Capabilities
            │
            ▼
      EvidenceGraph (canonical IR)
            │
            ▼
   Projection Registry
            │
            ▼
 Knowledge Projections
            │
            ▼
    ReplayVerifier
```

---

## Problem Statement

EXP-DISCOVERY-001 defined the adapter contract and EXP-DISCOVERY-002 rebuilt the engine as a compiler with three extension mechanisms:

- Correlation Capabilities
- Projection Registry
- Replay Verifier

Acquisition, however, was still implemented as standalone adapters without the same capability semantics. This creates an asymmetry: every other stage has a clear, versioned, registerable extension model except observation production.

Without a unified Observation Capability model, SYNTH cannot cleanly add future acquisition sources (Docker, Kubernetes, GitHub, cloud APIs, databases) without duplicating adapter boilerplate and weakening provenance.

---

## Motivation

Most SYNTH projects will enter through a local directory or a Git repository. The filesystem capability captures structure; the Git capability captures identity, history, and lineage. Together they provide enough evidence for downstream projections to distinguish:

- A greenfield directory from a cloned repository.
- A committed specification from uncommitted drafts.
- A maintained project from an abandoned archive.

More importantly, this expedition defines the pattern every future acquisition source will follow.

---

## Goals

This expedition shall:

- Define the `ObservationCapability` contract.
- Refactor the existing filesystem adapter into a `FilesystemObservationCapability`.
- Implement a `GitObservationCapability` that reads `.git/` metadata without modifying the repository.
- Ensure both capabilities produce observations only, never semantic interpretation.
- Add observation contracts that declare which facts each capability produces.
- Include provenance metadata in every observation for replay verification.
- Register observation capabilities with the default Discovery engine.
- Add contract and integration tests for both capabilities.
- Preserve the invariant that Discovery never modifies the observed system.

---

## Non-Goals

This expedition shall not:

- Add new Discovery engine stages.
- Change the EvidenceGraph, ProjectModel, or projection contracts.
- Perform semantic inference in observation producers.
- Implement persistence, approval, or governance.
- Modify Protected Assets.
- Produce events.
- Create `.synth/` artifacts.
- Build CLI projections or the `synth discover` command.
- Fetch remotes over the network.

---

## Observation Capability Contract

An ObservationCapability is a versioned, registerable unit of acquisition:

```ts
interface ObservationCapability {
  id: string
  version: string
  /** Adapter that produces observations from supported sources. */
  adapter: DiscoveryAdapter
  /** Optional correlation rules derived from this capability's observations. */
  correlation?: CorrelationCapability
  /** Declares the facts this capability may produce. */
  observationContract: ObservationContract
}

interface ObservationContract {
  produces: string[]
  neverProduces: string[]
}
```

The contract makes the observation boundary explicit:

- `produces`: allowed observation facts (e.g., `manifest detected`, `branch exists`).
- `neverProduces`: forbidden interpretive facts (e.g., `Rust project`, `healthy repository`).

---

## Filesystem Observation Capability

### Observation Contract

**Produces:**

- `directory exists`
- `file exists`
- `manifest detected`
- `file extension observed`
- `top-level entries observed`

**Never produces:**

- `Node.js project`
- `React application`
- `specification repository`
- Any framework, language, or lifecycle interpretation.

### Responsibilities

- Observe directory structure without interpreting it.
- Detect manifest files (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, etc.) and report them as raw observations.
- Detect implementation, test, documentation, architecture, and knowledge directories.
- Report file extensions at the top level.
- Remain deterministic and read-only.

### Example observations

```text
fact: "manifest detected"
payload: { type: "cargo", path: "Cargo.toml" }

fact: "file extension observed"
payload: { extensions: ["rs", "toml"] }
```

---

## Git Observation Capability

### Observation Contract

**Produces:**

- `git repository detected`
- `remote exists`
- `branch exists`
- `tag exists`
- `HEAD observed`
- `commit observed`
- `working tree state observed`
- `repository topology observed`

**Never produces:**

- `healthy git repository`
- `repository is active`
- `repository is abandoned`
- `default branch`
- Any lifecycle or health interpretation.

### Responsibilities

- Detect whether a path is inside a Git working tree.
- Read repository identity from `.git/config` or remote URLs.
- List local and remote branches.
- List tags.
- Read recent commit history.
- Report working tree cleanliness.
- Report current HEAD and active branch.
- Include replay provenance in observations (`gitDir`, `HEAD`, repository format version, capability version).

### Provenance

Every Git observation includes:

```text
.git path
HEAD ref
capability version
adapter version
repository format version (optional)
```

This allows the ReplayVerifier to confirm that the observation was produced against a specific repository state.

### Responsibilities it does NOT have

The Git capability shall:

- Never invoke `git fetch`, `git pull`, or any network operation.
- Never modify `.git/`, working tree, or index.
- Never interpret repository health, activity, or abandonment.

---

## Repository Topology (Reserved)

The following observations are reserved for future expeditions and should not be implemented now, but the capability contract should not prevent them:

- `submodule present`
- `worktree present`
- `bare repository`
- `shallow clone`
- `sparse checkout`

---

## Separation of Traversal and Observation

Traversal logic (walking `.git/`, listing directories) and observation generation are separate concerns:

- Traversal strategies are implementation details of the capability.
- Observations are the canonical, versioned output.
- The engine consumes only observations.

This separation allows future capabilities to reuse traversal patterns without duplicating observation semantics.

---

## Integration with Default Engine

The default Discovery engine shall register observation capabilities instead of raw adapters:

```ts
function defaultObservationCapabilities(): ObservationCapability[] {
  return [
    createFilesystemObservationCapability(),
    createGitObservationCapability(),
  ]
}
```

Each capability contributes its adapter to the Acquire stage and optionally contributes its correlation rules to the Correlate stage.

---

## Future Capability Roadmap

This expedition establishes the pattern for future observation capabilities:

```text
Filesystem   ✅ this expedition
Git          ✅ this expedition
Docker       future
Kubernetes   future
GitHub       future
Azure        future
AWS          future
Terraform    future
Database     future
Package Manager future
```

No implementation is required for future capabilities; this expedition only defines the extension point they will use.

---

## Acceptance Criteria

A successful expedition:

- [x] `ObservationCapability` contract is defined.
- [x] Filesystem capability exists with a published observation contract.
- [x] Filesystem capability detects manifest files as raw observations.
- [x] Filesystem capability never performs semantic inference.
- [x] Git capability exists with a published observation contract.
- [x] Git capability detects repository identity, remotes, branches, tags, commits, and working tree state.
- [x] Git capability includes replay provenance in observations.
- [x] Git capability never performs semantic inference.
- [x] Both capabilities use provider abstractions and include in-memory providers for tests.
- [x] Default engine registers observation capabilities.
- [x] Observation contracts are validated by tests.
- [x] `npm run build` passes.
- [x] New tests pass.
- [x] `npm run govern` passes.

---

## Architectural Principles

This expedition reinforces:

> **Observation Capabilities produce immutable facts only.**

> **Adapters participate only in Acquire.**

> **Capabilities are source-specific; the engine is source-agnostic.**

> **Discovery shall never modify the system it is observing.**

> **Environment-dependent observations are replayable only as contextual.**

> **Every capability declares what it produces and what it never produces.**

---

## Expected Outcome

After completion:

- SYNTH has a symmetric, four-extension-point Discovery compiler.
- Filesystem and Git acquisition follow the same capability model as correlation and projections.
- Every observation carries enough provenance for replay.
- Future acquisition sources have a clear implementation pattern.
- The Brownfield Genesis integration in EXP-DISCOVERY-005 has richer source capabilities to consume.

---

## Governance

### Protected

- ObservationCapability contract
- ObservationContract boundary
- Determinism semantics
- Read-only guarantee
- Provider abstractions

### Not included

- CLI command
- Persistence layer
- Approval lifecycle
- Bootstrap integration
- Network operations
- Semantic inference

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-001 — Source Adapter Framework](EXP-DISCOVERY-001.md)
- [EXP-DISCOVERY-002 — Discovery Engine](EXP-DISCOVERY-002.md)
- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
