# EXP-GIT-001 — Git Integration for Governance State Snapshots

> Keep the git repository and SYNTH governance state synchronized by automatically snapshotting governance state on expedition completion and other lifecycle milestones.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** EXP-PROGRAM-043 Workstream F, EXP-REVIEW-003 required actions, EXP-ADP-001 repository adapter findings  
**Depends On:** EXP-IDENTITY-001, EXP-SIGN-001, ADR-039 Convergence Review outcome  
**Blocks:** None

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

## Purpose

Governance state lives in `.synth/data/` and `data/` (for ungoverned directories), but operators manage source code in git. When an expedition completes or a snapshot is taken, the governance event log and derived state should be anchored to a git commit or tag so that:

- Replay can be verified against a known repository state.
- Operators can correlate a git commit with a governance milestone.
- A fresh clone can reconstruct both source and governance history.
- Agent actions leave a durable, human-readable mark in source control.

This expedition does not change the event model; it adds repository-adapter behavior and optional git automation.

---

## Scope

### In scope

1. Define triggers for automatic git snapshots.
2. Define tag format and commit message conventions.
3. Define what files are included in a governance snapshot.
4. Define hooks and CLI commands for manual snapshots.
5. Integrate with the repository adapter surfaced in EXP-ADP-001.
6. Record snapshot metadata in the event log.
7. Obtain an ADR-039 Convergence Review outcome before writing implementation code.

### Out of scope

- Identity capture (see EXP-IDENTITY-001).
- Cryptographic signing of events (see EXP-SIGN-001); however, signing-key fingerprints may be referenced in tags.
- Two-party approval workflows (see EXP-APPROVAL-001).
- Auto-creating git repositories; we only operate when git is already present.

---

## Triggers

Automatic snapshots fire when the repository adapter is healthy and `git.snapshotPolicy` is not `disabled`:

| Trigger | Snapshot type | Condition |
|---|---|---|
| `EXPEDITION_COMPLETED` | Lightweight tag + optional commit | Expedition reaches `completed` state and `autoTagOnComplete` is enabled. |
| `SNAPSHOT_REQUESTED` | Commit + tag | Operator runs `synth snapshot create`. |
| `GOVERNANCE_STATE_CHANGED` | Commit only | Significant state change (mission approved, evidence attached) if `autoCommitOnStateChange` is enabled. |
| `MERKLE_ROOT_PUBLISHED` | Annotated tag | Publishes a signed/unsigned Merkle root as a git object if `autoTagMerkleRoot` is enabled. |

All automatic actions are suppressed when:

- No git repository is detected.
- The working tree has uncommitted changes outside the snapshot set.
- The repository adapter reports `health: unhealthy`.
- The current HEAD is already tagged with the same expedition/snapshot ID.

---

## Tag Format

### Expedition completion tag

```text
synth-expedition/<expedition-id>
```

Example: `synth-expedition/EXP-SIGN-001`

### Snapshot tag

```text
synth-snapshot/<iso-timestamp>
```

Example: `synth-snapshot/2026-08-01T120000Z`

### Merkle root tag (annotated)

```text
synth-merkle/<root-short-hash>
```

Annotation message:

```text
SYNTH Merkle Root <root-hash>
Start offset: <startOffset>
End offset: <endOffset>
Signed by: <signingKeyFingerprint>
```

### Tag namespace rules

- All tags use the `synth-*` namespace to avoid collisions.
- Existing tags in the same namespace are never overwritten.
- If a collision occurs, append `-<counter>` and log a warning.

---

## Commit Message Conventions

### Automatic commit message

```text
[synth] snapshot <snapshot-id>

- Event log offset: <latest-offset>
- State hash: <state-hash>
- Trigger: <trigger-name>
- Expedition: <expedition-id>
- Agent: <agent-id>
- Session: <session-id>
```

### Manual commit message

Operators may override with:

```text
synth snapshot create --message "..."
```

If no message is provided, the automatic template is used.

---

## Files Included in a Governance Snapshot

A snapshot commits only governance-relevant files:

- `.synth/data/event-log.jsonl`
- `.synth/data/canonical-state.json`
- `.synth/manifest.json`
- `.synth/keys/*.pub` (public signing keys)
- `.synth/policy/*.yaml`
- `data/event-log.jsonl` (for ungoverned directories, if present)
- `AGENTS.md` (if project policy marks it as tracked)
- `proof/*.json` and `proof/*.jsonl` (if `includeProofs` is enabled)

Source code files are **not** committed by automatic snapshots; the operator remains responsible for source commits. If uncommitted source changes exist, the snapshot is blocked or warned based on `snapshotPolicy`.

---

## Hooks

Repository hooks are installed by `synth adapter install-hooks` (EXP-ADP-001). Governance-related hooks:

| Hook | Behavior |
|---|---|
| `pre-commit` | Warn if `.synth/data/` contains uncommitted governance state; block if `strictSnapshotPolicy` is enabled. |
| `post-commit` | Optionally run `synth snapshot create --trigger post-commit` if `autoCommitOnStateChange` is enabled. |
| `post-merge` | Run `synth explain replay` to verify that the merged event log is consistent. |

Hooks are shell scripts that delegate to `synth` so they stay up to date with CLI changes.

---

## CLI Surface

```text
synth snapshot create [--message "..."] [--tag <name>] [--include-proofs]
synth snapshot list [--limit <n>]
synth snapshot show --tag <tag-name>
synth snapshot verify --tag <tag-name>
synth config set git.snapshotPolicy [disabled|tag-only|commit-and-tag]
synth config set git.autoTagOnComplete [true|false]
synth config set git.autoCommitOnStateChange [true|false]
```

---

## Deliverables

### 1. Repository adapter extension

- Extend `src/workspace/repository-health.ts` to report snapshot capability.
- Add `src/adapter/git-snapshot.ts` to create commits and tags.

### 2. Snapshot configuration

- `.synth/config.yaml` keys:
  - `git.snapshotPolicy`
  - `git.autoTagOnComplete`
  - `git.autoCommitOnStateChange`
  - `git.autoTagMerkleRoot`
  - `git.includeProofs`

### 3. Event types

- `GOVERNANCE_SNAPSHOT_CREATED` — records snapshot ID, git commit/tag, event-log offset, state hash, and trigger.
- `GOVERNANCE_SNAPSHOT_FAILED` — records failure reason when an automatic snapshot cannot be created.

### 4. ExecutionGate integration

- After `EXPEDITION_COMPLETED` and `MERKLE_ROOT_PUBLISHED` events, invoke the snapshot adapter if policy allows.
- Snapshot failures are non-fatal but recorded as events.

### 5. Hooks

- `scripts/governance/git-hooks/pre-commit`
- `scripts/governance/git-hooks/post-commit`
- `scripts/governance/git-hooks/post-merge`
- `synth adapter install-hooks` copies or symlinks hooks into `.git/hooks/`.

### 6. Tests

- `tests/governance-git-snapshot.test.js`:
  - Expedition completion creates a tag when `autoTagOnComplete` is enabled.
  - Snapshot is blocked when uncommitted source changes exist and policy is strict.
  - `synth snapshot create` commits the correct files.
  - `synth snapshot verify` replays the event log at the tagged commit.
  - Hook installation succeeds and hooks delegate to `synth`.

---

## Acceptance Criteria

1. ADR-039 Convergence Review is completed with a **CONVERGED** outcome before implementation merges.
2. Expedition completion creates a lightweight tag in the `synth-expedition/` namespace when enabled.
3. `synth snapshot create` commits governance files with a deterministic message and optional tag.
4. Snapshot failures are recorded as `GOVERNANCE_SNAPSHOT_FAILED` events.
5. `synth snapshot verify` checks out the tagged commit and confirms replay consistency.
6. Hooks are installable via `synth adapter install-hooks` and do not break normal git workflows.
7. Existing tests pass without changes to event hashes or replay behavior when git integration is disabled.
8. `npm run govern` passes.

---

## Evidence

- Implementation files:
  - `src/adapter/git-snapshot.ts` — `GitSnapshotAdapter` with `canSnapshot`, `createSnapshot`, `listSnapshots`, and `verifySnapshot`
  - `src/adapters/repository/git.ts` — repository adapter snapshot delegation and `installHooks`
  - `src/adapters/repository/types.ts` — extended `RepositoryAdapter` interface and snapshot types
  - `src/control/execution-gate.ts` — automatic snapshot after `EXPEDITION_COMPLETED`
  - `src/cli/synth.ts` — `synth snapshot create/list/show/verify` and `synth adapter install-hooks`
  - `src/cli/command-safety.ts` — snapshot command safety registry entries
  - `src/types/event.ts` — `GOVERNANCE_SNAPSHOT_CREATED` and `GOVERNANCE_SNAPSHOT_FAILED`
  - `scripts/governance/git-hooks/pre-commit`, `post-commit`, `post-merge`
- Tests: `tests/governance-git-snapshot.test.js` — 7 assertions covering create, auto-tag, block, list, verify, hooks, and event recording
- Validation: `npm run govern` passes after implementation

---

## Convergence Review

Per `EXP-REVIEW-003` required action 3, this charter passed an ADR-039 Convergence Review before implementation began.

**Review date:** 2026-08-03  
**Outcome:** CONVERGED  
**Reviewer:** synth-cli / operator  
**Evidence:** `docs/expeditions/EXP-GIT-001.md` (this charter) and `proof/govern-baseline.json` from Program 043 validation.

### Review decisions

1. **Automatic git commits/tags do not conflict with the append-only event-source design.** Git snapshots are read-only anchors that reference an immutable event-log offset; they do not mutate events. Default policy is `tag-only`; `commit-and-tag` is opt-in.
2. **The `synth-*` tag namespace and snapshot event types are acceptable.** `GOVERNANCE_SNAPSHOT_CREATED` and `GOVERNANCE_SNAPSHOT_FAILED` are auxiliary events that record git references, not governance state changes.
3. **Hook installation is opt-in.** `synth adapter install-hooks` must be run explicitly and backs up existing hooks.
4. **The charter remains a single Governance Expedition.** The snapshot adapter is an extension of the repository adapter; policy configuration is small enough to ship together.

**Review outcome is a prerequisite.** The review returned **CONVERGED**, so implementation proceeds.

---

## Governance

### Protected

- Event Model (`SynthEvent` envelope schema and replay semantics).
- ExecutionGate mutation authority.
- Public Vocabulary.

### Not included

- Changes to the `SynthEvent` envelope.
- Cryptographic signatures.
- Two-party approval policy.

---

## Risks

| Risk | Mitigation |
|---|---|
| Automatic commits pollute git history | Default to tag-only; commit-and-tag is opt-in per project. |
| Snapshot fails due to uncommitted source changes | Warn by default; strict policy blocks; `GOVERNANCE_SNAPSHOT_FAILED` event records the reason. |
| Hook installation overwrites user hooks | `synth adapter install-hooks` backs up existing hooks and appends rather than replacing when possible. |
| Tag collisions | Append counter and warn; never overwrite existing tags. |
| Correlation between git state and governance state drifts | `synth snapshot verify` replays the event log at the tagged commit and reports divergence. |

---

## Related Documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-IDENTITY-001 — Agent/Session Identity in Events](EXP-IDENTITY-001.md)
- [EXP-SIGN-001 — Event-Log Signing / Merkle Root](EXP-SIGN-001.md)
- [EXP-APPROVAL-001 — Two-party Approval for Destructive Operations](EXP-APPROVAL-001.md)
- [EXP-ADP-001 — Surface Repository Adapter During Onboarding](EXP-ADP-001.md)
- [docs/architecture/09-event-model.md](../architecture/09-event-model.md)
- [docs/architecture/11-replay.md](../architecture/11-replay.md)
- [docs/adr/ADR-039-architectural-convergence-review.md](../adr/ADR-039-architectural-convergence-review.md)
