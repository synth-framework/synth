# EXP-HOME-021 — Mission Studio State Machine

> **Architecture expedition.** Replace page-specific state with a unified state machine that drives the entire homepage workspace.

**Status:** Completed (pending acceptance)  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace), EXP-HOME-019 (Artifact Projection Layer)  
**Blocks:** EXP-HOME-015 (Production Certification)

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

Make the homepage behave like Mission Studio: a single state machine advances the visitor through Intent, Discovery, Mission, Expedition, and Replay states.

---

## Origin Evidence

The Mission Workspace specification (`docs/design/mission-workspace.md`) defines a lifecycle state machine, but the homepage currently treats sections as separate pages. The state machine must become the single source of truth for workspace behavior.

---

## Required Change

### 1.1 State machine

```text
Idle
  ↓
Intent
  ↓
Discovery
  ↓
Constraints
  ↓
Domain
  ↓
Mission
  ↓
Expeditions
  ↓
Governance
  ↓
Replay
```

### 1.2 Transitions

Transitions are triggered by:

- Visitor input
- Example selection
- Scroll progress
- Replay scrub position
- Explicit navigation clicks

### 1.3 State shape

The state machine holds:

- Current phase
- Runtime context (Homepage Runtime)
- Current artifact projection
- Replay state (when applicable)

### 1.4 UI binding

All workspace panels derive their content from the current state. No panel owns independent state.

---

## Deliverables

1. **Mission Studio State Machine** implementation.
2. **Transition definitions** and guards.
3. **State-to-projection binding**.
4. **Tests** verifying phase transitions are deterministic.

---

## Acceptance Criteria

- The workspace is always in exactly one phase.
- Transitions are deterministic and reversible where appropriate.
- Scroll, interaction, and replay all drive the same state machine.
- The state machine does not depend on the CLI or filesystem.

---

## Out of Scope

- Real-time collaboration.
- Persistence of visitor progress.
- Server-side state.

---

## Success Criteria

The expedition succeeds when every homepage interaction advances the same Mission Studio state machine and the workspace updates consistently.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-002 — Mission Studio Homepage](EXP-HOME-002.md)
- [EXP-HOME-019 — Artifact Projection Layer](EXP-HOME-019.md)
- [docs/design/mission-workspace.md](../design/mission-workspace.md)
