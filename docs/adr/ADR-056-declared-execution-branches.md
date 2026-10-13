# PROPOSED ADR-056 — Operator-Declared Execution Branches

**Status:** Proposed (submitted for operator review; accepted on merge)
**Date:** 2026-10-12
**Depends on:** ADR-055-proposed (ceremonial events / branch protocol), ADR-054-proposed (unified lifecycle)
**Companion evidence:** `docs/audits/mission-expedition-cli-audit-2026-10-12.md` §3 #12, §4 R2 (the branch demanded but never created)

---

## 1. Context

The execution-branch rule today is *naming-derived*: `resolveExecutionBranch` (branch-policy.ts) accepts a
branch only if it is one of the taxa-generated candidates (`mission/<slug>-<id7>`,
`expedition/<mission>/<expedition>`, or the legacy raw-ID forms). Nothing binds an entity to a branch — the
name **is** the binding.

Three consequences, all observed:

1. **The convention is mandatory even when it is wrong for the environment.** This session is pinned by
   Arena to `arena/c5db653e-synth`; that branch can never satisfy `mission/…`, so every mission approval and
   expedition start in this workspace is blocked by policy. The operator's only options today are to
   rename/re-create the branch or to leave the framework's ceremony behind.
2. **The branch is demanded before it exists and created by nobody.** The first `mission approve` fails
   with `BRANCH_POLICY_DENIED … Required branch: mission/265b36a5a801d8e4`; the operator must hand-create a
   branch whose name they could not have known in advance (audit §4 R2). The only branch creator in the CLI
   is `ensureExpeditionBranch` (expedition start), and it only ever generates convention names.
3. **Real branches that people and bots actually create are invisible to the model.** `pr-303`,
   `fix/…`, `arena/…`, agent session branches — the taxonomy's `allowedBaseBranches` is never checked at
   creation, and no branch outside the convention can ever be *bound* to governed work.

The user's request: *"add a `--branch` flag to carry on the work on said branch instead of forcing users to
use the framework's convention … and a flag to let the thing know the branch is already created —
validate the branch exists and, if it is not the current branch, check it out."*

This is the right fix, with one design rule attached: **a declared branch must be recorded in the ledger,
not just accepted for one command.** Acceptance without a record would create a second, invisible policy
path; the record is what makes the override auditable and what lets later commands (`checkpoint`, `status`,
`complete`, `seal`) agree about which branch this entity owns.

## 2. Decision

### 2.1 `--branch <name>` — declare the execution branch

Accepted by:

| Command | Meaning |
|---|---|
| `mission approve --draft-id … --branch <name>` | Bind the mission to `<name>` for all mission-role checks (its expeditions inherit it as their base/default). |
| `expedition commit --proposal-id … --branch <name>` | Optional: pre-bind the expedition at commit time (before it starts). |
| `expedition start --id … --branch <name>` | Bind the expedition to `<name>`; this is the branch its worktrees/execution checks resolve to. |

Semantics:

- The binding is written to the entity record and emitted as a ledger event (`EXPEDITION_BRANCH_BOUND` /
  `MISSION_BRANCH_BOUND`, payload: `{ entityId, branch, declared: true, created: bool, baseCommit,
  declaredBy }`). With ADR-055 P2 the event lands on the canonical branch; until then it lands wherever the
  ledger writes today.
- `resolveExecutionBranch` **consults the binding first**, then falls back to the taxonomy candidates, then
  to trunk `main` in `strategy: trunk`. This is the single change that makes the convention a *default*
  instead of a *law*.
- The declared branch is validated with `git check-ref-format --branch`, resolves locally or as
  `origin/<name>` (a local tracking branch is created when only the remote exists), and must not already be
  bound to another **live entity of the same role** — otherwise `DECLARED_BRANCH_IN_USE`. Exclusivity is
  per role: a live mission binding does not block that mission's expeditions from declaring the same
  branch (the operator-owned workspace case, §2.4), while two live expeditions on one branch remain
  forbidden. A terminal entity (`completed`/`cancelled`/`archived`) releases its branch for re-use.
- **A binding is not a bypass.** Resolution uses the binding *instead of the naming taxonomy*, but the
  checked-out branch must be the bound branch: from any other branch the gate denies with
  `<role> execution is bound to <branch>` and repeats the bound name, so a recorded binding can never
  authorize a ceremony from an unrelated branch.
- A declared branch that does **not** match a taxonomy candidate is not silently accepted: the command
  succeeds with a recorded, visible warning (`BRANCH_POLICY_OVERRIDDEN: declared branch <name> is not a
  canonical <role> branch; recorded as an operator decision`) and the override appears in `status`,
  `checkpoint`, `show` and `report`.
- Declaring `main` (or the configured canonical branch) requires no special flag but is surfaced as an
  explicit warning, because it opts that entity out of isolation.

### 2.2 `--no-create` — "the branch already exists"

The user's `--branch-created` idea, named for the behaviour it changes.

- **Default (no flag):** if `<name>` does not exist, the CLI *creates* it — based on, in order: the mission
  branch (ADR-055 §2.4), the configured base branch, the current HEAD — then checks it out (or allocates it
  as the expedition worktree under ADR-055 P3).
- **`--no-create`:** never create. Validate existence (local or `origin/<name>`); if the current branch is
  not `<name>`, check it out; if it does not exist anywhere →
  `DECLARED_BRANCH_MISSING`, with the exact `git branch <name> <base>` next step. The record stores
  `created: false`, so an audit can see the branch pre-existed.
- If the declared branch is **already checked out in this working tree** (the Arena case), nothing is
  checked out or allocated; the ceremony simply runs here. In worktree mode (P3) that is the
  single-checkout fallback: git refuses to attach one branch to two worktrees, so the CLI detects
  "branch is checked out at <path>" and uses that path.

**Naming decided (2026-10-12): `--no-create`.** It states the *behaviour* (do not create) rather than a
claimed state ("created"), and matches the existing negative-flag style (`--no-auto-commit`,
`--no-bootstrap-logs`, `--no-lineage-check`). No alias is added; the audit's documentation-drift finding
argues against multiplying spellings for one behaviour.

### 2.3 What stays enforced

- The ExecutionGate's `EXECUTION_BRANCH_CHECK` still runs for `ApproveMission` / `StartExpedition` — it now
  passes because the binding resolves (and HEAD is the bound branch), not because the name matched. The
  gate enriches its context from the persisted record, so no flag is needed on later commands.
- Chore lanes, trunk/branch-strategy semantics, and the lineage guard are unchanged.
- A declared binding is **per entity**, not global: declaring a branch for expedition E1 does not let
  expedition E2 run anywhere. Two expeditions on one branch remains forbidden (`DECLARED_BRANCH_IN_USE`),
  which is also what makes ADR-055's worktree concurrency coherent.

### 2.4 Config-level variant (optional, recommended for agent workspaces)

`.synth/config.yaml`:

```yaml
git:
  branchStrategy: featured
  branchPolicy:
    mode: enforce
    declaredPatterns: ["arena/*", "fix/*"]     # branches pre-approved as execution targets
```

With `declaredPatterns`, a pattern match is *accepted as a binding without a warning*, but the binding
still has to be declared (`--branch`) and recorded. Patterns never bind anything implicitly — they only
soften the warning class. This gives agent sandboxes (fixed branch names they cannot choose) a
configuration-level story that does not require per-command ceremony.

### 2.5 Lifecycle of a binding

- `mission complete` / `expedition complete|abandon|archive|delete` keep the binding in the historical
  record (it is part of the event payload) but release the branch for re-use.
- Re-binding a live entity requires an explicit command (`synth expedition rebind --id … --branch …`,
  proposed alongside `expedition move`), never a silent side effect of another verb.
- `expedition deliver` (ADR-055 §2.6) uses the binding as the branch to push, and `seal` verifies the merge
  commit against it.

## 3. Acceptance criteria

1. **AC1** — On a workspace whose branch is `arena/c5db653e-synth` (pre-existing, never created by SYNTH):
   `synth expedition start --id <id> --branch arena/c5db653e-synth --no-create` succeeds, records
   `created:false, declared:true`, and every subsequent command (`checkpoint`, `evidence`, `finish`) agrees
   without further flags.
2. **AC2** — `--branch X` without `--no-create` on a missing `X` creates `X` from the mission branch (or the
   configured base when no mission branch exists) — never from an unrelated sibling expedition branch.
3. **AC3** — `--branch X --no-create` when `X` is missing fails with `DECLARED_BRANCH_MISSING` and the exact
   creation command; nothing is created and nothing is recorded.
4. **AC4** — Two live expeditions cannot bind the same branch (`DECLARED_BRANCH_IN_USE`).
5. **AC5** — A non-canonical declared branch produces the visible, recorded `BRANCH_POLICY_OVERRIDDEN`
   warning, and `synth status` shows the override for the entity.
6. **AC6** — Without `--branch`, behaviour is exactly as today (taxonomy candidates), so existing branches
   and the 49 historical expeditions keep resolving.
7. **AC7** — A recorded binding never authorizes a ceremony from another branch: with `m` bound to `arena/x`,
   `ApproveMission` from `main` is denied and the denial cites `arena/x`.
8. **AC8** — Ownership is per role: one live mission and its expedition may declare the same operator-owned
   branch (arena workspace); a second live expedition on that branch is refused with `DECLARED_BRANCH_IN_USE`.

## 4. Code surface

| File | Change |
|---|---|
| `src/cli/synth.ts` | flag parsing in `cmdMissionApprove`, `cmdExpeditionCommit`, `cmdExpeditionStart`; pass `declaredBranch` into `ensureExpeditionBranch`/`assertExecutionBranch`; extend the responses |
| `src/repository/branch-policy.ts` | `ExecutionBranchContext.declaredBranch`, resolution order (binding → taxonomy → trunk), warning class |
| `src/repository/branch-taxonomy.ts` | helper to validate a declared name without requiring taxonomy membership |
| `src/capability/registry.ts` | `CreateExpeditionBranch` payload gains `declared`, `created`, `baseCommit`, `declaredBy` (or new `BindExecutionBranch` capability) |
| `src/control/execution-gate.ts` | PHASE 2d enriches the branch context from the binding |
| `src/domain/execution.ts` | persist `executionBranch` on the mission/expedition record |
| `src/repository/branch-declaration.ts` | git-facing half of the declaration (validate, owner check, checkout/create) — pure, testable, never prints |
| `src/runtime/replay.ts` | apply `MISSION_BRANCH_BOUND` / `EXPEDITION_BRANCH_BOUND` to the record (replayable binding) |
| `tests/` | `execution-branch-policy` (resolution order, HEAD rule, ownership), `declared-branch-git` (--no-create, create, origin-only, conflict), `declared-branch-binding` (recorded binding replays and the gate resolves it) |

Estimated: ~1–2 days of work, no schema migration (payload is additive; old records resolve by name as
today).

## 5. Non-goals / risks

- **Not** a way to disable branch policy globally: enforcement still runs, against the declared branch.
- **Risk:** a declared branch can be force-pushed or rebased outside SYNTH; the binding records the name,
  not a commit (except `baseCommit`). ADR-055's `seal` is where truth about delivery is established.
- **Risk:** flag-driven bindings are easy to forget in agent scripts; the config `declaredPatterns` variant
  exists to make the common case declarative.
- **Non-goal:** renaming the taxonomy or adding first-class prefixes for `arena/`, `fix/`, etc. Declared
  branches are operator-owned names; they do not need a taxonomy type (classification may still report them
  as `declared/<unknown>` for display).

## 6. Open questions

1. ~~Q1 — flag name~~ **Resolved: `--no-create`** (2026-10-12), no alias.
2. **Q2 — who may declare:** any actor, or should binding a *mission* branch require the operator identity
   (`--approved`-style), matching `expedition move`?
3. **Q3 — rebind verb:** ship `expedition rebind` in the same change, or defer until a real need appears?
4. **Q4 — `declaredPatterns` semantics:** warning-softening only (recommended), or also implicit-binding
   candidates for `checkpoint`/`status` reads?
5. **Q5 — interaction with ADR-055 P3 worktrees:** when the declared branch is already checked out in the
   main worktree, prefer the current checkout (recommended) or force a worktree and detach the main one?

## 7. Implementation record

- **Slice 1** — resolution order, `declaredPatterns`, warning class, name validation
  (`branch-policy.ts`, `branch-taxonomy.ts`); 22 policy tests green.
- **Slice 2** — `BindExecutionBranch` capability + `*_BRANCH_BOUND` events, record fields, replay
  cases, gate/guard enrichment, `--branch` / `--no-create` on `mission approve`, `expedition commit`,
  `expedition start`, and `repository/branch-declaration.ts` for the git mechanics.
- The window exit is: `git.branchPolicy.mode: enforce` restored in `.synth/config.yaml` once the bootstrap
  mission is approved with `--branch <operator branch> --no-create` (ADR-056 §2.4), so the declared
  pattern — not `mode: off` — keeps the operator branch valid.

## Proof Impact

- **P1 Replay Integrity:** improved — the declared branch is recorded in the ledger (`*_BRANCH_BOUND`), so branch resolution is replayable instead of being derived from a naming convention.
- **P2 Governance Traceability:** improved — a non-canonical declared branch is a recorded, visible override (`BRANCH_POLICY_OVERRIDDEN`), not an invisible exception.
- **P3 Capability Boundary:** unchanged — enforcement still runs in the ExecutionGate's `EXECUTION_BRANCH_CHECK`, now against an enriched (bound) context.
- **P4 Adversarial:** strengthened — `DECLARED_BRANCH_MISSING`, `DECLARED_BRANCH_IN_USE`, and `--no-create` on a missing branch are explicit, testable failure modes.
- **P5 Reproducibility:** unchanged — resolution order (binding → taxonomy → trunk) is deterministic and additive; records without a binding behave exactly as today.

## Kernel Impact

None. Branch policy and taxonomy are repository-adapter concerns, outside the kernel freeze.

## Constitutional Baseline Impact

None.

## Related

- ADR-021 — Enforce Pull-Request Workflow for All Source Changes
- ADR-053 — Branch Inheritance of Executing Expedition State
- ADR-054 / ADR-055 — companion proposals (lifecycle; ceremonial events)
- `docs/audits/mission-expedition-cli-audit-2026-10-12.md` §3 #12, §4 R2 — the branch demanded but never created
