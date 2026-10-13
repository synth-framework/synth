# ADR-054 — Unified Lifecycle State Machine and Verb Set

**Status:** Proposed (submitted for operator review; accepted on merge)
**Date:** 2026-10-12
**Author:** Arena agent (proposal), for the SYNTH Architecture Owner
**Deciders:** Architecture Owner / Operator
**Stakeholders:** Operators, AI Agents, Mission Studio, Governance, Contributors
**Location:** `docs/adr/ADR-054-unified-lifecycle-state-machine.md`
**Supersedes / amends:** amends ADR-026 (lifecycle freeze) and supersedes the *Synthesis-layer* portion of ADR-045; must be read alongside ADR-046 (Implementation Authority Ordering) and ADR-050 (gate state & dependency enforcement)
**Implementation vehicle (existing):** expedition `bc9c51e0674ec0ef` — *Unify expedition and mission termination commands* (status: `committed`; scope already covers `src/cli/synth.ts`, `src/capability/registry.ts`, `src/domain/execution.ts`, `src/control/execution-gate.ts`, `src/mission-studio/draft-integrity.ts`, `tests/`)

> Why this document exists: SYNTH currently ships **two lifecycles** — the runtime states in ADR-026 and a target Genesis/Synthesis/Governance machine in ADR-045 that explicitly declares itself "NOT the implemented runtime lifecycle" — plus a verb surface where `complete`, `finish`, `archive`, and `cancel` overlap, one rule that is inverted, and one state (`committed`) that carries no artifact of its own. Operators cannot predict which command leaves which state behind; agents cannot plan a transition without reading 8,000 lines of dispatcher.

---

## 1. Context

### 1.1 Observed facts (verified 2026-10-12, v2.6.1)

| Observation | Evidence |
|---|---|
| Expedition runtime has **8 states** and **5 terminal-ish verbs** | `src/domain/planning.ts` L142–L261; `synth expedition --help` lists create, approve, commit, start, complete, finish, cancel, archive, certify, refine, move, delete, new |
| `archive` **refuses** a `completed` expedition (`"cannot archive a completed expedition"`) while `cancel` refuses `completed`/`cancelled` but is itself restartable | `planning.ts` L191–L203, L225–L235; `startExpedition` accepts `committed | archived | paused | cancelled` |
| `commit` exists only to grant permission to start (it does **not** create the branch — `start` does) | `EXPEDITION_COMMITTED` events; `startExpedition` precondition |
| Missions have **4 states** and **no** branch, convergence gate, or cancel path | `planning.ts` L46–L80; `execution.ts` |
| Mission approval requires an approved Alignment Contract **and** an aligned Divergence Gate | `execution.ts` L205–L224 (`ALIGNMENT_CONTRACT_REQUIRED`, `DIVERGENCE_GATE_NOT_ALIGNED`) — the documented `mission approve --draft-id` flow omits this |
| Review / Refinement / Acceptance gates are implemented but **never exercised** (0 events in 320) | `src/governance/review-gates.ts`; event-type census |
| ADR-045 self-declares its Synthesis states as non-normative | ADR-045 "Implementation Status" |
| A full cycle costs 8–12 events | event census (busiest expedition: 12) |
| One inversion is already filed as a defect | draft `729e4e2c` — "Allow archiving completed expeditions" |

### 1.2 Problem statement

> **The lifecycle is not a single, predictable machine.** It is a runtime machine, a documented machine, and a set of verb-level special cases that disagree with each other and with the docs. Every disagreement is paid for by an operator or an agent at the moment of decision.

### 1.3 Design goals

1. **One verb vocabulary** shared by Missions and Expeditions.
2. **Predictable dispositions**: the caller states the outcome; the system derives the exact event trail.
3. **No ghost states**: every state has an artifact, an owner, and at least one exit.
4. **Replay compatibility**: no existing event type is renamed or removed.
5. **Small surface**: ≤ 6 lifecycle verbs per object, ≤ 7 states per object.
6. **Agent-checkable**: every transition has a machine-readable precondition check (`--dry-run` reports legality *and* would-append).

### 1.4 Non-goals

- Not changing the Genesis/alignment layer semantics (Intent Model, Refinement, Alignment Contract, Divergence Gate).
- Not changing the event model, ExecutionGate, replay, or proof classes (Protected Assets).
- Not deciding the governance-cluster verbs (`validate` / `verify` / `govern` / `certify`) — that stays with the Stage 0–4 workstream (drafts `761c9be3`…`eb5e0740`).

---

## 2. Decision

### 2.1 One lifecycle verb set (both objects)

```text
create ──▶ approve ──▶ start ──▶ finish --disposition <complete|archive|cancel>
             │            │                    │
             │            └─ pause / resume ───┘   (modal, not a disposition)
             └─ (rejected/withdrawn) ──▶ finish --disposition cancel
```

**Six lifecycle verbs per object:** `create`, `approve`, `start`, `pause`, `resume`, `finish`. Everything else is an *operation on the object*, not a lifecycle transition: `show`, `list`, `evidence`, `refine`, `move`, `delete`, `certify`, `rank`, `report`.

### 2.2 State machines

**Expedition — 7 states (was 8; `committed` removed)**

```text
draft ──approve──▶ approved ──start──▶ executing ──finish(complete)──▶ completed
  │                   │                  │  ▲                            (terminal)
  │                   │                  │  │ resume
  │                   │                  ▼  │
  │                   │                paused
  │                   │
  └──finish(cancel)───┴──finish(cancel)─┴────────────────────────────▶ cancelled
                                          (restartable via start)
  finish(archive) from executing | paused | cancelled | completed ───▶ archived  (terminal)
```

| Transition | Verb | Preconditions | Event emitted |
|---|---|---|---|
| ∅ → draft | `expedition create` | mission exists and is `active`; optional `--depends-on` | `EXPEDITION_CREATED` |
| draft → approved | `expedition approve` | draft integrity valid; (optional review gate satisfied if `--governed`) | `EXPEDITION_APPROVED` |
| approved → executing | `expedition start` | **branch created/checked out here** (was `commit`); upstream `dependsOn` resolved (unresolved → `UPSTREAM_GATE_BLOCKED`; cancelled upstream **resolves**) | `EXPEDITION_BRANCH_CREATED` + `EXPEDITION_STARTED` |
| executing → paused | `expedition pause` | — | `EXPEDITION_PAUSED` |
| paused → executing | `expedition start` | — | `EXPEDITION_STARTED` |
| executing → completed | `expedition finish --disposition complete` | convergence certified; evidence attached; **in-scope source clean** (derived paths excluded) | `EXPEDITION_COMPLETED` |
| any non-terminal → cancelled | `expedition finish --disposition cancel --reason …` | reason required | `EXPEDITION_CANCELLED` |
| any non-terminal → archived | `expedition finish --disposition archive` | — | `EXPEDITION_ARCHIVED` |
| completed → archived | `expedition finish --disposition archive` | **now legal** (fixes the inversion) | `EXPEDITION_ARCHIVED` |
| cancelled → executing | `expedition start` | retained restart path (unchanged) | `EXPEDITION_STARTED` |

**Mission — 4 states, same verbs**

| Transition | Verb | Preconditions | Event emitted |
|---|---|---|---|
| ∅ → draft | `mission create` | subject + purpose | `MISSION_CREATED` |
| draft → active | `approve` | approved Alignment Contract **and** aligned Divergence Gate | `MISSION_APPROVED` |
| active → completed | `finish --disposition complete` | all non-cancelled expeditions terminal; mission snapshot exists | `MISSION_COMPLETED` |
| any non-terminal → archived | `finish --disposition archive --reason …` | — | `MISSION_ARCHIVED` |
| — | `finish --disposition cancel` | maps to `archived` **with reason** (a mission has no execution to abort, only a commitment to retire) | `MISSION_ARCHIVED` |

> Missions deliberately keep 4 states. Symmetry is in the **verbs**, not the state count: a mission has no branch, no pause, and no convergence gate because it has no execution.

### 2.3 Dispositions are the only terminal vocabulary

| Disposition | Meaning | Leaves | Restartable |
|---|---|---|---|
| `complete` | Work delivered and proven | `completed` | No |
| `archive` | Retired without claiming the work was proven (superseded, duplicate, obsolete, housekeeping after completion) | `archived` | No |
| `cancel` | Abandoned mid-flight | `cancelled` | Yes (expeditions only) |

### 2.4 Branch creation moves to `start`

`commit` is removed as a state and as a verb alias.
**Rationale:** `committed` was a permission gate masquerading as a lifecycle state: it emitted an event with no artifact, blocked nothing that `start` could not block, and forced operators through two commands (`commit` then `start`) to do one thing (begin work on a branch).
**Note:** `EXPEDITION_BRANCH_CREATED` remains; it is emitted immediately before `EXPEDITION_STARTED`.

### 2.5 Events are preserved (no migration required)

| Verb (new) | Event emitted | Legacy equivalence |
|---|---|---|
| `approve` | `EXPEDITION_APPROVED` | identical |
| `start` | `EXPEDITION_BRANCH_CREATED` + `EXPEDITION_STARTED` | `commit` + `start` collapsed, same two events, same order |
| `pause` | `EXPEDITION_PAUSED` | identical |
| `finish --disposition complete` | `EXPEDITION_COMPLETED` | was `complete` |
| `finish --disposition cancel` | `EXPEDITION_CANCELLED` | was `cancel` |
| `finish --disposition archive` | `EXPEDITION_ARCHIVED` | was `archive` |
| mission `finish --disposition complete` | `MISSION_COMPLETED` | was `mission complete` |
| mission `finish --disposition archive|cancel` | `MISSION_ARCHIVED` | was `mission archive` |

**Replay impact: none.** No event type is added, renamed, or removed; every existing log replays to the same state. `synth explain replay` must remain `consistent: true` across the change.

### 2.6 Deprecation shims (required, not optional)

Legacy verbs keep working for **two minor versions** with a `[deprecated → …]` notice on `stderr` (never on `stdout`; reuse the shim mechanism designed in draft `29b9a370`):

| Legacy | Routes to |
|---|---|
| `expedition commit --id X` | `expedition start --id X` (branch creation is unchanged: it already happens at `start`) |
| `expedition complete --id X` | `expedition finish --id X --disposition complete` |
| `expedition cancel --id X --reason R` | `expedition finish --id X --disposition cancel --reason R` |
| `expedition archive --id X` | `expedition finish --id X --disposition archive` |
| `mission complete --id X` | `mission finish --id X --disposition complete` |
| `mission archive --id X` | `mission finish --id X --disposition archive` |
| `expedition new` / `mission new` | fold into `create` (drop the duplicate surface) |

### 2.7 Dry-run contract (strengthened)

Every lifecycle verb must support `--dry-run` returning:

```json
{ "status": "ok", "kind": "LifecycleDryRun",
  "legalTransition": true,
  "preconditionChecks": [ {"name": "branch_policy", "ok": true}, … ],
  "wouldAppend": [ {"type": "EXPEDITION_STARTED", "payload": {…}} ],
  "stateDelta": "expedition <id>: approved → executing" }
```

`legalTransition` and `preconditionChecks` are **domain-computed**, not caller-supplied, and `--dry-run` must never be blocked by branch policy (it observes; it does not commit). This fixes two defects observed on 2026-10-12: `stateDelta` was a static label (it reported `draft → executing` for an illegal transition), and mission verbs returned `BRANCH_POLICY_DENIED` even in dry-run.

---

## 3. Governance layer: keep, wire, or delete

This ADR takes the position that **dormant machinery is worse than absent machinery**. Decision:

1. **Divergence Gate** — keep as-is (it is the only gate with live events; it guards mission approval).
2. **Convergence certification** — keep, as a *precondition artifact* for `finish --disposition complete` (never as a state).
3. **Review / Refinement / Acceptance gates** — **wire or delete within this ADR's implementation**: either (a) an expedition created with `--governed` runs the Review gate between `approve` and `start`, and the Acceptance gate is folded into `finish --disposition complete`; or (b) the gate set is deleted from `src/governance/review-gates.ts` and ADR-045's Synthesis layer is formally withdrawn. Option (a) is recommended and is what the transition table above assumes for `--governed` expeditions.
4. **ADR-045's Synthesis layer** — superseded by this ADR. Its Genesis layer remains normative and unaffected.

---

## 4. Consequences

### Positive
- One predictable mental model for humans and agents; `synth <object> --help` fits on one screen.
- The archive inversion (`729e4e2c`) disappears by construction.
- `commit`→`start` merge removes a full round-trip from every expedition (2 commands → 1).
- Dry-run becomes a legality oracle, which is what agents assumed it was (evidence: this review's probes).
- No event-model change → no replay migration, no proof-class change.

### Negative / risks
- **Verb churn** for operators with muscle memory (`complete`/`cancel`/`archive`). Mitigated by shims + a deprecation notice; measured by `synth log` counts of deprecated usage.
- **Test surface**: lifecycle tests across `tests/` assert the current verb/state behaviour (e.g. `expedition-completion-gates`, `governance-lifecycle-replay`, `execution-branch-gate`). This is the dominant cost of the change.
- **Mission `cancel` ≠ `cancelled`** may confuse; mitigated by documenting the reason-mandatory mapping, or by adding a `MISSION_CANCELLED` event in a *future* ADR if operators ask for it.
- Removing `committed` could break external tooling that reads expedition status; mitigated by shims and by treating unknown statuses defensively in consumers.

### Neutral
- Expeditions still cost 8–12 events per cycle; the verb count drops, not the event count. Reducing *event* ceremony is a separate concern (see drafts `0463c2ca`, `0bd85610`).

---

## 5. Alternatives considered

| Alternative | Assessment |
|---|---|
| **A. Do nothing; document the differences** | Rejected: the two machine descriptions already contradict each other; more documentation increases drift surface. |
| **B. Adopt ADR-045's 12-state Synthesis machine as the runtime** | Rejected: larger surface, unproven gates, migration of live state, no operator demand. |
| **C. Full 3-verb model (`create → run → close`)** | Rejected: collapses approval into creation and removes the human authorization boundary that is the product's core guarantee. |
| **D. Keep `commit` as a distinct state** | Rejected: no artifact, no independent precondition; its only function (branch creation) belongs at `start`. |

---

## 6. Implementation plan (maps onto work that already exists)

| Step | Work | Existing item |
|---|---|---|
| 0 | Accept this ADR (docs-only PR; add to `docs/adr/`) | this proposal |
| 1 | Fold `complete`/`cancel`/`archive`/`commit` into `finish --disposition` + `start`; deprecation shims; retire `new` aliases | **`bc9c51e0`** (committed; scope already correct) |
| 2 | Fix `archive` of a completed expedition | absorbed by step 1 → **`729e4e2c` becomes obsolete (close as superseded)** |
| 3 | Strengthen `--dry-run` (legalTransition + preconditionChecks; never branch-blocked) | new item, small; pairs with step 1 |
| 4 | Land verb-shim infrastructure (`emitDeprecation`, help text, command-safety entries) | **`29b9a370`** (draft; plan written) |
| 5 | Reconcile ADR-045/ADR-026 text; update README, `docs/operator/01-getting-started.md`, `docs/reference/public-architecture.md`, `.synth/ai/lifecycle.json` | new docs item |
| 6 | Wire-or-delete the review/refinement/acceptance gates (§3) | new item; may reuse `71ce984c` certification pattern |
| 7 | Regenerate AGENTS.md and publish the state machine as a projection of code | new docs item; ties to the truth-restoration pass |

**Test obligations:** update/author tests for (a) every row of both transition tables, (b) each shim's stdout/stderr contract, (c) `--dry-run` legality on legal and illegal transitions, (d) replay equality before/after (no migration), (e) `archive` after `complete`.

---

## 7. Acceptance criteria

1. `synth expedition --help` and `synth mission --help` list ≤ 6 lifecycle verbs each.
2. Every transition in §2 is covered by a passing test, including the two previously illegal/impossible ones (`finish archive` on `completed`; `pause` → `finish`).
3. Legacy verbs emit a deprecation notice on stderr and produce byte-identical `stdout` to their canonical equivalents.
4. `synth explain replay` remains `consistent: true` on this repository's log throughout.
5. `--dry-run` reports `legalTransition: false` for at least three illegal transitions (e.g. `approve` on `executing`, `resume` on `draft`, `finish --disposition complete` without convergence) and is never blocked by branch policy.
6. `committed` no longer appears in `synth status`, `expedition list`, or any generated projection; no live expedition is left in that state (currently: **8 committed expeditions** must be migrated to `approved` by the transition itself or a one-time repair).
7. Documentation for the lifecycle is generated from (or verified against) the code, so drift is detectable in CI.

---

## 8. Open questions for the operator

1. **Mission `cancel`**: map to `archived` with reason (this proposal), or introduce `MISSION_CANCELLED`?
2. **Review gates**: wire them for `--governed` expeditions, or delete and formally withdraw that part of ADR-045?
3. **`committed` migration**: transition the 8 committed expeditions to `approved` via a one-time repair event, or leave them readable-but-deprecated?
4. **Shim lifetime**: two minor versions (this proposal), or one?
5. **Mission `start`**: keep approval-as-activation (this proposal), or split into `approve` (authorize) and `start` (activate) for symmetry with expeditions?

## Proof Impact

- **P1 Replay Integrity:** unchanged by construction — no event type is added, renamed, or removed; every existing log replays to the same state and `synth explain replay` must remain `consistent: true` across the change.
- **P2 Governance Traceability:** improved — one predictable verb vocabulary and machine-readable `--dry-run` precondition checks replace verb-level special cases.
- **P3 Capability Boundary:** unchanged — `finish` / `start` route through the same ExecutionGate capabilities as today; only the verb names are folded.
- **P4 Adversarial:** strengthened — the transition table is exhaustive and illegal transitions become testable (`--dry-run` reports `legalTransition: false`).
- **P5 Reproducibility:** unchanged — no schema or state migration is required.

## Kernel Impact

None. No component listed in `docs/kernel-freeze.md` is modified: the change is confined to CLI verbs, the lifecycle rules in `src/domain/planning.ts`, and their tests.

## Constitutional Baseline Impact

None. The ExecutionGate mutation authority and the event/replay invariants are reinforced, not changed.

## Related

- ADR-026 — Governance Lifecycle Freeze (amended by this ADR)
- ADR-045 — Governance Lifecycle State Machine (Synthesis layer superseded)
- ADR-046 — Implementation Authority Ordering
- ADR-050 — Execution Gate State Dependency Enforcement
- ADR-053 — Branch Inheritance of Executing Expedition State
- Expedition `bc9c51e0674ec0ef` — Unify expedition and mission termination commands (implementation vehicle)
- Drafts `729e4e2c17add703` (obsoleted by this ADR), `29b9a3704eb1287c`, `8ed4c9240f9997f0`, `761c9be33f165253`, `424e13e73c362f3b`, `17a5c207277389ae`, `eb5e0740225fdb11`
