# SYNTH — Master Delivery Plan (rev 2)

**Prepared:** 2026-10-12 · **Base:** `main` @ `ac4e81a` (v2.6.1) · **Working branch:** `arena/c5db653e-synth`
**Status:** plan for operator approval — **no code, config, or state changes have been made.**
**Supersedes:** the ad-hoc sequencing in `the operator project brief (working note, not in-repo)` §4.2 and the trailing "next steps" of the audit.
**Design of record:** `PROPOSED-ADR-054` (lifecycle), `PROPOSED-ADR-055` (ceremonial events), `PROPOSED-ADR-056` (declared branches).

---

## 0. What changed in rev 2

| # | Change | Why |
|---|---|---|
| 1 | Bootstrap decided: **option (c) — this sandbox is the temporary host**, via a one-time, recorded `branchPolicy.mode: off` window | ADR-055 §2.11; the hash-chain finding makes "write here, merge later" impossible; (a) costs 15 synchronous operator transitions and breaks evidence capture |
| 2 | **Single writer is structural** (global hash chain, `execution-gate.ts:162`), not a policy preference | two-clone reproduction: same offsets 317/321/326 assigned to different events; union+renumber → `Hash-chain broken at index 1` |
| 3 | `--no-create` is the decided flag name for pre-existing branches | ADR-056, Q1 closed |
| 4 | Anchor mechanics lab-verified; **AC8** added; residual = who runs `worktree prune` (proposal: `doctor`) | ADR-055 §2.10 |
| 5 | Plan **corrects a factual error**: the expedition branch is created at **`start`**, not `commit` | verified in `startOneExpedition` (`synth.ts:5873` → `ensureExpeditionBranch`, L5732) and matches audit §1.2 |
| 6 | New **mandatory guardrail**: push the working branch to `origin` early and after each ceremony | the sandbox is ephemeral and is now the only holder of the ledger |
| 7 | Promotion mechanism named: **the arena-branch PR itself** is the delivery/promotion vehicle during the bootstrap | ADR-055 `deliver`/`seal` do not exist yet; the PR carries both code and the ledger temporarily |

---

## 1. Verified starting state (2026-10-12)

| Item | Value |
|---|---|
| Repo / version | `synth-framework/synth` @ `ac4e81a` (merge #339), v2.6.1 |
| Governance | 320 events, replay `consistent: true`, stateHash `97055763`, `status: ok` |
| Missions | `9861cf62476c90ae` *Framework Audit and Maturation* (completed); `4ab7e9d2cc7b1b66` *Framework Maturation v2* (active, 48 expeditions) |
| Mission draft ready | `2db51370ae127555` *Derived-State Integrity* → predicted runtime id `b536ecc7ceb9217a` |
| Dry-run expedition proposals | E1 `f34ce3ec4217d46d`, E2 `70c43bc00f294f70`, E3 `60f642ee75ee4ea9`; typed-refs `c830e84c138326f2` |
| Open PRs | none (the 4 `pr-*` remote branches are the deferred stale set) |
| `origin` branches | `main` + **7 others** (no `pr-*` remain on origin — the local remote-tracking refs for those are stale); **`arena/c5db653e-synth` is local-only → must be pushed** |
| Session constraint | Arena pins this session to `arena/c5db653e-synth`; it may not create or switch branches |
| Standing instruction | no code changes until the operator green-lights; deliverable is the plan + the ADRs |

---

## 2. Decisions locked

| Decision | Value | Recorded in |
|---|---|---|
| Worktrees for execution isolation | **yes** | ADR-055 §2.5 (operator: "worktrees: yes") |
| Push/remote policy | ceremonies are **local**; promote at seal/complete; docs/publish CI `paths-ignore: [".synth/**"]` | ADR-055 §2.9 |
| Anchor location + mechanism | `.synth/anchor/` (sparse, gitignored, detached worktree, `update-ref` CAS, dirty-check-before-restore) | ADR-055 §2.3/§2.10, AC8 |
| Bootstrap path | **(c)** sandbox as temporary host; one-time `mode: off`; revert at first PR that ships `--branch` | ADR-055 §2.11 |
| `--no-create` | decided, no alias | ADR-056 §2.2, Q1 closed |
| Mission structure | **two missions** (M1 existing draft; M2 new) + residuals stay in FMW v2 | §4 below, open Q9.1 |
| Branch creation point | `start` (already true in code; ADR-054 text corrected) | verified 2026-10-12 |

---

## 3. Plan on one page

```text
STAGE 0  WINDOW OPEN (all on arena/c5db653e-synth)          [agent]
         push branch · mode:off (1 commit) · force-add drafts · ledger commits per ceremony
              │
STAGE 1  M1 mission approve (alignment · evidence rounds)   [agent]
STAGE 2  M2 mission draft + approve   (same window)         [agent]
STAGE 3  E1–E3 + E4–E5 create/approve/commit/start          [agent]
              │
STAGE 4  WORK LOOP, serialized on src/cli/synth.ts:         [agent → operator merges]
         code+tests → finish → push → PR → Proof Gate green → merge → ledger stays linear
              │
STAGE 5  WINDOW CLOSE — after E4 (ADR-056) merges:          [agent]
         mode:enforce restored · every later start uses --branch arena/... --no-create
              │
STAGE 6  M2 continues (E5 ledger writer/delivery) · FMW v2 resumes (29b9a370, bc9c51e0)
              │
STAGE 7  STEADY STATE: finish → deliver → merge → seal → close; second writer allowed only via
         `synth ledger import` (does not exist yet)
```

**Serialization rule:** E1, E2, E3, E4, E5 all edit `src/cli/synth.ts` (8,030 LOC). They must run **one at a
time**, in the order below. Worktree concurrency (ADR-055 §2.5) does not help for conflicting files; it
helps different files.

---

## 4. Work breakdown

### 4.1 M1 — *Derived-State Integrity* (existing draft `2db51370ae127555`)

Fix class: SYNTH's own read paths dirty the tree, block completion, and leave governance state uncommitted.

| Expedition | Scope | Files | PR |
|---|---|---|---|
| **E1 — Derived-state staging correctness** `ecc3688796be0545` **✓ completed 2026-10-12** (fixes live P1; closes `e8ba8f92`) | `check-ignore --no-index`; stage only existing/changed durable artifacts; per-file fallback; surface `autoCommit{committed,commitHash,files,reason}`; index surgery per W2 | `src/cli/synth.ts`, `src/state/artifact-policy.ts` (new), `.gitignore` | PR-1 |
| **E2 — No write-on-read** `f089c4fea720c07c` (committed) | content-keyed cache in `.synth/cache/`; `status` stops persisting; `.synth/ai/` classified derived | `src/governance/dependency-graph.ts`, `src/cli/ai-metadata.ts`, `src/cli/status-light.ts` | PR-2 |
| **E3 — Artifact policy + regression guard** `cfbb801aa232795a` (committed; depends E1+E2) | policy module as single source; CI guard `scripts/check-artifact-policy.js`; `tests/no-write-on-read.test.js`, `tests/derived-state-commit.test.js` | policy + scripts + tests | PR-3 |

Full detail: `docs/plans/reads-never-write.md` (W1–W5, E1–E3, ~3 days, 3 PRs).

### 4.2 M2 — *Governed Operation from Operator Branches* (new mission, created in the window)

Purpose: make SYNTH govern work on pre-existing operator branches — declared execution branches, ledger
placement, delivery and abandonment protocol (ADR-055, ADR-056).

| Expedition | Scope | Depends on | PR |
|---|---|---|---|
| **E4 — Declared execution branches** `e788e528a896008a` (committed; ADR-056 minimal) | `--branch` / `--no-create` on `mission approve` / `expedition commit|start`; binding recorded (`*_BRANCH_BOUND`) and consulted before taxonomy; `BRANCH_POLICY_OVERRIDDEN` warning; `DECLARED_BRANCH_MISSING`/`DECLARED_BRANCH_IN_USE`; config `declaredPatterns` | — | PR-4 |
| **E5 — Ledger writer + delivery MVP** `bda2bbd4ef6550af` (committed; ADR-055 P1/P2 core) | anchor worktree + lock + CAS; ceremony commit routing (single writer); `doctor` checks (uncommitted ledger, stale anchor, ledger-ahead-N); `deliver` + `seal` verbs; abandonment/handoff record | E1 (staging), E4 | PR-5 |
| **E6 — Worktrees + full delivery** (ADR-055 P3, deferred) | per-expedition worktrees; `deliveryPending` enforcement; `close` cleanup; `status` stale-work warnings | E5 | later |

**E4 is the exit from the bootstrap window** — that is its strategic role, not just its feature content.

### 4.3 Carried by existing work (FMW v2 / committed)

| Item | State | Action in this plan |
|---|---|---|
| `bc9c51e0674ec0ef` *Unify termination* (ADR-054 vehicle) | committed | start + run **after E1** (same file, conflicts) |
| `29b9a3704eb1287c` *Fold legacy CLI verbs* | draft; framework's priority-1 next action | approve + run after the window (any time after E4) |
| Typed entity references (`c830e84c138326f2`) | draft-ready command | stays in FMW v2; unaffected |
| `0daac4fc9df96606` (gate scoping), `0463c2cae71ac727` (pointer evidence) | drafts | stay in FMW v2 backlog |
| `729e4e2c17add703` (archive completed) | draft | **close as superseded by ADR-054** when ADR-054 lands |

## 4.5 Progress log

**2026-10-12 — bootstrap executed (option c).**

| Step | Result |
|---|---|
| Branch backup | `arena/c5db653e-synth` pushed to origin (was local-only) |
| Window open | `branchPolicy.mode: off` committed with rationale; drafts force-added; PR #340 opened as draft (hold until stage 5) |
| Docs landed | ADR-054/055/056 + master plan + reads-never-write + audit + system review in `docs/` |
| M1 | `b536ecc7ceb9217a` *Derived-State Integrity* approved (0.67 → 0.69 → 0.71 via two evidence rounds; contract `alignment-contract-mv533f89-0ytu7j`) |
| M2 | `a57585f0aec4b2d8` *Governed Operation from Operator Branches* approved (same contract; 0.67 → 0.69 → 0.71) |
| Expeditions | E1 `ecc3688796be0545`, E2 `f089c4fea720c07c`, E3 `cfbb801aa232795a` (dep E1,E2), E4 `e788e528a896008a`, E5 `bda2bbd4ef6550af` (dep E1,E4) |
| E1 delivered | staging fix + `--no-index` classification + per-path fallback; index surgery (11 derived/cache/legacy files untracked); `.gitignore`/policy patterns aligned; `tests/auto-commit-ignored-paths.test.js` reproduces the failure (red before, green after); live proof: `autoCommit {committed: true}` on `refine`/`finish`/`evidence`, tree clean after every transition |
| Bookkeeping | first E1 draft `adbb8b39dd2831e6` was deleted and recreated (a refine set its `dependsOn` to E3 — wrong direction — and the CLI cannot clear `dependsOn`; new finding, see audit Addendum 3) |

Replay after E1: `consistent: true`, 364 events, chain valid.

### 4.4 Documentation landing

| Doc | Destination | When |
|---|---|---|
| `PROPOSED-ADR-054/055/056` | `docs/adr/ADR-054…`, `ADR-055…`, `ADR-056…` | PR-0 (docs-only, before code work) |
| This master plan | `docs/plans/master-delivery-plan.md` | PR-0 |
| Audit + system review | stay outside the repo (operator's evidence), or `docs/audits/` if the operator wants them public | operator choice |

---

## 5. Runbook (commands + expected output)

### Stage 0 — window open, branch backed up

```bash
git push -u origin arena/c5db653e-synth
# edit .synth/config.yaml: git.branchPolicy.mode: enforce → off
git add .synth/config.yaml
git commit -m "chore(governance): suspend branch policy for the bootstrap window (ADR-055 §2.11; reverted before merge)"
git add -f .synth/data/drafts/2db51370ae127555.json .synth/data/drafts/2db51370ae127555.integrity.json
git commit -m "chore(governance): preserve mission draft 2db51370ae127555 (bootstrap input)"
```

Expected: `git status --porcelain` empty; `synth status` still `ok`; `synth explain replay` → `consistent: true`.
The suspension is a *supported* mode: with it, `ensureExpeditionBranch` returns early (`synth.ts:5738`), so
**no branch is created or checked out anywhere in the window** — the session's branch pin is respected.

### Stage 1 — M1 mission approved

```bash
synth alignment prepare
synth mission approve --draft-id 2db51370ae127555 --alignment-contract-id <contractId>
# below-threshold outcome (expected first):
#   {"kind":"MissionApprovalDecision","decision":{"approved":false,"confidence":0.67},
#    "nextStep":"synth mission evidence add --draft-id … then approve --draft-id <new-id>"}
synth mission evidence add --draft-id <successor> --subject "…" --purpose "…" --confidence high   # ×2–3
synth mission approve --draft-id <successor> --alignment-contract-id <contractId>
synth mission show --id b536ecc7ceb9217a
```

Expected: `decision.approved: true`; mission `active`; ledger files modified → commit them
(`git add -A .synth/data && git commit -m "chore(synth): ledger — mission approved"`), then
`git status --porcelain` empty again.

### Stage 2 — M2 mission created + approved (same window)

```bash
synth mission create --subject "Governed Operation from Operator Branches" \
  --purpose "Make SYNTH govern work on pre-existing operator branches: declared execution branches, ledger placement, delivery and abandonment protocol (ADR-055, ADR-056)."
synth alignment prepare
synth mission approve --draft-id <M2-draft> --alignment-contract-id <contract2>   # + evidence rounds as needed
```

### Stage 3 — expeditions (create → approve → commit → start)

```bash
# for each of E1..E5
synth expedition create --mission <missionId> --subject "…" --goal "…" --scope "…"
synth expedition approve --draft-id <proposalId> --dry-run
synth expedition approve --draft-id <proposalId>
synth expedition commit  --proposal-id <proposalId> --dry-run
synth expedition commit  --proposal-id <proposalId>
synth expedition start   --id <proposalId>
synth expedition refine  --id <E3-id> --note "consumes E1+E2 policy" --depends-on <E1>,<E2>
```

Expected in the window: `start` → `{"status":"ok"}` with **no branch switch**
(`ensureExpeditionBranch` early-returns on `mode: off`); the ledger advances on the arena branch.

### Stage 4 — work loop (per expedition, serialized)

```bash
# code + tests (agent), then:
synth validate --dry-run
node tests/<targeted>.test.js
synth expedition finish --id <id>            # atomic: evidence → certify → complete
git add -A .synth proof && git commit -m "chore(synth): ledger — <expedition> finished"
git push origin arena/c5db653e-synth
gh pr create --base main --head arena/c5db653e-synth --title "<expedition subject>" --body "…"
# operator: npm run govern on the PR if required; merge when Proof Gate is green
git fetch origin && git merge origin/main    # keep the linear ledger; STOP if this conflicts on .synth/**
```

Expected (after E1 lands): `finish` → `autoCommit: {committed: true, commitHash: …}` and
`git status --porcelain` **empty** afterwards (today it silently fails — the live P1).

### Stage 5 — window close (after E4/ADR-056 merges)

```bash
# edit .synth/config.yaml: mode: off → enforce
git commit -am "chore(governance): restore branch policy enforcement (ADR-056 available)"
synth expedition start --id <next> --branch arena/c5db653e-synth --no-create
```

Expected: `EXPEDITION_BRANCH_BOUND{declared:true,created:false}` + `BRANCH_POLICY_OVERRIDDEN` warning
(recorded, visible in `status`/`show`), and every later command resolves the binding with no flags.

### Stage 6–7 — steady state

```bash
# FMW v2 resumes
synth expedition approve --draft-id 29b9a3704eb1287c
synth expedition start --id <id> --branch arena/c5db653e-synth --no-create
# after E5 lands, the delivery ceremony replaces the manual PR dance:
synth expedition finish --id <id>      # → deliveryPending
synth expedition deliver --id <id>     # → push + PR recorded (EXPEDITION_DELIVERED)
#   operator merges; CI green
synth expedition seal --id <id> --merge-commit <sha>   # → EXPEDITION_INTEGRATED
synth expedition close --id <id>       # cleanup; refuses while deliveryPending
```

---

## 6. Acceptance criteria (global definition of done)

| # | Criterion | Verified by |
|---|---|---|
| A1 | Mission M1 + M2 approved; E1–E5 created/approved/committed; at least one running | `synth mission list`, `synth expedition list` |
| A2 | After every ceremony: auto-commit succeeds and tree is clean | `git status --porcelain` empty (agent asserts after each transition) |
| A3 | Read-only commands never dirty the tree | `tests/no-write-on-read.test.js` green |
| A4 | Policy ↔ index ↔ `.gitignore` agree; CI guard wired | `scripts/check-artifact-policy.js` in `govern`/Proof Gate |
| A5 | Every PR: Proof Gate green, `explain replay` consistent, no ledger merge conflicts | CI + `synth explain replay` |
| A6 | `arena/...` branch works with `mode: enforce` via `--branch --no-create` | ADR-056 AC1 reproduced in this workspace |
| A7 | Delivery is a ceremony: `deliver` → merge → `seal`; `close` refuses `deliveryPending` | E5 tests |
| A8 | Anchor resilient: delete `.synth/anchor/` → `doctor` repairs (`worktree prune` + re-add) | manual + test |
| A9 | Sandbox never holds the only copy: branch pushed; every ceremony committed + pushed | `git log origin/arena/c5db653e-synth` |

---

## 7. Effort & critical path

| Stage | Work | Duration |
|---|---|---|
| 0 | window open + branch backup + draft preservation | 0.5 h |
| 1–3 | mission approval loop + 5 expeditions | 0.5 d |
| 4a | E1 (P1 fix) | 1 d |
| 4b | E2 | 1 d |
| 4c | E3 (policy + tests + CI) | 1 d |
| 4d | E4 (ADR-056) | 1–2 d |
| 5 | window close | 0.5 h |
| 6 | E5 (ledger writer + deliver/seal MVP) | 3–5 d |
| 6+ | FMW v2 resumes (`bc9c51e0`, `29b9a370`) | existing scopes |

**Critical path:** Stage 0 → E1 → E4 → Stage 5. Everything after the window close is steady-state work.
**Window bound:** ~1 week (E1+E2+E3+E4 with review). After E1 it is already paying for itself (clean
ceremonies), so an extension of the window is low-risk as long as the single-writer rule holds.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sandbox lost with uncommitted ledger | push branch at Stage 0; commit + push after every ceremony (A9) |
| A second writer runs a ceremony during the window | window rule (ADR-055 §2.9): code-only merges allowed; no ceremonies elsewhere; merge conflicts on `.synth/**` = stop signal |
| PRs carry the ledger during bootstrap (gate bypass) | accepted deviation, ends with E5; recorded in the plan and in ADR-055 §2.9 item 5 |
| `src/cli/synth.ts` conflicts across E1–E5 | strict serialization (one expedition in flight); ADR-054 refactor later splits the file |
| `mode: off` forgotten before merge | Stage 5 checklist + this doc + `doctor` warning class (E5); the suspension commit is reverted explicitly |
| Draft files are gitignored (lost on transfer) | force-add now (Stage 0); permanent fix is E1/E3 policy (`input` class) |
| CI Proof Gate unexpectedly red on ledger-carrying PRs | run `synth explain replay` + targeted tests before pushing; the operator owns final `npm run govern` |
| Protection rules unknown (403 on details) | operator merges; no bypass assumed |

---

## 9. Open questions — assumed defaults unless the operator objects

| # | Question | Assumed answer |
|---|---|---|
| 9.1 | Mission structure: 2 missions or fold M2 into M1? | **2 missions** (purposes stay honest; `expedition move` makes it cheap to change) |
| 9.2 | Artifact policy: keep draft `*.integrity.json` tracked? (PLAN Q2) | **tracked as `input`** (draft-integrity tests consume them) |
| 9.3 | Delete stale `event-log.jsonl` outright? (PLAN Q3) | **yes** (262 events vs 320; inert legacy) |
| 9.4 | ADR-054: mission cancel semantics / review gates / `committed` migration / shim lifetime (Q1–Q4) | map cancel→`archived`+reason; **wire** review gates for `--governed`; migrate the 8 committed expeditions to `approved` in one repair; shims for **2** minor versions |
| 9.5 | ADR-054 Q5: mission `start` vs approval-as-activation | keep **approval-as-activation** (no mission `start`) |
| 9.6 | ADR-056 Q2: who may declare a branch | **any actor** with a recorded binding (`declaredBy` in the payload); mission branches need the operator identity |
| 9.7 | ADR-056 Q3: ship `expedition rebind` now? | **defer** (Q4-style "wait for a real need") |
| 9.8 | ADR-056 Q4: `declaredPatterns` semantics | **warning-softening only** |
| 9.9 | ADR-056 Q5: declared branch already checked out in another worktree | **prefer the current checkout** |
| 9.10 | ADR-055 Q2: post-bootstrap host policy | **single writer at a time**, enforced by doctor + lock; `synth ledger import` for the second writer later |
| 9.11 | Anchor `worktree prune` ownership | `doctor` (with `--fix`) |

---

## 10. Out of scope / explicitly deferred

- The 7 deferred remote branches on `origin` (`exp-program-013-*`, `expedition/*`, `feat*`) plus the stale
  local remote-tracking refs for the already-deleted `pr-303…331` branches — operator handles later; do not
  delete/close them.
- Era IV roadmap and Program-level work (unchanged).
- FMW v2's remaining backlog beyond the three named items — continues under its own mission.
- ADR-055 P3 (full worktrees) and `synth ledger import` — E6/later, not needed to exit bootstrap.
- `full-govern` observational-equivalence work — not required for these PRs (targeted validation per ADR-043).

---

## 11. Artifact map

| File | Role |
|---|---|
| `docs/audits/mission-expedition-cli-audit-2026-10-12.md` | evidence base (inventory, rules, reproductions, Addendum 2) |
| `docs/plans/reads-never-write.md` | M1 detail (W1–W5 → E1–E3) |
| `docs/adr/ADR-054-unified-lifecycle-state-machine.md` | lifecycle design (vehicle `bc9c51e0`) |
| `docs/adr/ADR-055-ceremonial-events.md` | ledger placement, anchor, delivery, bootstrap §2.11 |
| `docs/adr/ADR-056-declared-execution-branches.md` | `--branch` / `--no-create` |
| `the operator project brief (working note, not in-repo)` | project status & operating contract |
| `docs/plans/master-delivery-plan.md` | this document |
