# SYNTH — Master Delivery Plan (rev 3.6)

**Prepared:** 2026-10-12 · **Base:** `main` @ `ac4e81a` (v2.6.1) · **Working branch:** `arena/c5db653e-synth` @ `d836808` (pushed)
**Status:** bootstrap executed; **E1–E3 complete, M1 completed, E4 complete (`0708265`, `19f1c99`, ceremony at `3352ea4`); the `mode: off` window is CLOSED** — `enforce` + `declaredPatterns: ["arena/*"]` + the `--ci` guard are committed. Next: E5 (ADR-055 P1/P2) with `--branch arena/c5db653e-synth --no-create`. Rev 3.1 records **F7**; rev 3.2 **F8** (a CLI test reads the monolith) and **F9** (two stale task tests); rev 3.3 adds **F10** (evidence manifests are per-call) and **F11** (the `test:all` chain was red at HEAD: the shared evaluation helper called the wrong `assert`). Rev 3.4 adds the **surface audit** (`docs/audits/mission-expedition-surface-audit-2026-10-12.md`) and findings **F12** (uncommitted ceremonies bleed across branches), **F13** (the ledger is not mergeable — reproduced) and **F14** (`finish` has no delivery step); it also records E5 slice 1 (the Ledger Writer, `63ed64f`). Rev 3.5 records **E5 slices 2–3** — the ledger **doctor** (`6edd347`) and **ceremony routing** (`d836808`) — and narrows E5's remainder to `deliver`/`seal`, the remaining §R2.1 ceremony rows and the `deliveryPending`/handoff markers. Rev 3.6 records **slice 4 — the ledger branch is named, not inferred** (`4a5e408`), **F15** (an expedition-auto-commit subtest was already red at `36ec00a`, verified in a detached worktree) and the **merge-time flip** (`git.ledgerBranch` → `main`) that Stage 7 must perform.
**Supersedes:** rev 2 of this document, and the ad-hoc sequencing in the project brief §4.2.
**Design of record:** `docs/adr/ADR-054` (lifecycle), `docs/adr/ADR-055` (ceremonial events), `docs/adr/ADR-056` (declared branches).
**Evidence base:** `docs/audits/mission-expedition-cli-audit-2026-10-12.md`, `docs/audits/mission-expedition-surface-audit-2026-10-12.md` (rev 3.4), `docs/plans/reads-never-write.md`.

---

## 0. What changed in rev 3

| # | Change | Why |
|---|---|---|
| 1 | **E2 — No write-on-read** is done: content-keyed charter cache in `.synth/cache/`, `writeAiMetadata` compares before writing, `status` no longer persists | verified in-repo: two consecutive `status` runs leave `.synth/ai/*` byte-identical; the cache is created once (413 digests) and not rewritten |
| 2 | **E3 — Artifact policy + guards** is done: `src/state/artifact-policy.ts` is the single classification table; `scripts/check-artifact-policy.js` checks index ↔ policy ↔ `.gitignore`; two new regression tests; registration across `package.json`, the task registry, the validation map and the `govern` task | rev 2 listed this work; rev 3 records what was built and what it proved |
| 3 | **The measured red was narrower than rev 2 claimed.** With each command judged on an independently reset tree, only `status` (writes `.synth/ai/`) and the cache-stability check fail pre-fix; `doctor`/`capabilities`/`expedition list`/… were clean because their writes were already-ignored files | E3's A/B run; corrected here and in `reads-never-write.md` |
| 4 | **New finding F1 — the Proof Gate does not run the test suite.** `govern` → `node scripts/govern-profiler.js --full` → `runGovernProfile` decomposes `package.json.scripts["test:all"]`, which is the task-adapter shim, so it yields zero `npm run` checks: CI executes **build + proof only**. The class-based path (`--explain`/`--profile`) only runs scripts listed in `docs/reference/capability-validation-map.json` (47 of 111+ test scripts) | measured while wiring E3; mitigated in-week by making the `govern` task run the guard and the read-only regression explicitly, and by registering the new scripts in the map |
| 5 | **`check-artifact-policy --ci` is deliberately not wired yet**: it asserts `branchPolicy.mode: enforce`, so it must land in the same PR that closes the window (E4) | otherwise the suspension could reach `main` silently |
| 6 | **`AGENTS.md` was lying about its own architecture** ("do not commit `.synth/data/drafts/`"; "`event-log.jsonl` is the replay source") — fixed at the fragment source (`knowledge/AGENTS-intro.md`) and regenerated | E3; the contract now matches the policy table |
| 7 | **`test:task-npm-migration` was red at HEAD** (the `test:adr` / `check:adr` task files were missing) — fixed by E3's registration pass | found while wiring; a second instance of the same class as F1 (registration drift) |
| 9 | **E4 slice 2 landed** (`19f1c99`): the declaration is recorded (`BindExecutionBranch` → `MISSION_BRANCH_BOUND` / `EXPEDITION_BRANCH_BOUND`), projected onto the records, replayed, and used to enrich the gate's context — so later commands agree without flags. `--branch` / `--no-create` on `mission approve`, `expedition commit`, `expedition start`; git mechanics isolated in `src/repository/branch-declaration.ts`; 9 new tests (`test:declared-branch`, in the chain) | ADR-056 slice 2 |
| 10 | **Two rules made explicit during implementation** (recorded in ADR-056 §2.1): (a) a binding is **not a bypass** — HEAD must be the bound branch or the gate denies with the bound name; (b) exclusivity is **per role** — one mission + its expeditions may share an operator-owned branch (the arena case), two live expeditions may not, and a terminal entity releases its branch | the arena workflow needs both; without (a) the binding would authorize ceremonies from any branch |
| 11 | **F8 — `tests/execution-branch-gate.test.js` reads `.synth/data/event-log.jsonl`** in its two CLI assertions; since the event-stream cutover that file is no longer written, so both fail with `ENOENT` at HEAD (pre-existing; verified by stashing slice 2 and re-running). Same class as F7: a live consumer of the monolith | migrate the two assertions to the event-stream reader in the F1 follow-up (§9.12) |
| 12 | **F9 — `tests/task-npm-adapter.test.js` and `tests/task-schema-registry.test.js` are red at HEAD and not in the `test:all` chain** (the first asserts every npm script delegates to the task shim and trips on the E3 additions; the second imports an export that no longer exists). Registration drift, same family as F1/F4 | fold into the F1 follow-up ("register or delete", one decision per stale test) |
| 13 | **The window is closed** (`de3cab5`): `git.branchPolicy.mode` back to `enforce` + `declaredPatterns: ["arena/*"]`, and `check:artifact-policy` now runs `--ci` inside the governed chain, so the suspension cannot reach `main` silently. E4 finished first (evidence `e4-source.patch`, 82,310 B; certificate; `expedition-completed`), which the sequencing constraint required | the window's exit condition was "ADR-056 available and declared" |
| 14 | **F10 — evidence manifests are per-call, not cumulative.** `attachExpeditionEvidence` writes `manifest.json` with only the attachments captured by that invocation, while the expedition record keeps the full history (E1 already carries three `git-diff` entries). The record is the truth; the manifest is a view of the last call | fold into the F1 follow-up (either make the manifest cumulative or say so in its schema) |
| 15 | **F11 — the `test:all` chain was red at HEAD.** `tests/helpers/test-fixtures.js` imported the minimal callable `assert` from `helpers/assert.js` and then used Node's assert API on it, so `assertEvaluationShape` threw `assert.ok is not a function`: `tests/proposal-evaluation.test.js` 3 passed / 12 failed (introduced by the dedupe commit `29cb4a5`). Fixed in `4bc6ddd` (15/0, and the other five consumers still pass). The registry-count pin moved 49 → 50 (`a7d3096`) after `BindExecutionBranch` | evidence for F1: because the Proof Gate never runs the chain, a 12-test rot went unnoticed |
| 16 | **E5 slice 1 landed** (`63ed64f`): `src/ledger/writer.ts` — detached sparse anchor at `.synth/anchor`, lock file `.git/synth-ledger.lock` with stale-owner recovery, `advanceCanonicalBranch` (stage → commit in the anchor → `git update-ref` CAS), residue guard (dirty ledger paths outside the ceremony payload refuse the commit), `refreshCheckout` (operator index + worktree refreshed after the CAS), `repairAnchor`; 7 tests, registered as `test:ledger-writer` and wired into the `test:all` chain | ADR-055 §2.3/§2.10 P2 — the mechanism every ceremony will route through |
| 17 | **F12 — ceremonies do not all commit, and the ledger bleeds.** Only 6 of 19 expedition verbs call `autoCommitDerivedState` (start/complete/finish/evidence/refine/certify), and it commits on the *current* branch. Lab reproduction: a draft created on `bleed-a` stayed uncommitted, followed `git checkout main`, and was swept into an unrelated `refine` commit on `main` (`4c13bb4`); back on `bleed-a`, the draft was gone | found by the surface audit; it is why "fix the six call sites" is not enough — E5 routes **every** ceremony through the writer (ADR-055 rev 2 §R2.1/§R2.3) |
| 18 | **F13 — the ledger is not mergeable.** `previousHash` chains globally (`src/api/index.ts:372-379`) and segments are appended in place: two branches from one base, one ceremony each → merge conflicts in `canonical-state.json`, `event-stream/partition-3/segment-0001.jsonl` and `expeditions/<id>.json`; a union-style resolution gives `explain replay` `consistent:false` (`liveHash 2015876977 ≠ replayHash 662567280`). "Write to the canonical branch" is a reproduced necessity, not a preference | audit §6; owner E5 |
| 20 | **E5 slice 2 landed** (`6edd347`): `src/ledger/doctor.ts` — four silent-failure classes (anchor missing/prunable, uncommitted ceremony, anchor behind the branch with `rev-list` counts, detached HEAD) become visible in `synth doctor`'s new `ledgerHealth` block and repairable with `synth doctor --fix` (commit the stalled ceremony through the writer, then prune/recreate/re-point the anchor; never throws). `porcelainPath()` now tolerates one- and two-column porcelain status lines — the doctor had been mis-reading the common ` M path` shape. 6 tests (`test:ledger-doctor`), registered in the chain | ADR-055 §2.10, AC6/AC8/AC13 |
| 21 | **E5 slice 3 landed** (`d836808`): `src/ledger/ceremony.ts` + `autoCommitDerivedState` rewritten to go through the Ledger Writer — lock → residue check → commit the ceremony's paths → `update-ref` CAS → checkout refresh. Messages now follow §R2.1 (`chore(synth): EXPEDITION_STARTED expedition bda2bbd4`); a refusal (dirty ledger, lock timeout, divergence, detached HEAD) is printed as a structured `LEDGER_*` error and exits non-zero — the silent `{committed:false}` path is gone. 4 tests (`test:ledger-ceremony`); `tests/expedition-auto-commit.test.js` updated to the normative message | ADR-055 §2.3 / rev 2 §R2.1·§R2.3(1) |
| 22 | **E5 remainder (next):** `expedition deliver` + `seal --merge-commit` MVP with the `deliveryPending` marker (§2.6/AC12), the remaining §R2.1 rows — the ten verbs that still commit nothing (`mission create\|approve\|evidence add\|delete`, `expedition create\|approve\|commit\|move`, `pause\|cancel\|archive\|delete`, `evidence`, `refine`, `certify`) — via the single `handleIntent` choke point rather than nineteen call sites, and the abandonment handoff block (`refs/synth/abandoned/<id8>`). ~~One more row belongs here because slice 3 exposed it: the ledger branch must be named, not inferred.~~ **Landed in slice 4 (`4a5e408`)** — see row 23: explicit `git.ledgerBranch`, else the recorded bootstrap branch, else the checkout with a warning; the anchor path for every non-ledger checkout | rev 3.5 status; blocks E6 worktrees |
| 19 | **F14 — `finish` has no delivery step.** `expedition finish` = evidence → certify → complete, in place, before any PR; the response has no `nextStep` naming a push/PR/merge, and no lifecycle path pushes. Owner: E5 `deliver`/`seal` MVP (ADR-055 §2.6/§R2.1); worktrees + `close` in E6 | audit §6; ADR-055 AC4/AC12 |
| 23 | **E5 slice 4 landed** (`4a5e408`): the ledger branch is *named* — `git.ledgerBranch` in `.synth/config.yaml`, else `.synth/data/ledger.json` (recorded by the first ceremony that had to infer one), else the checkout with a warning. A ceremony run outside the ledger branch now commits **through the anchor** (`sourceRoot` + `materializeInto`), refuses ledger edits it does not own (`LEDGER_DIRTY`), and reports `checkoutDirty` instead of hiding them. E5's own ceremony will therefore record `arena/c5db653e-synth` as the bootstrap ledger branch; **Stage 7 flips it to `main`** (`git.ledgerBranch: main`, one config line) when PR #340 merges | plan rev 3.5 row 22, blocks E6 |
| 24 | **F15 — `tests/expedition-auto-commit.test.js` was already red at `36ec00a`:** its third subtest aborts with `Convergence certification must converge, got diverged` (thrown by `tests/helpers/governance-intent.js:111`), which stops the suite before the remaining cases run — the same family as F8/F9 (helper/registration drift), not a ledger-writer regression. Verified by building and running the suite in a detached worktree at the pushed tip | fold into the F1 follow-up (§9.12): the certification helper needs the same read-before-write repair `test-fixtures.js` got in `4bc6ddd` |
| 8 | M1's three expeditions are complete **and M1 itself auto-completed** (the framework completes a mission when its last expedition terminates — observed at `f3dda2d`), so the next lifecycle act is M2's E4 (ADR-056), which is also the **window exit** | new sequencing detail in §5; removes the "run `mission complete`" step rev 2 planned |

---

## 1. Verified starting state (2026-10-12, on this branch)

| Item | Value |
|---|---|
| Repo / version | `synth-framework/synth` @ `ac4e81a` (merge #339), v2.6.1 |
| Branch | `arena/c5db653e-synth` @ `19f1c99`, pushed and equal to `origin` |
| Governance | 377 events, replay `consistent: true` |
| Missions | `b536ecc7ceb9217a` *Derived-State Integrity* — **completed** (auto-completed at `f3dda2d` when E3 finished; 3/3 expeditions complete); `a57585f0aec4b2d8` *Governed Operation from Operator Branches* — active (E4, E5 committed) |
| Expeditions | E1 `ecc3688796be0545` **completed** · E2 `f089c4fea720c07c` **completed** · E3 `cfbb801aa232795a` **completed** · E4 `e788e528a896008a` **executing** (slice 1 `0708265`, slice 2 `19f1c99`) · E5 `bda2bbd4ef6550af` committed (dep E1, E4) |
| Window | `git.branchPolicy.mode: off` committed with a rationale comment + restore instruction (`.synth/config.yaml`); no branch is created or checked out anywhere in the window |
| PR | **#340** open, **draft**, "Governance bootstrap: ADR-054/055/056, master plan, and the derived-state fixes (hold: carries `mode: off` window)" |
| Artifact classification | `scripts/check-artifact-policy.js` → PASS (2065 tracked paths; rules durable:10 input:1 derived:4 cache:4 legacy:2) |
| Tests added | `tests/no-write-on-read.test.js` 11/11 (0/11 pre-fix) · `tests/artifact-policy.test.js` 11/11 · `tests/auto-commit-ignored-paths.test.js` green · `test:declared-branch` 34/34 (25 policy + 6 git + 3 binding) |

---

## 2. Decisions locked

| Decision | Value | Recorded in |
|---|---|---|
| Worktrees for execution isolation | **yes** | ADR-055 §2.5 (operator: "worktrees: yes") |
| Push/remote policy | ceremonies are **local**; promote at seal/complete; docs/publish CI `paths-ignore: [".synth/**"]` | ADR-055 §2.9 |
| Anchor location + mechanism | `.synth/anchor/` (sparse, gitignored, detached worktree, `update-ref` CAS, dirty-check-before-restore) | ADR-055 §2.3/§2.10, AC8 |
| Bootstrap path | **(c)** sandbox as temporary host; one-time `mode: off`; reverted in the E4 PR | ADR-055 §2.11 |
| `--no-create` | decided, no alias | ADR-056 §2.2, Q1 closed |
| Mission structure | **two missions** (M1 draft → `b536ecc7ceb9217a`; M2 → `a57585f0aec4b2d8`) + residuals stay in FMW v2 | §4, open Q9.1 |
| Branch creation point | `start` (verified; ADR-054 text is already correct) | `startOneExpedition` → `ensureExpeditionBranch` |
| Artifact classes | durable / input / derived / cache / legacy, first-match-wins, one table in `src/state/artifact-policy.ts`; auto-commit scope and completion-gate exclusions derive from it | E3, ADR-055 §2.8 |
| Draft files | **tracked inputs** (committed before use); `.gitignore` rules removed in E1's commit | E1/E3 |
| Guard `--ci` | wired in the window-close PR, not before | §0.5 |

---

## 3. Plan on one page

```text
STAGE 0  WINDOW OPEN (all on arena/c5db653e-synth)                          ✅ done
         push branch · mode:off commit · drafts force-added · PR #340 (draft, hold)
              │
STAGE 1  M1 approve (alignment contract + 2 evidence rounds)                 ✅ b536ecc7ceb9217a
STAGE 2  M2 draft + approve (same window)                                    ✅ a57585f0aec4b2d8
STAGE 3  E1–E5 created / approved / committed                                ✅
              │
STAGE 4  WORK LOOP (serialized on src/cli/synth.ts)                          ✅ E1 · ✅ E2 · ✅ E3
         code + tests → finish (evidence→certify→complete) → ledger commit → push
              │
STAGE 4b M1 completion — AUTOMATIC when its last expedition terminated        ✅ b536ecc7ceb9217a
              │
STAGE 5  E4 — Declared execution branches (ADR-056)                          ⏳ next
         + window close: restore mode:enforce · wire check-artifact-policy --ci
              │
STAGE 6  E5 — Ledger writer + anchor + deliver/seal MVP (ADR-055 P1/P2)      ⏳
              │
STAGE 7  STEADY STATE: finish → deliver → merge → seal → close;
         FMW v2 resumes (29b9a370 verb fold, bc9c51e0 termination unification);
         F1 follow-up (govern actually runs the suite) as a new expedition   ⏳
```

**Serialization rule:** everything in stages 4–6 edits `src/cli/synth.ts` (still ~8k LOC) — one expedition at a time, in the order above. Worktree isolation (ADR-055 §2.5) helps for disjoint files only.

---

## 4. Work breakdown

### 4.1 M1 — *Derived-State Integrity* (`b536ecc7ceb9217a`)

| Expedition | Status | Delivered | PR |
|---|---|---|---|
| **E1 — Derived-state staging correctness** `ecc3688796be0545` | ✅ complete (`123030d`) | `existingAutoCommitPathspecs` (a missing pathspec no longer forces the fallback), `isTrackedPath` (`git ls-files --`), `check-ignore --no-index`, primary `git add -A -- <existing dirs> <excludes>` gated by `primaryOk`, fallback skips ignored+untracked and `-f` only for ignored+tracked, `autoCommit{committed,commitHash,files,reason}` surfaced; index surgery on 11 derived/cache/legacy files; regression `tests/auto-commit-ignored-paths.test.js` red→green | PR-1 |
| **E2 — No write-on-read** `f089c4fea720c07c` | ✅ complete (`5a663e8`) | charter cache keyed on sha256 content digests at `.synth/cache/dependency-records.json` (gitignored, written only when the digest map or records change; legacy mtime cache no longer read), `writeAiMetadata` compares each file against disk and returns `{changed,files}`, `status` (light + heavy) is a pure read | PR-2 |
| **E3 — Artifact policy + guards** `cfbb801aa232795a` | ✅ complete (`e881f6d`) | `src/state/artifact-policy.ts` (5 classes, first-match-wins, include roots + `:(exclude)` pathspecs derived), `scripts/check-artifact-policy.js` (index ↔ policy ↔ `.gitignore`, `--ci` for the window close), `tests/no-write-on-read.test.js` (pristine `git archive` tree; 9 read-only commands + cache stability; 0/11 pre-fix → 11/11), `tests/artifact-policy.test.js` (11/11), registration in `package.json` / `data/tasks` / `capability-validation-map.json` / `govern` task, `AGENTS.md` fragment corrected + regenerated | PR-3 |

Full detail: `docs/plans/reads-never-write.md` (W1–W5 → E1–E3). **M1 is complete**: the framework marked it `completed` at `f3dda2d` when E3 terminated. No `mission complete` call is needed (and none is available for an already-completed mission). Verify with `synth mission show --id b536ecc7ceb9217a`.

### 4.2 M2 — *Governed Operation from Operator Branches* (`a57585f0aec4b2d8`)

Purpose: make SYNTH govern work on pre-existing operator branches — declared execution branches, ledger placement, delivery and abandonment protocol (ADR-055, ADR-056).

| Expedition | Scope | Depends on | PR |
|---|---|---|---|
| **E4 — Declared execution branches** `e788e528a896008a` (**executing**; slice 1 `0708265`, slice 2 `19f1c99`) | `--branch` / `--no-create` on `mission approve` / `expedition commit|start`; binding recorded (`*_BRANCH_BOUND`) and consulted before taxonomy; `BRANCH_POLICY_OVERRIDDEN` warning; `DECLARED_BRANCH_MISSING` / `DECLARED_BRANCH_IN_USE`; config `declaredPatterns` (warning-softening). **Remaining:** window close (§5) — `mode: enforce` + `declaredPatterns: ["arena/*"]` + `check-artifact-policy --ci` in the governed chain, then finish E4 | — | PR-4 |
| **E5 — Ledger writer + delivery MVP** `bda2bbd4ef6550af` (committed) | anchor worktree + lock + CAS; ceremony commit routing (single writer); `doctor` checks (uncommitted ledger, stale anchor, ledger-ahead-N); `deliver` + `seal` verbs (seal verifies the merge commit after `git fetch origin main`); abandonment/handoff record | E1, E4 | PR-5 |
| **E6 — Worktrees + full delivery** (ADR-055 P3, deferred) | per-expedition worktrees; `deliveryPending` enforcement; `close` cleanup; `status` stale-work warnings | E5 | later |

**E4 is the exit from the bootstrap window** — that is its strategic role, not just its feature content: with it, every later `start` runs under `mode: enforce` with `--branch arena/c5db653e-synth --no-create`.

### 4.3 Carried by existing work (FMW v2 / committed)

| Item | State | Action in this plan |
|---|---|---|
| `bc9c51e0674ec0ef` *Unify termination* (ADR-054 vehicle) | committed | start + run after E5 (collides with `synth.ts`) |
| `29b9a3704eb1287c` *Fold legacy CLI verbs* | draft; framework's priority-1 next action | approve + run after the window (any time after E4) |
| Typed entity references (`c830e84c138326f2`) | draft-ready command | stays in FMW v2 |
| `0daac4fc9df96606` (gate scoping), `0463c2cae71ac727` (pointer evidence) | drafts | stay in FMW v2 backlog |
| `729e4e2c17add703` (archive completed) | draft | close as superseded by ADR-054 when ADR-054 lands |

### 4.4 Findings and follow-ups (new in rev 3)

| # | Finding | Disposition |
|---|---|---|
| **F1** | `npm run govern` (the Proof Gate) runs **build + proof only**: `runGovernProfile` decomposes `package.json.scripts["test:all"]`, which is the `task-adapter-shim` indirection, so the registered suite is never expanded. The class-based path (`--explain`/`--profile`) covers only the 47 scripts present in `capability-validation-map.json` | **mitigated now** (the `govern` task runs the policy guard + the no-write-on-read regression first; new scripts registered in the map). **Proper fix** = make `loadGovernChecks` read the canonical chain from `data/tasks/test%3Aall.task.json` (or fail loudly when it cannot decompose). Recommend a new expedition **after the window**, in a new mission ("verification coverage truthfulness"); assumed yes, see §9.12 |
| **F2** | `check-artifact-policy --ci` fails while the window is open (by design) | wire it in the window-close PR (Stage 5). Until then the suspension is visible in PR #340's title and in this log |
| **F3** | `AGENTS.md` contradicted the policy (drafts "do not commit"; `event-log.jsonl` as replay source) | fixed at the fragment source in E3 |
| **F4** | `test:task-npm-migration` was red at HEAD: `test:adr` / `check:adr` had no task files | fixed by E3's registration pass; keep the test in the chain |
| **F5** | `expedition evidence --git-diff` is not range-scoped and re-runs capture their own output | use `--attach` with a scoped `git diff <from> <to> -- <paths>`; all three E1–E3 evidence attachments do exactly that |
| **F6** | `--depends-on` is set-only (`planning.ts` replaces only when an array is passed; the CLI omits empty arrays), so a wrong edge can only be cleared by delete + recreate | recorded in audit Addendum 3; E1's dependency set is correct (`E3 → E1, E2`), no repair needed |
| **F7** | **The legacy monolith is still read by the snapshot path** (audit Addendum 4): `getEventOffset()` uses its line count (262 vs the true 377); `SNAPSHOT_FILES` includes it, so a commit-on-change snapshot `git add` would fail on the ignored file (reproduced); and `verifySnapshotAtTag()` requires it at the tagged commit, so `synth snapshot verify --tag synth-expedition/cfbb801aa232795a` → `Event log missing at tagged state`. The data itself is a proven subset of `event-stream/` (262/262 by `eventHash`, 0 unique) | **Do not delete the file yet** (§9.3). Migrate the three call sites to `event-stream/` in the F1 follow-up expedition; afterwards the file is inert and deletable. The snapshot test seeds its own monolith, which is why the suite stayed green while the ceremony is broken |

| **F8** | `tests/execution-branch-gate.test.js` (two CLI assertions) still reads `.synth/data/event-log.jsonl`, which the event-stream cutover stopped writing → both fail `ENOENT` at HEAD. Verified pre-existing: stashing E4 slice 2 and re-running reproduces it (engine tests in the same file pass) | migrate the assertions to the event-stream reader in the F1 follow-up (§9.12); until then the file is a known-red test, not a regression |
| **F9** | `tests/task-npm-adapter.test.js` (asserts every npm script delegates to the task shim; trips on E3's additions) and `tests/task-schema-registry.test.js` (imports `getTasksByGroup`, which no longer exists) are red at HEAD **and absent from the `test:all` chain**, so CI neither runs nor reports them | fold into the F1 follow-up: one decision per stale test — register it (and fix it) or delete it; "not in the chain" must be a recorded decision, not an accident |

| **F10** | `attachExpeditionEvidence` rewrites `proof/expeditions/<id>/manifest.json` with **only that call's** attachments; the expedition record accumulates the full list (E1 has three `git-diff` entries). Deleting the empty finish-time `git-diff.patch` (E1–E3 practice) therefore leaves a record entry pointing at a removed file, while the manifest lists the surviving attachment | record-as-truth; make the manifest cumulative (or state its per-call semantics) in the F1 follow-up |
| **F11** | `tests/helpers/test-fixtures.js` imported the minimal callable `assert` from `helpers/assert.js` and used Node's assert API on it → `assertEvaluationShape` threw, taking `proposal-evaluation` to 3/12. Pre-existing (dedupe commit `29cb4a5`), unrelated to E4 | **fixed** (`4bc6ddd`): Node strict assert in the helper; `parseJson` still comes from `helpers/assert.js`. Chain now green for that file |
| **F12** | Only 6 of 19 expedition verbs auto-commit, on the current branch. Uncommitted ledger edits follow `git checkout` and are committed by the next ceremony on the *other* branch; reproduced in the lab (draft `b0b60a436410a0bb` created on `bleed-a`, committed by a `refine` on `main`) | **E5 build**: route every ceremony through the Ledger Writer (ADR-055 rev 2 §R2.1); add AC9/AC10 (no bleed, no uncommitted ceremony) |
| **F13** | The ledger cannot be merged: the global `previousHash` chain plus in-place segment appends make two writers conflict in `canonical-state.json` + segments; union-resolution leaves `explain replay` inconsistent | **E5 build** (writer already on the branch, `63ed64f`); `guardEventLogLineage` becomes a diagnostic per ADR-055 §2 |
| **F14** | `expedition finish` completes in place with no delivery state; nothing pushes or opens a PR; `deliver`/`seal`/`close` do not exist | **E5 build** (`deliver`/`seal` MVP, ADR-055 AC12 first half); E6 for `close` + `deliveryPending` enforcement |
| **F15** | `tests/expedition-auto-commit.test.js` aborts at `testCompleteDoesNotBlockOnDerivedState` with `Convergence certification must converge, got diverged` (`helpers/governance-intent.js:111`). Verified pre-existing at `36ec00a` in a detached worktree — not a ledger regression | §9.12 F1 follow-up: repair or retire the helper, then re-run the suite end to end |

### 4.5 Progress log

**2026-10-12 — bootstrap executed (option c).** Branch pushed; `mode: off` committed with rationale; drafts force-added; docs landed; M1 + M2 approved (0.67 → 0.69 → 0.71 via two evidence rounds each); E1–E5 chartered; PR #340 opened as a draft hold.

**2026-10-12 — E1 complete** (`123030d`). Staging fix + `--no-index` classification + per-path fallback; index surgery (11 files untracked); `.gitignore`/policy patterns aligned; `tests/auto-commit-ignored-paths.test.js` reproduces the failure (red before, green after); live proof: `autoCommit {committed: true}` on `refine`/`finish`/`evidence`, tree clean after every transition. Evidence: `proof/expeditions/ecc3688796be0545/attachments/e1-source.patch`.

**2026-10-12 — E2 complete** (`5a663e8`). Content-keyed cache in `.synth/cache/` (413 digests, stable across runs); `writeAiMetadata` compare-and-write; `status` pure in both the light and heavy paths. In-repo verification: two consecutive `status` runs leave `.synth/ai/*.json` byte-identical; `status`/`doctor`/`capabilities`/`explain replay`/`expedition list`/`mission list`/`program list` leave `git status --porcelain` empty. Evidence: `proof/expeditions/f089c4fea720c07c/attachments/e2-source.patch`.

**2026-10-12 — E3 complete** (`e881f6d`). Policy table + CI guard + two regression suites + registration + `AGENTS.md` correction. Measured A/B: `tests/no-write-on-read.test.js` 0/11 pre-fix (failures: `status` writes `.synth/ai/`; the mtime cache rewrote on identical runs) → 11/11 post-fix; `scripts/check-artifact-policy.js` PASS (2065 tracked paths); `tests/artifact-policy.test.js` 11/11; `test:task-npm-migration` green again. Findings F1–F4 recorded above. Evidence: `proof/expeditions/cfbb801aa232795a/attachments/e3-source.patch`.

**2026-10-12 — E4 slice 1** (`0708265`). `BranchPolicy.declaredPatterns`; `ExecutionBranchContext.declaredBranch`; declaration-before-taxonomy resolution with `overridden` / `patternMatched` and the `BRANCH_POLICY_OVERRIDDEN` warning class; `validateDeclaredBranchName` + `isCanonicalBranchForRole`. 22 policy tests green.

**2026-10-12 — E4 slice 2** (`19f1c99`). `BindExecutionBranch` capability → `MISSION_BRANCH_BOUND` / `EXPEDITION_BRANCH_BOUND`, projected onto the records (`Mission.executionBranch`, `Expedition.executionBranch`) and replayed by `applyEvent`; the gate enriches its branch context from the record, so later commands resolve the same branch without flags. `--branch` / `--no-create` on `mission approve`, `expedition commit`, `expedition start` (batch verbs refuse a single declaration; dry-runs report the declaration without touching git). Git mechanics isolated in `src/repository/branch-declaration.ts`. Two rules added to ADR-056: HEAD must be the bound branch (a binding is not a bypass — AC7) and exclusivity is per role (AC8). Tests: `declared-branch-git` 6/6, `declared-branch-binding` 3/3, policy 25/25 — wired as `test:declared-branch` in the chain. Findings F8/F9 recorded.

**2026-10-12 — E5 slice 4 (ledger branch named).** `4a5e408`: `src/ledger/branch.ts` (config → record → inferred), ceremony routing through the anchor for non-ledger checkouts with `materializeInto` + the source-side residue rule, doctor `branchSource` + record-on-fix. Suite results: ledger-writer 7/7, ledger-doctor 6/6, ledger-ceremony 6/6, `npm test` exit 0, `check:artifact-policy` PASS, declared-branch 34/34, synth-cli/taskpro/governance-record/draft-integrity green. Live `synth doctor` reports the ledger branch as `inferred` — the E5 ceremony records it. F15 verified pre-existing in a detached worktree.

**2026-10-12 — surface audit + E5 slice 1.** (a) Audited the mission/expedition surface at `63ed64f` in a throwaway clone: inventory + flags, the rules catalog (R1–R15), the multi-expedition reality (`DECLARED_BRANCH_IN_USE` reproduced; `start` still checks out and stacks branches unless `--branch` is given), the artifact-loss vectors (the bleed, branch-local records, `expedition delete` retiring drafts, non-atomic failures) and the sync problem (merge conflicts + `consistent:false`). Written to `docs/audits/mission-expedition-surface-audit-2026-10-12.md`; ADR-055 revised to rev 2 with the ceremony contract table (§R2.1), invariants, AC9–AC13 and the E5 mapping. (b) Implemented and pushed the Ledger Writer (`63ed64f`, 7 tests). Plan rev 3.4 records F12–F14.

**2026-10-12 — E4 complete + window closed** (`3352ea4` ceremony, `de3cab5` config). Scoped evidence attached (`proof/expeditions/e788e528a896008a/attachments/e4-source.patch`, sha `5afec3c395e06934…`, `git diff ef340aa..19f1c99` excluding `.synth/`+`proof/`); finish certified and completed the expedition (warnings: clean tree, empty git-diff — the empty file was removed, matching E1–E3). Then: `mode: enforce` + `declaredPatterns: ["arena/*"]`, `check:artifact-policy` wired with `--ci` (PASS, 2071 tracked paths, policy enforce), and two test-infrastructure repairs (`4bc6ddd` F11, `a7d3096` registry count). Pre-flight for E5: `expedition start --dry-run --branch arena/c5db653e-synth --no-create` → `declaredBranch.valid: true`, HEAD unchanged.

**State after E1–E4s1/s2:** replay `consistent: true`; tree clean after every ceremony; HEAD == origin == `19f1c99`; M2/E4 still executing (window open).

### 4.6 Documentation landing

| Doc | Destination | When |
|---|---|---|
| `docs/adr/ADR-054/055/056` | already landed | ✅ (`62bd91b`) |
| This master plan + `reads-never-write.md` | `docs/plans/` | ✅ (updated in rev 3) |
| Audit + system review | `docs/audits/` | ✅ |

---

## 5. Runbook (commands + expected output)

### Stage 4b — M1 is already closed

```bash
synth mission show --id b536ecc7ceb9217a     # expect: status completed (auto — no command ran)
synth expedition list --mission b536ecc7ceb9217a
```
The framework completes a mission when its last expedition terminates; observed when E3 finished
(`f3dda2d`). The ledger commit for it is that same auto-commit, already pushed. Nothing left to run.

### Stage 5 — E4 (ADR-056) and the window close — ✅ CLOSED 2026-10-12

```bash
synth expedition start --id e788e528a896008a          # mode:off → ran in place; no branch switch
# slice 1 + slice 2 landed: 0708265, 19f1c99
synth expedition finish --id e788e528a896008a         # evidence + certify + complete (no branch-gated phase)
git push origin arena/c5db653e-synth

# window close (same PR):
#   1. .synth/config.yaml: mode: off → enforce  (delete the suspension comment)
#   2. .synth/config.yaml: branchPolicy.declaredPatterns: ["arena/*"]   (ADR-056 §2.4)
node scripts/check-artifact-policy.js --ci            # expect PASS (enforce + patterns)
git add .synth/config.yaml && git commit -m "chore(governance): restore branch policy enforcement (ADR-056 available)"
git push origin arena/c5db653e-synth
# then, and only then, ask the operator to merge PR #340 (drop "hold" from the title)
```
**Sequencing constraint (verified in code):** entities created *before* ADR-056 (M2, E4) carry no binding, so under `enforce` any branch-gated ceremony for them (`checkpoint`, a re-`start`) is denied with the canonical name. Therefore the flip happens **after E4 completes** and E5 declares its binding. `mission approve` is idempotent, so a legacy *mission* can still record a binding by re-approving its draft with `--branch`; a legacy *expedition* has no clean rebinding path today → `rebind` (§9.14).

Expected: `check-artifact-policy --ci` PASS; `synth doctor` reports policy `enforce`; every later `start` uses the declared branch:
```bash
synth expedition start --id bda2bbd4ef6550af --branch arena/c5db653e-synth --no-create
# expect EXPEDITION_BRANCH_BOUND{declared:true,created:false}; with declaredPatterns ["arena/*"] the
# BRANCH_POLICY_OVERRIDDEN warning is softened (patternMatched: true) and stays recorded either way
# verify the binding is replayable: drop the flag and repeat
synth expedition show --id bda2bbd4ef6550af          # resolution comes from the record, not the flag
```

### Stage 6 — E5 (ledger writer + delivery MVP)

```bash
synth expedition start --id bda2bbd4ef6550af --branch arena/c5db653e-synth --no-create
# ... implement anchor/lock/doctor/deliver/seal ...
synth expedition finish --id bda2bbd4ef6550af
git push origin arena/c5db653e-synth && gh pr create --base main --head arena/c5db653e-synth --draft
# operator merges; then the ceremony replaces the manual PR dance:
synth expedition seal --id bda2bbd4ef6550af --merge-commit <sha>   # after: git fetch origin main
synth expedition close --id bda2bbd4ef6550af
```

### Stage 7 — steady state

```bash
synth expedition approve --draft-id 29b9a3704eb1287c       # FMW v2 verb folding
synth expedition start  --id <id> --branch arena/c5db653e-synth --no-create
# F1 follow-up (new mission, after the window):
synth mission create --subject "Verification coverage truthfulness" --purpose "..."
#   → govern must fail loudly or expand the registered suite, not silently run build+proof
```

**Ledger rule during and after the window:** commit and push after every ceremony; if a merge from `origin/main` ever conflicts on `.synth/**`, **stop** — that is the two-writer signal (ADR-055 §2.9), not something to resolve by hand.

---

## 6. Acceptance criteria — status

| # | Criterion | Status |
|---|---|---|
| A1 | M1 + M2 approved; E1–E5 created/approved/committed | ✅ 2026-10-12 |
| A2 | After every ceremony: auto-commit succeeds and the tree is clean | ✅ E1 (live) + E2/E3 (observed, `autoCommit.committed: true`) |
| A3 | Read-only commands never dirty the tree | ✅ `tests/no-write-on-read.test.js` 11/11 (0/11 pre-fix) |
| A4 | Policy ↔ index ↔ `.gitignore` agree; guard wired | ✅ guard PASS (2071 tracked paths) with `--ci` in the governed chain (`de3cab5`); policy `enforce` |
| A5 | Every PR: Proof Gate green, `explain replay` consistent, no ledger merge conflicts | ⏳ per PR; replay consistent (377) |
| A6 | `arena/…` works with `mode: enforce` via `--branch --no-create` | ✅ window closed (`de3cab5`): enforce + `declaredPatterns: ["arena/*"]` committed, guard `--ci` PASS; live proven by E5's start |
| A6b | A recorded binding resolves later commands **without flags**, and never authorizes a ceremony from another branch | ✅ `tests/declared-branch-binding.test.js` 3/3 (gate resolves the record; off-branch denied citing the bound name) |
| A6c | Ownership rules: mission + its expedition share one operator branch; second live expedition refused; terminal entity releases it | ✅ `findLiveBranchBindingOwner` tests in `execution-branch-policy` (25/25) + `declared-branch-git` 6/6 |
| A7 | Delivery is a ceremony: `deliver` → merge → `seal`; `close` refuses `deliveryPending` | ⏳ E5 remainder (F14 still open — `finish` has no delivery step) |
| A8 | Anchor resilient: delete `.synth/anchor/` → `doctor` repairs | ✅ `6edd347` — prunable anchor recreated, stale anchor re-pointed, stalled ceremony committed (`test:ledger-doctor`) |
| A9 | Sandbox never holds the only copy: branch pushed; every ceremony committed + pushed | ✅ HEAD == origin after every step so far |
| A10 | M1's own claim is verified, not asserted: the suite fails pre-fix and passes post-fix | ✅ E3 A/B (0/11 → 11/11) |
| A11 | The Proof Gate actually executes the registered suite (F1) | ⏳ follow-up expedition (§9.12) |
| A12 | `synth snapshot verify --tag <tag>` verifies against `event-stream/` (F7) | ⏳ currently fails with `Event log missing at tagged state`; follow-up expedition (§9.12) |

---

## 7. Effort & critical path (remaining)

| Stage | Work | Duration |
|---|---|---|
| 5 | E4 (ADR-056) + window close + PR #340 review/merge | 1–2 d |
| 6 | E5 (ledger writer, anchor, `deliver`/`seal` MVP) | 3–5 d |
| 7 | FMW v2 resumes (`bc9c51e0`, `29b9a370`) · F1 follow-up | existing scopes |

**Critical path:** E4 → window close → PR #340 merge → E5 → steady state.
**Window bound:** the remaining piece is E4 alone. E1–E3 already paid for the window (ceremonies now commit their own state; reads are pure).

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sandbox lost with uncommitted ledger | push after every ceremony (A9); HEAD == origin is checked each step |
| A second writer runs a ceremony during the window | window rule (ADR-055 §2.9): code-only merges allowed; a `.synth/**` merge conflict = stop signal |
| PR #340 carries the ledger (gate bypass) | accepted deviation, ends with E5; recorded in ADR-055 §2.9 item 5 |
| `mode: off` forgotten before merge | `check-artifact-policy --ci` (fails while off) + Stage 5 checklist + PR title holds the window |
| The Proof Gate gives false assurance (F1) | mitigated in-week (guard + regression in the `govern` task); tracked as A11 with its own follow-up |
| `src/cli/synth.ts` conflicts across E4/E5 and FMW v2 | strict serialization; ADR-054 refactor later splits the file |
| `--depends-on` cannot clear an edge (F6) | set dependencies only in the final refine of a committed expedition; verify with `expedition show` |
| Protection rules unknown (403 on details) | operator merges; no bypass assumed |

---

## 9. Open questions — assumed defaults unless the operator objects

| # | Question | Assumed answer |
|---|---|---|
| 9.1 | Mission structure: 2 missions or fold M2 into M1? | **2 missions** (already created; purposes stay honest) |
| 9.2 | Artifact policy: keep draft `*.integrity.json` tracked? | **tracked as `input`** (E3 implements and tests this) |
| 9.3 | Delete stale `event-log.jsonl` outright? | **Not yet — revised in rev 3.1.** The *data* is not needed (262/262 events are in `event-stream/` by `eventHash`; verified 2026-10-12), but three code paths still read the file and one is already broken by its absence from tags (F7). Sequence: migrate `getEventOffset` to `eventStore.count()`, drop the monolith from `SNAPSHOT_FILES`, make `verifySnapshotAtTag` replay `event-stream/` → then delete with the operator's confirmation |
| 9.4 | ADR-054: cancel semantics / review gates / `committed` migration / shim lifetime | cancel→`archived`+reason; wire review gates for `--governed`; migrate the 8 committed expeditions in one repair; shims for **2** minor versions |
| 9.5 | ADR-054 Q5: mission `start` vs approval-as-activation | keep **approval-as-activation** |
| 9.6 | ADR-056 Q2: who may declare a branch | **any actor** with a recorded binding (`declaredBy`); mission branches need the operator identity |
| 9.7 | ADR-056 Q3: ship `expedition rebind` now? | **Revised in rev 3.2: ship it in E5, as a small verb.** Entities created before ADR-056 (M2, E4) carry no binding, and under `enforce` their branch-gated ceremonies (`checkpoint`, re-`start`) deny with the canonical name; the only clean recovery today is re-approving a mission draft or creating the expedition again. `rebind --id … --branch … --no-create` (operator identity required, `BRANCH_REBOUND` recorded) closes that gap. If the operator prefers, the flip can instead be sequenced to avoid legacy entities entirely |
| 9.8 | ADR-056 Q4: `declaredPatterns` semantics | **warning-softening only** |
| 9.9 | ADR-056 Q5: declared branch checked out in another worktree | **prefer the current checkout** |
| 9.10 | ADR-055 Q2: post-bootstrap host policy | **single writer at a time**, enforced by doctor + lock; `synth ledger import` later |
| 9.11 | Anchor `worktree prune` ownership | `doctor --fix` |
| 9.12 | F1+F7 follow-up: create the "verification truthfulness" expedition after the window? | **yes** (new mission; fix `loadGovernChecks` to read the task registry or fail loudly, migrate the snapshot/verify path off the monolith (F7), migrate the two CLI assertions in `execution-branch-gate` that read the monolith (F8), resolve the two stale task tests register-or-delete (F9), then wire the new suites into the Gate) |
| 9.13 | PR #340 shape: one merged PR at window close, or split? | **one PR** merged at Stage 5 (docs + E1–E3 + E4); E5 gets its own PR. Splitting earlier would require a branch not pinned to this session — the operator can do that if they prefer |

---

## 10. Out of scope / explicitly deferred

- The 7 deferred remote branches on `origin` plus the stale local remote-tracking refs for the deleted `pr-*` branches — operator handles later; do not delete/close them.
- Era IV roadmap and Program-level work.
- FMW v2's remaining backlog beyond the named items.
- ADR-055 P3 (worktrees) and `synth ledger import` — E6/later.
- `full-govern` observational-equivalence work.

---

## 11. Artifact map

| File | Role |
|---|---|
| `docs/audits/mission-expedition-cli-audit-2026-10-12.md` | evidence base (inventory, rules, reproductions, Addenda) |
| `docs/audits/mission-expedition-surface-audit-2026-10-12.md` | rev 3.4: surface audit — flags, rules R1–R15, multi-expedition, artifact-loss vectors, sync problem, lab reproductions |
| `docs/plans/reads-never-write.md` | M1 detail (W1–W5 → E1–E3) + status log |
| `docs/adr/ADR-054-unified-lifecycle-state-machine.md` | lifecycle design (vehicle `bc9c51e0`) |
| `docs/adr/ADR-055-ceremonial-events.md` | ledger placement, anchor, delivery, bootstrap §2.11 |
| `docs/adr/ADR-056-declared-execution-branches.md` | `--branch` / `--no-create` |
| `src/state/artifact-policy.ts` | the classification table (E3) |
| `src/repository/branch-declaration.ts` | declared-branch git mechanics (E4 slice 2) |
| `tests/execution-branch-policy.test.js` | resolution order, HEAD rule, per-role ownership (25 tests) |
| `tests/declared-branch-git.test.js` | `--no-create`, create, origin-only, conflict (6 tests) |
| `tests/declared-branch-binding.test.js` | recorded binding replays; gate resolves it (3 tests) |
| `scripts/check-artifact-policy.js` | CI guard (index ↔ policy ↔ `.gitignore`; `--ci` for the window close) |
| `tests/no-write-on-read.test.js` | the invariant, executable (E3) |
| `docs/plans/master-delivery-plan.md` | this document |
