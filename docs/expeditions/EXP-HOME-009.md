# EXP-HOME-009 — Governance & Replay Phase (v2)

> **Product expedition.** Define the Governance & Replay phase inside Mission Studio: governance visualization, replay timeline, scrubber, state hash, and the proof of deterministic execution.

**Status:** Completed (pending acceptance)  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-003 (Mission Studio UI Specification), EXP-HOME-004 (Homepage / Mission Studio Integration)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/capabilities-explorer.md`](../design/capabilities-explorer.md).

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

## Objective

Transform the former Capabilities Explorer scope into the Governance & Replay phase of Mission Studio. This phase demonstrates that SYNTH's output is governed, replayable, and deterministic. It combines governance visualization with an interactive replay timeline that reconstructs state from events.

---

## Origin Evidence

Governance and Replay are foundational SYNTH concepts, but they are abstract. An interactive timeline that shows events, approvals, state hashes, and reconstructed artifacts makes determinism visceral.

---

## Required Change

### 1.1 Phase purpose

- Visualize governance status across the lifecycle.
- Provide a scrubbable replay timeline of events.
- Show state hash at each replay position.
- Demonstrate that state is reconstructed from events, not stored as a snapshot.

### 1.2 Governance visualization

- **Governance Status Panel:** approved Mission, governed Expeditions, evidence summary.
- **Approval Trail:** sequence of approval events with timestamps and actors.
- **Comparison View:** before/after contrast showing drift vs. governed state.
- **Event Log:** list of runtime events with type, payload, and state hash.

### 1.3 Replay timeline

- Horizontal timeline of lifecycle events.
- Event markers for Intent, Discovery, Mission Proposed, Mission Approved, Expedition Proposed, Expedition Started, Governance Verified, Replay Advanced, Completed.
- Scrubber to move backward and forward through history.
- Current event is highlighted.

### 1.4 Scrubber

- Scrubbing updates workspace artifacts to reflect state at that point.
- State hash is visible and updates with scrubber position.
- Status bar shows replay position.
- Scrubber is keyboard accessible.

### 1.5 State hash

- A state hash is displayed for each replay position.
- Hash changes deterministically with each event.
- Hovering or focusing the hash reveals a short explanation.

### 1.6 Sidebar state

- Governance & Replay phase is highlighted.
- Expeditions phase is marked completed.
- Progress indicator nears completion.
- Governance status badge shows `Governed`.

### 1.7 Status badges

- Status: `Replaying`, `Governed`, `Verified`, `Deterministic`.

### 1.8 Scroll transition

- Entering the phase shows the governance panel and replay timeline.
- Scrolling forward scrubs the timeline forward.
- Scrolling backward scrubs the timeline backward.
- At the end of the phase, Mission Studio completes and releases into supporting content.

### 1.9 Animation

- Timeline advances with smooth, controlled motion.
- Artifacts crossfade to their state at the scrubber position.
- State hash updates with a subtle transition.

---

## Deliverables

1. **Governance & Replay Phase Specification** under `docs/design/capabilities-explorer.md`.
2. **Governance status panel** and approval trail components.
3. **Replay timeline and scrubber** components.
4. **State hash display** with explanatory interaction.
5. **Sample event log** representing a complete lifecycle.
6. **Tests** verifying scrubber behavior, artifact updates, and state hash correctness.

---

## Acceptance Criteria

- Governance status, approval trail, and event log are visible.
- Scrubbing the timeline updates workspace artifacts deterministically.
- State hash is visible and updates with each event position.
- Sidebar, header, and status badges reflect Governance & Replay state.
- Keyboard and screen reader users can operate the scrubber.
- Replay uses a deterministic, curated event log.
- Mission Studio completes and releases cleanly after the phase ends.
- Animations respect reduced-motion preferences.

---

## Out of Scope

- Expeditions phase (EXP-HOME-008).
- Real repository event log.
- Changes to SYNTH Replay or governance implementation.

---

## Success Criteria

The expedition succeeds when a visitor can scrub through history, see artifacts reconstruct from events, and explain why governance and replay make SYNTH deterministic.

---

## Related documents

- `docs/design/capabilities-explorer.md`
- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-004.md`
- `docs/expeditions/EXP-HOME-008.md`
