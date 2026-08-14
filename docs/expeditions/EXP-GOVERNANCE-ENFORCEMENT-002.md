# EXP-GOVERNANCE-ENFORCEMENT-002 — Expedition Branch Workflow at Start

> Auto-create the canonical expedition branch at start so an executing expedition always runs on its canonical branch.

**Status:** In progress — executing  
**Expedition ID:** `ee4874cdcadaf218`  
**Mission ID:** `2644f4a2c0ad2ad7`  
**Branch:** `expedition/2644f4a2c0ad2ad7/ee4874cdcadaf218`  
**Depends On:** `EXP-GOVERNANCE-ENFORCEMENT-001` (branch-policy enforcement inside `ExecutionGate`), `EXP-REPO-006` (branch taxonomy / canonical naming)

---

## Goal

Close the ECOSYSTEM-001 gap: turn branch enforcement on and auto-create the canonical expedition branch at start.

1. Add `.synth/config.yaml` declaring `git.branchPolicy.mode: enforce` and `git.branchStrategy: featured` so `resolveExecutionBranch` blocks non-canonical branches.
2. Wire automatic canonical branch creation (`git checkout -b expedition/<missionId>/<expeditionId>`) into `startOneExpedition` via the repository adapter.
3. Record `EXPEDITION_BRANCH_CREATED` events when the canonical branch is created.
4. Update checkpoint/completion guards so an executing expedition always runs on its canonical branch.

---

## Problem Statement

ECOSYSTEM-001 added branch enforcement to the ExecutionGate (mission / expedition / chore lanes) and a fail-fast guard to the CLI, but the operator still had to create the canonical expedition branch **by hand** before `synth expedition start`:

```bash
git checkout -b expedition/<missionId>/<expeditionId>   # manual step
synth expedition start --id <expeditionId>              # gate then passes
```

With `mode: enforce` active, starting an expedition from `main` (or any non-canonical branch) failed with `BRANCH_POLICY_DENIED` and no self-service path. The workflow should create the branch for the operator.

---

## Solution

### 1. `CreateExpeditionBranch` capability

New capability registered in the capability registry and the domain switch. Emits:

```json
{
  "type": "EXPEDITION_BRANCH_CREATED",
  "payload": { "expeditionId": "<id>", "branch": "expedition/<missionId>/<expeditionId>", "baseCommit": "<sha>" }
}
```

Unlike `CreateBranch`, it has **no** `repository_initialized` precondition, so it works in repositories whose `state.repository` is not yet initialized. The `EXPEDITION_BRANCH_CREATED` event type already existed in the event model; replay treats it as log-only and the derived-state builder updates the execution graph.

### 2. `ensureExpeditionBranch` in `startOneExpedition`

A new CLI step runs **before** the fail-fast `assertExecutionBranch` guard. It:

- Loads the branch policy from `.synth/config.yaml`.
- Degrades to a no-op when policy is `off` (default) or strategy is `trunk` — no behavior change for non-enforced projects.
- Degrades to a no-op when the VCS has no branch concept (non-git).
- Computes the canonical branch with `generateBranchName("expedition", { missionId, expeditionId })`.
- Skips when already on the canonical branch (no duplicate event).
- Otherwise checks existence via `adapter.branchExists(name)`, then `checkout` (existing branch) or `createBranch` (`git checkout -b`), and records `EXPEDITION_BRANCH_CREATED` through the gate (`ctx.api.handleIntent`).

After this step, both `assertExecutionBranch` and the gate's `EXECUTION_BRANCH_CHECK` phase pass because the process is on the canonical branch.

### 3. Checkpoint guard

`resolveCheckpointBranch` previously validated only `executingExpeditions[0]`. It now matches the executing expedition whose canonical branch equals the current branch (falling back to the first entry), so multi-expedition checkpoints resolve the correct required branch.

### 4. Config

```yaml
# .synth/config.yaml
git:
  branchStrategy: featured
  branchPolicy:
    mode: enforce
```

---

## Files Changed

| File | Change |
|---|---|
| `src/capability/registry.ts` | Added `CreateExpeditionBranch` capability |
| `src/domain/execution.ts` | Added `CreateExpeditionBranch` domain case |
| `src/adapters/repository/types.ts` | Added optional `branchExists` to adapter interface |
| `src/adapters/repository/git.ts` | Implemented `branchExists` |
| `src/cli/synth.ts` | Added `ensureExpeditionBranch`, wired into `startOneExpedition`, fixed `resolveCheckpointBranch` |
| `.synth/config.yaml` | Added `branchStrategy: featured` + `branchPolicy.mode: enforce` |
| `tests/execution-branch-gate.test.js` | Replaced fail-fast-on-main test with auto-create tests; added no-recreate test |
| `tests/synth.test.js` | Asserted `CreateExpeditionBranch` capability + event emission; updated registry size |

---

## Validation

- `tests/execution-branch-gate.test.js` — enforce blocks gate-level start off-branch; CLI auto-creates branch on main; no re-create on canonical branch; chore lane; checkpoint.
- `tests/synth.test.js` — capability present, event recorded.
- `tests/execution-branch-policy.test.js`, `tests/execution-branch.test.js`, `tests/execution-runtime.test.js`, `tests/execution-intent.test.js`, `tests/derived-state-guard.test.js`, `tests/migration.test.js` — unaffected.
- Typecheck (`tsc`) passes.

Full governance pipeline (`npm run govern`) is run by the operator before merge (ADR-043).
