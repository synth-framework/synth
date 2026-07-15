# ADR-013 — Forge Capability

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Forge` as a constitutional capability family. ADR-011 established the `Process` and `Tool` capabilities. This ADR defines the `Forge` capability interface so that the SYNTH Core never depends directly on GitHub or any specific code-hosting platform.

Today, forge interaction exists only as a product-boundary adapter (`src/adapters/github/`) with GitHub-specific types. The Core should read repository metadata, issues, pull requests, and releases through a forge-agnostic capability interface.

## Decision

### 1. Forge Capability Interface

The `Forge` capability is satisfied by a provider implementing:

```text
ForgeProvider {
  name: string
  version: string
  getRepository(): Promise<ForgeRepository | undefined>
  listIssues(options?: ForgeListOptions): Promise<ForgeIssue[]>
  listPullRequests(options?: ForgeListOptions): Promise<ForgePullRequest[]>
  listReleases(options?: ForgeListOptions): Promise<ForgeRelease[]>
}
```

### 2. Forge-Agnostic Abstractions

All data types are forge-neutral; no GitHub-specific vocabulary leaks into the interface:

```text
ForgeRepository { name, owner?, url?, defaultBranch?, description? }
ForgeIssue      { number, title, state, labels, url? }
ForgePullRequest { number, title, state, headBranch?, baseBranch?, url? }
ForgeRelease    { tag, name?, isDraft?, isPrerelease?, url? }
ForgeListOptions { limit?, state? }
```

These abstractions are the constitutional vocabulary for forge interaction. Provider-specific fields remain inside providers.

### 3. Read-Only Scope

This ADR establishes read operations only — the minimum surface required for environment discovery and evidence. Write operations (create issue, merge PR, publish release) are execution concerns and are intentionally out of scope; they may be added by a future ADR if an expedition requires them.

### 4. Default Provider: GitHub Forge Provider

`GitHubForgeProvider` composes the `ToolProvider` capability (ADR-011) and shells out to the `gh` CLI (`gh repo view`, `gh issue list`, `gh pr list`, `gh release list`, all with `--json` output). Authentication is delegated entirely to `gh`; the provider handles no tokens or credentials itself (the `Secrets` capability family is addressed separately under EXP-ENV-009).

### 5. Core Boundary Rule

No Core component may invoke forge APIs, forge CLIs, or embed platform-specific logic directly. All forge interaction flows through the `ForgeProvider` interface.

## Consequences

- **Easier:** SYNTH becomes forge-agnostic; GitLab, Bitbucket, or self-hosted forges can be added as providers without Core changes.
- **Easier:** Tests can use scripted forge providers.
- **Easier:** Forge metadata becomes capability evidence (supports EXP-ENV-010).
- **Harder:** Existing GitHub-coupled components must migrate behind the interface.
- **Note:** The product-boundary `GitHubAdapter` in `src/adapters/github/` is unchanged; the Forge capability is an Environment Layer artifact, not a replacement for the adapter's product-level functions.

## Proof Impact

- **P1 Structural:** Reinforced — forge dependency is isolated.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Strengthened — credentials are never handled by the Core; auth is delegated to the environment's own tooling.
- **P5 Reproducibility:** Strengthened — forge reads return structured, capturable data.

## Kernel Impact

No frozen kernel components are modified. The Forge capability provider is an Environment Layer artifact.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/adr/ADR-011-process-tool-capability.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-008.md`
