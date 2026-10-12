# AUDIT — the mission/expedition command surface, and why ceremonies leak

**Status:** evidence gathered at HEAD `63ed64f` (`arena/c5db653e-synth`), 2026-10-12. Read-only in the live
repo; every side-effecting probe ran in a throwaway clone (`/tmp/synth-lab`).
**Companions:** `docs/audits/mission-expedition-cli-audit-2026-10-12.md` (the earlier audit + reproductions R1–R5; this document
supersedes its *inventory* sections and adds the E4/E5-era rules), `docs/adr/ADR-055-ceremonial-events.md`
(rev 2, the proposal), `docs/plans/master-delivery-plan.md` (rev 3.4).

This document answers six questions, in order:

1. what the mission/expedition commands *are* and every flag they take (§1);
2. the lifecycle as the code actually implements it (§2);
3. the rules and constraints that apply while a mission/expedition is executing (§3);
4. what happens if you try to run two expeditions (§4);
5. which artifacts get wiped, and where "we lose stuff" really comes from (§5);
6. why finishing on a branch forces manual integration (§6).

---

## 0. The model in plain language

Four nouns carry all the weight:

| Noun | What it is | Where it physically lives |
| --- | --- | --- |
| **Mission** | a bounded strategic goal (`{"id","status","expeditions":[…]}`) | a JSON record the runtime rebuilds from events |
| **Expedition** | one unit of executable work under a mission; carries `status`, `objectives`, `dependsOn`, evidence | same |
| **Ceremony** | one lifecycle verb invocation (`mission approve`, `expedition finish`, …). Every ceremony appends one or more **events** through a single gate, then (maybe) commits | `.synth/data/event-stream/partition-N/segment-*.jsonl` + projections (`canonical-state.json`, `.synth/data/{missions,expeditions}/*.json`) |
| **Ledger** | the canonical state + event stream + evidence, reconstructed by replay | **tracked in Git, in the working tree of whatever branch you are standing on** |

The crucial sentence is the last row. The ledger is a *database expressed as files in your working tree*. It
is chained: every event stores `previousHash = hash(previous event)` computed across the whole log
(`src/api/index.ts:372-379`; `src/control/execution-gate.ts:501-505`). Two writers anywhere produce two
chains; the chains **cannot** be text-merged (§6, reproduced).

Everything else in this document follows from that design choice.

---

## 1. The surface (exact, from code at `63ed64f`)

### 1.1 `synth mission` — 12 subcommands

| Subcommand | Flags (code) | Notes |
| --- | --- | --- |
| `create` | `--subject --purpose --scope --intent --evidence-file` | writes a draft + planning proposal + integrity record |
| `project` | `--alignment-contract-id` | projects a mission from an approved contract |
| `approve` | `--draft-id --alignment-contract-id --complete-first --branch --no-create` | the heavy one; `--complete-first` force-completes a *blocking* expedition (§3 R1) |
| `evidence add` | `--draft-id --subject --purpose --confidence` | blocked while an expedition executes in "the" active mission (§3 R2) |
| `list` | `--status --program` | |
| `show` | `--id` | |
| `verify-charter` | `--file` | |
| `decisions` | `--draft-id` | |
| `snapshot` | `[<snapshot-id>\|list] --id` | |
| `report` | `--id --human` | |
| `complete` | `--id` | shell for the `CompleteMission` capability (release guidance) |
| `delete` | `--id --reason --dry-run` | allowed only for missions with **zero** expeditions (§3 R6) |

`synth mission certify` intentionally does not exist and returns guidance to use `complete`.

### 1.2 `synth expedition` — 19 subcommands

| Subcommand | Flags (code) | Ledger commit? (§5 V1) |
| --- | --- | --- |
| `create` | `--mission --subject --goal --scope --intent --template --dry-run` | **no** — leaves dirty ledger |
| `new` | `--mission` | template helper |
| `approve` | `--draft-id --all-drafts --mission --dry-run` | **no** |
| `commit` | `--proposal-id --all-approved --mission --branch --no-create --dry-run` | **no** — records the branch binding |
| `start` | `--id --mission --all-committed --branch --no-create --dry-run` | **yes** (`:6278`) — and it *switches your branch* unless `--branch` is given (§4) |
| `pause` | `--id --dry-run` | **no** |
| `cancel` | `--id --reason --dry-run` | **no**; a cancelled expedition is re-startable (§3 R4) |
| `complete` | `--id --evidence --force --reason --dry-run` | **yes** (`:6705`) |
| `finish` | `--id --force --reason --note --dry-run` | **yes** (`:6800`) — evidence → certify → complete |
| `archive` | `--id --reason --dry-run` | **no**; refuses `completed`/`cancelled`/`archived` (§3 R5) |
| `delete` | `--id --reason --dry-run` | **no**; deletes the draft + integrity records (§5 V4) |
| `move` | `--id --to-mission --approved --reason --dry-run` | **no** |
| `evidence` | `--id --attach --git-diff --baseline --test-results --note --dry-run` | **yes** (`:7242`) |
| `refine` | `--id --note --depends-on --dry-run` | **yes** (`:7324`) |
| `certify` | `--id --evaluation --evidence --dry-run` | **yes** (`:7535`) |
| `list` | `--mission --status --priority --program --ranked` | |
| `show` (`explain`) | `--id --human` | |
| `rank` | `--next --status --priority --program --human` | |
| `report` | `--id --human` | |

Six of nineteen verbs auto-commit; **thirteen leave the ledger modified but uncommitted** (proved in the lab,
§8 L2: after create → approve → commit → start → evidence → refine → cancel → delete, our probe's HEAD
never moved while `git status` grew from 1 to 8 dirty ledger entries — the one commit we saw was a manual
`lab base` commit).

### 1.3 Related commands the ceremonies actually chain

`checkpoint` (pre-flight: status + replay + **an executing expedition** + branch check), `status`
(operator briefing; branch-local), `explain {replay,lineage,resume,proposals,graph,diagnostics,governance}`,
`verify`, `certify`, `validate artifact`, `evidence add`, `doctor` (runtime + project health; **no ledger
or branch checks today**), `program {list,show,rank}`, `release`, `task run`, `adapter promote` (a manual
branch merge/push that no ceremony invokes; `src/adapters/repository/git.ts:459-478`).

### 1.4 Three identifiers per entity (unchanged from the earlier audit, §3 #13)

A mission draft id (`c2b7e292…`), a planning proposal id (`4e3133c3…`), and the runtime mission id
(`265b36a5…`) are three different strings; only the third appears in `mission list`, events and required
branch names. Expeditions are luckier (draft id == runtime id) — but `expedition create` still prints the
*proposal* id in its `nextStep` while `commit` needs the *draft* id (reproduced in the lab: calling
`commit --proposal-id <proposal>` returns `ExpeditionNotFound`, §8 L3).

---

## 2. The lifecycle as implemented

Statuses (`src/domain/planning.ts`):

```
Mission:    draft → active → completed | archived          (delete: only if expeditions == [])
Expedition: draft → approved → committed → executing ⇄ paused
                     ↘ cancelled            ↘ completed
                     archived (from any non-terminal, never from completed)
```

Rules that are enforced in code (`src/domain/planning.ts`, `src/governance/intake.ts`,
`src/domain/execution.ts`):

- `approve` requires `draft`; `commit` requires `approved`; `complete` requires `executing` (planning.ts:46,
  154, 191, 206-224).
- `start` accepts `committed | archived | paused | cancelled` — so **cancel/pause/archive are resumable
  detours**, not exits (`startExpedition`, planning.ts:166-177; `intake.ts` startable statuses).
- `archive` refuses `completed | cancelled | archived` (planning.ts:191-205 + intake.ts) — a completed
  expedition can never be archived; the only way into `archived` is from a live state.
- `delete` refuses anything with objectives (`intake.ts` expedition.delete; `execution.ts` throws
  `INVARIANT_VIOLATION: can only delete an empty expedition that has no objectives`).
- `mission complete` does not check that its expeditions are closed; a mission auto-completes when its last
  expedition terminates (`src/runtime/governance-lifecycle.ts:19,127`) — so `mission complete` is mostly a
  shell for release guidance.
- Completion gates for `expedition complete`: source tree not dirty (derived state excluded), ≥1 attachment,
  `synth verify` green; `--force --reason` bypasses all three. `finish` = attach diff + certify + complete
  with the dirty check skipped (synth.ts:6566, 6737).

Two shortcuts worth knowing before reading the rest:

- `expedition start` **auto-approves** a draft and **auto-commits** an approved expedition
  (`startOneExpedition`, synth.ts:6119-6280). One verb, up to three state transitions.
- The intake gate is a *coarse* filter (status preconditions + mission-level blocks). The real invariants
  live in the pure domain functions and in the ExecutionGate.

---

## 3. Rules catalog — what applies while a mission/expedition is executing

| # | Rule | Where | Intent | Cost today |
| --- | --- | --- | --- | --- |
| R1 | `mission approve` is **BLOCKed while an expedition is executing in "the active mission"**; escape hatch `--complete-first` force-completes that expedition (`force:true`, no evidence, no verification) | `intake.ts:82-97`; `cmdMissionApprove` synth.ts:3469+ | don't let intent drift while bounded work is in flight | the gate receives no mission id, so it uses *the first active mission* → with 2 active missions the wrong mission can block; the escape hatch silently force-completes unrelated work |
| R2 | `mission evidence add` has the same block | `intake.ts:118-130` | operator likely starting a new mission | same scoping hole; the suggested command names a flag alias that only works by accident |
| R3 | Expeditions may be created at any time; **"multiple expeditions may execute concurrently"** | `intake.ts:154-157` (comment) | enable parallelism | the VCS has one working tree; the agent contract (`src/cli/agent-artifacts.ts`) says the opposite; §4 |
| R4 | `cancel` is a detour: cancelled expeditions are `start`-able again, and `cancel` prints `nextStep: start --id <id>` | planning.ts:166-177; synth.ts:6450+ | allow resuming after abandonment | "cancelled" doesn't mean done; a cancelled expedition re-enters execution without ceremony |
| R5 | `archive` is unreachable from success | planning.ts:191-205 | keep archives for live/stale work | completed expeditions can only be deleted (and delete refuses non-empty ones) → nothing is ever cleaned up |
| R6 | `delete` only for **empty** entities (mission with 0 expeditions, expedition with 0 objectives) | planning.ts:100-113, 261-270; `execution.ts` | safety rail | in practice nothing can be removed; the runtime store keeps 54 expedition records / 4 missions / 31 drafts (§7) |
| R7 | **Branch enforcement is two capabilities wide**: `ApproveMission` (mission role) and `StartExpedition` (expedition role) | `src/control/execution-gate.ts` PHASE 2d; `branch-policy.ts:resolveExecutionBranch` | branch sanity at the two "begin" points | completion/cancel/delete/evidence are ungated by branch (deliberately: expedition `4b5694ab`); the ledger can be closed from any branch |
| R8 | **A declaration is a binding, not a bypass**: with a declared branch, HEAD must *be* that branch or the gate denies with the bound name | `branch-policy.ts` (declared path) | make `--branch` replayable | a bound entity cannot be operated from another checkout, even read-modify ceremonies |
| R9 | **Branch exclusivity is per role**: two live expeditions cannot bind the same branch; a mission binding does not block its expeditions | `branch-policy.ts:144` `findLiveBranchBindingOwner`; `branch-declaration.ts:83-86` `DECLARED_BRANCH_IN_USE` | one writer per branch | with one checkout this is effectively "one live expedition at a time" (§4, reproduced) |
| R10 | `guardEventLogLineage` blocks `approve\|commit\|start\|finish\|complete\|archive\|cancel` when a **sibling branch carrying the same expedition id** has a different event stream; bypass `--no-lineage-check` (undocumented) | synth.ts:6466-6560 | detect per-branch ledger divergence | scoped to the same expedition's short id, so cross-expedition/mission divergence is invisible; a symptom of R15 |
| R11 | `dependsOn` blocks `start` (upstream review gate), not the work | `review-gate-engine.ts:isBlockedByUpstreamGate`; `execution.ts:323-330` | respect the plan graph | with one worktree, the dependency graph is enforced only where it doesn't matter |
| R12 | The **mission branch is demanded but never created** | audit §3 #12 (still true: only `ensureExpeditionBranch` creates branches) | branch per role | denial messages name branches that do not exist |
| R13 | `.synth/data` is append-only per branch: `status`, `list`, `show` read the **working tree**, not the canonical branch | `sdk.state.readState` | fast local reads | the same repo reports different truths per checkout (§6, reproduced) |
| R14 | `expedition delete` retires draft artifacts: deletes `<id>.json` and its integrity records (chain-aware retention) | `draft-integrity.ts:143-175`; synth.ts:6884+ | keep the intake chain clean | it is the one verb that *does* delete files; a deleted draft leaves no tombstone in the ledger |
| R15 | Ceremony writes are **branch-local and best-effort**: `autoCommitDerivedState` commits `.synth/data`, `proof/expeditions`, `AGENTS.md` on the *current* branch and returns `{committed:false, reason}` instead of failing | synth.ts:616-700; `artifact-policy.ts:104` | convenience | the source of the bleed and of the uncommitted-ceremony class (§5) |

---

## 4. Two expeditions: what actually happens

**The intent** (`intake.ts:154-157`): "multiple expeditions may execute concurrently within and across
missions". **The reality** is a one-checkout, one-branch, one-ledger system:

1. **Starts move your working tree.** `ensureExpeditionBranch` → `adapter.createBranch` → `git checkout -b`
   (`synth.ts:5926-5967`; `src/adapters/repository/git.ts:295-299`). Unless you pass
   `--branch <name> --no-create` (ADR-056), starting expedition 2 checks out a new branch **based on
   whatever you had checked out** — i.e. on expedition 1's unmerged tip. Reproduced in the lab (§8 L4):
   starting "Lab sync C" while on "Lab sync A" created
   `expedition/framework-maturation-v2-4ab7e9d/lab-sync-c-2c293e7` from lab-sync-a's tip.
2. **The second expedition inherits the first's ledger.** Because the branch was cut from expedition 1's
   tip, expedition 2's events chain onto expedition 1's, and every later ceremony for expedition 1 that you
   run from expedition 2's checkout is recorded on the wrong branch.
3. **With declared branches, the door is closed — loudly.** Running
   `expedition commit --proposal-id <new> --branch arena/c5db653e-synth --no-create` while E5 owns that
   branch refuses:

   ```
   code:    DECLARED_BRANCH_IN_USE
   error:   expedition bda2bbd4ef6550af is already bound to arena/c5db653e-synth
   suggestion: Use another branch, or finish bda2bbd4ef6550af first
   ```
   That is E4/ADR-056 working as designed — but note what it means operationally: **one live expedition per
   branch**, and since the operator has one working tree, that is one live expedition, period.
4. **Uncommitted ledger edits follow you.** Even when the *binding* is refused, the ceremony's partial work
   (events for the new draft, its record file) stays in the working tree. `git checkout <other-branch>` does
   not clean it, and the next auto-commit on that other branch sweeps it in (§5 V2 — reproduced).

So the honest statement today is: **multiple expeditions are possible only as "one executing + many
committed", and only by manually managing branches and worktrees yourself.** ADR-055 §2.5 (worktree per
expedition) is what makes the intake gate's sentence true; until then the comment and the agent contract
disagree with each other and with git.

---

## 5. Artifact loss — every vector (the "we may lose stuff" question)

Short answer: **you are right, and the loss is worse than a `cancel` deleting a file.** `cancel`, `pause`
and `archive` never touch branches or files; the loss happens because the *record of everything* lives on
the branch you happen to occupy.

| # | Vector | What is lost | Evidence |
| --- | --- | --- | --- |
| V1 | 13 of 19 expedition verbs (and `mission create/delete`, etc.) never commit | the ledger edits exist only as uncommitted working-tree changes; a `git checkout -f`, a clean, or another clone never sees them | §8 L2 (8 dirty ledger entries, HEAD unmoved) |
| V2 | **The bleed**: uncommitted ledger edits migrate across `git checkout` and are committed by the *next* ceremony on the *other* branch | the artifact is attributed to the wrong branch — and disappears from its own | §8 L5, reproduced twice: a draft created on `bleed-a` was committed by an unrelated `refine` on `main`; `bleed-a` then no longer has it |
| V3 | Branch deletion / abandonment | the entire governance record of that work: mission/expedition records, certifications, evidence manifests, draft integrity chain — they were auto-committed *to the branch* | §6 (status reports "no active expeditions" on `main` while the branch reports "1 expedition executing"); `git branch -D` = record gone (objects survive only until GC) |
| V4 | `expedition delete` | deletes `<draft>.json` + draft integrity records | `draft-integrity.ts:143-175`; covered by the existing 7-stale-branch / 2-cancelled-expedition backlog |
| V5 | Failed ceremonies are not atomic | a refused ceremony can still leave record files behind (lab: `DECLARED_BRANCH_IN_USE` refusal left `.synth/data/expeditions/0a39293a52474d74.json` untracked) | §8 L3 |
| V6 | `--complete-first` | marks a *blocking* expedition `completed` with `force:true` and no evidence — its work is never delivered, its status lies | `cmdMissionApprove` synth.ts:3469+ |
| V7 | Excluded-from-commit derived state | `.synth/ai/**`, `.synth/cache/**`, `.synth/context.json` are deliberately not committed (fine); but `.synth/data/event-log.jsonl` (legacy monolith, **262 events / 300 KB**) is untracked + ignored, so a fresh clone cannot replay it — the known F7 | `.gitignore`; `ls -l .synth/data/event-log.jsonl` |
| V8 | Nothing pushes | even a perfectly committed ceremony exists only in the local clone; delivery is manual (`git push`, PR, merge) with no ceremony that records it | no `push`/PR call in any lifecycle path (`git.ts:478` exists, unreferenced by the CLI) |

Two calming notes so the picture is precise:

- **`cancel` does not delete anything.** It appends `EXPEDITION_CANCELLED` and prints a resume command
  (§3 R4). What it *fails* to do is protect the branch, the worktree, or the uncommitted ledger.
- **The evidence directory is tracked** (`proof/expeditions/<id>/…` is in the auto-commit roots), so once
  an auto-commit happens, evidence survives branch deletion *until the ref is deleted* — after that it is
  gone with the branch like everything else.

---

## 6. The sync problem: finish happens on the branch, integration is manual

**Mechanism.** Each event's `previousHash` is the previous event's `eventHash`, computed over the whole
stream (`src/api/index.ts:372-379`, `execution-gate.ts:501`). The stream is stored as
`event-stream/partition-{0..3}/segment-*.jsonl` with in-place appends, plus projections
(`canonical-state.json`, `.synth/data/{missions,expeditions}/*.json`). Two branches that both ran a
ceremony have two different chains *in the same files*.

**Reproduced (§8 L6).** Two branches from one base, each running one `expedition refine`:

```
$ git merge writer-b
Auto-merging .synth/data/canonical-state.json
CONFLICT (content): Merge conflict in .synth/data/canonical-state.json
Auto-merging .synth/data/event-stream/partition-3/segment-0001.jsonl
CONFLICT (content): Merge conflict in .synth/data/event-stream/partition-3/segment-0001.jsonl
Auto-merging .synth/data/expeditions/2c293e73ef1b1dde.json
CONFLICT (content): Merge conflict in .synth/data/expeditions/2c293e73ef1b1dde.json
```

Resolving the JSONL "union-style" (both sides' lines) — the best a human can do — yields a forked chain:

```
$ synth explain replay
{ "status": "error", "consistent": false, "eventCount": 337,
  "liveHash": 2015876977, "replayHash": 662567280 }
```

So it is not "merge conflicts are annoying"; **the ledger is not mergeable at all**. That is why
`guardEventLogLineage` exists (§3 R10) and why ADR-055's core decision is *single writer on the canonical
branch*.

**Consequences observed today:**

- `synth status`, `mission list`, `expedition show` report **whatever the checked-out branch says** (§8 L7):
  `main` → "Mission … is approved and ready for Expeditions. activeExpeditions: []"; the arena branch →
  "1 expedition currently executing: bda2bbd4ef6550af". Both are "correct" for their branch; neither is the
  project's truth.
- `expedition finish` completes the expedition *in place* and its response contains **no delivery step and
  no `nextStep`** naming a PR, push or merge (synth.ts:6797-6828). Completion therefore precedes the PR;
  "we only complete after CI is green" is a human convention, not a state the tool knows.
- The CI gate bypasses this entirely (`paths-ignore: .synth/**`), so an unreviewed PR merge cannot even
  accidentally reconcile the ledger — it silently keeps whatever the merge produces.

---

## 7. Verdict

**Sound — keep and build on:**

- the status model and pure transition functions (planning.ts) — small, testable, correct;
- the layered gate (intake → ExecutionGate → domain invariants);
- ADR-056 declared branches (`--branch`, `--no-create`, `declaredPatterns`, binding-not-bypass,
  per-role exclusivity) — the first mechanism in the system that makes the working branch *replayable*;
- `finish`'s shape (capture evidence → certify → complete) — the right ceremony, in the wrong place (on the
  branch, before delivery);
- the artifact classification table (`artifact-policy.ts`) — the vocabulary for V7 is already there;
- `draft-integrity` chaining (chain-aware retirement) — keep, but make deletions visible (§5 V4).

**Broken — the E5/ADR-055 target list:**

1. ceremonies commit (or fail to commit) to the current branch (V1, V2, R15);
2. the ledger cannot be merged, and integration is manual (V3, §6);
3. there is no delivery state: `deliver`/`seal`/`close`/`abandon` do not exist (V8, §6);
4. concurrency is asserted but the implementation is single-checkout (R3, §4);
5. `mission approve`'s gate scoping + `--complete-first` (R1) — already owned by draft `0daac4fc`;
6. `doctor` cannot see any of this (no ledger/branch/anchor checks).

**Obsolete — delete with ceremony-named replacements:**

- the mission branch role and its demanded-but-never-created names (R12) — replaced by declared branches;
- `archive`'s dead-end (R5) and empty-only `delete` (R6) — replaced by ADR-054's unified termination +
  `abandon`/`close`;
- `cancel` as a resumable detour (R4) — keep as a state, but stop printing "start it again" as the next
  step;
- `--complete-first` (R1) — replace with a named force path that writes a reason to the ledger;
- the three-identifier intake (§1.4) — one id per entity, aliases accepted at the edge only;
- the legacy monolith `event-log.jsonl` (V7/F7) — migrate then delete, per plan §9.3.

**What this means for the in-flight plan (E5 = ADR-055 P1/P2):** the ledger writer that is already on the
branch (`63ed64f`: anchor + lock + CAS + residue guard + checkout refresh) must become the *only* writer
for **all** lifecycle verbs, not just the six that call `autoCommitDerivedState` today; `deliver`/`seal`
must land with the delivery state; and `doctor` must grow the four checks of ADR-055 AC6. Everything else
in this section is P3/later. See ADR-055 rev 2 (§R2) for the contract table and the acceptance criteria
additions (AC9–AC13).

---

## 8. Reproduction log (lab, `/tmp/synth-lab`, 2026-10-12)

Lab setup: `git clone --local /home/user/synth /tmp/synth-lab && ln -s /home/user/synth/node_modules`,
`git config user.email lab@example.com && git config user.name "Lab Probe"`. The CLI used is the built
`dist` from the live repo (`node /home/user/synth/dist/cli/synth.js`), executed with `cwd=/tmp/synth-lab`.

- **L1 — inventory/dry-run:** `expedition commit … --dry-run` reports only `declaredBranch.valid`
  (name validity), no live-owner check; the real call refuses.
- **L2 — no commit on most verbs:** create/approve/commit/start/evidence/refine/cancel/delete left
  `git status` at 8 dirty ledger entries with `HEAD` unmoved (`ac4e81a → ac4e81a`); auto-commit only ran
  (and failed loudly, `Author identity unknown`) on `start` until git identity was configured.
- **L3 — identifiers + failed-ceremony residue:** `commit --proposal-id abef2bcbb1adb6a6` →
  `ExpeditionNotFound`; `commit --proposal-id 0a39293a52474d74` → `DECLARED_BRANCH_IN_USE`, but the record
  file `.synth/data/expeditions/0a39293a52474d74.json` was already written (untracked residue).
- **L4 — start moves the tree:** `start --id 9fbaae83ea05bd7a` (no `--branch`) on `main` →
  `branch main → expedition/framework-maturation-v2-4ab7e9d/lab-sync-a-9fbaae8`; a later start created
  `…/lab-sync-c-2c293e7` while standing on lab-sync-a (stacked base).
- **L5 — the bleed:** on `bleed-a`, `expedition create` → 4 dirty entries; `git checkout main` carried them;
  `expedition refine` on `main` committed them (`4c13bb4`, including
  `.synth/data/expeditions/b0b60a436410a0bb.json`); back on `bleed-a` the draft was gone.
- **L6 — the merge:** `writer-a` / `writer-b` from one base, one `refine` each → merge conflicts in
  `canonical-state.json`, `event-stream/partition-3/segment-0001.jsonl`,
  `expeditions/2c293e73ef1b1dde.json`; union-style resolution → `explain replay`
  `status: error, consistent: false` (`liveHash 2015876977 ≠ replayHash 662567280`).
- **L7 — two truths:** `synth status` on `main` vs on `arena/c5db653e-synth` reports "approved / no active
  expeditions" vs "1 expedition currently executing".
- **L8 — current repo counts:** 54 expedition records, 4 missions, 31 drafts, 4 partitions / 4 segments,
  2 local branches, 14 remote refs, monolith 299,847 bytes / 262 lines.
