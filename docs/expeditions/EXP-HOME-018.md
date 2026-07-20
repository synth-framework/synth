# EXP-HOME-018 — Homepage Replay Projection

> **Product expedition.** Expose replay as a scrubbable, browser-native projection using the existing SYNTH replay engine.

**Status:** Completed (pending acceptance)  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-007 (Replay Experience), EXP-HOME-016 (Homepage Runtime)  
**Blocks:** EXP-HOME-019, EXP-HOME-021

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

Let visitors scrub through a curated sample event log and watch the Mission Workspace reconstruct state, using the same deterministic replay engine that SYNTH uses internally.

---

## Origin Evidence

The replay engine in `src/runtime/replay.ts` is pure and deterministic, but it is not exposed in a form the homepage can consume. The homepage needs a callable interface that maps replay state to Artifact Cards.

---

## Required Change

### 1.1 Function surface

Provide functions such as:

```ts
loadReplay(events: SampleEvent[]): ReplayState
stepForward(state: ReplayState): ReplayState
stepBackward(state: ReplayState): ReplayState
gotoOffset(state: ReplayState, offset: number): ReplayState
currentArtifacts(state: ReplayState): ArtifactProjection
```

### 1.2 Curated event log

Use a deterministic, hand-curated sample event log representing a complete Genesis → Mission → Expedition lifecycle. The log ships with the homepage and does not depend on visitor input.

### 1.3 State projection

Replay produces canonical SYNTH state. A projection layer (EXP-HOME-019) maps that state into homepage Artifact Cards and status indicators.

---

## Deliverables

1. **Replay projection function library**.
2. **Sample event log** for the homepage demo.
3. **Scrubber integration** with the Mission Workspace state machine.
4. **Tests** verifying deterministic state at each offset.

---

## Acceptance Criteria

- Scrubbing updates workspace artifacts deterministically.
- The sample event log is deterministic and bounded.
- Replay uses the existing SYNTH replay engine or a documented subset.
- No filesystem or CLI dependencies are invoked.

---

## Out of Scope

- Loading real repository event logs.
- Chain hash verification UI.
- Graph integrity violation enforcement on the homepage.

---

## Success Criteria

The expedition succeeds when a visitor can scrub backward and forward through the sample event log and see the workspace reconstruct state.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-007 — Replay Experience](EXP-HOME-007.md)
- [EXP-HOME-016 — Homepage Runtime](EXP-HOME-016.md)
- [EXP-HOME-019 — Artifact Projection Layer](EXP-HOME-019.md)
- [docs/reference/replay-specification.md](../reference/replay-specification.md)
