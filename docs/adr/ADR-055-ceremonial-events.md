# PROPOSED ADR-055 — Ceremonial Events: Ledger Placement, Branch Protocol, and Delivery

**Status:** Proposed **rev 2** (submitted for operator review; accepted on merge). Rev 2 adds §R2 after the surface audit of 2026-10-12 (`docs/audits/mission-expedition-surface-audit-2026-10-12.md`, HEAD `63ed64f`); §1–§7 stand unchanged.
**Date:** 2026-10-12
**Depends on:** ADR-051 (derived-state protection), ADR-053 (branch inheritance — this ADR implements its Decision 4),
ADR-054-proposed (unified lifecycle state machine — states; this ADR is the git/artifact half of the same change)
**Supersedes:** nothing. Makes ADR-053's interim, discipline-based Decisions 1–3 unnecessary.
**Companion document:** `docs/audits/mission-expedition-cli-audit-2026-10-12.md` (evidence, reproductions, and the three failure modes this ADR answers).

---

## 1. Context

The audit reproduced three failures that are all the same failure seen from three angles:

- **F1 — Governance artifacts live only on feature branches.** Mission records, expedition records,
  evidence, certifications and every lifecycle event written during a ceremony are committed (when they are
  committed at all) to whatever branch the operator happened to be standing on. Delete that branch and the
  governance record of the work is gone; `synth status` on `main` does not even know something was lost
  (audit §4 R4).
- **F2 — The delivery of finished work is not modelled.** `expedition finish` completes the expedition *in
  place*, before any PR exists. The branch, the push, the CI run, the merge and the eventual branch deletion
  are outside the model entirely; the user's "we try to complete expeditions only after the PR's CI goes
  green" is a hand-kept convention, not a state (audit §4 R5, §7).
- **F3 — Concurrency is claimed but not possible.** The intake gate explicitly allows parallel expeditions;
  the agent contract forbids them; git allows exactly one working tree. The second `start` bases its branch
  on the first expedition's tip — silently inheriting its governance state and unmerged code — and later
  ceremonies for expedition 1 are recorded on expedition 2's branch (audit §3 #3, §4 R5).

The root cause was already written down. **ADR-053 (2026-08-24), Decision 4:** *"The real fix is a
mission/expedition creation handler that lands mission/expedition events directly into the durable,
centralized event source (effectively `main`), so every branch already contains them and branch-base
strategy stops being the failure point."* ADR-053 chose not to implement it and instead made branch-base
discipline a rule for humans and agents — which is how "weird rules that made sense at the start" enter a
system and stay.

**The git/Linus framing.** A branch is a line of *code* development; the durable project record is the
trunk. Nobody keeps the only copy of a project's ledger in a topic branch, and nobody expects discipline to
substitute for a merge. Governance metadata (who did what, why, with what evidence) belongs to the project,
not to the topic. Therefore: **write governance to the canonical branch at the moment it happens, and let
branches carry code only.**

## 2. Decision

### 2.1 Two planes

| Plane | Contents | Home | Writer |
|---|---|---|---|
| **Governance** | event journal (`.synth/data/event-stream/**`), derived projections, mission/expedition records, decisions, snapshots, certifications, evidence manifests | always the canonical branch (`main`, or the configured release branch) | exactly one component: the **Ledger Writer** (§2.3), invoked by the ExecutionGate |
| **Code** | source changes, tests, docs | per-expedition branches and worktrees | the agent/operator, as today |

A branch must never contain the only copy of a governance artifact. Corollary: *execution branches inherit
the ledger by construction* because the ledger's newest state is already on `main` when the branch is cut.

### 2.2 Artifact classes (explicit, enforced)

| Class | Examples | Git status | Lifetime |
|---|---|---|---|
| **Canonical** | event stream, `canonical-state.json`, `missions/*.json`, `expeditions/*.json`, `decisions.jsonl`, `snapshots/*`, `referenceEvidence/*`, `proof/expeditions/<id>/*` | tracked, always committed by the Ledger Writer in the ceremony commit | forever; single source of truth |
| **Canonical-tracked, derived-content** | `.synth/data/drafts/*` + `.integrity.json`, `.synth/ai/*`, `.synth/context.json`, `.synth/discovery/*` | **tracked** (operator decision — see note below) | drafts retire via `git rm` at `commit`/`abandon` so the deletion is part of the ceremony commit; `ai/`/`context`/`discovery` regenerate freely and must never block work |
| **Working** | source, tests, proof attachments captured mid-flight | tracked on the expedition branch | until merge/seal/abandon |
| **Ephemeral-untracked** | `.synth/cache/`, `.synth/anchor/`, `.synth/worktrees/`, lock files | gitignored, never tracked | disposable; content-hashed keys make them safely regenerable |

**Note on the drafts/ai regression (operator-corrected).** These families were *deliberately* tracked;
commit `80a93b4` (2026-08-23) re-ignored them without untracking the files, which is what silently broke
auto-commit (audit §4 R7). The fix direction is therefore **restore tracking, not untrack**: drop the
`.synth/data/drafts/` and `.synth/ai/` ignore rules, keep only true caches ignored, and — independently —
make the CLI's staging filter robust so it can no longer be knocked over by an ignore rule:

- classify with `git check-ignore --no-index` (the default hides index-tracked paths);
- skip a path only when it is ignored **and** untracked; every tracked file is stageable by definition;
- a ceremony whose staging/commit fails must fail loudly (see §2.3), never return `{committed:false}`.

Rule: *an artifact may not move to a stricter class without an explicit command that says so.*
`drafts/` is the only place an editable planning artifact may live; it is deleted the moment the runtime
record exists (`commit`) — which `commit` already does.

### 2.3 The Ledger Writer (implements ADR-053 D4)

One mechanism, one lock, one code path — every governance mutation goes through it.

- **Anchor worktree (operator-confirmed location: `.synth/anchor/`).** SYNTH maintains a dedicated
  worktree there — added to `.gitignore` together with `.synth/worktrees/`, so neither ever appears as
  working-tree noise — exported from the same repository object store and **detached at the canonical
  branch's tip** (`git worktree add --detach .synth/anchor main`) — detached because git refuses to check out the
  same branch in two worktrees, and the operator's own checkout may well be on `main`. The writer does its
  file I/O there with ordinary `git add`/`git commit` (on detached HEAD), then advances the branch with a
  single guarded command: `git update-ref refs/heads/main <new-commit> <expected-old-value>` — the
  compare-and-swap form, so a concurrent operator push or commit makes the write fail loudly instead of
  clobbering it. The anchor is created **sparse** (`git sparse-checkout set --no-cone '.synth/' 'proof/'`
  inside it): it only ever needs the ledger paths, and a sparse anchor avoids doubling the tree for
  repo-wide traversals (`tsc`, test globs, linters). If the operator's own checkout is clean, on the
  canonical branch, and the ledger lock is held, the writer may use it directly and skip the anchor.
  This keeps the mechanism to *one* line of plumbing and everything else plain, debuggable git. Details —
  dirty checkouts, resync, cleanup — are in §2.10 (lab-verified).
- **Serialization.** A lock file (`.git/synth-ledger.lock`, `flock`) plus a fast-forward-or-rebase
  refresh (`git fetch` when a remote exists, `git pull --ff-only` in the anchor) make the writer the
  *single writer* of the ledger. Concurrent CLI processes queue instead of racing.
- **Commit shape.** One ceremony = one commit on the canonical branch:
  `chore(synth): <TRANSITION> <entity-kind> <entity-id8>` — replacing today's best-effort
  `chore(synth): record <transition> for expedition <id>` that fails silently (audit §4 R7).
- **Failure is loud.** If the anchor cannot be updated (dirty, lock timeout, divergence), the ceremony
  **fails before** emitting anything, with a specific error (`LEDGER_UNAVAILABLE`) and a next step. The
  current silent `{committed:false}` path is deleted. Derived state may still be regenerated lazily; the
  *journal* may not be best-effort.
- **Reads stay local.** Reads keep using the checkout's own `.synth/data` (fast, offline). Because the
  ledger is on the canonical branch, a checkout that merges/rebase frequently is up to date; `synth doctor`
  reports anchor staleness. `guardEventLogLineage` (`e617ccd0`) becomes a redundant safety net and can
  eventually be retired — the divergence class it guards against disappears when there is one writer.

### 2.4 Branch protocol

1. **Mission branches become real or disappear.** Preferred: `mission approve` creates and pushes
   `mission/<slug>-<id7>` from the canonical branch (nothing about mission approval grants the right to be
   on an arbitrary branch — approval is a ledger ceremony, §2.3). Expeditions are based on their mission
   branch: `git worktree add <exp-worktree> -b expedition/… mission/…`. This makes
   `expedition → mission → main` a true graph and matches `branch-taxonomy.ts`'s `allowedBaseBranches`.
   Alternative if the operator wants a flat model: delete the mission role from the state machine and the
   taxonomy (ADR-054 already questions it). What is not acceptable is the current state — demanded by the
   gate, created by nobody (audit §3 #12).
   **Operator-declared branches** are the sanctioned exception to generated names: any entity may bind a
   branch it names, preferring a pre-existing one, via `--branch <name> [--no-create]`. The binding is
   recorded in the ledger and `resolveExecutionBranch` consults it before the naming convention. Full
   design: **ADR-056 (proposed)**.
2. **Base validation.** `ensureExpeditionBranch` refuses to base an expedition branch on anything except
   its mission branch (or the canonical branch when no mission branch exists). No more stacking on a
   sibling expedition (audit §4 R5).
3. **Follow-up branches** for in-flight work are based on the expedition's worktree branch (ADR-053 #1),
   though the ledger no longer depends on it.
4. **Naming** stays as `branch-taxonomy.ts` defines; the legacy raw-id candidate remains accepted for old
   branches but is no longer generated. Branch names are surfaced in `expedition show` **before** they are
   needed, so no operator should ever learn a branch name from an error message.

### 2.5 Execution isolation (worktrees) — how "multiple expeditions" becomes true

- `expedition start` creates a worktree per expedition: `<repo>/.synth/worktrees/<expedition-id8>/` on
  branch `expedition/…`. The operator's main checkout is never switched, so:
  - starting expedition 2 cannot move expedition 1's working tree;
  - uncommitted work cannot follow you onto another expedition's branch;
  - `checkpoint`, `evidence`, `finish` and `status` resolve per expedition
    (`synth checkpoint --id <id>` runs in that worktree).
- `synth status` lists every executing expedition with its worktree path and its own branch/HEAD.
- Cleanup: `expedition complete` (or `seal`) removes the worktree after the delivery ceremony; `abandon`
  keeps it until `--discard` (see §2.7). `synth doctor` detects orphaned worktrees.
- Escape hatch: `--worktree=off` restores today's single-checkout behaviour for constrained environments.
  Default on when git ≥ 2.5 and the filesystem is local.

### 2.6 Delivery ceremony (integration) — first-class, ordered after merge

New verbs, each a ledger ceremony:

```
expedition finish      # unchanged: evidence → certify → completed (local truth: "the work is done")
        │
        ▼   (only for expeditions that produce code)
expedition deliver     # push branch (or open PR via the GitHub adapter); record EXPEDITION_DELIVERED
                       #   payload: branch, tipCommit, prRef, baseBranch  → ledger on main
        │
        ▼   CI green → merge (operator or adapter); SYNTH does not merge for you
expedition seal --merge-commit <sha>
                       # verifies the merge commit's tree contains the delivered tip;
                       # records EXPEDITION_INTEGRATED → ledger on main
                       #   payload: branch, tipCommit, mergeCommit, integratedAt
        │
        ▼
expedition close       # (or archive) removes the worktree/branch refs once seal is recorded
```

Rules:

1. **Completion no longer implies delivery.** `expedition finish` stays exactly as it is (the local
   completion), but for expeditions whose charter declares a code deliverable it produces a
   `deliveryPending: true` marker in the record.
2. **`seal` is the only thing that may set `integrated: true`.** It refuses unless the merge commit
   exists on the canonical branch's ancestry and the delivered tip is an ancestor of it.
3. **`expedition close` refuses while `deliveryPending`** unless `--no-delivery` was declared at creation
   (for governance-only expeditions: docs, audits, plans). This replaces the informal "we only complete
   after CI is green" convention with a state the tool can enforce — and it *inverts today's order*
   (completion currently happens before the PR exists).
4. **Force paths remain** (`--force --reason`) and are recorded on the ledger, never silent.
5. `explain resume` for an expedition shows: delivered? merged? sealed? worktree path, PR, merge commit.

### 2.7 Abandonment and handoff — nothing is wiped

`expedition abandon --reason <text> [--discard]` (the honest name for "I walked away"), plus `cancel`
kept as its terminal ledger state per ADR-054:

1. Records the event on the canonical ledger — *before* any branch operation — so the abandonment itself
   is part of the durable record.
2. **Preserves by default:** keeps the branch and worktree, and tags the tip
   `refs/synth/abandoned/<expedition-id8>` with the reason and date in the ref message. A branch that is
   deleted later can still be recovered from the ref until an explicit `--discard` (which deletes worktree,
   branch and tag, and records that it did).
3. Writes a **handoff block** into the expedition record: branch, tip commit, whether it was delivered,
   whether it was merged, and the operator's note. `synth expedition show --id <id>` prints it.
4. `synth status` gains a warning class for abandoned/unmerged work and stale branches (today's 7 stale
   branches and 2 cancelled expeditions are exactly what this surfaces).
5. The **mission** inherits the same rule: missions never own branches that can take records down with
   them, because the record is already on main.

### 2.8 Derived-state anchoring (the small, immediate half)

This ADR absorbs the "Reads Never Write" plan's W1–W5 for its own needs, specifically:

- the ceremony commit anchors derived state in the same commit as the journal (§2.3);
- `.gitignore` repaired **in the tracking direction the operator intended**: the `.synth/data/drafts/` and
  `.synth/ai/` ignore rules added by `80a93b4` are removed (the files stay tracked; drafts keep retiring via
  `git rm` in the ceremony commit), `.synth/cache/` stays ignored, and `.synth/anchor/` +
  `.synth/worktrees/` are added as ignored;
- the staging filter is made robust (`--no-index` classification + "ignored *and* untracked" rule) so no
  future ignore-rule edit can silently disable ceremonies;
- the stale tracked `event-log.jsonl` (262 events) is removed from the commit list and from the patterns;
- `synth doctor` fails when the ledger is uncommitted, the anchor is stale, or the working event stream
  diverges from the anchor;
- reads never write (carry-over AC7): `synth status` stops rewriting `.synth/ai/*`, caches move to
  `.synth/cache/` and are content-hashed.

### 2.9 Push, remotes, and multi-clone reality (investigated 2026-10-12)

This is the answer to former Q2 — "does the ledger writer push, and how does that interact with PR review?"
— based on the repository's actual configuration and history:

**Facts**

1. One remote (`origin` → `github.com/synth-framework/synth`); no secondary/upstream.
2. `main` **is protected** (`gh api …/branches/main` → `protected: true`; the detailed protection rules are
   not visible to this token). Protection is therefore a real constraint for automated pushes.
3. Nevertheless, **the last 60 non-merge commits on `origin/main` are all authored by the operator**, and
   they include every `chore(synth): anchor <id8> completion state` commit. Direct pushes of governance
   state to `main` are *already the established practice* — the anchor commits are exactly the manual
   version of what the Ledger Writer would automate.
4. CI on push to `main`: **Documentation**, **Publish** (docs regeneration + GitHub Pages deploy), and
   **Proof Gate**. `publish.yml` skips `github-actions[bot]` and `[skip ci]` messages. The incremental
   governance workflow (`synth-incremental-govern`) runs on **pull requests only**; `release.yml` on tags.
   Nothing in CI writes to the repository.
5. Agents work in sandboxes: they push topic branches and open PRs (#303–#339 observed), and merges are
   performed by the operator. So the "many actors" are *many writers of code branches*, but only one
   actor (the operator) currently writes `main`.
6. **Cross-clone ledger merges are impossible today — not merely conflicted.** Lab reproduction (two
   clones of this repo, one `alignment prepare` ceremony each, then `git merge`): all four event-stream
   segments plus `canonical-state.json` and `dependency-records-cache.json` conflict; and more decisively,
   the events form a **global hash chain** — the ExecutionGate sets each event's `previousHash` to the
   *last event in the stream* (`execution-gate.ts:162`), so two clones append links to different
   predecessors. A union-by-id merge with renumbered offsets fails replay with
   `Hash-chain broken at index 1 … previousHash mismatch` (337 events). Both clones also assigned the
   *same offsets* to different events (317/321/326). Reconciling therefore requires an **authoritative
   re-chain** — an import through the ExecutionGate (sort by `(timestamp, transactionId, index)`, dedupe by
   id, append, records `LEDGER_IMPORTED`) — not a text merge.

**Caveats of the single-writer rule** (in order of severity):

1. **It is structural, not stylistic.** Because of the hash chain, a second writer cannot be merged in at
   all today — not even with a careful union. Every "let the sandbox write ceremonies" story needs the
   gate-mediated import (or the sandbox *is* the host for the duration).
2. **`main` lags.** Promotion at `seal`/`complete` means other clones read a stale ledger mid-flight.
   Mitigation: `status`/`doctor` must say "ledger ahead of origin by N ceremonies" and name the entities.
3. **The host is a single point of failure.** Ceremonies pending in the host exist only there until pushed;
   a dead laptop loses them. Mitigation: promote after each ceremony when it matters, or keep the host on
   the machine that is backed up.
4. **Sandbox/agent friction.** An agent session (like this one) cannot share the host's chain. Choices:
   (a) sessions propose, the host records; (b) sessions run ceremonies and their commits are imported
   later; (c) the session is the host while it works — provided the operator is not writing ceremonies
   concurrently and the branch is promoted before the sandbox dies.
5. **PR merges bypass the guard.** Merging a branch that carries `.synth/**` happens on GitHub; the
   ExecutionGate and `guardEventLogLineage` never run. Divergence can enter `main` silently. Two ways out:
   keep ledger files out of code branches entirely (the whole point of ADR-055), or add a required
   reconcile check to CI.
6. **Credentials decide, not policy.** The rule holds only if non-hosts cannot push `main`. Protection
   details were not readable with this token (403) and the operator's own pushes prove their credential
   can; so this is enforced by credential policy + a `doctor` check, not by git.
7. **Two operator clones are two writers too.** Laptop + desktop reproduce caveat 1; the in-repo lock and
   CAS only serialize same-machine concurrency.

### 2.10 Anchor lifecycle (lab-verified 2026-10-12)

- **Creation:** `git worktree add --detach .synth/anchor main` works from inside the repository (verified);
  the directory then shows as `??` in the main checkout, so `.synth/anchor/` (and `.synth/worktrees/`)
  **must** be gitignored — otherwise every ceremony would make the tree dirty and block the completion gate.
- **Sparse anchor:** `git sparse-checkout set --no-cone '.synth/' 'proof/'` inside the anchor reduces it to
  the ledger paths (verified); the anchor does not need `src/`, `tests/`, etc., and a full-tree anchor
  would double the repo for any tool that walks the tree.
- **Advancing the canonical branch while the operator's checkout sits elsewhere:** clean; the operator's
  checkout is unaffected (verified).
- **Advancing it while a worktree has the canonical branch checked out:** the index of that worktree goes
  stale and shows staged deletions of the newly committed ledger files. `git reset --keep HEAD` does *not*
  restore them (verified — it merely downgrades the deletion to unstaged). The working repair is
  `git restore --source=HEAD --staged --worktree -- .synth proof AGENTS.md`, which restores only ledger
  paths and leaves source edits alone. **Caveat:** that restore *clobbers local modifications* to ledger
  paths (verified). Therefore the writer must first run
  `git status --porcelain -- .synth proof AGENTS.md` in that worktree and refuse with a clear message if
  those paths are dirty; dirty *source* files are irrelevant and must not block the ceremony.
- **Cleanup / repair:** deleting `.synth/anchor` leaves the worktree `prunable` (`git worktree list`);
  `git worktree prune` cleans the metadata and re-adding is a no-op re-create (verified). `synth doctor`
  should detect "anchor missing / prunable / stale" and repair it — never fail a ceremony for it.
- **Decision (resolves Q1):** detached sparse anchor under `.synth/anchor/`, `update-ref` CAS for the
  pointer move, the extra-worktree resync rule above, and repair-on-doctor. If the primary checkout is on
  the canonical branch and clean, the writer may take a short path through it; if it is dirty *on ledger
  paths*, the ceremony fails with a one-line instruction (`commit or stash .synth changes first`).

**Decision — local-first, promote at integration points**

1. **Ceremonies never touch the network.** The Ledger Writer commits into the local anchor only
   (`.synth/anchor/`). Ceremonies stay fast, offline and deterministic.
2. **Divergence is visible.** `synth status`/`synth doctor` report "ledger ahead of `origin/<canonical>` by
   N ceremonies", naming the entities involved.
3. **Promotion happens at defined moments**, never mid-flight: `seal` (ADR-055 §2.6) and the completion of
   non-code expeditions; `synth ledger sync` for an explicit push.
4. **Single writer, promoted by a single host.** The ledger has exactly one writer host at a time — the
   operator's clone, or whichever clone currently holds the ledger lock and is designated `ledgerHost`
   (structurally required by the hash chain, see caveats above). Ceremony commits stay local; promotion
   uses the path already in use for anchor commits (`git push origin main` of ledger-only commits).
   If protection ever blocks it, the documented fallback is a `synth/ledger` branch + PR; the writer must
   not attempt to defeat protection.
5. **Other clones import, they do not merge.** A clone that ran ceremonies outside the host (an agent
   sandbox, a second machine) does **not** push and does **not** text-merge its ledger. It calls
   `synth ledger import --from <ref>`: the ExecutionGate sorts the incoming unique events by
   `(timestamp, transactionId, index)`, dedupes by event id, appends them through the normal gate path
   (re-chaining), and records `LEDGER_IMPORTED`. Until that capability exists, the rule is simpler and
   stricter: **ceremonies are only written by the host.**
6. **CI interaction:** ledger-only pushes should not re-deploy the docs site. Add
   `paths-ignore: [".synth/**"]` to `docs.yml`/`publish.yml`, but **keep Proof Gate running** on ledger
   pushes — verifying replay of the state being pushed is precisely its job.

Residual question (Q2 below): designate the host and the session policy — the operator's clone only, or
"whichever clone holds the lock"; and whether sandboxes that run ceremonies become temporary hosts.

### 2.11 Bootstrap path (recommended, until the Ledger Writer exists)

The framework currently requires a ceremony to authorize work, and the ceremony itself needs the fixes in
this ADR — a genuine bootstrap problem. Recommended path (operator-confirmed direction: option **c**,
sandbox as temporary host):

1. **One-time, recorded suspension.** On the working branch (`arena/c5db653e-synth` in this workspace),
   set `.synth/config.yaml` → `git.branchPolicy.mode: off` for the bootstrap ceremony only. This is a
   supported mode, not a hack: it also suppresses branch creation, so nothing switches branches and the
   session branch stays the single working branch. The suspension is mentioned in the mission/expedition
   notes and reverted as soon as ADR-056 lands.
2. **Bootstrap the mission + first expeditions** from the sandbox (single writer): `alignment prepare` →
   `mission approve` → `expedition create/approve/commit` → `start` the first one.
3. **First deliverable ships the way out:** ADR-056 minimal (`--branch`, `--no-create`) + P1 (restore
   tracking of drafts/`ai`, robust staging filter, loud ceremony failures). After that,
   `synth expedition start --branch arena/c5db653e-synth --no-create` plus `mode: enforce` means no
   override is ever needed again.
4. **Sandbox guardrails while it is the host:** commit the ledger (`git add -A .synth proof`, `-f` for
   drafts until P1) after *every* ceremony — an ephemeral sandbox must not hold the only copy; push and
   open the promotion PR at natural points, not only at the end.
5. **Window rule:** other clones may merge *code-only* PRs, but must not run ceremonies while the sandbox
   is host — a second writer breaks the hash chain (§2.9).

When to prefer option (a) (operator's clone records, sandbox only writes code) instead: if the promotion
must be cut from the operator's machine, if the window cannot stay ceremony-free, or for release steps.

## 3. Acceptance criteria

1. **AC1 (durability):** after any of `mission create|approve|complete|delete`,
   `expedition create|approve|commit|start|pause|cancel|complete|finish|archive|delete|move|evidence|refine|certify`,
   `git status --porcelain` is clean in the operator's checkout and the canonical branch contains the
   corresponding commit. No silent `committed:false`.
2. **AC2 (branch-independence):** `git checkout main && git branch -D <any-expedition-branch>` followed by
   `synth status` still reports every mission/expedition and its true status; no artifact vanishes.
3. **AC3 (real concurrency):** two expeditions can be started and worked on simultaneously with no branch
   switching; `synth checkpoint --id A` and `--id B` both pass; each expedition's ceremonies land on main.
4. **AC4 (delivery as a state):** `seal` refuses a merge commit that does not contain the delivered tip;
   `close` refuses while `deliveryPending`; `explain resume` shows delivered→merged→sealed.
5. **AC5 (abandonment):** `abandon` leaves a recoverable ref + handoff record + a `status` warning; nothing
   is deleted without `--discard`; `--discard` is recorded.
6. **AC6 (diagnosis):** `synth doctor` detects an uncommitted ceremony, a stale anchor, an orphaned
   worktree, and a ledger divergence — the four silent-failure classes of today.
7. **AC7 (no write-on-read):** no read-only command (including `status`) modifies the working tree.
8. **AC8 (anchor resilience):** deleting `.synth/anchor` at any time never loses the ledger and never
   blocks a ceremony after `synth doctor` runs; advancing the canonical branch leaves every other worktree
   that has it checked out either consistent or with an explicit, actionable warning (never a silent
   staged-deletion state).

## 4. Migration (three shippable phases)

**Phase P1 — stop the bleeding (small; no API change; ~1 day).**
Untrack ignored-but-tracked files + fix `git add` path set; add `.synth/ai/` to the derived patterns; make
`autoCommit` failure **loud** on lifecycle transitions; add the `doctor` check for uncommitted ceremonies;
fix the docs drift found in the audit (`pause`, `--complete-first`, `--no-lineage-check`, `SYNTH_AUTO_COMMIT`).
Owned in part by draft `e8ba8f92d0105412` — extend it rather than duplicate.

**Phase P2 — Ledger Writer for ceremonies (medium; ~3–5 days).**
Anchor worktree + lock; route `create/approve/commit/abandon/archive/delete/refine/certify/evidence`
through it; single commit per ceremony; retire the best-effort path; `guardEventLogLineage` becomes a
diagnostic. At the end of P2, AC1, AC2, AC5 (record half), AC6 hold.

**Phase P3 — worktrees + delivery (larger; ~1–2 weeks).**
`start` allocates worktrees; `checkpoint`/`evidence`/`finish` are expedition-scoped; `deliver`, `seal`,
`close` land; `deliveryPending` enforcement; `status` warnings; worktree cleanup.
At the end of P3, AC3, AC4, AC5 (full) hold.

State-model changes from **ADR-054** (the 6-verb lifecycle, `disposition` instead of ad-hoc terminal
states) land in parallel; this ADR only adds the four ceremony verbs (`deliver`, `seal`, `close`,
`abandon`) and the `integrated`/`deliveryPending`/`handoff` record fields.

## 5. Alternatives considered

- **Plumbing-only writer** (`hash-object`/`update-index`/`commit-tree`/`update-ref` to append to `main`
  with no second worktree): fewer moving parts on disk, more raw git internals and harder failure recovery.
  Rejected on the principle that the tool should use git the way a careful human would (Q1).
- **Push-first model** (write ledger on the branch, push, and let a server/CI rebase into `main`): keeps the
  branch authoritative longer and needs infrastructure the project does not have today.
- **Dedicated state branch** (`synth/ledger`, merged to `main` by a small workflow): the strongest
  multi-clone story and a natural answer if `main` protection is ever tightened, but it adds a merge
  machine and makes `main`'s ledger lag by one merge. §2.9 keeps it as the documented fallback rather than
  the default.
- **Keep the discipline rule (ADR-053 as-is)**: proven insufficient — the incident that motivated it
  (`6e26566b65b8ebcb`) is in the same class as today's failures, and rule-following cannot survive a
  `git branch -D`.
- **One branch, no worktrees, serialized expeditions (status quo, documented honestly):** cheap, and
  legitimate for a single operator — but then the gate must *stop claiming* concurrency is allowed and the
  agent contract must stop forbidding what the gate permits. If worktrees are rejected, this ADR requires
  this option be chosen explicitly (`worktree: off` + a `single-flight` gate rule).

## 6. Open questions

1. ~~Q1 — Anchor mechanics~~ **Resolved (§2.10, lab-verified):** detached *sparse* worktree at
   `.synth/anchor/` (gitignored), plain file I/O, one `update-ref` compare-and-swap; resync any other
   worktree holding the canonical branch with a ledger-path-only `git restore` after a dirtiness check;
   `doctor` repairs a missing/prunable anchor. Only residual: who runs `git worktree prune` on a schedule
   (proposal: `doctor`/`synth ledger repair`).
2. **Q2 — Host designation and session policy.** §2.9 settles the mechanics (local-first writes, promote at
   seal/complete, operator's direct-push path, import-not-merge for other clones) and the caveats make the
   single-writer rule structural, not optional. Residual: is the host always the operator's clone, or
   "whichever clone holds the ledger lock"? And may a sandbox that runs ceremonies (e.g. this Arena
   session, branch `arena/c5db653e-synth`) become a temporary host — provided it promotes before it dies
   and the operator is not writing ceremonies concurrently?
3. **Q3 — `delivered/sealed` as states, flags-in-record, or ADR-054 dispositions?** This ADR assumes flags
   in the record to keep the state count low; confirm with ADR-054's final form.
4. **Q4 — Evidence payloads on the canonical branch.** Patches can be large; draft `0463c2cae71ac727`
   argues for pointer-based evidence. Does `proof/expeditions/<id>/git-diff.patch` belong on `main`, or
   should the record carry a pointer + hash and the blob live on the branch?
5. **Q5 — Worktree naming/location and Windows/remote filesystems.** `git worktree` on network shares is
   fragile; is `--worktree=off` needed as a permanent first-class mode with a single-flight gate rule?

## 7. Relationship to existing work (do not duplicate)

- Implements **ADR-053 Decision 4**; makes ADR-053 #1–3 (discipline) obsolete.
- Complements **ADR-054 (proposed)** — states and verbs there, ledger/branch mechanics here.
- Reuses and does not re-open: `886dc15e` (segmented store + per-entity derived files),
  `4b5694ab06ccb652` (debranched completion), `e617ccd0ac6d60b8` (lineage guard, now a diagnostic),
  `190a72e7`/`c6f9251b` (branch naming), `e8ba8f92d0105412` (auto-commit fix, absorbed into P1),
  `0463c2ca` (pointer evidence, resolves Q4), `729e4e2c17add703` / `0daac4fc9df96606` (orthogonal fixes).
- The mission *Derived-State Integrity* (draft `2db51370ae127555`) is the natural home for P1; P2/P3 deserve
  their own expeditions under it (`E1` staging/anchoring, `E2` ledger writer, `E3` worktrees + delivery).

---

# Revision 2 — 2026-10-12, after the surface audit at `63ed64f`

§1–§7 stand. This revision exists because the surface audit *proved* five mechanics that change how the
decision must be implemented — and gives the operator one table to approve instead of nine paragraphs.

What the audit proved (evidence: `docs/audits/mission-expedition-surface-audit-2026-10-12.md` §5–§8):

1. **The bleed.** Thirteen of nineteen expedition verbs never commit. Their ledger edits sit in the working
   tree, **follow `git checkout` to another branch, and are committed by the next unrelated ceremony on that
   branch** (reproduced: a draft created on `bleed-a` was committed by a `refine` on `main` and vanished
   from `bleed-a`). Fixing *only* the six `autoCommitDerivedState` call sites leaves the bleed intact.
2. **The ledger is not mergeable.** Two branches from one base that each ran one ceremony conflict on three
   files; a union-style resolution produces a forked chain and `explain replay` reports
   `consistent: false` (`liveHash 2015876977 ≠ replayHash 662567280`). "Write to `main`" is not a
   preference; it is the only mergeable design.
3. **Two truths.** `synth status` on `main` says "approved, no active expeditions" while the arena branch
   says "1 expedition executing". Reads are branch-local by construction.
4. **Exclusivity already bites.** ADR-056's per-role binding rule makes `DECLARED_BRANCH_IN_USE` the normal
   response to a second expedition on the operator's branch — with one checkout, that is one live
   expedition until §2.5 worktrees land.
5. **Nothing pushes.** No lifecycle path pushes a branch or opens a PR; `expedition finish` completes
   *before* the PR exists and prints no delivery `nextStep`.

## R2.1 The ceremony contract (normative, one table)

Every row is **one commit on the canonical branch**, made by the Ledger Writer (anchor + lock + CAS, §2.3),
with message `chore(synth): <TRANSITION> <entity-kind> <entity-id8>`. No row may leave
`.synth/`, `proof/` or `AGENTS.md` dirty, and no row may move the operator's HEAD.

| Ceremony | Canonical commit payload | Working-tree / branch effect | Artifacts | Must never |
| --- | --- | --- | --- | --- |
| `mission create \| approve \| evidence add \| delete` | mission record + events | none (no checkout) | draft + integrity (input class) | leave the ledger uncommitted |
| `expedition create \| approve \| commit \| refine \| move \| certify \| evidence` | expedition record + events (+ binding on `commit`) | none | draft, integrity, attachment manifests | switch branches |
| `expedition start` | `EXPEDITION_STARTED` + binding | worktree at `.synth/worktrees/<id8>/` on the bound branch; operator checkout untouched | — | `git checkout -b` in the operator's tree |
| `expedition pause \| cancel \| archive \| delete` | status event (+ reason) | none; `delete` retires draft artifacts **and records the retirement** | — | silent file deletion (V4) |
| `expedition complete \| finish` | `EXPEDITION_COMPLETED` (+ certificate, manifest) | none | evidence, certification, manifest | report success when the commit failed |
| `expedition deliver` | `EXPEDITION_DELIVERED{branch, tipCommit, prRef, baseBranch}` | push branch / open PR | PR ref | merge anything |
| `expedition seal --merge-commit <sha>` | `EXPEDITION_INTEGRATED{branch, tipCommit, mergeCommit}` | none | — | seal a merge commit that does not contain the delivered tip |
| `expedition close` | `EXPEDITION_CLOSED` | removes worktree; keeps refs | — | run while `deliveryPending` |
| `expedition abandon --reason [--discard]` | `EXPEDITION_ABANDONED{reason, tipCommit}` | keeps worktree + `refs/synth/abandoned/<id8>`; `--discard` deletes and records it | handoff block | delete an unpushed tip without a recovery ref |
| reads (`status`, `list`, `show`, `explain`, `doctor`) | **no commit** | none | — | write anything (AC7) |

## R2.2 Invariants (testable)

- **I1 — single writer.** The canonical ledger advances only through the lock + CAS anchor; a ceremony never
  commits ledger paths from the operator's checkout.
- **I2 — the ledger never merges.** No ceremony writes ledger paths on a non-canonical branch; the work
  branch carries code and (by hash reference) evidence.
- **I3 — atomic ceremonies.** A refused or failed ceremony leaves the tree byte-identical (no residue files,
  no dirty ledger paths). `LEDGER_DIRTY`/`LEDGER_LOCKED`/`LEDGER_DIVERGED`/`LEDGER_UNAVAILABLE` are loud.
- **I4 — the operator's checkout is stable.** Ceremonies never switch HEAD; `start` allocates a worktree.
- **I5 — no deletion without a record.** Every delete/discard is an event; abandoned tips are kept under
  `refs/synth/abandoned/<id8>` until an explicit `--discard` that is itself recorded.
- **I6 — delivery is a state.** `completed` ≠ `integrated`; `seal` is the only path to `integrated`; `close`
  refuses while `deliveryPending`.

## R2.3 What the CLI must stop doing

1. `autoCommitDerivedState` on the current branch (synth.ts:616) — replaced by the Ledger Writer for **all**
   verbs in R2.1, including the thirteen that never commit today.
2. `git checkout -b` / `checkout` inside `start` (`ensureExpeditionBranch`, synth.ts:5926-5967) — replaced by
   worktree allocation, with `--worktree=off` as the explicit single-flight escape hatch.
3. `expedition delete` silently retiring draft files (V4) — record the retirement; keep the tombstone in the
   ledger.
4. `--complete-first` force-completing a blocking expedition with no evidence (V6) — replace with a named
   force path (`--force --reason`) recorded in the ledger.
5. Completing an expedition that has a deliverable with no `deliveryPending` marker (§2.6.1).
6. `cancel` printing `nextStep: start` (R4) — the next step is a decision (`abandon`, `refine`, `start`),
   not a verb.

## R2.4 Acceptance criteria additions

- **AC9 (no bleed).** After any ceremony, `git status --porcelain` is clean; running a ceremony on branch A
  and then `git checkout <branch B>` leaves B exactly as it was. *Test:* two-branch fixture, ceremony on A,
  checkout B, compare `git status --porcelain` and the B tree hash.
- **AC10 (no uncommitted ceremony).** Every verb in R2.1 either lands a canonical commit or fails loudly;
  the response envelope carries `ledger: {committed: true, commitHash}`. *Test:* iterate the verb table
  against a fixture, assert HEAD-of-canonical moved (or a loud error), never `committed:false`.
- **AC11 (failure atomicity).** Forced failures (branch already in use, lock held, diverged CAS) leave the
  working tree byte-identical. *Test:* hash `.synth`/`proof`/`AGENTS.md` before/after the failed call.
- **AC12 (delivery order).** `finish` on a code expedition sets `deliveryPending`; `deliver` records the tip;
  `seal` refuses a merge commit that does not contain it; `close` refuses while pending.
- **AC13 (doctor coverage).** `doctor` detects and (with `--fix`) repairs: uncommitted ceremony, stale/
  prunable anchor, orphaned worktree, ledger-ahead-N.

## R2.5 Mapping to the live plan (rev 3.4)

| ADR-055 requirement | Owner | Status |
| --- | --- | --- |
| Ledger Writer core (anchor, lock, CAS, residue guard, checkout refresh) | E5 (plan Stage 6) | **implemented** on the branch: `63ed64f` (`src/ledger/writer.ts` + 7 tests, `test:ledger-writer` in the chain) |
| Ceremony routing for every verb in R2.1 | E5 | to do — this is the E5 build |
| `doctor` ledger checks (AC6/AC8/AC13) | E5 | to do |
| `deliver` / `seal` MVP (AC12 first half) | E5 | to do |
| `close`, `deliveryPending` enforcement, worktrees (AC3/AC4/AC8 full) | E6 (P3) | deferred, per plan rev 3.3 |
| `abandon` + recovery refs (AC5) | E6 | deferred, per plan rev 3.3 |

## R2.6 Operator-facing commands and expected output

```console
$ synth doctor
{"runtimeHealth":{...},"projectHealth":{...},
 "ledger":{"anchor":{"ok":true,"detail":".synth/anchor @ <sha> (detached, sparse)"},
           "workingTree":{"ok":true,"detail":"no uncommitted ceremony"},
           "divergence":{"ok":true,"detail":"canonical branch == anchor (ahead 0)"}}}

$ synth expedition start --id <id> --branch arena/c5db653e-synth --no-create
{"status":"ok","kind":"ExpeditionStarted","expeditionId":"<id>",
 "executionBranch":{"branch":"arena/c5db653e-synth","created":false,"declared":true},
 "ledger":{"committed":true,"commitHash":"<sha>","files":[".synth/data/event-stream/..."]}}

$ synth expedition finish --id <id>
{"status":"ok","kind":"ExpeditionFinished","steps":["evidence-attached","convergence-certified","expedition-completed"],
 "deliveryPending":true,"ledger":{"committed":true,"commitHash":"<sha>"}}

$ synth expedition deliver --id <id> --remote origin
{"status":"ok","kind":"ExpeditionDelivered","branch":"expedition/...","tipCommit":"<sha>","prRef":"#<n>","ledger":{"committed":true}}

$ synth expedition seal --id <id> --merge-commit <sha>      # after the PR's CI is green and it is merged
{"status":"ok","kind":"ExpeditionIntegrated","mergeCommit":"<sha>","containsTip":true,"ledger":{"committed":true}}

$ synth expedition close --id <id>
{"status":"ok","kind":"ExpeditionClosed","worktreeRemoved":true,"branchKept":"expedition/..."}
```

A refused ceremony always looks like (never a silent `committed:false`):

```console
$ synth expedition start --id <other> --branch arena/c5db653e-synth --no-create
{"status":"error","code":"DECLARED_BRANCH_IN_USE",
 "error":"expedition bda2bbd4ef6550af is already bound to arena/c5db653e-synth",
 "suggestion":"Use another branch, or finish bda2bbd4ef6550af first"}
```

## Proof Impact

- **P1 Replay Integrity:** strengthened — the Ledger Writer serializes ceremonies into single commits anchored on the canonical branch and refuses to write while the ledger is dirty or another writer holds the lock. The two-clone reproduction (audit Addendum 2) shows why a text merge cannot preserve the global event hash chain.
- **P2 Governance Traceability:** strengthened — `LEDGER_IMPORTED`, `EXPEDITION_DELIVERED`, `EXPEDITION_INTEGRATED` and the abandonment handoff block extend the audit trail to delivery and walk-away, which are invisible today.
- **P3 Capability Boundary:** unchanged — every state mutation still goes through the ExecutionGate; the writer decides *where* the resulting commit lands, not *what* is allowed.
- **P4 Adversarial:** strengthened — the anchor lifecycle (deletion, staleness, dirty-ledger refusal, restore-clobbers-edits) has explicit failure modes and a `doctor` repair path.
- **P5 Reproducibility:** improved — content-keyed caches and untracked derived state remove the machine-local churn that made fresh clones dirty.

## Kernel Impact

None structurally. The ExecutionGate is not modified: the ADR changes where the gate's resulting commit is anchored (a detached, sparse, gitignored worktree) and adds ceremony verbs (`deliver`, `seal`, `close`, `abandon`) with additive event payloads.

## Constitutional Baseline Impact

None. The single-mutation-authority invariant is preserved; the ADR makes the ledger's *placement* explicit rather than changing what may mutate state.

## Related

- ADR-021 — Enforce Pull-Request Workflow for All Source Changes
- ADR-034 — Replay Recovery
- ADR-043 — AI Agent Validation Scope Boundary
- ADR-051 — Derived State Protection and Expedition Scope
- ADR-053 — Branch Inheritance of Executing Expedition State (this ADR implements its Decision 4)
- ADR-054 / ADR-056 — companion proposals (lifecycle; declared branches)
- `docs/plans/reads-never-write.md` — the derived-state workstreams this ADR absorbs
- `docs/audits/mission-expedition-cli-audit-2026-10-12.md` — evidence base (Addendum 2: hash-chain divergence, anchor lab)
