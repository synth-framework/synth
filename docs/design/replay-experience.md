# Replay Experience Specification

> **Specification for the interactive Replay timeline on the SYNTH homepage.** Defines the scrubber, event log, and state reconstruction under EXP-HOME-007.

---

## Purpose

Demonstrate Replay as a core SYNTH capability by letting visitors scrub through a sample event log and watch the workspace reconstruct state.

---

## Replay timeline

- Horizontal timeline of events.
- Event markers for:
  - Intent
  - Discovery
  - Mission
  - Expedition
  - Approval
  - Completion
- Scrubber to move backward and forward through history.

---

## Scrubbing behavior

- As the scrubber moves, workspace artifacts update to reflect state at that point.
- Status bar shows replay position and state hash.
- Currently hovered event is highlighted.

---

## Sample event log

A deterministic, curated event log representing a complete Genesis → Mission → Expedition lifecycle. It does not depend on visitor input.

```jsonl
{"type":"SYSTEM_GENESIS","payload":{"projectName":"Example Project"}}
{"type":"MISSION_CREATED","payload":{"mission":{"id":"M1","name":"Example Mission"}}}
{"type":"MISSION_APPROVED","payload":{"id":"M1"}}
{"type":"EXPEDITION_CREATED","payload":{"expedition":{"id":"E1","name":"Example Expedition"}}}
{"type":"EXPEDITION_STARTED","payload":{"id":"E1"}}
{"type":"EXPEDITION_COMPLETED","payload":{"id":"E1"}}
```

---

## State reconstruction

- Replay applies events sequentially from offset 0 to current scrub position.
- Resulting state is projected into Artifact Cards.
- State hash is displayed for the current position.

---

## Component taxonomy

- `ReplayTimeline` — outer container.
- `ReplayTrack` — horizontal track.
- `ReplayMarker` — individual event marker.
- `ReplayScrubber` — draggable position indicator.
- `ReplayStateHash` — displays current state hash.

---

## Acceptance criteria

- Scrubbing the timeline updates workspace artifacts deterministically.
- The timeline shows all major lifecycle events.
- Replay position and state hash are visible.
- Reduced-motion mode disables scrub animations.

---

## Blockers / dependencies

- **Blocked by runtime Replay integration.** The homepage replay must use the canonical SYNTH replay engine or a documented, deterministic subset approved for the homepage. Until EXP-PROGRAM-022 / runtime replay exposes a callable interface for the homepage, this expedition cannot be fully implemented.
- Depends on Artifact Cards defined in EXP-HOME-004.

---

## Definition of Done

- [ ] Specification complete.
- [ ] Sample event log defined and deterministic.
- [ ] Runtime replay integration path resolved (external dependency).
- [ ] Implementation scrubbing through sample events updates workspace artifacts.
- [ ] Tests verify artifact updates match event log position.

---

## Related documents

- [Mission Workspace Specification](mission-workspace.md)
- [Artifact System Specification](artifact-system.md)
- [EXP-HOME-007 — Replay Experience](../expeditions/EXP-HOME-007.md)
