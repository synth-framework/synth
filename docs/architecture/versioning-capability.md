# Versioning Capability

**Status:** Draft (EXP-VCS-001)  
**Scope:** Repository-versioning operations as a SYNTH capability  
**Layer:** Implementation  
**Authority:** `docs/expeditions/EXP-PROGRAM-015.md`

---

## Principle

> Version control is an implementation capability. The Core may only read and write repository state through registered capability providers. Mission Studio may consume observations produced by versioning adapters, but it may never invoke Git or any versioning tool directly.

This document defines the generic `VersioningCapability` contract and the observation types versioning adapters emit.

---

## Relationship to existing capabilities

| Capability | Responsibility | Mutates? |
|---|---|---|
| `Revision` | Discover repository identity, branch, commit, remotes, and clean/dirty status. | No |
| `Forge` | Interact with remote collaboration platforms (GitHub, GitLab, etc.). | Sometimes |
| `Versioning` | Perform local repository-versioning operations (commit, branch, merge, push, etc.). | Yes |

`Versioning` is the write-side complement to `Revision`. `Forge` handles platform-specific remote operations such as opening pull requests.

---

## Generic operations

| Operation | Intent | Git mapping |
|---|---|---|
| `initializeRepository` | Create a new versioned repository. | `git init` |
| `createRevision` | Capture a new point in history from the working tree. | `git commit` |
| `switchRevision` | Move the working tree to a named or anonymous revision. | `git checkout` / `git switch` |
| `integrateRevision` | Combine two lines of history. | `git merge` / `git rebase` |
| `publishRevision` | Send local history to a remote. | `git push` |
| `createSnapshot` | Capture a lightweight, possibly labeled, state. | `git stash` / temporary commit |
| `compareRevisions` | Compute differences between two revisions. | `git diff` / `git log` |
| `history` | Enumerate ancestors of the current revision. | `git log` |
| `synchronize` | Fetch remote state and reconcile local state. | `git fetch` / `git pull` |

Operation names are chosen by intent, not by Git command, so future providers (Mercurial, Fossil, Pijul, database-backed stores) can implement the same contract.

---

## Observations

Versioning adapters emit read-only observations that Mission Studio may consume for planning.

| Observation | Value | Purpose |
|---|---|---|
| `versioning.repository` | `VersioningRepositoryDescriptor` | Repository presence, system, branch, commit, remotes, cleanliness. |
| `versioning.branch` | `{ current, others[], divergence }` | Local branch state and divergence from upstream. |
| `versioning.commit` | `VersioningRevisionDescriptor` | Latest commit metadata. |
| `versioning.remote` | `{ name, url, access }` | Remote availability and access level. |
| `versioning.pullRequest` | `{ number, title, source, target, state }` | Open or merged pull requests. |
| `versioning.divergence` | `{ ahead, behind, hasConflict }` | Divergence between local and remote. |

---

## Execution model

Every mutating versioning operation is a capability invocation routed through the ExecutionGate. The resulting event records:

- the capability family (`Versioning`)
- the provider name
- the operation
- the inputs
- the outputs
- the resulting repository descriptor

This keeps repository history itself replayable and governed.

---

## Provider registration

A versioning provider registers itself like any other capability provider:

```typescript
{
  name: "git-versioning",
  version: "1.0.0",
  capabilities: [
    { family: "Versioning", priority: 100, confidence: "high" }
  ],
  evaluate: async (ctx) => { /* discover Git repository */ }
}
```

The Core selects providers through the standard Environment Layer resolution process.

---

## Protected assets

This capability does **not** modify:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model semantics (only additive family extension)
- Constitutional Baseline
- Public Vocabulary

---

## References

- `docs/expeditions/EXP-PROGRAM-015.md`
- `docs/expeditions/EXP-VCS-001.md`
- `src/environment/versioning-capability.ts`
- `src/environment/revision-capability.ts`
- `src/environment/forge-capability.ts`
- `docs/architecture/constitutional-layer-boundaries.md`
