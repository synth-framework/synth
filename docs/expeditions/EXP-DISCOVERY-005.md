# EXP-DISCOVERY-005 — Brownfield Genesis Integration

> **Discovery expedition.** Integrate the Discovery compiler with Brownfield Genesis so that bootstrap consumes a `DiscoverySession` (and its ProjectModel projection) instead of performing ad-hoc repository analysis.

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-002, EXP-DISCOVERY-003, EXP-DISCOVERY-004

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

Integrate the Discovery compiler with Brownfield Genesis so that bootstrap consumes a `DiscoverySession` (and its ProjectModel projection) instead of performing ad-hoc repository analysis. Establish a `DiscoverySessionProvider` abstraction that makes Discovery the authoritative source of pre-governance project understanding.

After this expedition, the architectural flow becomes:

```text
Repository
        │
        ▼
Discovery Compiler
        │
        ▼
DiscoverySession
        │
        ▼
Bootstrap Adapter
        │
        ▼
Genesis
```

Bootstrap performs **translation and orchestration**, not semantic analysis.

---

## Problem Statement

Current bootstrap analysis in `src/cli/bootstrap-analyzer.ts` is separate from the Discovery compiler. It:

- Re-implements language, framework, and test detection.
- Uses a different observation model than Discovery.
- Cannot leverage Git history, file extension evidence, or correlation rules.
- Produces proposals from raw filesystem scans instead of from a governed EvidenceGraph.

As a result, Brownfield Genesis does not benefit from the deterministic, replayable, evidence-backed understanding that Discovery provides. The two subsystems speak different languages.

---

## Motivation

Brownfield adoption is the most important consumer of Discovery. A project that predates SYNTH must be understood before it can be governed. If bootstrap produces its own analysis, Discovery remains an isolated capability. If bootstrap consumes Discovery, every improvement to observation, correlation, and projection automatically improves brownfield adoption.

---

## Goals

This expedition shall:

- Define a `DiscoverySessionProvider` abstraction.
- Provide a default provider that runs the Discovery engine against a target directory.
- Refactor bootstrap analysis to consume the ProjectModel projection from a DiscoverySession.
- Map ProjectModel fields to bootstrap proposal inputs.
- Ensure bootstrap remains read-only during the discovery phase.
- Preserve the existing bootstrap CLI contract.
- Add tests proving bootstrap uses Discovery output.
- Ensure `npm run govern` passes.

---

## Non-Goals

This expedition shall not:

- Add new observation or projection capabilities.
- Modify the Genesis event model.
- Modify Protected Assets.
- Implement persistence or approval workflows.
- Change the `synth bootstrap` CLI surface except to preserve behavior.
- Remove existing adapters used by Mission Studio.

---

## DiscoverySessionProvider Abstraction

```ts
interface DiscoverySessionProvider {
  id: string
  version: string
  /**
   * Produce a DiscoverySession from the supplied provider context.
   * Must be read-only and deterministic for the same inputs.
   */
  discover(context: DiscoveryProviderContext): Promise<DiscoverySession>
}
```

Default implementation:

```ts
function createDefaultDiscoverySessionProvider(): DiscoverySessionProvider
```

The default provider:

- Accepts a context containing a target directory.
- Uses the default Discovery engine.
- Configures the filesystem observation capability with the target directory.
- Optionally enables the Git observation capability if `.git` is present.
- Returns the full DiscoverySession.

The contract is intentionally not tied to a directory. Future providers may load cached, remote, persisted, replayed, or signed sessions without changing Bootstrap.

---

## Bootstrap Integration

`src/cli/bootstrap-analyzer.ts` is refactored into a thin adapter:

```text
Target Directory
        │
        ▼
DiscoverySessionProvider
        │
        ▼
DiscoverySession
        │
        ├── EvidenceGraph
        ├── Findings
        └── ProjectModel
        │
        ▼
Bootstrap Analysis
        │
        ▼
Mission Studio Proposals
```

The `RepositoryAnalysis` type is preserved for CLI compatibility but its fields are populated from the ProjectModel projection:

| RepositoryAnalysis field | ProjectModel source |
|---|---|
| `repositoryType` | lifecycle stage + languages |
| `languages` | `projectModel.languages` |
| `frameworks` | `projectModel.frameworks` |
| `hasTests` | `testing` capability |
| `hasPackageManager` | manifest observations |
| `fileCount` | filesystem observations |
| `observations` | EvidenceGraph claims (mapped) |
| `adapterErrors` | Discovery warnings |

`RepositoryAnalysis` is a **temporary compatibility projection** (anti-corruption layer) over `ProjectModel`. Its only purpose is to preserve the existing Genesis interface while Bootstrap internals migrate to the canonical Discovery representation. No other component should construct `RepositoryAnalysis`. Eventually Genesis should consume `ProjectModel` directly and this projection can be removed.

---

## Bootstrap Consumes Only Stable Compiler Outputs

Bootstrap must depend only on stable, public Discovery artifacts. It is prohibited from inspecting:

- Raw observations.
- `EvidenceGraph` internals.
- Correlation rules or projection rules.
- Adapter-specific metadata.

Bootstrap may consume only:

- `ProjectModel` and other declared projections.
- `DiscoverySession` metadata (identifier, version, provenance).
- Replay metadata required for lineage.

This keeps compiler internals encapsulated and prevents semantic analysis from leaking back into Bootstrap.

---

## Replay Lineage

Bootstrap must carry the `DiscoverySession` identifier (or hash) into Genesis so that every Brownfield Genesis can be traced back to the DiscoverySession that produced it.

```text
Repository
        │
        ▼
DiscoverySession
        │
        ▼
Bootstrap
        │
        ▼
Genesis
```

This provenance enables future auditing, replay, and regression analysis.

---

## Proposal Mapping

Mission Studio proposals are generated from the ProjectModel:

- Mission subject: derived from project identity.
- Mission purpose: derived from lifecycle stage and intent.
- Language observations: from `projectModel.languages`.
- Framework observations: from `projectModel.frameworks`.
- Findings observations: from findings projection (missing README, missing architecture, etc.).

This replaces the current hard-coded `makeObservation` calls in `bootstrap-apply.ts`.

---

## Read-Only Guarantee

The provider and bootstrap analysis must not modify:

- The target directory.
- `.git/`.
- Any existing files.
- Any SYNTH state.

Only the apply phase (after `--approve`) may write `.synth/` artifacts.

---

## Acceptance Criteria

A successful expedition:

- [x] `DiscoverySessionProvider` contract is defined with session-centric inputs.
- [x] Default provider runs the Discovery engine against a target directory.
- [x] `bootstrap-analyzer.ts` consumes a DiscoverySession.
- [x] `RepositoryAnalysis` is implemented as a compatibility projection over `ProjectModel`.
- [x] `RepositoryAnalysis` fields are populated from the ProjectModel projection.
- [x] Bootstrap proposals are generated from Discovery evidence.
- [x] Bootstrap remains read-only during analysis.
- [x] Bootstrap depends only on stable compiler outputs (`ProjectModel`, projections, session metadata).
- [x] Bootstrap carries the `DiscoverySession` identifier/hash into Genesis for lineage.
- [x] Existing `tests/brownfield-validation.test.js` passes without changes.
- [x] New tests verify the Discovery-to-bootstrap integration.
- [x] Semantic-equivalence tests prove representative repositories produce the same Genesis artifacts through Discovery as through the previous implementation.
- [x] `npm run build` passes.
- [x] `npm run govern` passes.

---

## Architectural Principles

This expedition reinforces:

> **Brownfield Genesis consumes Discovery output; it does not re-implement analysis.**

> **Discovery is the single source of pre-governance project understanding.**

> **Bootstrap analysis is read-only.**

> **`RepositoryAnalysis` is a temporary compatibility projection over `ProjectModel`.**

> **Bootstrap depends only on stable compiler outputs, never on observations or EvidenceGraph internals.**

> **Bootstrap carries Discovery lineage into Genesis.**

> **CLI compatibility is preserved while internals evolve.**

---

## Expected Outcome

After completion:

- `synth bootstrap --dry-run` runs the Discovery compiler under the hood.
- Proposals are derived from a replayable DiscoverySession.
- Improvements to observation, correlation, and projection capabilities automatically improve brownfield adoption.
- The bootstrap subsystem is thinner and more deterministic.

---

## Governance

### Protected

- `DiscoverySessionProvider` contract
- Read-only analysis guarantee
- CLI bootstrap contract

### Not included

- New observation capabilities
- New projection capabilities
- Genesis event model changes
- Persistence layer
- Approval lifecycle

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-002 — Discovery Engine](EXP-DISCOVERY-002.md)
- [EXP-DISCOVERY-003 — First Observation Capabilities](EXP-DISCOVERY-003.md)
- [EXP-DISCOVERY-004 — Projection Capability Mechanism](EXP-DISCOVERY-004.md)
