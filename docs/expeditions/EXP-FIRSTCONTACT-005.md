# EXP-FIRSTCONTACT-005 — Interactive Replay Experience

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-003, EXP-FIRSTCONTACT-009  
**Blocks:** EXP-FIRSTCONTACT-006

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

Allow newcomers to observe the canonical Mission through Replay, making execution evidence the centerpiece of the first-contact experience.

---

## Motivation

Replay is SYNTH's most distinctive concept. The first-contact experience should let visitors see Replay in action before reading a definition. An interactive Replay experience transforms abstract concepts into observable behavior.

---

## Deliverables

1. **Interactive timeline**
   - Step-by-step visualization of the recorded journey.

2. **Event visualization**
   - Human-readable rendering of events from the canonical Mission.

3. **Mission progression**
   - Visual indicators of Mission phases and approvals.

4. **Replay browser**
   - A lightweight viewer for the canonical Replay artifact.

5. **Approval checkpoints**
   - Highlight governance and approval moments.

6. **Execution visualization**
   - Show AI reasoning, CLI invocations, and outcomes side by side.

---

## Acceptance

A first-time visitor can open the interactive Replay experience and understand what happened during the canonical Mission without reading architectural documentation.

---

## Phases

### Phase 1 — Design the experience

Define the ideal newcomer flow through the Replay viewer.

### Phase 2 — Parse the canonical Replay

Consume the Replay artifact produced by EXP-FIRSTCONTACT-003.

### Phase 3 — Build the timeline

Render events and checkpoints in chronological order.

### Phase 4 — Add interactivity

Allow visitors to expand events, see AI reasoning, and inspect CLI commands.

### Phase 5 — Integrate into the website

Embed the Replay experience on the website as a first-class surface.

---

## Risks

| Risk | Mitigation |
|---|---|
| Replay viewer becomes too technical | Hide implementation details behind plain-language labels |
| Replay artifact is too large | Scope the canonical Mission to a manageable event count |
| Viewer depends on Protected Assets | Only consume Replay output; do not modify Replay itself |

---

## Definition of Done

- [x] Interactive timeline implemented.
- [x] Event visualization implemented.
- [x] Mission progression visualization implemented.
- [x] Replay browser implemented.
- [x] Approval checkpoints highlighted.
- [x] Execution visualization implemented.
- [x] Experience embedded on the website.
- [x] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Receive the canonical Replay artifact from EXP-FIRSTCONTACT-003.
2. Design the newcomer-facing Replay experience.
3. Build a static or lightly dynamic viewer.
4. Embed it in the website.
5. Validate comprehension with EXP-FIRSTCONTACT-006.

---

## Completion Notes

Completed as part of Program 009 closure.

The interactive Replay experience is now embedded in `website/first-contact/replay.html`. It is generated deterministically from Archive B by `scripts/generate-first-contact-projection.js` and includes:

- An interactive episode timeline (all eight episodes).
- Per-episode command and event visualization derived from `commands.json` and `events.jsonl`.
- Mission progression shown through episode ordering and approval-checkpoint highlighting.
- Replay browser with the full replay verdict table (`events replayed`, hash chain, operational vs replayed hash, consistency verdict).
- Execution visualization showing actor, command, and purpose for each step.

The page is a projection, not a hand-authored UI: deleting `website/first-contact/replay.html` and regenerating restores it byte-identically, as verified by `tests/first-contact-projection.test.js`.

Acceptance is pending the comprehension validation results from EXP-FIRSTCONTACT-006.
