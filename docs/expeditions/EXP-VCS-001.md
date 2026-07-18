# EXP-VCS-001 — Versioning Capability Contract

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-015 — Repository Versioning Capability  
**Depends On:** EXP-PROGRAM-007 (Environment Independence), EXP-PROGRAM-014 (Governance Maturation)  
**Blocks:** EXP-VCS-002, EXP-VCS-003, EXP-VCS-004, EXP-VCS-005  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (N1: recursion from ungoverned `package.json` `govern` script; agent-created files outside SYNTH boundary)  
**Accepted:** 2026-07-17

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Define the generic **Repository Versioning Capability** contract that allows SYNTH to participate in repository history without hard-coding Git, GitHub, or any other versioning system.

The contract sits on the implementation side of the constitutional boundary. Mission Studio may consume observations produced by versioning adapters, but the Core may only invoke versioning operations through registered capability providers.

---

## Motivation

The TaskPRO field experiment surfaced the versioning gap indirectly:

- The agent created and edited files outside SYNTH's governance boundary (`package.json`, runtime patches, workarounds).
- Approved Expeditions have no governed path to produce a branch, commit, or pull request.
- Repository state is observed through the `Revision` capability but cannot be influenced by Mission Studio planning or Genesis execution.
- Git is assumed everywhere; other versioning systems are unreachable without redesign.

EXP-PROGRAM-007 established environment independence. EXP-PROGRAM-014 established governance maturation. This expedition closes the loop by adding a generic versioning contract so repository mutations can become governed capability invocations.

---

## Scope

### In scope

- Generic `VersioningCapability` interface defining repository-versioning operations.
- Generic observation types emitted by versioning adapters.
- Relationship to the existing `Revision` capability (read-only observation) and the `Forge` capability (remote collaboration).
- Provider registration contract and discovery rules.
- Documentation of the contract in `docs/architecture/versioning-capability.md`.
- Decision record for why versioning remains in the Implementation layer.

### Out of scope

- Any Git-specific implementation (EXP-VCS-002).
- Any GitHub-specific implementation (EXP-VCS-003).
- Any CLI surface changes.
- Any Mission Studio or Genesis changes.
- Any event-model or replay-model changes.

---

## Deliverables

### 1. `VersioningCapability` interface

A capability contract that abstracts repository-versioning operations:

```text
VersioningCapability
{
  // Lifecycle
  initializeRepository(ctx, options): Promise<RepositoryDescriptor>

  // Revisions
  createRevision(ctx, options): Promise<RevisionDescriptor>
  switchRevision(ctx, target): Promise<RevisionDescriptor>
  integrateRevision(ctx, source, target, options): Promise<IntegrationResult>
  publishRevision(ctx, source, remote, options): Promise<PublishResult>
  createSnapshot(ctx, label?): Promise<SnapshotDescriptor>

  // History and comparison
  compareRevisions(ctx, a, b): Promise<RevisionComparison>
  history(ctx, options?): Promise<RevisionEntry[]>
  synchronize(ctx, remote?, options?): Promise<SynchronizeResult>
}
```

Operations are intentionally generic:

| Operation | Intent | Git mapping | Future mapping |
|---|---|---|---|
| `initializeRepository` | Create a new versioned repository. | `git init` | `p4 init`, `fossil init` |
| `createRevision` | Capture a new point in history from the working tree. | `git commit` on a branch | `p4 submit` |
| `switchRevision` | Move the working tree to a named or anonymous revision. | `git checkout` / `git switch` | `p4 sync` |
| `integrateRevision` | Combine two lines of history. | `git merge` / `git rebase` | `p4 merge` |
| `publishRevision` | Send local history to a remote. | `git push` | `p4 push` |
| `createSnapshot` | Capture a lightweight, possibly unnamed, state. | `git stash` / `git commit` | `p4 shelf` |
| `compareRevisions` | Compute differences between two revisions. | `git diff` / `git log` | `p4 diff2` |
| `history` | Enumerate ancestors of the current revision. | `git log` | `p4 changes` |
| `synchronize` | Fetch remote state and reconcile local state. | `git fetch` / `git pull` | `p4 sync` |

### 2. Observation types

Versioning adapters emit read-only observations that Mission Studio may consume:

```text
VersioningObservation
{
  name: "versioning.repository"
  value: RepositoryDescriptor
}

VersioningObservation
{
  name: "versioning.branch"
  value: { current: string, others: string[], divergence: DivergenceDescriptor }
}

VersioningObservation
{
  name: "versioning.commit"
  value: { hash: string, message: string, author: string, timestamp: string, parents: string[] }
}

VersioningObservation
{
  name: "versioning.remote"
  value: { name: string, url: string, access: "read" | "write" | "none" }
}

VersioningObservation
{
  name: "versioning.pullRequest"
  value: { number: number, title: string, source: string, target: string, state: "open" | "closed" | "merged" }
}

VersioningObservation
{
  name: "versioning.divergence"
  value: { ahead: number, behind: number, hasConflict: boolean }
}
```

### 3. Relationship diagram

```text
Mission Studio (planning)
        │
        │ consumes
        ▼
ObservableAdapter ──► VersioningObservation[]
        ▲
        │ implements
Environment Layer
        │
        ├── RevisionCapability       (read-only)
        ├── ForgeCapability          (remote forge operations)
        └── VersioningCapability     (local repository mutations)
                │
                ├── GitVersioningProvider    (EXP-VCS-002)
                └── FutureProvider           (Mercurial, Fossil, etc.)
```

### 4. Constitutional positioning

Document in `docs/architecture/versioning-capability.md`:

- Versioning is an Implementation-layer concern.
- The Core remains versioning-system agnostic.
- Every mutation flows through the ExecutionGate as a capability invocation.
- Observations are read-only and emitted through `ObservableAdapter` instances.
- No public vocabulary changes.

---

## Acceptance

- `VersioningCapability` interface is defined and documented.
- Operation semantics are provider-agnostic and mapped to Git as the reference implementation.
- Observation types are defined and classified as read-only.
- The contract is registered in the capability model without modifying the Capability Model itself.
- A draft ADR or architecture note explains why versioning mutations belong in the Implementation layer.
- Review by program steward confirms the contract is sufficient for EXP-VCS-002 and EXP-VCS-003.

---

## Phases

### Phase 1 — Survey existing capabilities

Review:

- `src/environment/revision-capability.ts` (read-only Revision provider)
- `src/environment/forge-capability.ts` (remote forge abstraction)
- `src/environment/process-capability.ts` (how mutations are executed)
- `src/environment/providers/reference.ts` (provider registration)

Identify which operations are missing and where the new contract fits.

### Phase 2 — Draft the contract

Write the `VersioningCapability` interface and observation types in `docs/architecture/versioning-capability.md` and a new type-only module `src/environment/versioning-capability.ts`.

### Phase 3 — Map to Git

Produce the reference Git mapping table and define success/failure result shapes for each operation.

### Phase 4 — Review with downstream expeditions

Validate that EXP-VCS-002 (Git adapter) and EXP-VCS-003 (GitHub forge adapter) can be built on this contract without changes.

### Phase 5 — Document and request acceptance

Commit the architecture note and request program-steward acceptance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Contract is too Git-centric | Name operations by intent (`createRevision`, `integrateRevision`) rather than Git commands (`commit`, `merge`). |
| Contract is too abstract to implement | Provide explicit Git mapping as the reference implementation. |
| Mutations bypass ExecutionGate | State the invariant explicitly: every mutating operation is a capability invocation recorded by the ExecutionGate. |
| Mission Studio tries to invoke Git directly | Constitutional invariant: Mission Studio consumes observations only; execution flows through Genesis → ExecutionGate → provider. |
| Existing Revision capability overlaps | Preserve Revision as read-only; Versioning adds write operations. Document the split. |

---

## Definition of Done

- [x] `docs/architecture/versioning-capability.md` documents the contract, observations, Git mapping, and constitutional positioning.
- [x] `src/environment/versioning-capability.ts` exports the `VersioningCapability` interface and observation types (type-only; no implementation).
- [x] `src/environment/index.ts` exports the new module.
- [x] `Versioning` added to `CapabilityFamily` in `src/environment/types.ts`.
- [x] Provider registration contract is documented.
- [x] Downstream expeditions (EXP-VCS-002, EXP-VCS-003, EXP-VCS-004, EXP-VCS-005) confirm the contract is sufficient.
- [x] CHANGELOG updated.
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

---

## Implementation Plan

1. Survey `src/environment/revision-capability.ts`, `forge-capability.ts`, `process-capability.ts`, and `providers/reference.ts`.
2. Draft `docs/architecture/versioning-capability.md` with the full contract.
3. Create `src/environment/versioning-capability.ts` as a type-only module.
4. Add `Versioning` to `CapabilityFamily` in `src/environment/types.ts`.
5. Export the module from `src/environment/index.ts`.
6. Update `CHANGELOG.md` under `[Unreleased]`.
7. Open PR and request review.

---

## Completion Notes

Contract delivered and validated by downstream implementation. `VersioningCapability` operations (`initializeRepository`, `createRevision`, `switchRevision`, `integrateRevision`, `publishRevision`, `createSnapshot`, `compareRevisions`, `history`, `synchronize`) and observation types (`versioning.repository`, `versioning.branch`, `versioning.commit`, `versioning.remote`, `versioning.pullRequest`, `versioning.divergence`) proved sufficient for the Git adapter, GitHub forge adapter, observation rule, and deterministic certification suite without contract changes.
