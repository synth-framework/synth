# AUDIT — `synth mission`, `synth expedition`, and the ceremony around them

**Date:** 2026-10-12
**Repo:** `synth-framework/synth` @ `ac4e81a` (branch `arena/c5db653e-synth`, tree untouched)
**Scope:** every mission/expedition subcommand + flags, the lifecycle rules that govern them,
the artifact/branch consequences of each transition, and the "ceremonial events"
(create → approve → commit → start → finish → complete → archive) that surround them.

**Method.** Two instruments, both evidence-producing:

1. **Code audit (read-only).** `src/cli/synth.ts` (8,030 lines), `src/governance/intake.ts`,
   `src/control/execution-gate.ts`, `src/capability/registry.ts`, `src/repository/branch-policy.ts`,
   `src/repository/branch-taxonomy.ts`, `src/adapters/repository/git.ts`, `.gitignore`, the 49 runtime
   expedition records, both mission records, and the ADR/expedition corpus.
2. **A throwaway lab** (`/tmp/lab`, made from `git archive HEAD` — *not* the working repo) where the
   entire ceremony was executed end-to-end, then abandoned, then re-run with two concurrent expeditions.
   To stay faithful to the real repo for the auto-commit question, that one defect was additionally
   proven against the real repo with non-mutating commands (`git add -n`, `git check-ignore`, `git log`).

Nothing in the working repo was changed: no lifecycle command was run against it, and the only
non-read commands used were `git add -n` (dry) and `git check-ignore` (read).

---

## 0. Plain language first: what these commands actually are

Before judging any of it, the objects have to be named without jargon.

- **Mission** — a *governed objective*. It starts life as a **draft**: a planning "session" produced by
  Mission Studio from the operator's `--subject`/`--purpose`, stored as a JSON file in
  `.synth/data/drafts/`. Approval turns it into a runtime mission record (`.synth/data/missions/<id>.json`)
  and emits `MISSION_APPROVED` into the event log.
- **Expedition** — a *bounded increment of work* under a mission. It also starts as a draft, is approved,
  is "committed" to the runtime, and then "started", at which point one is supposed to leave the canonical
  branch and work on a dedicated branch named `expedition/<mission>/<expedition>`.
- **Events** — every transition appends an event to a partitioned event stream
  (`.synth/data/event-stream/partition-N/segment-XXXX.jsonl`, git-tracked). `canonical-state.json` and the
  per-entity JSON files are *derived* from that stream. The **ExecutionGate** is the only component allowed
  to append events.
- **Branches** — `main` plus, per the declared policy (`.synth/config.yaml`: `branchStrategy: featured`,
  `branchPolicy.mode: enforce`), a canonical branch for missions (`mission/<slug>-<id7>`) and one per
  expedition (`expedition/<mission>/<expedition>`). Branch enforcement is active in this repository.

The user-facing question is therefore: *does the record of a mission/expedition survive the way git is
used to develop the code?* The answer, demonstrated below, is **no — and not for the reason the code
comments assume.**

---

## 1. Command & flag inventory

All flags below were extracted from the command bodies, not from `--help` (the two disagree; see §1.4).

### 1.1 `synth mission` (12 subcommands)

| Subcommand | Flags | `--dry-run` | Notes |
|---|---|---|---|
| `create` | `--subject` (req), `--purpose`, `--intent`, `--scope`, `--evidence-file` | no | Writes draft + `.integrity.json`; runs `mission.create` intake; duplicate-aware advisory via `findSimilarMissions`. Bootstrap uses `persistence: "memory"` for the Studio session. |
| `project` | `--alignment-contract-id` | no | Projects a mission from an approved Alignment Contract (`ProjectMission`). |
| `approve` | `--draft-id` (req), `--alignment-contract-id`, `--complete-first` **(undocumented)** | no | Requires an approved contract (can be inferred, EXP-REUSE-001); verifies draft integrity (EXP-TRUST-002), records decisions (EXP-TRUST-004), asserts the mission branch (ECOSYSTEM-001), materializes the runtime mission, persists the snapshot, then records `MISSION_APPROVAL_APPROVED`. |
| `evidence add` | `--draft-id` (req), `--subject` (req), `--purpose`, `--confidence` | no | Produces a **successor draft** (new id) rather than mutating the old one. |
| `list` | `--status`, `--program` | n/a | Read-only. |
| `show` / `report` | `--id` | n/a | `show` returns kind/priority `"Unknown"` for runtime missions — the projection knows less than the record (see §5.2 #6). |
| `verify-charter` | `--file` (+ `--json`, dry-run-ish analysis) | YES | The largest single command in the CLI (496 lines). |
| `decisions` | `--draft-id` | n/a | Reads the decision chain; verifies it is unbroken. |
| `snapshot` | `<snapshot-id>` or `list` | n/a | Snapshots are persisted certified artifacts. |
| `complete` | `--id` | no | Only precondition exposed: mission is `active`. The real gate is a converged convergence certification (§3 #7). |
| `delete` | `--id`, `--reason` | YES | Blocked when the mission hosts any expedition. |

### 1.2 `synth expedition` (19 subcommands)

| Subcommand | Flags | `--dry-run` | `--no-auto-commit` | Notes |
|---|---|---|---|---|
| `create` | `--mission`, `--subject`, `--goal`, `--scope`, `--intent`, `--template {ci,deployment,observability,documentation}`, `--dry-run` | YES | – | `--mission` may be an existing id **or name**; infers the mission when omitted (unless strict context). Writes draft + integrity, emits `CreateExpedition`. Dry-run writes nothing. |
| `new` | `--subject`, `--goal`, `--mission`, `--scope` | (inherits) | – | Thin wrapper over `create`. |
| `approve` | `--draft-id` \| `--all-drafts --mission`, `--dry-run` | YES | – | Verifies draft integrity, emits `EXPEDITION_APPROVED`. |
| `commit` | `--proposal-id` \| `--all-approved --mission`, `--dry-run` | YES | – | `EXPEDITION_COMMITTED` + retires the draft files. **Does not create a branch** (contrary to older docs). |
| `start` | `--id` \| `--all-committed --mission`, `--no-auto-commit`, `--dry-run` | YES | YES | Auto-chains draft→approve→commit if needed. Creates/checks out the expedition branch **from whatever HEAD is current**. |
| `pause` | `--id` **(not in `--help`)** | YES | – | `executing → paused`. |
| `cancel` | `--id`, `--reason` (req), `--no-lineage-check` **(undocumented)** | YES | – | Terminal-ish; the response's `nextStep` is *`synth expedition start`* (§3 #4). |
| `complete` | `--id`, `--evidence`, `--force` (+`--reason`), `--dry-run` | YES | YES | Gates: dirty source tree, evidence attached, `synth verify` green. Completion is deliberately **not** branch-gated. |
| `finish` | `--id`, `--note`, `--force` (+`--reason`), `--dry-run` | YES | YES | Atomic: attach git-diff evidence → certify convergence (`must == converged`) → complete (skips dirty check). |
| `archive` | `--id`, `--reason` (req), `--dry-run` | YES | – | `executing\|paused\|committed… → archived`; **blocked from `completed`/`cancelled`** (§3 #5). |
| `delete` | `--id`, `--reason`, `--dry-run` | YES | – | Only for expeditions with no objectives; retires draft artifacts chain-safe. |
| `move` | `--id`, `--to-mission`, `--reason`, `--approved`, `--dry-run` | YES | – | Re-parents under scope/intent verification; `--approved` overrides misalignment. |
| `evidence` | `--id`, `--git-diff`, `--baseline`, `--test-results`, `--attach`, `--note`, `--dry-run` | YES | YES | Writes `proof/expeditions/<id>/manifest.json` + attachments; emits `EVIDENCE_ATTACHED`. |
| `refine` | `--id`, `--note` (req), `--depends-on`, `--dry-run` | YES | YES | Edits charter metadata; status unchanged. |
| `certify` | `--id`, `--evaluation`, `--evidence`, `--dry-run` | YES | YES | Emits `CONVERGENCE_CERTIFIED` / `CONVERGENCE_DIVERGED`. |
| `list` | `--mission`, `--status`, `--priority`, `--program`, `--ranked` | n/a | – | Read-only, derived from charters + runtime records. |
| `show` / `explain` | `--id` | n/a | – | `explain` is an alias of `show`. |
| `rank` | `--next`, `--status`, `--program` | n/a | – | Read-only. |
| `report` | `--id` | n/a | – | Rich report incl. evidence + expected output. |

### 1.3 Related ceremony commands (the ones operators actually chain)

| Command | Flags | Role in the ceremony |
|---|---|---|
| `synth alignment prepare` | *(none)* | Fabricates a minimal intent model + contract + divergence gate. The "quick path" to an approvable mission. |
| `synth alignment create` | `--intent-model-id` (req), `--evidence` | Full path: intent model must already be approved. |
| `synth alignment submit` | `--contract-id` | Contract → submitted. |
| `synth alignment approve` | `--contract-id`, `--reason` | Contract → aligned (this is what `mission approve` needs). |
| `synth checkpoint` | *(none)* | 4-step pre-flight: status, replay health, ≥1 executing expedition, branch policy. Exits 1 when blocked. |
| `synth status` | *(none)* | Operator briefing; **refreshes `.synth/ai/*`** before printing (a write-on-read). |
| `synth validate artifact` | `--type {expedition,mission}`, `--file` | Charter validation. |
| `synth validate dependencies` | *(none)* | `dependsOn` resolution across charters. |
| `synth explain lineage / resume` | various | Read-only projections: Mission → Expedition → Objective; "what happened / what's next". |
| `synth log` | `--mission`, `--expedition`, `--type`, `--since`, `--limit`, `--format` | Read-only event query. |
| `synth approval request/grant/deny/list/show` | `--operation`, `--reason`, `--request-id`, `--status` | Two-party approval for destructive operations (not wired into mission/expedition flows as far as this audit found). |

### 1.4 Documentation drift (help text vs. code)

- `expedition pause` exists and works but **is not listed** in `synth expedition --help`.
- `mission approve --complete-first`, `expedition cancel --no-lineage-check` and the
  `SYNTH_AUTO_COMMIT=0` environment switch are **undocumented**.
- `synth mission approve --help` and `docs/operator/01-getting-started.md` omit that
  `--alignment-contract-id` is required (it is; only inference can supply it).
- `--dry-run` is advertised as universal for mutating subcommands in the expedition help footer;
  `mission approve` / `mission complete` / `mission project` have none.
- `synth expedition list --help` says the inventory comes from `docs/expeditions/*.md`; the runtime
  commands (`approve`, `start`, …) operate on `.synth/data` records. Both exist; the help never says so.

---

## 2. The lifecycle as the code actually implements it

```
Mission:     draft ──approve──▶ active ──complete──▶ completed
                └──delete──▶ (deleted)

Expedition:  draft ─approve─▶ approved ─commit─▶ committed ─start─▶ executing ⇄ paused
                                                                      │
                                                     ┌────────────────┼───────────────┐
                                                     ▼                ▼               ▼
                                                  completed       cancelled       archived
```

Observed asymmetries (all reproduced or read from code):

- `committed` is reachable only through `commit`; `start` auto-chains it for convenience.
- `executing → archived` is allowed, but `completed → archived` and `cancelled → archived` are **denied**
  (intake.ts:262-276) — so the archive lane is only reachable by *not* finishing the work.
- `start` accepts `committed | archived | paused | cancelled` (intake.ts:221) — cancelled and archived
  expeditions can be resurrected by `start`, and `cancel` explicitly suggests it.
- `mission complete` has exactly one precondition in the capability registry (`mission_exists_active`)
  plus an invariant check (`CONVERGENCE_CERTIFICATION_REQUIRED`, registry.ts:533). The CLI's error
  suggestion ("Ensure the mission is active and all its expeditions are completed or cancelled",
  synth.ts:3694) describes a rule that is not implemented anywhere.
- There is no `mission → archive` state and no `mission cancel`. Deletion is only allowed for a mission
  with zero expeditions.

Event vocabulary observed in this repo (320 events): `EXPEDITION_CREATED` 53, `EVIDENCE_ATTACHED` 46,
`EXPEDITION_COMMITTED` 33, `EXPEDITION_APPROVED` 33, `CONVERGENCE_CERTIFIED` 33, `EXPEDITION_STARTED` 25,
`EXPEDITION_BRANCH_CREATED` 25, `EXPEDITION_COMPLETED` 24, `GOVERNANCE_SNAPSHOT_CREATED` 17,
`GOVERNANCE_SNAPSHOT_FAILED` 7, `EXPEDITION_DELETED` 4, `EXPEDITION_REFINED` 4, `MISSION_CREATED` 2,
`MISSION_APPROVED` 2, `EXPEDITION_CANCELLED` 2, `MISSION_COMPLETED` 1. Funnel: 53 drafts created,
33 approved, 33 committed, 25 started, 24 completed, 2 cancelled, **0 archived, 0 moved, 0 paused**.

---

## 3. The rules catalog — "weird rules that made sense when the project started"

Each row: the rule, where it lives, the intent it was built for, and what it costs today.

**#1 · Mission approval is blocked while an expedition is executing "in the same mission".**
`intake.ts:84-97`. *Intent:* don't let mission-level intent drift while bounded work is in flight.
*Cost:* the check never receives the mission being approved. `cmdMissionApprove` calls
`gateDecision({ kind: "mission.approve" }, …)` — **without `missionId`** (synth.ts:3432) — so the gate falls
back to *the first mission in state with status `active`* (intake.ts:82). With two active missions in this
repo today, approving Mission B can be blocked (or silently allowed) by an expedition living in Mission A.
The escape hatch `--complete-first` then *force-completes that unrelated expedition* (`force: true`, no
evidence, no verification).
*Already known:* draft expedition `0daac4fc` "Fix mission.approve gate scoping (checks active mission
instead of target mission)". **This audit adds the code-level confirmation and the two-active-mission
trigger condition; do not re-plan it.**

**#2 · Same rule for `mission evidence add`** (`intake.ts:118-130`). Intent: an operator adding evidence
to a draft is probably starting a *new* mission instead of closing the one in flight. Cost: same scoping
hole; the requiredAction text suggests `synth expedition complete --expedition-id <id>` — a flag that only
works because `resolveExpeditionId` silently accepts the alias.

**#3 · Three doctrines about concurrency.**
`intake.ts:154-157`: "multiple expeditions may execute concurrently within and across missions";
`src/cli/agent-artifacts.ts:43`: "Do not begin another expedition until the current expedition is
completed"; the VCS layer: **one working tree, one branch** — so the second `start` checks out a new branch
and the first expedition's branch is abandoned mid-flight (reproduced, §4 R5).

**#4 · Cancel is a detour, not an exit.** `start` accepts `cancelled`, and `cmdExpeditionCancel` prints
`nextStep: "synth expedition start --id <id>"` (synth.ts:6092). A cancelled expedition can silently
re-enter execution.

**#5 · Archive is unreachable from success.** `expedition.archive` blocks when status is
`completed|cancelled|archived` (intake.ts:262-276). The only way to reach `archived` is to archive a live
expedition. *Already known:* draft expedition `729e4e2c` "Allow archiving completed expeditions".

**#6 · Delete only empty entities.** `mission.delete` refuses when `mission.expeditions.length > 0`;
`expedition.delete` refuses when objectives exist. Intended as a safety rail; in practice it means
"nothing can ever be cleaned up" and pushes leftover records into the 49-expedition runtime store.

**#7 · Completion requires a convergence certification, but says something else.**
`registry.ts:533` (mission) and `domain/execution.ts:1151` (expedition) both require a certification.
The mission-path CLI suggestion (§2) is simply wrong text. Note this is *architectural* (part of
ADR-slope convergence), so it should be fixed by better messages, not by removing the invariant.

**#8 · The three completion gates.** `complete`: source tree not dirty (derived state excluded),
≥1 attachment, `synth verify` green. `force` bypasses all three but demands `--reason`; `finish` skips the
dirty check because it captures the diff as evidence first. This part is well-conceived; the only defect
is that the *derived-state exclusion list* misses `.synth/ai/` (§5.1 D1/D6).

**#9 · Branch enforcement is exactly two capabilities wide.** `execution-gate.ts` PHASE 2d gates
`ApproveMission` (mission role) and `StartExpedition` (expedition role) only; "creation and commit are
planning steps and remain branch-agnostic"; completion is deliberately not gated (expedition
`4b5694ab06ccb652` "Debranch expedition completion"). The result is an hourglass: the ledger must be on
a canonical branch to *begin*, nobody ensures it is on a canonical branch to *close*.

**#10 · The lineage guard works but is a symptom.** `guardEventLogLineage` (synth.ts:6102) runs before
`approve|commit|start|finish|complete|archive|cancel`, comparing this checkout's event stream against
every branch that mentions the same expedition id, and blocks with `EVENT_LOG_DIVERGENCE`. It exists
precisely because the ledger is per-branch. Bypass flag `--no-lineage-check` is undocumented.

**#11 · `dependsOn` blocks `start`, not the work.** `isBlockedByUpstreamGate` (review-gate-engine.ts:383)
refuses `expedition.start` while an upstream dependency hasn't passed its review gate. Reasonable — but
combined with #3 it means the plan's dependency graph is enforced only for the one expedition that can
physically hold the working tree.

**#12 · The mission branch is demanded, never created.** `assertExecutionBranch("ApproveMission", …)`
requires `mission/<slug>-<id7>`, but the only branch creator in the codebase is
`ensureExpeditionBranch` (called only from `expedition start`). Reproduced verbatim in §4 R2: the tool
instructs the operator to `git checkout mission/265b36a5a801d8e4` — a branch that does not exist and that
nothing in the CLI will create.

**#13 · Three identifiers per entity.** A mission draft is `c2b7e292cb1fc3c9`; the planning proposal is
`4e3133c31e449f22`; the runtime mission node — the id that appears in `mission list`, in events, and in the
required branch name — is `265b36a5a801d8e4`. The operator must discover the third by reading a denial
message. (Expeditions are luckier: draft id == runtime id.)

**#14 · An outdated enforcement mechanism is still the only enforcement.** ADR-053 ("Branch Derivation
Must Carry the Executing Expedition's `.synth/data`", 2026-08-24) decided that follow-up branches must be
based on the executing expedition's branch, to be checked **by hand, by the agent/human, before creating
the branch** — deliberately no code. Its Decision 4 names the real fix: *"a mission/expedition creation
handler that lands mission/expedition events directly into the durable, centralized event source
(effectively `main`)"*. That decision was never implemented; §5.1 shows it is the root cause of the
artifact-wipe complaint.

---

## 4. Reproductions

Lab = fresh clone of the tracked tree (so: same code, same charters, same event stream at baseline) in
`/tmp/lab`, running the real CLI (`dist/cli/entry.js`) with `cwd=/tmp/lab`. Because `git add -A` skips
ignored paths, the lab does not carry the 28 ignored-but-tracked files of the real repo; for every claim
that depends on those files the real repo was probed directly (R7).

**R1 — the minimal ceremony is not minimal.** `mission create` produced confidence **0.67** against the
Studio's approval threshold of **0.70**. `mission approve` correctly refused ("Confidence 0.67 below
threshold 0.7"). Each `mission evidence add` raised confidence by ~0.02 → **three evidence rounds** were
needed to cross 0.70 (0.69 → 0.71 → 0.71). Final path: 1 create + 3 evidence + 1 approve + 1 branch
created by hand. Also: every evidence round mints a *successor draft* with a new id — the operator must
track the newest id each time, while the runtime node id stays stable across successors.

**R2 — the branch that the tool demands does not exist.**

```
$ synth mission approve --draft-id bd6c604e08d3e464 --alignment-contract-id alignment-contract-mv512fld-rj6aff
{ "status": "error", "kind": "BranchPolicyDenied",
  "error": "BRANCH_POLICY_DENIED for ApproveMission: mission execution must run on mission/265b36a5a801d8e4;
            current branch is main\nRequired branch: mission/265b36a5a801d8e4",
  "suggestion": "… git checkout mission/265b36a5a801d8e4" }

$ git checkout -b mission/265b36a5a801d8e4     # created by hand; nothing else will
$ synth mission approve …                       # succeeds
```

**R3 — what each ceremony writes, and whether git keeps it.** (`??` = untracked, `M` = modified tracked,
on a branch with no commits yet beyond baseline.)

| Step | Files produced | Git status after |
|---|---|---|
| `mission create` | `drafts/<id>.json` + `.integrity.json` | untracked, **gitignored** |
| `alignment prepare` | `referenceEvidence/…json`; 4 partition files | untracked / modified tracked |
| `mission approve` | `missions/<id>.json`, `snapshots/<id>.json`, `decisions.jsonl`, partitions, canonical-state | **all untracked or uncommitted** |
| `expedition create` | `drafts/<id>.*`, `expeditions/<id>.json`, partitions | untracked / modified |
| `expedition approve` | partitions, canonical-state, `decisions.jsonl` | uncommitted |
| `expedition commit` | partitions; **deletes the draft files** | uncommitted |
| `expedition start` | creates+checks out the branch; `autoCommit` fires | committed **on the new branch only** (with auto-commit working; in the real repo it fails — R7) |
| `expedition finish` | evidence + certification + completion events | committed on **whatever branch you were standing on** (R5) |

Two facts stand out: (a) the *only* git commit in the whole ceremony is the auto-commit, which is broken
in the real repo; (b) the planning artifacts (`drafts/`) are gitignored, so the "record of intent" exists
as an ignored file that no clone, CI run, or reviewer will ever see.

**R4 — abandonment wipes the record.** With expedition 1 executing on its branch and a clean tree:

```
$ git checkout main && git branch -D expedition/lab-ceremony-265b36a/lab-expedition-one-e9ededf
$ ls .synth/data/missions/       → 4ab7e9d2cc7b1b66.json  9861cf62476c90ae.json   # lab mission gone
$ ls .synth/data/expeditions/    → 49 files                                             # lab exp gone
$ ls proof/expeditions/          → 23 entries                                           # lab proof gone
$ synth status                   → "Mission \"Framework Maturation v2\" is approved and ready for Expeditions."
                                   activeExpeditions: []                                # no trace, no warning
```

The mission, the expedition, its evidence and its certification existed *only* on the deleted branch.
This is exactly the failure the user described: abandoning an expedition takes unrelated governance
artifacts with it. (Untracked artifacts such as the current draft files follow a `checkout`, so they are
not wiped by switching — but they are invisible to everyone else and die to `git clean` or a fresh clone.)

**R5 — a second expedition forks the first one.** Starting expedition 2 while expedition 1 was executing
(and *without* leaving expedition 1's branch) created `expedition/lab-ceremony-265b36a/lab-expedition-two-a126544`
**on top of expedition 1's commits**:

```
$ git log --oneline -3
0adcfaf chore(synth): record expedition-start for expedition a126544d36dcb31b
847b613 chore(synth): record expedition-refine for expedition e9ededfb6ea07753   ← expedition 1's state
c51f081 lab baseline
```

Then `expedition finish --id <expedition 1>` succeeded **from expedition 2's branch** and committed
expedition 1's evidence/certification/completion onto expedition 2's line of history
(`da194ed chore(synth): record expedition-finish for expedition e9ededfb6ea07753`).

Consequences: expedition 2's branch contains expedition 1's unmerged work and governance state; expedition 1
is "executing" in state but has no checked-out branch; finishing 1 writes to 2's branch; merging 2 to main
drags 1's unmerged source along; deleting 2 (as an abandoned experiment) destroys 1's completion record.
Meanwhile `synth checkpoint` reports **ok** because it matches the current branch against *any* executing
expedition (`resolveCheckpointBranch`, synth.ts:848-895) — the design acknowledges the plural case but the
VCS cannot honour it.

**R6 — `mission complete` is blocked by an invisible gate and explained wrongly.**

```
$ synth mission complete --id 265b36a5a801d8e4
{ "status": "error", "kind": "MissionCompleteFailed",
  "error": "[EXECUTE_DOMAIN] ExecutionGate rejected at EXECUTE_DOMAIN:
            CONVERGENCE_CERTIFICATION_REQUIRED: Mission 265b36a5a801d8e4 cannot be completed
            without a converged certification",
  "suggestion": "Ensure the mission is active and all its expeditions are completed or cancelled." }
```

The suggestion and the actual rule have nothing to do with each other (§3 #7).

**R7 — auto-commit has been dead since 2026-08-23 (real repo, non-mutating proof).**

The CLI's auto-commit collects *every* file under `.synth/data` + `proof/expeditions` + three root files
(145 paths today), filters them with `git check-ignore --stdin`, then runs
`git add -- <survivors>` and `git commit -m … -- <staged>`.

- `git check-ignore` **does not report index-tracked paths** (that is what `--no-index` is for):
  `printf '.synth/data/drafts/190a72e71fbe3c14.json\n' | git check-ignore --stdin` → **exit 1, no output**;
  with `--no-index` → the path is reported.
- 19 of the 145 collected paths are *tracked but ignored* drafts (`git ls-files` ∩ `.gitignore`), plus
  `.synth/ai/*`, `.synth/data/cli-errors.jsonl`, `.synth/context.json`, `.synth/discovery/*` are in the same state (28 tracked-but-ignored files in total, per `git ls-files -i -c --exclude-standard`).
- Therefore the filter keeps them, and `git add` refuses the whole pathspec:
  `git add -n -- <the CLI's own 145-path list>` → **exit 1**, `The following paths are ignored by one of your .gitignore files: .synth/data/drafts`.
- The refusal is swallowed (best-effort), so every transition returns
  `autoCommit: { committed: false, reason: "Failed to stage derived state: …" }`.

Dates pin the regression: the ignore rules were added by commit `80a93b4` ("expedition(68b59f0e): implement
CLI verb-consolidation Phases 0-2", **2026-08-23**) without untracking the files; the last successful
`chore(synth): record …` commit is `9208648` (**2026-08-23**). There are 33 such commits in history and
**none after that date**. What replaced them: hand-made anchoring commits
(`3589d5c chore(synth): anchor f4e4850f completion state`, `6cbacc8 chore(synth): anchor 5c2b2db1 completion state`).
In other words: the ledger has not been committed automatically for ~7 weeks, and the operators built a
manual workaround that the tooling neither documents nor performs.

---

## 5. Verdict

### 5.1 Broken (defects with a reproduction)

| # | Defect | Evidence |
|---|---|---|
| D1 | **Auto-commit fails on every transition** (ignored-but-tracked paths kill `git add`); derived state silently stops being recorded. | §4 R7 — exit codes, dates, 145-path list |
| D2 | **`.synth/ai/` is missing from `DERIVED_STATE_PATTERNS`** (synth.ts:361-367), so its churn counts as *source* dirt and can block `expedition complete`. | code + `synth status` rewrites 2 tracked files per run |
| D3 | **`mission.approve` gate scoping** — checks the first active mission, not the target; `--complete-first` can force-close an unrelated expedition. | §3 #1, intake.ts:82 + synth.ts:3432 |
| D4 | **`mission complete`'s suggestion describes a rule that does not exist.** | §4 R6 |
| D5 | **Help/flag drift** — `pause`, `--complete-first`, `--no-lineage-check`, `SYNTH_AUTO_COMMIT` undocumented; `--alignment-contract-id` omitted from getting-started. | §1.4 |
| D6 | **Planning artifacts are gitignored by construction** — drafts, snapshots and decision records are invisible to any other clone until someone commits them; `decisions.jsonl` is untracked and *never* committed by any command. | §4 R3 |
| D7 | **Completion is written to whichever branch you stand on** — finishing expedition 1 from expedition 2's branch records it on branch 2. | §4 R5 |
| D8 | **Stale tracked `event-log.jsonl` (262 events)** is still in the auto-commit list (and in `DERIVED_STATE_PATTERNS`) even though the segment store superseded it (`886dc15e`). | code + repo state |

### 5.2 Bonkers (rules/structures that no longer fit the system they govern)

1. **The concurrency contradiction** — the gate says parallel expeditions are fine, the agent contract says
   never to do it, and git allows exactly one. The system pays for all three beliefs at once. (§3 #3, R5)
2. **Mission branches are demanded but not created**, and their names are only discoverable by being
   denied. (§3 #12, R2)
3. **Three IDs per mission** (draft / proposal / node) and legacy raw-id branch names mixed with slug names. (§3 #13)
4. **Cancel invites restart; archive requires you not to have finished; delete requires emptiness.** The
   terminal states form a maze with no exit: 0 archives, 0 pauses, 2 cancels in 49 expeditions. (§3 #4-6)
5. **Enforcement by discipline**: ADR-053's branch-base rule is a documented instruction to humans/agents,
   and it is the current answer to a durability bug. Rules that only exist in prose are how "weird rules"
   accumulate. (§3 #14)
6. **Read commands that write** (`synth status` refreshing `.synth/ai/`) and read commands that lie
   (`mission show` → `"kind": "Unknown"`). Derived-state integrity was the earlier audit's subject; it
   still holds.
7. **Ceremony vocabulary inflation**: 19 expedition subcommands, 12 mission subcommands, 7 lifecycle events
   per successful expedition (`CREATED → APPROVED → COMMITTED → BRANCH_CREATED → STARTED → EVIDENCE_ATTACHED
   → CONVERGENCE_CERTIFIED → COMPLETED`) for what an operator experiences as "I did a piece of work".
   The folding work already drafted (`8ed4c924`, `29b9a370`, `761c9be3`, `424e13e7`, `17a5c207`, `eb5e0740`)
   targets exactly this; ADR-054 (proposed earlier today) is its design.

### 5.3 Reliable (keep, and build on)

- **Event sourcing + the ExecutionGate boundary**: every mutation is an event; the gate is the only writer.
- **Replay verification**: `explain replay` is consistent today (320 events, hash `97055763`), and the
  lineage guard is a correct-if-unnecessary safety net (`e617ccd0`).
- **The dry-run discipline** (14 of 19 expedition subcommands) and the recent fix that made `evidence` /
  `certify --dry-run` truly read-only (`5c2b2db1`).
- **Branch naming as a single source** (`190a72e7`, `c6f9251b`) with slug-then-legacy candidate matching —
  good machinery, wrong owner (nothing creates mission branches).
- **The completion gate trio** (dirty tree / evidence / verification) and **`expedition finish`** as an
  atomic operation: the right instinct — the same atomicity is now needed for *delivery*.
- **`ADRs 034/051/053`** as an honest paper trail: the root cause and its remedy are already written down.

---

## 6. Coverage map — what already has an owner (do not re-plan it)

| Concern | Already owned by |
|---|---|
| Runtime mission/expedition gate scoping bug (#1) | draft `0daac4fc9df96606` |
| Archive from terminal states (#5) | draft `729e4e2c17add703` |
| Auto-commit ignoring gitignored paths (D1) | draft `e8ba8f92d0105412` (EXP-AUTO-COMMIT-001) |
| Derived-artifact exclusion from completion gate (D2) | draft `0463c2cae71ac727` (pointer evidence) |
| Monolithic state / per-entity derivation | completed `886dc15e19a8e587` |
| Cross-branch event-log linearity | completed `3c84f699a7c932fc` + `e617ccd0ac6d60b8` |
| Debranching completion | completed `4b5694ab06ccb652` |
| Expedition lifecycle simplification / termination unification | completed `dac069e8cc375a6b`, committed `bc9c51e0674ec0ef` (ADR-054 vehicle) |
| Verb folding, governance-cluster redesign | drafts `29b9a370`, `8ed4c924`, `761c9be3`, `424e13e7`, `17a5c207`, `eb5e0740` |
| Unified lifecycle states (7 → 6 verbs, dispositions) | proposed ADR-054 (`docs/adr/ADR-054-unified-lifecycle-state-machine.md`) |

**Not owned by anything** (the genuine gaps this audit found):

1. the *ledger placement* protocol — where lifecycle events are written relative to branches (ADR-053 D4);
2. the *delivery* ceremony — how a finished expedition's branch and files reach `main` (the user's
   "CI-green-then-complete" mess);
3. the *abandonment/handoff* protocol — what survives when a branch is walked away from;
4. *execution isolation* — how more than one expedition can actually be in flight;
5. making `mission/<id>` branches real (or deleting them from the state machine).

These five are proposed as **ADR-055 — Ceremonial Events: ledger placement, branch protocol, and delivery**,
in `docs/adr/ADR-055-ceremonial-events.md`.

---

## 7. Answers to the questions that were asked

- **"Constraints when a mission is executing?"** Missions do not execute; expeditions do. The mission-level
  rules are two: you may not approve a mission draft / add evidence to it while an expedition is executing
  "in the same mission" (#1-#2), and you may not complete a mission without a converged certification (#7).
  The first pair is mis-scoped in code; the second is mis-explained in the CLI.
- **"Problem if you try to execute multiple expeditions?"** Yes, and it is structural, not a bug: the gate
  permits it, the agent contract forbids it, and the branch model makes the second `start` fork the first
  expedition's history (R5). The real fix is one worktree per executing expedition (ADR-055 §2.4).
- **"If I abandon or cancel, will unrelated artifacts be wiped?"** Yes (R4): mission records, expedition
  records, evidence and the entire lifecycle history for that work live only on the branch, because
  auto-commit is broken and because nothing writes the ledger to `main` at creation time.
- **"Expedition finishes only in its branch — how to handle the files/branch/PR/CI ceremony?"**
  Today: by hand, after the fact, with the branch delete/push/merge sequence untracked by SYNTH. ADR-055
  proposes `expedition integrate`/`seal` as first-class, ordered *after* merge and *before* completion.

---

## Appendix A — exact lab commands

```bash
# lab build (from the repo, tracked files only)
git -C /home/user/synth archive HEAD | tar -x -C /tmp/lab
ln -s /home/user/synth/node_modules /tmp/lab/node_modules
cd /tmp/lab && git init -q -b main && git add -A && git -c user.email=… commit -qm baseline

# the ceremony (ids as produced in the lab)
synth mission create --subject "Lab Ceremony" --purpose "…"
synth alignment prepare
synth mission approve --draft-id c2b7e292cb1fc3c9 --alignment-contract-id alignment-contract-mv512fld-rj6aff   # denied (branch)
git checkout -b mission/265b36a5a801d8e4
synth mission evidence add --draft-id c2b7e292cb1fc3c9 --subject "Lab 1" --purpose "…" --confidence high      # ×3
synth mission approve --draft-id bd6c604e08d3e464 --alignment-contract-id alignment-contract-mv512fld-rj6aff   # ok
synth expedition create --mission 265b36a5a801d8e4 --subject "Lab Expedition One" --goal "…" --scope "src/**"
synth expedition approve --draft-id e9ededfb6ea07753
synth expedition commit --proposal-id e9ededfb6ea07753
synth expedition start  --id e9ededfb6ea07753          # creates + checks out the expedition branch
synth expedition refine --id e9ededfb6ea07753 --note "x"   # commits derived state on this branch
# second expedition (R5)
synth expedition create --mission 265b36a5a801d8e4 --subject "Lab Expedition Two" --goal "…"
synth expedition approve --draft-id a126544d36dcb31b && synth expedition commit --proposal-id a126544d36dcb31b
synth expedition start  --id a126544d36dcb31b          # branch based on expedition 1's tip
synth expedition finish --id e9ededfb6ea07753 --note "lab"   # exp 1 completion lands on exp 2's branch
# abandonment (R4)
git checkout main && git branch -D expedition/lab-ceremony-265b36a/lab-expedition-one-e9ededf
synth status
```

## Appendix B — real-repo probes (non-mutating)

```bash
git ls-files .synth | sed 's|/[^/]*$||' | sort | uniq -c        # 91 tracked: 49 expeditions, 19 drafts, 6 ai, …
printf '.synth/data/drafts/190a72e71fbe3c14.json\n' | git check-ignore --stdin          # exit 1 (tracked ⇒ hidden)
printf '.synth/data/drafts/190a72e71fbe3c14.json\n' | git check-ignore --no-index --stdin  # path reported
git add -n -- $(cat /tmp/stageable.txt)                          # exit 1: "paths are ignored … .synth/data/drafts"
git log --all --grep="record expedition" --format="%h %ad %s" --date=short | head
git log -1 --format="%h %ad %s" --date=short 80a93b4             # the .gitignore regression, 2026-08-23
```

---

## Addendum — 2026-10-12, after operator review

Three corrections/additions from the operator, recorded here because they change part of the analysis:

1. **The drafts/ai ignore rules were a regression against explicit operator intent** — those artifacts are
   *meant* to be tracked; the operator had previously had to argue the point with an agent, and commit
   `80a93b4` re-ignored them. Accordingly, ADR-055 §2.2/§2.8 now prescribe **restoring tracking** (drop the
   `.synth/data/drafts/` and `.synth/ai/` ignore rules; keep only true caches ignored) plus making the CLI's
   staging filter robust (`--no-index` classification; skip only ignored **and** untracked paths) — instead
   of the "untrack the drafts" direction in the original §2.8.
2. **New proposal — ADR-056: Operator-Declared Execution Branches.** A `--branch <name>` flag (on
   `mission approve`, `expedition commit`, `expedition start`) binds the entity to an operator-named branch,
   recorded on the ledger; `--no-create` declares that the branch already exists (validate + check out,
   never create). `resolveExecutionBranch` consults the recorded binding before the naming convention. This
   is what makes the current session's fixed branch (`arena/c5db653e-synth`) usable for governed work at
   all. See `docs/adr/ADR-056-declared-execution-branches.md`.
3. **Push/remote investigation** (the former ADR-055 Q2): `main` is protected, yet the last 60 non-merge
   commits on `origin/main` are all direct pushes by the operator, including every `chore(synth): anchor …`
   commit; CI on push to `main` is Documentation + Publish + Proof Gate, and CI never writes back.
   Conclusion recorded in ADR-055 §2.9: ceremonies stay local, the ledger is promoted at `seal`/`complete`
   by a single promoter (the operator's clone) using the existing direct-push path, agents reconcile via a
   deterministic union-by-event-id, and docs workflows gain `paths-ignore: [".synth/**"]` while Proof Gate
   keeps running on ledger pushes.

---

## Addendum 2 — 2026-10-12, after the second round of investigation

Two lab investigations, both reproduced rather than reasoned:

**A. The ledger is a global hash chain — single-writer is structural, not policy.** Two clones of this
repository each ran one `alignment prepare` ceremony and were then merged: all four event-stream segments
plus `canonical-state.json` and `dependency-records-cache.json` conflicted, and both clones had assigned the
**same offsets** (317/321/326) to *different* events. A careful union-by-id merge with renumbered offsets
does not fix it: every event's `previousHash` chains to the *last event in the stream*
(`execution-gate.ts:162`), so replay reports `Hash-chain broken at index 1 … previousHash mismatch`
(337 events). Consequences recorded in ADR-055 §2.9: (i) a single writer host is required today; (ii) other
clones must *import* through the ExecutionGate (sorted, deduped, re-chained, `LEDGER_IMPORTED`), never
text-merge; (iii) PR merges that carry `.synth/**` bypass the gate and the lineage guard entirely; (iv) main
lags the host between promotions, so `status`/`doctor` must report "ledger ahead by N ceremonies".

**B. Anchor mechanics verified in a lab** (ADR-055 §2.10): `git worktree add --detach .synth/anchor main`
works inside the repo and must be gitignored; a sparse anchor
(`sparse-checkout set --no-cone '.synth/' 'proof/'`) suffices and avoids doubling the tree; advancing the
canonical branch is clean while other worktrees sit elsewhere, but a worktree **on** the canonical branch
ends up with staged deletions of the new ledger files — `git reset --keep` does not repair it, while
`git restore --source=HEAD --staged --worktree -- .synth proof AGENTS.md` does (and clobbers local ledger
edits, so a dirtiness check must precede it); deleting the anchor leaves it `prunable` and re-addable, so
`doctor` can repair it.

## Addendum 3 — 2026-10-12, findings while executing the bootstrap

1. **`expedition refine --depends-on` can set but never clear a dependency.**
   `refineExpedition` replaces `dependsOn` only when an array is passed
   (`planning.ts:250`), while the CLI omits the field when the parsed list is empty
   (`synth.ts`, `dependsOn.length > 0 ? { dependsOn } : {}`). An omitted list means
   "leave unchanged", so a wrong edge cannot be removed through any verb. Live
   consequence: an E1 draft received a wrong edge (E1→E3) and had to be
   **deleted and recreated** (`expedition delete` … `create`), which is the only
   CLI-native correction. Fix belongs with the ADR-054 verb work (a `--clear-depends`
   or `--depends-on ""` contract).
2. **`expedition evidence --git-diff --baseline <ref>` is not range-scoped.** With a
   clean tree it diffs `<ref>..HEAD` (or worktree state), so the artifact includes every
   ledger commit since the baseline and — on a second run — its own previously written
   patch file. In this session the unrestricted capture was 0.9–1.4 MB of ledger noise
   for a 3-file source change; a scoped `--attach` patch (16 KB) was used instead.
   Evidence capture needs a `--range <from>..<to>` (and a ledger-exclusion) option.
3. **The existing auto-commit test did not cover the real failure.** `tests/expedition-auto-commit.test.js`
   passes on unpatched code because its temp project has no tracked-but-ignored files;
   the bug requires the repository's own condition (drafts/ai tracked *and* ignored).
   `tests/auto-commit-ignored-paths.test.js` (added with E1) recreates it and fails
   before the fix.
4. **`tests/expedition-auto-commit.test.js` sub-test 3 is red on unpatched code too**
   (`Convergence certification must converge, got diverged` in the test helper,
   reproduced against `ac4e81a`'s CLI). Pre-existing rot, unrelated to E1; the suite
   aborts there, so sub-tests 4–6 are not exercised by that file today.

## Addendum 4 — 2026-10-12, the legacy monolith (`event-log.jsonl`)

Operator question: *"Don't we need the `event-log.jsonl`?"* — **Not the data** (it is a
provable subset of the event-stream), **but three code paths still read the file**, and one
of them is broken *because* of it, so the file is not safe to delete until the
snapshot/verify path is migrated.

1. **The data is redundant — proven field-by-field, not assumed.** The monolith has 262
   events; all 262 are present in `.synth/data/event-stream/` with **identical `type`,
   `timestamp`, `capability`, `actor`, `transactionId`, `previousHash`, `eventHash` and
   `payload`** — 0 missing ids, 0 field mismatches. `legacy_hashes ⊆ stream_hashes`,
   `legacy-only = 0`, stream = 377 events. The store is
   explicit: *"The event-stream is the sole authority for the event log. There is no
   monolithic `event-log.jsonl` and no migration path"* (`src/infra/event-store.ts:341`).
   `synth explain replay` → `consistent: true`.

2. **Snapshot metadata reads its offset from the monolith.** `getEventOffset()`
   (`src/adapter/git-snapshot.ts:222`) returns the file's **line count**, so snapshot
   records and tag commit messages say `Event log offset: 262` while the true offset is 377.
   `src/control/execution-gate.ts:772` already uses `eventStore.count()` — the adapter was
   never migrated.

3. **A commit-on-change snapshot would now fail on the ignored file.** `SNAPSHOT_FILES`
   includes `.synth/data/event-log.jsonl`, and `snapshot()` stages that list with
   `git add -- <files>` (`git-snapshot.ts:389`, strict error handling). Reproduced:
   `git add --dry-run -- .synth/data/event-log.jsonl` → exit 1,
   *"The following paths are ignored by one of your .gitignore files"*. Current config
   defaults to `snapshotPolicy: tag-only`, which is the only reason this has not bitten yet
   (same class as D1/D3, in a second code path).

4. **Snapshot verification is already broken on this branch.** `verifySnapshotAtTag()`
   requires the monolith **at the tagged commit** and replays it. All three current
   `synth-*` tags contain no `event-log.jsonl` (E1's index surgery untracked it), so:
   `synth snapshot verify --tag synth-expedition/cfbb801aa232795a` →
   `{"ok": false, "consistent": false, "reason": "Event log missing at tagged state", "eventCount": 0}`.
   `tests/governance-git-snapshot.test.js` still seeds its own monolith, so the suite stays
   green while the ceremony is broken.

**Recommendation.** Do not delete the file yet, and do not leave it as unexplained dead
weight. Finish the migration in one expedition: derive the offset from `eventStore.count()`,
drop the monolith from `SNAPSHOT_FILES`, make `verifySnapshotAtTag` replay `event-stream/`,
and update the test to stop seeding a monolith. After that lands the file is provably inert
and can be deleted with the operator's confirmation. This belongs with F1 ("the Proof Gate
does not run the suite"): both are verification paths that report success without verifying.
