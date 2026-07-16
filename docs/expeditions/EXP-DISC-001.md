# EXP-DISC-001 — Status That Answers

**Status:** Accepted  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-012 — Runtime Self-Description  
**Depends On:** EXP-PROGRAM-011  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N5)

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

Make `synth status` answer the operator's actual question: *where am I, and what happens next?* Replace the current counts-only report with a concise operational briefing derived from replayable evidence — project lifecycle phase, missions and their states, active expeditions, blockers, and a ranked list of next actions. A reasoning system should never need to call `ctx.runtime.getState()` itself just to understand its own project.

---

## Motivation

The TaskPRO field experiment surfaced this exact gap (annex, finding N5):

> `synth status` reported `Mission: 1, Expeditions: 6` — never which mission, what state it was in, or what should happen next. The agent wrote `print_state_details.js` calling internal APIs just to see its own project.

Counts are not status. Status is a decision surface: it should minimize the latency between looking and acting. Today the operator receives enough information to know that something exists, but not enough to choose the next command. This expedition closes that gap.

---

## Scope

```text
synth status
        ↓
project lifecycle phase        ←  derived from state + drafts + snapshots
        │
missions (id, name, state)     ←  derived from canonical state
        │
active expeditions             ←  derived from canonical state
        │
blockers (unknowns, failures)  ←  derived from state + decisions + replays
        │
next actions, ranked           ←  computed projection
        ▼
Operator Briefing JSON
```

In scope: operational briefing format, phase detection, mission/expedition/blocker/next-action projection, regression tests.

Out of scope: **Resume Briefing** (cognitive reconstruction after interruption — EXP-PROGRAM-013); **Repository Identity** (the semantic attractor frame — EXP-DISC-006); cleaning bootstrap log noise from `--json` (EXP-DISC-004); `synth explain` deep diagnostics (already exists, used if needed).

---

## Deliverables

1. **Operator Briefing output format** — `synth status` returns `kind: "OperatorBriefing"` with deterministic fields:
   - `phase`: one of `uninitialized | planning | approved | executing | blocked | complete`
   - `summary`: one-sentence human-readable state
   - `missions`: array of `{ id, name, status, approvedAt? }` from canonical state
   - `activeExpeditions`: array of `{ id, name, missionId, status }`
   - `blockers`: array of `{ kind, description, remediation }` — e.g. low-confidence draft, failed replay, blocking unknowns
   - `nextActions`: ranked array of `{ command, reason, priority }` — the exact CLI invocation that moves the project forward

2. **Phase detection** — computed from the presence/contents of:
   - `.synth/manifest.json` and `data/event-log.jsonl` → `uninitialized` vs `initialized`
   - draft records vs approved snapshots → `planning` vs `approved`
   - execution state work items → `executing` / `blocked` / `complete`

3. **Deterministic projection** — every field is computed on read from events, state, drafts, snapshots, and decision records. No editable metadata file becomes authoritative.

4. **Regression guards** — permanent tests in `test:all`: empty directory → `uninitialized` + `synth init` action; mission draft present → `planning` + `synth mission approve`/`evidence add` action; approved mission, no expeditions → `approved` + `synth expedition create` action; blocked execution → blocker listed + remediation.

---

## Acceptance

```text
fresh clone / empty directory
        ↓
synth status
        ↓
{
  status: "ok",
  kind: "OperatorBriefing",
  phase: "uninitialized",
  summary: "No SYNTH project found in this directory.",
  nextActions: [
    { command: "synth init --name <project>", reason: "Initialize a SYNTH project", priority: 1 }
  ]
}

project with one Mission Draft below threshold
        ↓
synth status
        ↓
{
  phase: "planning",
  summary: "Mission '<name>' is awaiting approval (confidence 0.67).",
  missions: [ { id: "...", name: "...", status: "draft" } ],
  nextActions: [
    { command: "synth mission evidence add --draft-id <id> --subject ...", reason: "Confidence is below the approval threshold", priority: 1 },
    { command: "synth mission approve --draft-id <id>", reason: "Approve once confidence is sufficient", priority: 2 }
  ]
}
```

- A fresh operator can answer "what is this repository, where is it, and what happens next" from `synth status` alone.
- The output contains the exact command(s) that resolve the current blockers.
- All values are projections of replayable evidence; no hand-authored status file is consulted.
- All new guards are wired into `test:all`; `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Fixture failures

Codify current counts-only output and the expected briefing for each lifecycle phase as failing fixtures.

### Phase 2 — Lifecycle phase detection

Implement deterministic phase detection from filesystem and state evidence.

### Phase 3 — Mission / expedition projection

Derive mission and expedition summaries from canonical state; include confidence/status from drafts and snapshots where available.

### Phase 4 — Blockers and next actions

Compute blockers and ranked next actions; ensure every rejection-style blocker names its remediation command.

### Phase 5 — Verify

Regression guards wired into `test:all`; fixture suite green; full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Phase detection becomes a sprawling heuristic | Phase is derived from a small, ordered set of evidence checks; fixtures pin every transition |
| Status output becomes too large | Operator Briefing is intentionally concise; `synth explain` remains the deep-dive surface |
| Overlap with EXP-DISC-006 Repository Identity | Status answers "what happens next"; Identity answers "what kind of repository is this and where is it going" — keep scopes separate; status may reference identity but does not define it |
| Machine output still noisy | Out of scope; EXP-DISC-004 owns clean JSON |
| New terms in output leak implementation vocabulary | Public vocabulary only; vocabulary audit gate applies |

---

## Definition of Done

- [x] `synth status` returns an `OperatorBriefing` with phase, summary, missions, active expeditions, blockers, and ranked next actions.
- [x] Phase detection is deterministic and pinned by fixtures for all lifecycle states.
- [x] No next action is listed without its exact CLI command and reason.
- [x] All derived values come from replayable evidence (events, state, drafts, snapshots, decisions).
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Codify the counts-only output as the baseline and the briefing fixtures as failing tests.
2. Implement deterministic lifecycle phase detection.
3. Project missions, expeditions, and blockers from evidence.
4. Compute ranked next actions.
5. Wire regression guards; request acceptance.

---

## Completion Notes

- Implemented `src/cli/status-briefing.ts`: a deterministic `OperatorBriefing` projection consumed by `synth status`.
- `synth status` now emits `kind: "OperatorBriefing"` with lifecycle `phase`, human `summary`, `missions`, `activeExpeditions`, `blockers`, and ranked `nextActions`.
- Phase detection covers `uninitialized`, `planning`, `approved`, `executing`, `blocked`, and `complete`.
- All values are derived from replayable evidence: canonical state, event count, Mission Draft files (`data/drafts`), and snapshot store (`data/snapshots`). No hand-authored status file is consulted.
- Added regression guards in `tests/operator-briefing.test.js` covering:
  - uninitialized directory,
  - initialized project with no Mission,
  - Mission Draft below the approval threshold,
  - approved Mission with no Expeditions,
  - executing Expedition,
  - blocked work item.
- Wired `test:operator-briefing` into `test:all`.
- Local validation passed: build, typecheck, fixture suite, `synth-cli`, `draft-integrity`, `public-vocabulary-audit`, `explain-observability`, `verify-expedition-governance`, and `check-links`.
- Full governance validation (`npm run govern`) deferred to CI `proof` job per project workflow.
