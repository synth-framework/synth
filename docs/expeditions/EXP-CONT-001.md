# EXP-CONT-001 — Resume Briefing

**Status:** Completed and accepted  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-013 — Cognitive Continuity  
**Depends On:** EXP-PROGRAM-012 (Runtime Self-Description), EXP-TRUST-004 (Persisted Decision Log)  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N8)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Implement `synth explain resume`, a deterministic projection that answers the three questions an interrupted operator actually asks when arriving at a SYNTH repository with zero conversation history:

1. **What happened?** — the sequence of significant state transitions and decisions that produced the current repository state.
2. **What was decided?** — durable approvals, rejections, and planning commitments stored in the decision log.
3. **What is next?** — the next action an operator should take to continue correctly, derived from canonical state and active planning artifacts.

The Resume Briefing is the cognitive complement to the Operator Briefing (`synth status`). `status` answers *what should I do next?* by minimizing decision latency. `resume` answers *why am I here?* by reconstructing intent from replayable evidence.

---

## Motivation

The TaskPRO field experiment demonstrated the failure directly (annex §N8):

- Session 1 approved a mission and then lost it to memory-only persistence.
- Session 2 began with only a summary of Session 1. The disk could not convey "a mission was approved and lost"; the agent reconstructed intent from priors and reconstructed it imperfectly.
- The agent read ~1,100 lines of runtime source, patched internal APIs, and eventually forged confidence because the repository itself could not narrate its own history.

Trust (PROGRAM-011) makes the repository's answers believable. Self-description (PROGRAM-012) makes them available. This expedition makes them *sufficient* for a zero-history reasoning system to resume correctly without reading source code or reconstructing intent from priors.

---

## Scope

```text
Replayable evidence
        │
        ├──► event-log.jsonl          →  significant transitions
        │
        ├──► canonical-state.json     →  current missions / expeditions / objectives / work items
        │
        ├──► decisions.jsonl          →  approvals / rejections / integrity decisions
        │
        ├──► snapshots/               →  certified ApprovedMissionModelSnapshot lineage
        │
        └──► docs/expeditions/        →  charter names, statuses, definitions of done

                    ↓

        synth explain resume
                    ↓

        ResumeBriefing
        {
          whatHappened[],
          whatWasDecided[],
          whatIsNext[],
          context,
          confidence,
          warnings[]
        }
```

In scope:

- New read-only projection module `src/cli/resume-briefing.ts`.
- CLI routing: `synth explain resume [--json]`.
- Synthesis of event transitions, state, decisions, snapshots, and expedition charters into a narrative briefing.
- Regression tests in `tests/resume-briefing.test.js`.
- Wiring into `test:all` in `package.json`.

Out of scope:

- Mutating any state or event log.
- Introducing new public concepts beyond the seven (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Replacing `synth status`; the Operator Briefing remains the operational surface.
- Hand-authored narrative files; the briefing is always recomputed on read.

---

## Deliverables

1. **Resume Briefing projection module** (`src/cli/resume-briefing.ts`)
   - Reads `data/event-log.jsonl`, `data/canonical-state.json`, `data/decisions.jsonl`, `data/snapshots/`, and `docs/expeditions/`.
   - Identifies significant transitions: mission created, mission approved, expedition created, expedition completed, expedition accepted, work item completed, proof generated.
   - Reads durable decisions and maps them to the missions/drafts they concern.
   - Builds a concise, ordered `whatHappened[]` timeline.
   - Builds a `whatWasDecided[]` list with decision type, target, reason, and timestamp.
   - Builds a `whatIsNext[]` list from active missions, approved-but-not-completed expeditions, blocked work items, and pending decisions.
   - Emits warnings when continuity is fragile:
     - approved mission but no snapshot artifact
     - completed expedition without an acceptance record
     - active expedition older than the most recent event
     - decision log chain broken
     - state file missing or stale relative to event log

2. **CLI integration**
   - Add `resume` branch in the `explain` command router in `src/cli/synth.ts`.
   - Default output is structured JSON (consistent with all SYNTH CLI surfaces).
   - `--json` is idempotent; machine output is always JSON.

3. **Regression guards**
   - `tests/resume-briefing.test.js`:
     - uninitialized directory returns a minimal "nothing to resume" briefing.
     - after `synth init`, briefing reports the project was initialized and next action is mission creation.
     - after a mission is approved, briefing reports the approval decision and next action is expedition creation.
     - after an expedition is marked completed, briefing reports completion and points to pending acceptance or next expedition.
     - a broken decision log surfaces a continuity warning.
     - briefing recomputes identically across two consecutive invocations (determinism).
   - Wired into `test:all` as `test:resume-briefing`.

---

## Acceptance

```text
fresh agent, zero history
        ↓
   cd <synth-project>
        ↓
   synth explain resume
        ↓
   JSON briefing containing:
     - what happened
     - what was decided
     - what is next
     - any continuity warnings
```

Specifically:

- An agent can determine the current mission and its status without reading source code.
- An agent can determine which expeditions are active and what should happen next.
- An agent can see that a mission was approved or rejected from the decision log.
- An agent is warned when the repository state is inconsistent or fragile.
- The output is deterministic: two consecutive runs on unchanged state produce identical briefings.
- All new tests pass and `npm run govern` succeeds in CI.

---

## Phases

### Phase 1 — Survey evidence sources

Map exactly where each piece of resume-relevant information lives:

| Question | Source | Location |
|---|---|---|
| What happened? | Events | `data/event-log.jsonl` |
| What is the current state? | Canonical state | `data/canonical-state.json` |
| What was approved/rejected? | Decision log | `data/decisions.jsonl` |
| What snapshots exist? | Snapshot store | `data/snapshots/` |
| What are the charters? | Expedition docs | `docs/expeditions/EXP-*.md` |

### Phase 2 — Implement projection module

Build `buildResumeBriefing(cwd)` with helpers for:

- event summarization
- state summarization
- decision summarization
- snapshot lineage summarization
- next-action derivation
- warning detection

### Phase 3 — Wire CLI

Add `resume` to the `explain` router and ensure `--json` behavior.

### Phase 4 — Regression tests

Implement `tests/resume-briefing.test.js` and add to `test:all`.

### Phase 5 — Verify

Run full governance pipeline and request acceptance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Briefing becomes a wall of text | Cap timeline length; prioritize mission/expedition-level transitions over every work-item event |
| Event log contains sensitive input | Only summarize event *types* and aggregate IDs; never echo user prompts or free-form evidence |
| Snapshot store read fails | Treat missing/corrupt snapshot store as a warning, not a fatal error; resume must still produce useful output |
| Stale canonical state | Compare `lastEventOffset` in state to event log length; emit warning if state lags events |
| Decision log chain broken | Surface tamper-evident warning and still produce best-effort briefing from events and state |
| Output vocabulary leaks implementation detail | Audit message strings against the seven public concepts |

---

## Definition of Done

- [x] `src/cli/resume-briefing.ts` implements deterministic `buildResumeBriefing(cwd)`.
- [x] `synth explain resume` is routed in the CLI and produces valid JSON.
- [x] Regression tests cover uninitialized, initialized, approved, executing, and broken-decision states.
- [x] Continuity warnings are emitted for fragile or inconsistent state.
- [x] Output is deterministic across repeated invocations on unchanged state.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check on PR #105).
- [ ] Expedition is accepted (pending PROGRAM-013 acceptance).

---

## Implementation Plan

1. Survey evidence sources and document the schema each projection reads.
2. Implement `src/cli/resume-briefing.ts` with timeline, decision, and next-action builders.
3. Wire `synth explain resume` in `src/cli/synth.ts`.
4. Add `tests/resume-briefing.test.js` and register it in `test:all`.
5. Run `npm run govern` and request acceptance.

---

## Completion Notes

Implemented as scoped:

- **Projection module** — `src/cli/resume-briefing.ts` reads `data/event-log.jsonl`, `data/canonical-state.json`, `data/decisions.jsonl`, and `data/snapshots/` to produce a deterministic `ResumeBriefing`.
- **Timeline** — significant mission/expedition/objective/work-item transitions are summarized in `whatHappened`, with adjacent duplicate suppression for repeated genesis runs.
- **Decisions** — durable approvals/rejections from `data/decisions.jsonl` are surfaced in `whatWasDecided`; a broken decision chain is always warned.
- **Next actions** — `whatIsNext` is derived from canonical state using the same public-vocabulary-aware phase logic as the Operator Briefing.
- **Warnings** — continuity warnings cover: broken decision chain, approved mission without snapshot, state lagging events, and completed expedition without accepted decision.
- **CLI** — `synth explain resume` is routed in `src/cli/synth.ts`; `--log` is supported for inspecting arbitrary project logs.
- **Tests** — `tests/resume-briefing.test.js` covers uninitialized, initialized, approved, executing, determinism, and broken-decision-log scenarios; wired into `test:all` as `test:resume-briefing`.

Verification run locally:

```
npm run typecheck     PASS
npm run build         PASS
npm run test:resume-briefing        PASS (6/6)
npm run test:operator-briefing      PASS
npm run test:repository-identity    PASS
npm run test:explain-observability  PASS (25/25)
```

Full `npm run govern` is pending CI run as requested.
