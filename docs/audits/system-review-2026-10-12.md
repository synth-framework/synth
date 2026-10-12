# SYNTH — Full System Review

**Date:** 2026-10-12 · **Repo:** `synth-framework/synth` @ `ac4e81a` (v2.6.1) · **Mode:** read-only (no code or state changes)
**Reviewer:** Arena agent · **Reference artifacts:** `the operator project brief (working note, not in-repo)`, `the operator PR triage note (working note, not in-repo)`

> **How to read this.** Everything marked ✅ was verified live by running the built CLI (`dist/cli/entry.js`) and/or reading source. Items marked ⚠️ are observations with plausible-but-unproven causation. Nothing in this review modified the repository; derived files touched by CLI reads were reverted (`git checkout --`), and `synth explain replay` stayed `consistent: true`, hash `97055763`, 320 events throughout.

---

## 1. Verdict scorecard

| Dimension | Grade | One-line assessment |
|---|---|---|
| **Product thesis & coherence** | **A** | The seven-concept model (Mission/Expedition/Evidence/Plan/Event/State/Replay) maps cleanly onto real machinery; nothing is decorative. |
| **Determinism / replay** | **A** | Verified end-to-end: state is bit-for-bit reproducible from a hash-chained event log; repair paths exist when it drifts. |
| **Governance rigour** | **A−** | Single mutation authority enforced in code, branch policy, PR-only workflow, proof artifacts. Loses points for dormancy (gates unused), proof gaps, and doc/code drift. |
| **Execution discipline (self-application)** | **B+** | 48 expeditions run under its own rules; CI green on `main`. Loses points for a 23-item live backlog, an unverified CI equivalence path, and duplicated/drifting governance layers. |
| **Agent workability** | **B** | Excellent contract surface (JSON stdout, dry-runs, exit codes, AGENTS.md, MCP/SDK/skills) undermined by ergonomics: read-only commands dirty tracked files, branch policy blocks even dry-runs, agents cannot self-verify CI locally. |
| **Code quality** | **B+** | Strict TS, near-zero duplication (1.9%), tiny dependency surface. Weakened by one 8,030-line dispatcher, ~22% unused exports, duplicate singular/plural module families, no lint/format/coverage tooling. |
| **Performance** | **B** | Light commands 118–152 ms, heavy 250–370 ms; lazy-load paid off. Beats its own 300 ms target for `status`/`explain`, misses the 100 ms target for version/help; every heavy command still pays a 13-step bootstrap. |
| **Resilience** | **B+** | Append-only log + hash chain + verification + repair + draft integrity + guards. Real friction remains: tracked-file churn from routine reads, two event stores on disk, no locking for concurrent writers. |
| **Documentation** | **B−** | Voluminous (53 ADRs, 18-chapter constitution, 413 charters) but visibly drifted from code in the places that matter most (lifecycle, AGENTS.md status, mission-approval flow). |
| **Overall** | **B+ (strong, with compounding debt)** | An unusually principled system whose own governance artifacts have outrun its bookkeeping. The next 30 days of work should be consolidation and truth-restoration, not new capability. |

**The three findings that matter most**

1. **The dirty-tree feedback loop.** Every command that touches the dependency graph rewrites `.synth/data/dependency-records-cache.json` (mtime floats) — a **tracked** file. Measured: ±1,275 changed lines per run. That dirties the tree, and SYNTH refuses to complete expeditions with uncommitted changes. The framework's own status warning "7 expedition completions failed because of uncommitted source changes" is, at least partly, **self-inflicted by its own read paths**. ⚠️ (root-cause of the 7 historical failures not individually confirmed, but the mechanism is reproducible today).
2. **Governance artifacts disagree with reality.** ADR-045 declares its own lifecycle "not the runtime contract"; `AGENTS.md` still says `Phase: uninitialized` and lists a cancelled expedition as *executing*; docs say `mission approve --draft-id` while the code requires an alignment contract; 27 "Proposed" charters + 1 stale "In progress — executing" exist outside canonical state; `event-log.jsonl` (262 events) is tracked while the real log is `event-stream/` (320).
3. **Dry-run is a preview, not a proof.** `verifyResult` in a dry-run is the *global* 6-check verification report, not a transition gate, and `stateDelta` is a static label (`beforeStatus → targetStatus`) supplied by the caller. Demonstrated: `expedition start --dry-run` reports `draft → executing` — a transition the domain would reject. Useful for exploration, dangerous if trusted as a legality check.

---

## 2. What SYNTH is trying to do

**Thesis.** Engineering work loses its reasoning: decisions scatter across tickets, PRs, chats, and heads. SYNTH's answer is to make intent and execution *event-sourced*: humans express intent, SYNTH records every transition as an immutable event, state is a pure function of history, and replay proves the state is correct. It sells three things: (a) determinism/auditability, (b) a governance lifecycle for AI-assisted work, (c) an agent-native interface (CLI/SDK/MCP).

**The seven public concepts** — Mission, Expedition, Evidence, Plan, Event, State, Replay — are real: each maps to types in `src/types/`, tables in canonical state, and CLI operations.

**The three-layer intent pipeline** (implemented, not just documented):

```text
GENESIS (intent correctness)          SYNTHESIS (execution)              GOVERNANCE (proof)
  Intent Model                          Mission (projection)               Convergence Certification
      │ refine/submit/approve                │                              Review / Acceptance gates*
      ▼                                      ▼                              Evidence + Proof artifacts
  Refinement Report ──▶ Alignment Contract ──▶ Mission → Expeditions → events → replay → snapshots
                              │ (divergence gate)                              │
                        * the sole constitutional boundary between intent and execution
```
`*` implemented in `src/governance/review-gates.ts` but **not exercised** in this repo's history (see §8).

**Who it's for.** Teams pairing humans with coding agents who want the agent's work to be *accountable* — reproducible, attributable, and gated. The repository itself is the flagship customer: 48 expeditions of its own work are governed by it.

---

## 3. How good is it at doing that?

| Claim | Evidence | Verdict |
|---|---|---|
| "State is derived, never edited" | 320 events in `event-stream/partition-{0..3}`; `explain replay` → live hash == replay hash (`97055763`); chain valid | ✅ holds |
| "Single mutation authority" | `src/control/execution-gate.ts` (987 lines) + `src/domain/execution.ts` (1,322) emit events per capability; `scripts/audit-bypass-map.js` exists specifically to hunt bypasses | ✅ holds, actively policed |
| "Replayable history" | Hash-chained events; `synth verify` 6/6 (ReplayIntegrity, ProjectionConsistency, EvidenceReferentialIntegrity, +3); `synth repair state`/`repair replay` for drift; ADR-051 guard blocks hand-edits | ✅ holds |
| "Every change is governed" | PR-only workflow, branch policy enforced in `.synth/config.yaml`, Proof Gate on `main`, per-expedition proof artifacts | ⚠️ mostly — see gaps below |
| "Agents execute deterministically" | JSON-first CLI, dry-runs, MCP manifest (36 capabilities), agent SDK (280 LOC), `.synth/ai/` metadata, AGENTS.md contract | ⚠️ partial — surfaces exist, adoption metric unmeasured |
| "Proof for every expedition" | **22 of 49** expeditions have `proof/expeditions/<id>/`; **7 completed expeditions have none** (incl. "Dead Code Elimination", "Dependency Graph Hardening") | ❌ gap |
| "Mission snapshot certification" | `synth status` warns: active mission has **no certified snapshot**; `synth snapshot create/list/verify` exists | ❌ gap |
| Correctness of the live commands | Known defect: `expedition create` returns a `missionId` that is **not** the requested mission (reproduced live; root-cause doc in `docs/analysis/`); draft `0daac4fc` documents a `mission.approve` scoping defect that can block approval of an unrelated mission | ❌ open bugs |

**Effectiveness summary.** The *core* (events → replay → determinism) is genuinely excellent and is the reason the rest of the system can be trusted. The *edges* are where quality leaks: proof coverage, docs drift, the drift-detection/repair loop, and a handful of command-level defects whose workarounds are an operator's tribal knowledge rather than the tool's defaults.

---

## 4. Agent workability (from direct experience)

I spent this session operating the framework as an agent: reading state, running dry-runs, triaging PRs, and probing failure modes. That is the best data I can give you.

### What works well ✅
- **Machine-first output.** `stdout` is clean JSON; the 13-step bootstrap chatter goes to `stderr` (verified: `synth capabilities 2>/dev/null` is pure JSON). `SYNTH_QUIET_LOGS=1` silences it entirely.
- **Explicit exit codes.** `synth explain bogus` → usage JSON + exit 1; unknown commands fail loudly.
- **Dry-runs everywhere it matters.** Lifecycle verbs (`mission`/`expedition` create, approve, start, …) support `--dry-run` and return `{wouldAppend, verifyResult, stateDelta}`. Verified: `expedition approve --dry-run` on the pending draft shows the exact event that would be appended and leaves the log at 320 events.
- **Self-describing surface.** `synth status` returns `nextActions[]` with an exact command; `synth checkpoint` returns a pre-flight verdict (`blocked` today, correctly, because no expedition is executing); `synth capabilities` lists 30+ capability/command pairs; `synth explain status|replay|identity|resume|governance` give graded detail.
- **A written contract.** AGENTS.md + `.synth/AGENT_CONTRACT.md` state the rules (no direct SDK mutation, no unapproved writes to `.synth/data/`, targeted validation only per ADR-043).
- **Agent distribution.** `distribution/agent-skills/{claude,codex,chatgpt,gemini}.md`, IDE rules for 6 editors, an MCP manifest, and `.synth/ai/{skills,protocols,lifecycle,capabilities,interaction-manifest}.json`.

### What hurts ❌ (ranked by pain)
1. **Read paths write to tracked files.** Observed on *every* probing session:
   - `.synth/data/dependency-records-cache.json` — rewritten (~1,275 lines) by any command that parses charter dependencies, because it stores float mtimes.
   - `.synth/ai/*.json` — regenerated by `status`/`doctor`-class invocations.
   - `.synth/data/cli-errors.jsonl` — appended on handled errors.
   All three are git-tracked (the first two are even gitignored *and* tracked). For an agent working under "keep the tree clean" rules, every read is a potential violation and every expedition completion a coin flip. **This is the single highest-value ergonomics fix in the system.**
2. **Branch policy can block `--dry-run`.** `synth mission approve --draft-id … --dry-run` from a non-canonical branch fails with `BRANCH_POLICY_DENIED: mission execution must run on mission/<id>; current branch is arena/c5db653e-synth` (verified twice, with and without `--alignment-contract-id`). An exploration command should never be gated on the branch you'd need only to commit the change.
3. **ADR-043 means an agent cannot verify CI-green locally.** The rule is defensible (it prevents state pollution and burnt context), but in practice it means agents hand off with "tests should pass" — the exact ambiguity this framework exists to remove. `test:all` is a 100+ command chain (`data/tasks/test:all.task.json`), estimated 10 minutes; nobody should run it casually, and no cheaper full-signal substitute exists.
4. **Stale contract.** The AGENTS.md "Repository status" block (generated 2026-08-18) says `Phase: uninitialized` and lists cancelled/completed expeditions as executing. An agent that trusts it plans the wrong work.
5. **`init`, `govern`, and `release` have no namespace help** — `synth init --help` returns the generic root help instead of flag documentation (`--greenfield`, `--brownfield`, `--analyze`), which hides the entire onboarding surface from discovery.
6. **Reading the CLI costs a lot of context.** `src/cli/synth.ts` is 8,030 lines; understanding one command frequently means reading a 300-line function inside an 8k-line file.

**Net:** the *contract* is A-grade — honestly better than most agent-native tools. The *ergonomics* (B−) are what will limit adoption by agents: a coding agent will be productive on day one for read/analysis tasks and will stumble on the first mutating task unless it is already on the canonical branch, inside an executing expedition, with a clean tree.

---

## 5. Code quality

### Scale map (measured)

| Area | Files | Lines | Notes |
|---|---:|---:|---|
| `src/` (TypeScript) | 341 | 71,544 | 42 top-level modules |
| `src/cli/` | 39 | 17,712 | `synth.ts` alone: **8,030** |
| `src/governance/` | 33 | 6,438 | review gates, alignment, ranking, intake |
| `src/discovery/` | 30 | 6,464 | repo analysis/projections |
| `src/adapters/` | 37 | 6,308 | 13 adapter families |
| `src/runtime/` | 16 | 3,673 | replay engine |
| `tests/` | 273 | 46,195 | 2.9 test LOC per src LOC |
| `scripts/` | 69 | 12,385 | 153 task definitions in `data/tasks/` |
| `docs/` | — | — | 53 ADRs, 413 charters, 18-chapter constitution |

### Strengths ✅
- **Strict TypeScript** (`strict: true`), zero `@ts-ignore`, builds clean in ~9.5 s.
- **Near-zero duplication**: jscpd over `src/` → 50 clones, **1.9% duplicated lines / 2.17% tokens**. The committed DRY expeditions did their job.
- **Minimal dependency surface**: one runtime dep (`js-yaml`), three dev deps. No supply-chain sprawl, no framework lock-in.
- **Layered architecture matches the docs**: `domain/` is pure (zero IO — verified by module header and content), `control/` holds the gate, `infra/` holds the stores, `core/` bootstraps. A reader can hold the model in their head.
- **Self-policing machinery**: adversarial audit scripts, capability registry sealing (49 capabilities), public-vocabulary audit, freeze certification.

### Weaknesses ❌
| Finding | Evidence | Impact |
|---|---|---|
| **Monolith dispatcher** | `src/cli/synth.ts` 8,030 lines; 32 top-level verbs; longest functions in the 300–500 line range | Every CLI change risks everything; already why one expedition was cancelled to avoid collisions |
| **Dead/under-used exports** | **348 of 1,574 exported symbols (22%)** are never referenced in `src/`, `tests/`, `scripts/`, or `packages/` (type-only exports dominate: `discovery/types.ts` 21, `governance/review-gates.ts` 13, `mission-studio/types.ts` 10, …) | API surface lies about itself; earlier "355 unused exports removed" campaign evidently returned |
| **Unused locals/params** | `tsc --noUnusedLocals --noUnusedParameters` → **40 diagnostics**, dominated by `transition`/`message` parameters repeated across 13 adapters (copy-paste interface conformance) | Signal noise; hides real dead code |
| **Duplicate module families** | `src/adapter/` (singular) vs `src/adapters/`; `src/capability/` vs `src/capabilities/`; `src/repository/` vs `src/adapters/repository/` — overlapping Git adapter structures (`adapter/git-snapshot.ts` vs `adapters/repository/git.ts`+`types.ts`) | Cognitive tax, drift risk, classic "which one is real?" |
| **Type looseness at the edges** | 70 `: any` + 75 `as any` (mostly JSON/event payloads); 6 empty `catch {}` | Event payloads are the system's contract; `any` there erodes the model |
| **Two test styles** | 96 files use `node:test`; ~135 are script-style with bespoke assertions (231 files at `tests/` top level) | No uniform runner; parallelism/TAP reporting inconsistently available; the suite-classification doc from an earlier era documented the same split |
| **No lint / format / coverage tooling** | no eslint/prettier/biome config; no coverage dep or script | Style and complexity drift are unguarded; there is no objective coverage number anywhere |
| **Test-suite sprawl** | 147 npm scripts ↔ 153 task definitions; `test:all` chains ~100 commands | Duplicated registries, high maintenance, slow feedback |

---

## 6. Performance

**Cold start (best of 3, Node 22.22.3, warm FS cache):**

| Command | `entry.js` (lazy) | `synth.js` (monolith) | Target | Status |
|---|---:|---:|---|---|
| `version` | 152 ms | 192 ms | < 100 ms | ❌ 1.5× over |
| `--help` | 118 ms | 204 ms | < 100 ms | ⚠️ near |
| `status` | 247 ms | 322 ms | < 300 ms | ✅ |
| `explain replay` | 148 ms | 363 ms | < 300 ms | ✅ |
| `expedition list` | 290 ms | 279 ms | — | parity (heavy path) |
| `validate --dry-run` | 248 ms | — | — | ✅ snappy |

- The lazy-load work (PR #324 lineage, `SYNTH-LOADER-001`) delivered a real improvement — `explain replay` is **2.4× faster** via `entry.js` than the monolith, and `--help` 1.7×.
- **Every heavy command still pays the 13-step bootstrap** (~200–300 ms of imports + setup). The dependency-graph cache helps the expensive part but writes unconditionally.
- **CI cost concentration:** the incremental-govern workflow's full-govern job runs `govern-profiler --profile pull-request` **and** `--full` back-to-back (est. 300 s each), i.e. the "incremental" workflow's slowest job does *both* strategies.
- Not measured (out of scope): `npm run govern` wall clock on this sandbox, publication/distribution steps, examples' pipelines.

---

## 7. Resilience & failure modes

### Mechanisms present ✅
| Mechanism | Where | Demonstrated |
|---|---|---|
| Append-only, hash-chained log | `src/infra/event-store.ts` (`PartitionedEventStore`) | `synth verify` chainValid ✅ |
| Replay determinism check | `src/runtime/replay.ts` | live hash == replay hash ✅ |
| State regeneration from history | `synth repair state [--approve]` | available; documented in `docs/analysis/state-lag-…` as the fix for post-completion lag |
| Drift repair against snapshots | `synth repair replay [--approve]` | available |
| Derived-state protection (ADR-051) | `.synth/adr-enforcement.json` + `scripts/check-adr-compliance.js` + git pre-commit hook | verified in repo |
| Draft integrity | `.synth/data/drafts/*.integrity.json` + `test:draft-integrity` | 19 tracked draft files |
| Branch/workflow guard | `.synth/config.yaml` (`mode: enforce`) + `BRANCH_POLICY_DENIED` errors | observed live ✅ |
| Recursion guard | `test:govern-recursion-guard` | in task registry |
| Failure certification | `synth certify` (failure & recovery scenarios) | available |

### Failure modes observed or evidenced ⚠️
1. **Self-inflicted dirty trees** (cache/ai/error-log writes) → completion refusals; `synth status` counts **7** historical dirty-tree completion failures.
2. **Two event stores on disk.** The authoritative log is `event-stream/` (320 events, 4 segments). A **tracked, stale** `.synth/data/event-log.jsonl` (262 events) still exists; the code comment says it is "never read or migrated", yet AGENTS.md *still declares it the source of truth*. Any external tool (or agent) reading the obvious filename gets a 58-event-old lie.
3. **Concurrency is unguarded.** No lock files or write serialization in `infra/`/`control/` (grep: zero); `governance/intake.ts` explicitly allows concurrent expeditions. Two agents writing the same store is a race whose recovery relies on replay+repair. Fine in single-agent CI; risky for the multi-agent story the product promises (ADR-036).
4. **Post-completion state lag** — documented as recurring in `docs/analysis/state-lag-after-expedition-completion.md` (state N, log N+1); not reproducing at this commit (320/320 consistent), but the doc says it returns on every `expedition complete`.
5. **CI equivalence path is red.** The `full-govern` job in `synth-incremental-govern.yml` fails its "Verify observational equivalence" step on **3/3 recent expedition branches** (the job runs incremental *and* full governance and requires both to pass). The Proof Gate for the same commits passes. Either the incremental path weakens guarantees or the check is mis-specified — either way the "incremental is safe" claim is currently unverified. ❌

**Resilience verdict:** the *recovery* story is genuinely strong (deterministic rebuild + repair + guards). The *prevention* story has holes, all of them in the write-hygiene and environment layers rather than in the event model.

---

## 8. The lifecycle — explained, evaluated, and questioned

### 8.1 What actually happens (verified in `src/domain/planning.ts` + `execution.ts`)

**Missions** (4 states)
```text
draft ──approve──▶ active ──complete──▶ completed
   └────────────archive (any non-archived)────────▶ archived
delete: only if it hosts no expeditions
approval precondition (ExecutionGate): an approved Alignment Contract + an "aligned" Divergence Gate
```

**Expeditions** (8 states — the state machine in code)
```text
draft ──approve──▶ approved ──commit──▶ committed ──start──▶ executing ──complete──▶ completed
                                              ▲                 │
                        paused ───────────────┤                 ├──pause──▶ paused
                        archived ─────────────┤ (restart paths) │
                        cancelled ────────────┘                 └──cancel──▶ cancelled
cancel: from anything except completed/cancelled       archive: from anything except archived/completed ⚠️ inverted (draft 729e4e2c)
refine: any non-terminal           delete: only if it has zero objectives
uniqueness: `start` creates/uses branch `expedition/<mission>/<slug>-<id>`; completion is gated by branch/tree checks
```

**Artifacts & events per step:** every transition is one event (`EXPEDITION_CREATED/APPROVED/COMMITTED/BRANCH_CREATED/STARTED/…`), attached evidence is `EVIDENCE_ATTACHED`, closure needs `CONVERGENCE_CERTIFIED`, and governance snapshots (`GOVERNANCE_SNAPSHOT_CREATED|FAILED`) fire around git-tag snapshots.

**Typical expedition cost:** 8–12 events (measured: busiest = 12), i.e. the "13-event bureaucracy" complaint (investigated in completed expedition `0bd85610`) is literally accurate for a full cycle.

### 8.2 Does it make sense? Mostly yes — with three real distortions

1. **Two lifecycles, one product.** ADR-026 defines the *runtime* states; ADR-045 defines a *target* Genesis/Synthesis/Governance machine ("partially implemented; do not treat the Synthesis-layer states as the runtime contract" — its own words). ADR-047/048 add alignment contracts and divergence gates. The result: a user reading the docs believes in one lifecycle, the code implements another, and the target model's review/refinement/acceptance gates are **dormant** (zero gate events in 320; only the divergence gate has ever fired, twice).
2. **Asymmetry between missions and expeditions.** Missions: 4 states, 2 lifecycle verbs, no branch, no convergence gate. Expeditions: 8 states, 5 terminal-ish verbs, a branch, a convergence gate. Missions are the *strategic* object yet the least governed; expeditions carry the ceremony. If the goal is "govern intent", the weighting is backwards.
3. **Ceremony that cannot be exercised.** Because `archive` refuses `completed` expeditions, the *only* ways to end a completed expedition are… none (it is already terminal but can't be tidied); cancelled is restartable; commit is a state with no artifact of its own (it's a permission, not a thing). Each has a draft fix, which tells you the designers felt the same friction.

### 8.3 Can I work with missions and expeditions? Yes — here's the practical path

**Safe exploration (what I used this session):**
```bash
synth status                                  # phase, missions, blockers/warnings, nextActions[]
synth explain replay                          # determinism proof
synth checkpoint                              # agent pre-flight verdict
synth expedition list                         # inventory with statuses
synth mission show --id <id> / expedition show --id <id>
synth expedition approve --draft-id <id> --dry-run     # wouldAppend + stateDelta
synth expedition create --mission … --dry-run           # proposals, no writes
synth validate --dry-run                      # impact-scoped plan
```
**Actual mutation path (operator + agent together):** be on the canonical branch (`mission/<id>` for mission ops, expedition branch for expedition ops) → have an expedition at `executing` → run the verb → the auto-commit/derived-state step runs → replay must stay consistent → PR → Proof Gate → merge.

**Blockers I hit:** (a) branch policy denies mission ops (even dry-run) off-branch; (b) no executing expedition means `checkpoint` is `blocked` — correct by design, but it means an agent cannot legitimately write code from my current position; (c) ADR-043 forbids me running the full pipeline to prove anything.

### 8.4 Could it be done differently? Three coherent options

| Option | Shape | Pros | Cons / migration cost |
|---|---|---|---|
| **A. Minimal-linear (recommended end-state)** | `create → approve → start → finish --disposition complete\|archive\|cancel` for **both** mission and expedition; branch created at `start`; convergence gate is a *deliverable check* inside `finish`, not a separate state | Dramatically smaller verb/state surface; kills the archive inversion and the commit-as-ghost-state; missions and expeditions share one mental model | Touches every lifecycle test; needs a shim layer for legacy verbs (already designed in draft `29b9a370`) |
| **B. Collapse Genesis into Mission Studio** | Mission approval = alignment contract approval; drop the separate intent/refinement/alignment/divergence chain unless a mission is flagged high-risk (`--governed`) | Removes the biggest doc/code mismatch; most repos never need divergence gates | Weaker guarantee for high-stakes intent; requires an ADR superseding parts of ADR-045/047/048 |
| **C. Keep the model, make it honest** | Wire the review/refinement/acceptance gates into the expedition lifecycle (or delete them), fix asymmetries, regenerate all docs from state, publish a state machine diagram generated *from code* | Least behavioural change; keeps the research value of the gate model | Leaves the bureaucracy; the inversion fixes are needed anyway |

My recommendation: **A + C-lite** — adopt the unified minimal lifecycle for daily work, keep the Genesis layer as an explicit opt-in mode, and make documentation a *generated projection of the canonical state machine* so it can never drift again.

---

## 9. CLI architecture evaluation

### Current architecture
```text
bin: dist/cli/entry.js  (134 LOC)
  ├─ light, zero-bootstrap:  version | help | status            → status-light.ts (28) + status-briefing.ts (102) + status-validation.ts (129)
  ├─ bootstrap-free explain: explain replay | identity | resume | governance  → explain-replay-light.ts (67) + explain-paths.ts (88)
  └─ everything else: lazy `import("./synth.js")` → 8,030-line dispatcher (32 top-level verbs, 62 case labels)
       └─ `synth task run <id>` → 153 canonical tasks in data/tasks/ (ADR-044 task engine)
```
**Good design points ✅:** the light/heavy split is real (measured above); stdout purity and structured errors are consistent; `command-safety.ts` classifies every invocation as read-only/mutating for the Discovery gate; a task registry decouples CI from npm scripts; the two implementations of `status`/`explain replay` produce **byte-identical** output today (verified).

**Structural problems ❌**
1. **The monolith is the product.** 8,030 lines in one file; command groups are organized by `case` inside one switch. The lazy-load loader helps *startup*, not *authoring*.
2. **Verb sprawl with overlap** (measured from help output):
   | Cluster | Redundancy |
   |---|---|
   | Status/report | `status`, `report`, `explain status`, `checkpoint` (a status mode), `resume` |
   | Validation/verification | `validate`, `verify`, `govern`, `certify`, `checkpoint` |
   | Onboarding | `init`, `bootstrap`, `discover`, `genesis` (alias), `first-contact`, `migrate`, `govern` (routes!) — 8 entry points for "start here" |
   | Termination | `mission complete`, `expedition complete`, `archive`, `cancel`, `finish` (+`certify` redirect) |
   | Creation | `mission create` vs planned `mission new`; expedition `new` **and** `create` both listed |
   | Docs/agents | `project AGENTS.md`, `docs agents`, `project --help` |
3. **Two entry points, drifting usage.** `package.json` bin → `entry.js`; **CI runs `synth.js`** (`node dist/cli/synth.js task run govern`), so the optimized path is not what CI exercises.
4. **Help gaps:** `init`, `govern`, `release` fall back to root help; `govern`'s root-help description ("Run the full governance pipeline") still doesn't match its routing behaviour (documented as a known discrepancy in `docs/audits/cli-command-surface-audit.md`).
5. **Discovery asymmetry:** `synth archive` does not exist (only `synth expedition archive`), while `synth ai` exposes a single subcommand (`refresh`) despite being advertised as "AI agent interoperability".

**Consolidation plan already in flight (good):** draft `29b9a370` folds `report→status`, `verify→validate verify`, `project AGENTS.md→docs agents`, `bootstrap/discover/first-contact/genesis→init --brownfield|--analyze|--greenfield`, with deprecation shims — I agree with the approach; it is the single highest-leverage CLI change available.

---

## 10. Mission & expedition audit — and what's critically needed

### 10.1 Inventory (canonical state, 2026-10-12)

| Bucket | Count | Notes |
|---|---:|---|
| Missions | 2 | `9861cf62476c90ae` completed (audit), `4ab7e9d2cc7b1b66` active (Framework Maturation v2) |
| Expeditions — completed | 24 | 7 of them have **no proof artifact** |
| Expeditions — committed (approved, not started) | 8 | The ready-to-execute queue |
| Expeditions — draft | 15 | Includes 5 staged governance-verb proposals and the superseded `01604a3` |
| Expeditions — cancelled | 2 | Both superseded by other work |
| **Charter corpus in `docs/`** | **413** | 235 Completed, 120 Completed-and-accepted, **27 Proposed + 1 Draft + 1 stale "In progress — executing"** that exist **outside** canonical state |
| Proof artifacts | 22 dirs | for 49 expeditions |
| Executing / paused | **0** | Nothing is in flight right now |

### 10.2 Health flags
- ❌ **7 completed expeditions without proof**: `d0a701df`, `3919441f`, `dac069e8`, `ceaa59bf`, `247c0333`, `59053ceb`, `d7abae63` (all from the Aug-16 batch that predates the proof pipeline).
- ❌ **Active mission has no certified snapshot** — the mission-level proof object is missing.
- ⚠️ **Duplicate charter**: `01604a3` (draft) and `886dc15e` (completed) describe the same work; the draft should be retired.
- ⚠️ **Stale doc claim**: `docs/expeditions/EXP-GOVERNANCE-ENFORCEMENT-002.md` says "In progress — executing".
- ⚠️ **Registry drift**: 147 npm scripts vs 153 task files — two sources of truth for CI jobs.

### 10.3 Criticality ranking (the 23 live items + 3 system-level gaps)

Scored on **impact** (does it unblock/derisk other work?), **urgency** (is something actively broken?), **effort** (S/M/L), and **readiness** (is a plan already written?). P1 = do next; P2 = this cycle; P3 = backlog; RETIRE = close it.

| P | Item | Status | Why it's ranked here | Effort | Readiness |
|---|---|---|---|---|---|
| **P1** | `0daac4fc` — Fix `mission.approve` gate scoping | draft | Wrong mission's expedition state can **block approval of an unrelated mission** — a correctness bug in the authorization path itself | S | goal written |
| **P1** | `e8ba8f92` — Derived-state auto-commit skips gitignored paths | draft | Auto-commit aborts on `.synth/data/drafts/`, leaving event-log/state staged-but-uncommitted → the dirty-tree failures the framework counts (7) | S | goal written |
| **P1** | *(system)* **Stop read paths from writing tracked files** | — | Root cause of most operator friction: cache/ai/error-log writes on every command. **No expedition exists for this** — create one | S–M | not planned |
| **P1** | `5f2f84fe` — Pre-existing `test:all` failures | draft | Nothing else can be certified while the full suite is red; seven named failing suites | M | investigation listed |
| **P2** | `29b9a370` — Fold legacy CLI verbs (shims) | draft | Framework's own priority-1; largest ergonomics win; plan + implementation steps already written | M | **plan complete** |
| **P2** | *(system)* Fix the incremental-vs-full **CI equivalence** failure | — | The "incremental governance is safe" claim is currently falsified on every PR branch | M | not planned |
| **P2** | `ff268079` → `97ddb728` — Lazy-load strategy + migration | committed | Restructures the 8k-line dispatcher; must precede/coordinate with verb work to avoid collisions | M–L | strategy committed |
| **P2** | `4ce3c7bc` — Event schema versioning + migration registry | committed | Replay durability across future event-shape changes; cheap now, expensive later | M | goal written |
| **P2** | `bc9c51e0` — Unify termination (`finish --disposition`) | committed | Removes the complete/finish/archive/cancel/inversion cluster | M | goal written |
| **P2** | `71ce984c` — DRY + SDK-compliance certification in lifecycle | committed | Self-enforcing quality; directly targets §5 findings | M | goal written |
| **P2** | *(system)* Restore truth: regenerate AGENTS.md; drop stale `event-log.jsonl`; fix mission-approval docs; retire `01604a3`; backfill the 7 missing proofs; snapshot the active mission | — | Cheap, and their absence actively misleads both humans and agents | S–M | not planned |
| **P3** | `beb71bb7` — Canonicalize logs | committed | Consolidates cli-errors/event/proof logs; quality-of-life | M | goal written |
| **P3** | `729e4e2c` — Allow archiving completed expeditions | draft | Small inversion fix; depends on termination unification to avoid double-changing verbs | S | goal written |
| **P3** | `e38aa99f` / `9ab1218c` — DRY `src/` and `scripts/` | draft | Duplication is already low (1.9%); value is marginal but real | M each | goals written |
| **P3** | `912a468a` — Remove legacy v1 compatibility layers | committed | Simplification; risk if any v1 user exists (evidence says none) | M | goal written |
| **P3** | `3d9f5d0d` — `mission new` / `expedition new` | draft | Subsumed by `29b9a370`; sequence after it | M | goal written |
| **P3** | `4a3f7b93` — Quiet validation output | committed | Output saturation; small | S | goal written |
| **P3** | `0463c2ca` — Pointer-based evidence | draft | Reduces content redundancy + commit-then-complete friction; larger design | L | goal written |
| **P3** | `761c9be3`…`eb5e0740` — Governance-verb stages 0–4 | draft ×5 | Blocked on a Stage-1 decision nobody has taken; superseded in urgency by `29b9a370` | M–L | staged |
| **RETIRE** | `01604a3` — Chunk event log (draft) | draft | Duplicate of completed `886dc15e`; retire the charter | S | — |
| **RETIRE** | `e5fdf756`, `1ad8b22e` — cancelled pair | cancelled | Already cancelled with reasons; no action beyond a periodic archive pass | S | — |

**If I could only do three things next:** (1) the read-path write hygiene + the two P1 bug fixes, (2) `test:all` triage, (3) start `29b9a370`. That combination removes the daily friction, restores trust in green CI, and shrinks the CLI surface — after which the structural work (dispatcher split, lifecycle unification, docs-as-projection) has a clean runway.

---

## 11. Recommendations

### Now (0–2 weeks, all small)
1. **Make read-only commands truly read-only.** Don't persist the dependency cache unless content changed; write mtimes only on cache miss; exclude `.synth/ai/`, `cli-errors.jsonl`, and caches from the "dirty tree" completion gate (or from git entirely). *Expected effect: the dirty-tree friction class disappears.*
2. **Fix `mission.approve` scoping** (`0daac4fc`) and **auto-commit gitignored paths** (`e8ba8f92`) — both have written goals.
3. **Truth restoration pass:** regenerate `AGENTS.md`; delete the stale tracked `event-log.jsonl` (or rename to `.legacy`) and update every doc that calls it the source of truth; update README/getting-started for the alignment-contract flow; retire draft `01604a3`.
4. **Point CI at `entry.js`** so the optimized path is what gates merges, and investigate the incremental-govern equivalence failure (either fix the check or fix the incremental path — then say which in the ADR).

### Next (2–8 weeks)
5. **`29b9a370` verb consolidation with shims**, then freeze the verb set; add the missing `synth archive` alias and `init`/`govern`/`release` help while you're in there.
6. **`test:all` triage** (`5f2f84fe`) and split the slow chain into meaningful certification tiers; publish a coverage number (even a crude one) so quality claims are measurable.
7. **Lifecycle unification (`bc9c51e0`) + archive fix (`729e4e2c`)** under a single new ADR that supersedes the contradictory parts of ADR-026/045/047/048 and states the runtime machine once.
8. **Backfill the 7 missing proofs** and create the active mission's snapshot; make "no expedition completes without a proof artifact" an enforced gate (it already is for new ones — the gap is historical).

### Structural (2–6 months)
9. **Split `synth.ts`** into per-command-group modules (the committed `ff268079`→`97ddb728` pair) so the architecture matches the docs.
10. **Decide the gate layer:** wire the review/refinement/acceptance gates into the expedition lifecycle, or delete them and shrink `governance/` by a third. Dormant machinery is worse than absent machinery.
11. **Concurrency story:** either add write locking/leases to the event store or document the single-writer assumption explicitly (it contradicts the multi-agent promise otherwise).
12. **Docs as projections:** generate the lifecycle diagram, AGENTS.md status block, and charter statuses from canonical state so they cannot drift again.
13. **Agent-surface build-out:** promote the MCP server and agent SDK from stubs to first-class (measured) surfaces; the product's adoption thesis depends on them.

---

## 12. Appendix — method and raw data

**Method.** Read-only: `npm ci` + `npm run build` (to obtain a runnable CLI), then `git`/`gh` inspection, `python3` analysis of `canonical-state.json` / `event-log` / `event-stream`, `tsc --noUnusedLocals` (9.5 s, read-only), `jscpd@4` over `src/`, custom export/orphan scans, targeted `--dry-run` CLI probes, and `gh run view` for CI evidence. All CLI-induced file modifications were reverted; `git status` clean at the end; replay consistency re-verified.

**Key raw numbers:** 341 src files / 71,544 LOC · `synth.ts` 8,030 LOC · 273 test files / 46,195 LOC · 69 scripts / 12,385 LOC · 153 tasks · 147 npm scripts · 320 events in 4 partitions (+262 stale monolith) · 23 event types · 49 expeditions (24/8/15/2) · 22 proof dirs · 413 charters · 53 ADRs · 1 runtime dependency · jscpd 1.9% · 348/1574 unused exports · 40 unused-local diagnostics · cold start 118–290 ms · `verify` 6/6.

**What I could not verify (and why):**
- Full `npm run govern` / `test:all` runs — prohibited locally by ADR-043 (agent validation scope).
- Any state mutation — my branch (`arena/c5db653e-synth`) is not a canonical expedition/mission branch, and no expedition is executing (which is itself the correct behaviour of the framework).
- The 7 historical dirty-tree completion failures individually (only the mechanism is reproduced).
- Root cause of the incremental-govern equivalence failure (CI logs are not retrievable from this sandbox).

**Open questions worth an operator decision**
1. Is the Genesis/alignment layer **mandatory** for everyday missions, or opt-in? (Docs and code disagree; draft `8ed4c924` is waiting on this kind of decision.)
2. Is the 413-charter corpus still a live backlog or an archive? If live, it needs state records and triage; if archive, it should be labelled as such.
3. Is multi-agent concurrent execution a promise for this era? If yes, the write path needs serialization.
