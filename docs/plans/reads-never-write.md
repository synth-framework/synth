# Implementation Plan — "Reads Never Write" (Derived-State Integrity)

**Item:** Eliminate the defect class where SYNTH's own read paths dirty the working tree, block expedition completion, and leave governance state uncommitted.
**Status:** **Executed for E1–E3** (see §12 status log) — E1 `123030d`, E2 `5a663e8`, E3 `e881f6d` on `arena/c5db653e-synth`; M1 completion and PR merges pending.
**Date:** 2026-10-12 · **Base:** `main` @ `ac4e81a` (v2.6.1) · **Author:** Arena agent
**Related:** `docs/audits/system-review-2026-10-12.md` §4/§7/§11 · drafts `e8ba8f92d0105412`, `0463c2cae71ac727` · ADR-051 (derived state protection) · `docs/adr/ADR-054-…` proposal (unrelated lifecycle work)

---

## 0. The invariant

> **A read-only command must not modify anything that git tracks, and derived state must never block work.**

Everything below is in service of that sentence. If a change doesn't serve it, it's out of scope.

---

## 1. Findings (all reproduced today, on a clean tree)

I need to correct one thing I said earlier, and report two new discoveries that change the fix.

| # | Defect | Evidence | Severity |
|---|---|---|---|
| **D1** | **Auto-commit is broken right now.** `autoCommitDerivedState` collects all of `.synth/data/**` (145 files), runs one `git add -- <list>`, and **that add fails** because the list contains paths matching `.gitignore` rules | Reproduced with the exact file list: `git add -n -- …` → `The following paths are ignored by one of your .gitignore files: .synth/data/drafts`. Function returns `{committed:false, reason:"Failed to stage derived state"}` → governance state left uncommitted after every lifecycle transition | 🔴 **P1, live** |
| **D2** | **`filterIgnoredFiles` is a no-op for the files it exists to filter.** It calls `git check-ignore --stdin`, which **hides paths that are in the index** unless `--no-index` is passed | `git check-ignore --stdin` → reports nothing (exit 1); same input with `--no-index` → reports 3 of 4 paths. This is why the filter doesn't save D1 | 🔴 **P1, live** |
| **D3** | **`git add` refuses ignored paths even when they are tracked.** Assumption "gitignore doesn't apply to tracked files" is false for explicitly-listed pathspecs | `printf ' ' >> <tracked draft>; git add -n -- <that file>` → ignored-path error. Same for a modified `.synth/ai/skills.json` | 🔴 (explains D1) |
| **D4** | **`.gitignore` contradicts the index for 26 files.** Ignored-but-tracked: `cli-errors.jsonl`, `drafts/` (19 files), `dependency-records-cache.json`*, `.synth/ai/*.json` (5)  (*the cache has no rule but is tracked and machine-specific) | `git check-ignore --no-index` vs `git ls-files` | 🟠 P1 |
| **D5** | **`synth status` — a read-only command — writes two tracked files, every time.** `status-light.ts` imports and calls `refreshAiMetadata`, which rewrites `.synth/ai/{capabilities,lifecycle}.json`. It never settles: the tracked copy is stale (`activeExpeditionId: bfe9b21ecfd8074d`) while the writer is faithful to current state | Two consecutive `synth status` runs → same ` M .synth/ai/…` diff | 🟠 P1 |
| **D6** | **`.synth/ai/` is not in the derived classification**, so D5's writes count as *source* changes and can block completion | `DERIVED_STATE_PATTERNS = [".synth/data/", "proof/expeditions/", "data/event-log.jsonl", "data/canonical-state.json", "AGENTS.md"]` — no `.synth/ai/`. **Hypothesis (mechanism proven, attribution unproven):** this is a likely cause of the framework's own warning *"7 expedition completions failed because of uncommitted source changes"* — a `synth status` before `expedition complete` is enough | 🟠 P1 |
| **D7** | **The dependency cache is machine-local state committed into git.** It is keyed on `stat.mtimeMs` (float, filesystem-dependent). On a fresh clone, the first heavy command rewrites ~1,275 lines because foreign mtimes can never match | `synth doctor` / `synth capabilities` on a clean clone → ` M .synth/data/dependency-records-cache.json`, then it settles | 🟡 P2 |
| **D8** | **A stale monolithic event log is still tracked, still in the commit list, and still called the source of truth in prose.** `.synth/data/event-log.jsonl` = 262 events; the real log is `event-stream/` = 320 | file counts; `AGENTS.md` line 51; `collectDerivedStateFiles` rootFiles | 🟡 P2 |
| **D9** | **Parsing all 413 charters without any cache costs 89 ms** (2.2 MB read + parse) — i.e. the persisted cache buys very little | measured directly | context for D7's fix |

**Correction to my earlier report:** I said the cache rewrites on *every* command. More precisely: **once per clone/machine** (it then settles), because I was reverting it between probes. The defect is real — a fresh clone is guaranteed dirty after one command, which is exactly what CI does — but I overstated the frequency. D1/D2 are the sharper problems.

**Root cause (one sentence):** `.synth/data/` conflates four different kinds of thing — durable truth, durable governance input, derived projection, and machine-local cache — so `.gitignore`, the commit list, and the completion gate each encode a different, inconsistent guess about which is which.

---

## 2. Design decision — "Think of GIT, what would Linus do?"

Applied literally, because git solved this exact problem 20 years ago.

| Git concept | Git's rule | SYNTH equivalent | Today |
|---|---|---|---|
| **Objects** (blobs/trees/commits) | content-addressed, append-only, canonical | `event-stream/` events | ✅ correct, hash-chained |
| **Refs** | durable pointers in `.git/refs` | `canonical-state.json`, snapshots | ✅ tracked |
| **Index** (`.git/index`) | **a cache — never committed**, refreshed in memory, mtime used only as a *fast path* with a content fallback | `dependency-records-cache.json` | ❌ committed (blasphemy) |
| **Ignore rules** | apply to *untracked* paths; a tracked file is never "ignored" | `.gitignore` | ❌ lies: 26 files are both |
| **Working tree** | derived from objects; `git status` is a **pure read** | derived projections, `.synth/ai/` | ❌ written by reads |

The three Linus rules this implies:

1. **"Bad programmers worry about the code. Good programmers worry about data structures."** → Don't patch `git add` with `-f` and don't add another ignore exception. **Classify the artifacts once**, in one machine-readable place, and let `.gitignore`, the commit list, the completion gate, and CI all derive from it. That kills D2/D4/D6/D7 by construction instead of by special case.
2. **Content, not metadata.** A cache keyed on mtimes is git's own "racy index" problem; git solves it by falling back to content. Key the cache on **content hashes**, store it **outside the index** (`/.synth/cache/`, already ignored), and never let a cache live in version control.
3. **Never break userspace.** Existing checkouts must not break: keep reading legacy paths, keep the legacy cache file readable (ignored, not consumed), never rewrite history, no forced migrations. Deprecate with notices, delete in a later release.

**One more Linus-ism worth naming:** *"Talk is cheap. Show me the code."* → The last workstream is a **regression test that fails if any read-only command dirties the tree.** Not a policy, not a checklist — an executable assertion.

---

## 3. The classification (single source of truth)

New file **`src/state/artifact-policy.ts`** (pure data + predicates, no IO):

| Class | Meaning | Paths | In git? | In auto-commit? | In completion gate? |
|---|---|---|---|---|---|
| `durable` | authoritative replay source | `.synth/data/event-stream/`, `.synth/data/canonical-state.json`, `.synth/data/expeditions/`, `.synth/data/missions/`, `.synth/data/referenceEvidence/`, `proof/expeditions/*/manifest.json` | **tracked** | yes | excluded (they're the thing being recorded) |
| `input` | durable governance inputs produced before a transition is recorded | `.synth/data/drafts/` | **tracked** (rule removed) | yes | excluded |
| `derived` | regenerable projections, never a source | `.synth/ai/`, `.synth/context.json`, `.synth/discovery/`, `docs/generated/`, `AGENTS.md` (generated section), `*.integrity.json` | **untracked** | no | excluded |
| `cache` | machine-local, content-keyed, disposable | `.synth/cache/**`, `dependency-records-cache.json` (legacy, read-only) | **untracked** | no | excluded |
| `legacy` | superseded artifacts, readable but inert | `.synth/data/event-log.jsonl`, `.synth/data/cli-errors.jsonl` | **untracked** | no | excluded |

**Why drafts are `input`, not `derived`:** `synth mission approve --draft-id X` reads a draft file. A draft is therefore load-bearing across machines, and calling it "derived" (as `AGENTS.md` does today) is the document lying about the architecture. Making drafts truly replayable means emitting draft events into the log — that is an event-model change and belongs in its own ADR/expedition ("Drafts as replayable artifacts"). Until then, drafts are honest inputs.
**Why `cli-errors.jsonl` stays a file but leaves git:** it is a debugging log; the durable audit trail is the event log.

*(Note: `.synth/data/dependency-records-cache.json` currently has no `.gitignore` rule at all — it's tracked by accident of history. It becomes `cache`, and the file is deleted.)*

---

## 4. Workstreams and exact file changes

### W1 — Cache: content-keyed, untracked, disposable  *(D7, D9)*

**`src/governance/dependency-graph.ts`** (~L60–L135, `parseCharterDirectory`):
- Replace `mtimes: Record<string, number>` (from `fs.stat().mtimeMs`) with `digests: Record<string, string>` (sha256 of file content, computed with `crypto.createHash("sha256")` over the read buffer — cheap: 2.2 MB total).
- Move cache location: `path.join(cwd, ".synth", "cache", "dependency-records.json")` (already gitignored, line 30).
- Write only when the digest map or records set actually changed (unchanged from today's intent, but now content-driven, so it is stable across machines and clones).
- **Legacy read-through:** if `.synth/data/dependency-records-cache.json` exists, ignore it (do not consume, do not delete it in code). It's removed from the index by W2 and can be deleted by the operator.
- **Fallback:** any read/parse error → recompute silently (existing behavior, keep it).

**Files:** `src/governance/dependency-graph.ts` (only). **No new dependency** (`node:crypto`).

### W2 — Index surgery: make `.gitignore` truthful  *(D3, D4, D8)*

One commit, pure git bookkeeping + config:

```bash
# 1. Untrack things that are derived/cache/legacy (keep them on disk)
git rm --cached -r .synth/ai .synth/data/cli-errors.jsonl .synth/data/dependency-records-cache.json
git rm --cached .synth/data/event-log.jsonl           # stale monolith (262 events; superseded by event-stream/)

# 2. Deletions of files nobody should have on disk
rm -f .synth/data/dependency-records-cache.json .synth/data/event-log.jsonl
```

**`.gitignore`** — replace the ad-hoc block (lines ~28–40) with the classification, in this order (negations last):

```gitignore
# SYNTH artifacts (see src/state/artifact-policy.ts — do not hand-edit independently)
# durable
!.synth/data/event-stream/
!.synth/data/canonical-state.json
!.synth/data/expeditions/
!.synth/data/missions/
!.synth/data/referenceEvidence/
# cache (never committed)
.synth/cache/
.synth/data/dependency-records-cache.json
# derived projections
.synth/ai/
.synth/context.json
.synth/discovery/
.synth/data/cli-errors.jsonl
.synth/data/event-log.jsonl
*.integrity.json          # ← REVIEW: drafts' integrity files are referenced by draft-integrity tests
# inputs (durable — deliberately NOT ignored)
# .synth/data/drafts/     ← rule REMOVED
```

> ⚠️ **Open point (operator decision, Q2 below):** `*.integrity.json` currently applies to draft integrity files that are tracked and consumed by `tests/draft-integrity.test.js`. Either they become `input`+tracked (drop the blanket rule, add `!.synth/data/drafts/*.integrity.json`) or the integrity check recomputes in memory. Recommendation: keep them tracked (they are integrity *assertions* about durable inputs, not projections).

**`AGENTS.md`** (derived section, lines ~60–70): update "Durable replay source" and "Derived artifacts" lists to match the classification, and remove `event-log.jsonl` as the source of truth (it is `event-stream/`).

### W3 — Auto-commit: correct, bounded, observable  *(D1, D2)*

**`src/cli/synth.ts`:**
- `collectDerivedStateFiles` — drive from `artifact-policy` classes `durable` (only) instead of walking the whole tree; **stop including** `.synth/data/event-log.jsonl`, `cli-errors.jsonl`, `drafts/`*(inputs are already tracked; committing them is allowed but must not fail — see next bullet)*.
- `filterIgnoredFiles` — **`git check-ignore --no-index --stdin`** (the one-flag fix for D2). Keep exit-code handling as-is.
- Staging — never fail the whole commit for one path:
  ```ts
  // stage in one call, but only paths that exist AND are addable
  const stageable = (await filterIgnoredFiles(cwd, existing(allFiles)))
  const changed   = await changedPaths(cwd, stageable)   // git status --porcelain -- <paths>
  if (changed.length) execFileSync("git", ["add", "--", ...changed])
  ```
  If `git add` still fails, **fall back to per-file adds**, collecting failures, and report them instead of aborting.
- **Observability:** return `autoCommit` in the command's JSON payload (`{committed, commitHash, files, reason}`) so an agent sees why state wasn't committed; today it is silent.

**Files:** `src/cli/synth.ts` (~L300–L300+30, L524–L578, call sites L5918/L6341/L6436/L6878), `src/state/artifact-policy.ts` (new).

### W4 — Writers: separate compute from persist  *(D5, D6)*

- **`src/cli/ai-metadata.ts`** — `writeAiMetadata`: build the bundle, compare to the on-disk content, **write only if different**; return `{changed: boolean, files: []}`.
- **`src/cli/status-light.ts`** — `synth status` must not persist: call the **pure builder** (no `refreshAiMetadata`). If a caller wants regeneration, that's `synth ai refresh` (explicit, already exists) or the bootstrap path.
- **`DERIVED_STATE_PATTERNS`** → replaced by `artifact-policy.isDerived(relPath)` so `.synth/ai/`, `.synth/cache/`, `cli-errors.jsonl` are correctly excluded from the completion gate (fixes D6 and the 7-completions class of failure).
- Audit remaining read paths for writes: `src/cli/synth.ts` L1504–L1560 (`init` writes `lifecycle.json` — that's a mutating command, allowed), `src/cli/agent-artifacts.ts` L75 (bootstrap path, allowed).

**Files:** `src/cli/ai-metadata.ts`, `src/cli/status-light.ts`, `src/cli/synth.ts`.

### W5 — Policy artifact, CI guard, regression suite  *(the invariant)*

- **`src/state/artifact-policy.ts`** (new, ~60 lines): the classification table of §3 plus `classify(relPath)`, `isDerived()`, `isCommittable()`, `isExcludedFromGate()`, and `allPatterns()`.
- **`scripts/check-artifact-policy.js`** (new): asserts (a) every tracked path that the policy classes as non-`durable`/non-`input` is **not** in the index, (b) every policy `tracked` path exists or is optional, (c) `.gitignore` agrees with the policy for every class. Exit non-zero with a diff-style report. Wire into `npm run govern` and the Proof Gate.
- **`tests/no-write-on-read.test.js`** (new): `git archive HEAD | tar -x -C $(mktemp -d)` (the pristine-tree recipe from `.agents/AGENTS.md`), then for each read-only command — `status`, `explain replay`, `explain lineage`, `doctor`, `capabilities`, `expedition list`, `mission list`, `program list`, `log --tail 1`, `validate --dry-run` — assert `git status --porcelain` is **empty** afterwards, resetting between commands. Fails today on `status`, `doctor`, `capabilities`.
- **`tests/derived-state-commit.test.js`** (new, or extend the existing `tests/expedition-auto-commit.test.js`): in a temp repo, drive a lifecycle transition and assert exactly one `chore(synth): record …` commit containing the durable files, with a clean tree afterwards.
- **Registration:** `data/tasks/test:no-write-on-read.task.json`, `data/tasks/test:derived-state-commit.task.json`, `data/tasks/check:artifact-policy.task.json` + `package.json` scripts + `test:all` chain (or the governance tier list).

---

## 5. CLI runbook (what we will actually run)

All commands below are for **you (operator)** or for me **after** you approve; the first three are read-only and safe today.

```bash
# ── 0. Pre-flight (read-only) ──────────────────────────────────────────────
synth status                                  # expect: ok; note the Phase
synth explain replay                          # expect: consistent: true
synth checkpoint                              # expect: blocked (no executing expedition)

# ── 1. Mission (see §6 for the recommendation) ─────────────────────────────
synth alignment prepare                       # prints a minimal aligned contract id
synth mission create --subject "Derived-State Integrity" \
  --purpose "Eliminate the class of defects where SYNTH's own read paths dirty the working tree, block completion, or leave governance state uncommitted."
#   → copy the draftId
synth mission approve --draft-id <draftId> --alignment-contract-id <contractId>
#   ⚠️ must run on the mission branch the CLI names in its error/suggestion
synth mission show --id <missionId>           # verify status: active

# ── 2. Expeditions (one per workstream) ────────────────────────────────────
synth expedition create --mission "Derived-State Integrity" \
  --subject "Fix derived-state staging (auto-commit + ignore filtering)" \
  --goal "…

then, for each: approve → start (branch is created) → validate → evidence → complete
synth expedition approve --draft-id <expeditionDraftId> --dry-run     # preview first
synth expedition approve --draft-id <expeditionDraftId>
synth expedition commit --proposal-id <id> --dry-run   # preview: commit only records state (retires the draft)
synth expedition commit --proposal-id <id>             # no branch is created here
synth expedition start  --id <expeditionId>   # ← branch is created + checked out HERE (mode: enforce, featured)
git branch --show-current                     # expect expedition/<mission-slug>/<slug>-<id7>

# ── 3. During work (on the expedition branch) ──────────────────────────────
synth validate --dry-run                      # impact plan
synth validate                                # targeted checks  (ADR-043: no full pipeline as agent)
node tests/no-write-on-read.test.js           # the new invariant — must go red→green
synth expedition evidence --id <expeditionId> --git-diff
synth expedition complete --id <expeditionId> # auto-commit must now succeed
git status --short                            # EXPECT: empty
git log -1 --stat                             # EXPECT: one chore(synth): record expedition-complete commit

# ── 4. Hand off ────────────────────────────────────────────────────────────
git push -u origin <branch> && gh pr create    # operator runs: npm run govern
```

**Migration of the existing drafts (after the new mission exists):**
```bash
synth expedition move --id e8ba8f92d0105412 --to-mission <newMissionId>   # auto-commit bug belongs here
# 0463c2ca stays with the gate/evidence policy work; 0daac4fc stays in Framework Maturation v2
```

---

## 6. Mission recommendation

**Recommendation: a dedicated mission** — *"Derived-State Integrity"* — containing 3 expeditions, with the fix workstreams grouped as follows:

| Expedition | Workstreams | Why grouped |
|---|---|---|
| **E1 — Derived-state staging correctness** | W3 + W2(index surgery) + the `e8ba8f92` draft | One invariant, one PR, independently shippable in a day; fixes the live P1 |
| **E2 — No write-on-read** | W1 + W4 | Both are "commands that must not mutate"; both touch policy |
| **E3 — Policy + regression guard** | W5 (+ policy manifest, CI check, docs/AGENTS regeneration) | Makes the fix permanent; produces the proof artifact |

**Why not the current mission (`4ab7e9d2` Framework Maturation v2):** its chartered purpose is *"CLI next-command bugs, simplify expedition lifecycle, bootstrap performance."* This work is **derived-state integrity and toolchain truthfulness** — a different strategic theme, with its own ADR-adjacent artifact (the artifact classification) and its own proof story (a green invariant test). FMW-v2 is already a heterogeneous bucket (48 expeditions, 15 drafts, 8 committed); adding a distinct theme degrades its ranking signal — and SYNTH ranks by mission, so the confusion is structural, not cosmetic. A dedicated mission also gives us a clean unit to complete and archive, which is worth more than saving three commands of ceremony.

**Counter-argument, stated fairly:** FMW-v2 already owns `e8ba8f92` and `0463c2ca`; folding in avoids `expedition move` and mission ceremony, and the work is arguably "maturation". If you prefer to avoid mission overhead right now, the *fallback* is: keep everything in FMW-v2, create the three expeditions there, and accept that FMW-v2's purpose statement no longer describes its contents (I'd then recommend a mission `refine` to widen the purpose). **You decide; the plan works either way — only the `--mission` argument changes.**

---

## 7. Test plan

| Test | Type | Asserts | Fails today? |
|---|---|---|---|
| `tests/no-write-on-read.test.js` | new | every read-only command leaves `git status --porcelain` empty (pristine temp tree) | **yes** (status, doctor, capabilities) |
| `tests/derived-state-commit.test.js` | new / extend `expedition-auto-commit.test.js` | one commit per transition, durable files only, clean tree after | **yes** |
| `tests/artifact-policy.test.js` | new | policy ↔ index ↔ `.gitignore` agree; no derived path tracked | **yes** (26 files) |
| `scripts/check-artifact-policy.js` | new | CI guard, wired to `govern`/Proof Gate | n/a |
| `tests/draft-integrity.test.js` | existing | must keep passing after the `*.integrity.json` decision | watch |
| `tests/stale-state.test.js`, `tests/command-safety.test.js` | existing | may reference `DERIVED_STATE_PATTERNS`; update to policy API | watch |
| `tests/expedition-completion-gates.test.js` | existing | completion gate behavior unchanged for *source* dirt | must stay green |

**Definition of done:** all of the above green, plus `synth explain replay` still `consistent: true` on this repository, plus the four before/after proofs in §8.

---

## 8. Expected output after the fix

**Before / after, same commands, same clean clone:**

```text
$ synth status && git status --short
BEFORE:  M .synth/ai/capabilities.json
         M .synth/ai/lifecycle.json
AFTER:   (no output — tree clean)

$ synth doctor >/dev/null && git status --short
BEFORE:  M .synth/data/dependency-records-cache.json
AFTER:   (no output — cache now lives in ignored .synth/cache/)

$ synth expedition complete --id <id>
BEFORE:  { "status": "ok", ... }          ← nothing said about state hygiene
         $ git status --short  →  M .synth/data/...   (auto-commit silently failed)
AFTER:   { "status": "ok", ...,
           "autoCommit": { "committed": true, "commitHash": "<sha-of-the-new-commit>",
                           "files": [".synth/data/event-stream/partition-2/segment-0001.jsonl",
                                     ".synth/data/canonical-state.json", …] } }
         $ git status --short  →  (no output)

$ node tests/no-write-on-read.test.js
AFTER:   ✓ status … ✓ explain replay … ✓ doctor … ✓ capabilities … ✓ expedition list … 10/10 clean

$ git ls-files .synth | wc -l      # index no longer carries derived artifacts
BEFORE:  ~40      AFTER:  ~26 (durable + inputs only)
```

**Unchanged (regression guards):** `synth status`, `synth explain replay`, `synth capabilities`, `synth doctor`, `synth expedition list` output JSON must be **byte-identical** to today (the fix changes where data is *written*, not what is *read*). Performance must not regress: heavy commands ≤ 320 ms cold, light ≤ 250 ms (measured today: 118–290 ms).

---

## 9. Risks, rollback, effort

| Risk | Mitigation |
|---|---|
| Untracking `.synth/ai/` removes files from a fresh clone | They are regenerated by `synth ai refresh` / bootstrap; add a `doctor` check that reports missing AI metadata with the exact command to regenerate |
| Deleting `event-log.jsonl` surprises tooling that reads the conventional path | It is 262 events vs 320 in `event-stream/` (i.e. **wrong**); `PartitionedEventStore.createFromFile` still handles arbitrary evidence logs. Add a `doctor` warning if a monolith reappears |
| `*.integrity.json` decision affects draft-integrity tests | Explicit open question (Q2); the fallback keeps them tracked |
| Cache change could regress perf | Cache stays content-keyed (same hit rate); if any regression, fall back to no-cache (89 ms measured) |
| Index surgery is a large diff in one commit | It's bookkeeping, not logic: `git rm --cached` leaves files on disk; `npm run govern` must be green before merge; revert = `git revert` |
| `filterIgnoredFiles` behavior change alters auto-commit contents | The new test pins the exact expected file set |

**Rollback:** every workstream is independently revertable. W2 is a pure git-index change; W1/W3/W4 are code changes behind unchanged interfaces; W5 is additive (new files + CI step).

**Effort:** W1 0.5 d · W2 0.5 d · W3 0.5 d · W4 0.5 d · W5 1 d → **~3 focused days**, deliverable as 3 PRs (E1, E2, E3).

---

## 10. Open questions for the operator

1. **Mission:** dedicated *Derived-State Integrity* (my recommendation) or fold into Framework Maturation v2 with a purpose refinement?
2. **Draft integrity files:** keep tracked as `input` (recommended) or class them `derived` and recompute in memory?
3. **Deleting the stale monolith:** delete `event-log.jsonl` outright (recommended) or keep it on disk as inert `legacy` for one release?
4. **Mission branch friction:** approving a mission requires being on `mission/<id>` — do we accept that for these three expeditions, or file it (it blocks an agent from even *previewing* mission approval, as I hit twice)?
5. **`e8ba8f92`:** close it as *implemented-by* E1 once E1 lands, or keep it as the tracking item for the auto-commit half?

---

## 11. Drafts registered + handoff runbook (2026-10-12)

### 11.1 Mission draft (created)

| Field | Value |
|---|---|
| Subject | **Derived-State Integrity** |
| Draft id | `2db51370ae127555` |
| Draft file | `.synth/data/drafts/2db51370ae127555.json` (+ `.integrity.json`, integrity `certified`) |
| Confidence | 0.67 (`observationCoverage 0.1`, `evidenceQuality 0.8`, `consistency 1`) |
| Similar missions | none detected |
| **Runtime mission id (predicted)** | **`b536ecc7ceb9217a`** — read from the draft's `worldModel` mission node |
| **Required approval branch** | **`mission/b536ecc7ceb9217a`** (legacy 16-hex form: the mission does not exist in state yet, so slug enrichment cannot run) |

*Prediction method validated:* draft `29ae2d57a8e89153` → node id `8042c36560e13341` = exactly the branch the CLI demanded in its `BranchPolicyDenied` error. Trust the CLI's error message if it disagrees.

⚠️ Draft files are **gitignored** (rule `.synth/data/drafts/`), so they do not travel with a patch-based transfer. If the workspace is lost, re-running `mission create` yields a **different** draft id — and therefore a different mission id and required branch. To move it, copy both `2db51370ae127555.json` and `2db51370ae127555.integrity.json` together (the integrity record is the content hash).

### 11.2 Approval sequence (operator)

```bash
# 1. Genesis — create the aligned contract (branch-free)
synth alignment prepare
#    → note the contract id (alignment-contract-…)

# 2. First approval attempt tells you the branch it wants (nothing creates it for you)
synth mission approve --draft-id 2db51370ae127555 --alignment-contract-id <contractId>
#    → expected: BranchPolicyDenied, requiredBranch mission/b536ecc7ceb9217a
#      (this is the known gap: only EXPEDITION branches are auto-created — by `expedition commit`)

# 3. Create and switch to that branch manually
git checkout -b mission/b536ecc7ceb9217a

# 4. Approve
synth mission approve --draft-id 2db51370ae127555 --alignment-contract-id <contractId>
```

### 11.3 Expedition drafts (prepared, dry-run validated — NOT executed)

Each command below was validated with `--dry-run` (nothing written). After the mission is **active**, run them with the mission **id** (unambiguous, avoids the name-resolution path):

```bash
# E1 — staging correctness (fixes the live P1)
synth expedition create --mission b536ecc7ceb9217a --subject "Derived-state staging correctness (auto-commit + ignore filtering)" --goal "Fix auto-commit staging so lifecycle transitions always commit durable state and never fail on gitignored paths: call git check-ignore with --no-index so tracked-but-ignored paths are still filtered, stage only existing/changed durable artifacts instead of walking all of .synth/data, fall back to per-file adds so one bad path cannot kill the commit, and surface the autoCommit result (committed/commitHash/files/reason) in command JSON. Closes draft e8ba8f92."

# E2 — no write-on-read
synth expedition create --mission b536ecc7ceb9217a --subject "No write-on-read: content-keyed cache and pure status" --goal "Make read-only commands read-only: key the charter dependency cache on content hashes instead of mtimes and relocate it to .synth/cache/ (untracked), make synth status compute AI metadata without persisting it while synth ai refresh remains the explicit regenerator, and extend the derived classification to .synth/ai/, .synth/cache/ and cli-errors.jsonl. Deliverable: status, doctor and capabilities leave a pristine tree clean."

# E3 — policy + guard (depends on E1+E2)
synth expedition create --mission b536ecc7ceb9217a --subject "Artifact policy and no-write-on-read regression guard" --goal "Introduce src/state/artifact-policy.ts as the single classification of durable, input, derived, cache and legacy artifacts; make .gitignore, the auto-commit file list and the completion gate derive from it; add scripts/check-artifact-policy.js as a CI guard; add tests/no-write-on-read.test.js and tests/derived-state-commit.test.js so the invariants reads-never-write and derived-state-never-blocks-work are enforced by tests."
# then link the dependency (verified path):
synth expedition refine --id <E3-id> --note "E3 consumes the policy landed by E1/E2" --depends-on <E1-id>,<E2-id>
```

```bash
# Typed entity references — belongs to the ACTIVE Framework Maturation v2 mission
synth expedition create --mission 4ab7e9d2cc7b1b66 --subject "Typed entity references: link charters to runtime ids and print human-readable refs" --goal "Make SYNTH entity identifiers legible in three layers. (1) Link namespaces: add charterId to runtime records and a Runtime reference to charter frontmatter, modelled 1:many because one charter can spawn several runtime expeditions (precedent: charter 01604a3 / execution 886dc15e). (2) Typed display refs: emit EXP:<id8> - <name> and MIS:<id8> - <name> wherever a bare id appears (status nextActions, list/show, errors and warnings, --human), reusing the existing typed-prefix convention; add ref/title JSON fields and never change id. (3) Input resolution: accept typed refs, charter ids and full 16-hex ids in --id/--draft-id. Deliverable: src/cli/refs.ts, display and resolution changes, and an ADR for the typed reference contract."
```

Dry-run proposal ids (for the record): E1 `f34ce3ec4217d46d`, E2 `70c43bc00f294f70`, E3 `60f642ee75ee4ea9`, typed-refs `c830e84c138326f2`. These are **planning** ids, not runtime ids — the runtime id is assigned at create.

### 11.4 Why the expedition drafts were not executed from this session

1. **Binding:** the DSI mission is a *draft*; `expedition create` resolves the parent by id-or-name against **state**, and a draft mission is not in state. Creating now would store a name string as `missionId` → a record that never links to the mission once approved. Verified in `cmdExpeditionCreate` + `intake.ts` (`expedition.create`).
2. **State writes belong on a canonical branch:** `expedition create` calls `handleIntent` and emits `EXPEDITION_CREATED` into the tracked event stream. This session is pinned to `arena/c5db653e-synth`, so those events would be stranded outside the governance lineage — and the repo already carries two expeditions about exactly that hazard (`3c84f699`, `e617ccd0`). The repo's own contract requires an executing expedition + approval mode for state writes.
3. The typed-refs expedition (parent is active) is blocked only by (2) — run it on the branch you intend to keep, and it will bind correctly.

---

## 12. Status log (2026-10-12)

**E1 — Derived-state staging correctness** (`ecc3688796be0545`, commit `123030d`) — complete.
`existingAutoCommitPathspecs` (a missing pathspec no longer forces the fallback), `isTrackedPath` (`git ls-files -- <p>`), `check-ignore --no-index`, primary `git add -A -- <existing dirs> <excludes>` gated by `primaryOk`, fallback skipping ignored+untracked and using `-f` only for ignored+tracked; `autoCommit{committed,commitHash,files,reason}` surfaced in command JSON; 11 derived/cache/legacy files untracked; `.gitignore` rules for drafts/`integrity.json` removed. New regression `tests/auto-commit-ignored-paths.test.js` red before, green after. Live: `autoCommit.committed: true` on `refine`/`finish`/`evidence`, tree clean after each transition.

**E2 — No write-on-read** (`f089c4fea720c07c`, commit `5a663e8`) — complete.
Charter cache keyed on sha256 content digests, stored at `.synth/cache/dependency-records.json` (gitignored, written only when the digest map or records change; the legacy mtime cache is no longer read). `writeAiMetadata` compares each file against disk and writes only what changed, returning `{changed, files}`. `synth status` (light and heavy) no longer regenerates `.synth/ai/`; `synth ai refresh` and the bootstrap path remain the explicit regenerators.

**E3 — Artifact policy + guards** (`cfbb801aa232795a`, commit `e881f6d`) — complete.
`src/state/artifact-policy.ts` (durable / input / derived / cache / legacy, first-match-wins, include roots and `:(exclude)` pathspecs derived), `scripts/check-artifact-policy.js` (index ↔ policy ↔ `.gitignore`, plus `--ci` asserting `mode: enforce` — wired at window close), `tests/no-write-on-read.test.js`, `tests/artifact-policy.test.js`, registration in `package.json`, `data/tasks/*`, `docs/reference/capability-validation-map.json` and the `govern` task, `knowledge/AGENTS-intro.md` corrected and `AGENTS.md` regenerated.

### Corrections to the findings in §1

| Finding | Correction after implementation |
|---|---|
| D5 (`status` writes tracked files) | Confirmed, and now measured against a pristine tree: pre-fix `status` **creates `.synth/ai/`**; post-fix it does not |
| D7 (mtime-keyed cache) | Confirmed with a sharper test: pre-fix the cache was **rewritten by an identical run**; post-fix it is content-stable |
| "fails today on `status`, `doctor`, `capabilities`" (§7 test plan) | Too broad. Judged on an independently reset tree, only `status` and the cache-stability check fail pre-fix (0/11 → 11/11); `doctor`, `capabilities`, `explain replay`, `expedition list`, `mission list`, `program list`, `validate --dry-run` were already clean because their writes were to ignored paths |
| D4 (ignored-but-tracked) | E1's index surgery removed the tracked-but-ignored set; the guard now keeps it empty (2065 tracked paths checked) |
| D8 (stale `event-log.jsonl`) | Classified `legacy` and ignored; **not deleted**. The data is provably redundant (262/262 events present in `event-stream/` by `eventHash`), but three code paths still read the file — `getEventOffset()` (wrong offset 262 vs 377), `SNAPSHOT_FILES` (a commit-on-change snapshot would fail on the ignored path), and `verifySnapshotAtTag()` (already fails: `Event log missing at tagged state`). Migrate first, delete after (master plan F7/§9.3, audit Addendum 4) |
| New: Proof Gate coverage | `npm run govern` decomposes `package.json.scripts["test:all"]` (the shim), so it runs build + proof only. Mitigated in the `govern` task; proper fix is a follow-up expedition (master plan F1/A11) |
