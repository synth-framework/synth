# EXP-HOME-003 — Mission Studio UI Specification (v2)

> **Architecture expedition.** Specify Mission Studio as a persistent application embedded in the homepage, not merely a Genesis experience.

**Status:** Completed (pending acceptance)  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language), EXP-HOME-002 (Mission Studio Component Catalog)  
**Blocks:** EXP-HOME-004, EXP-HOME-021

> **Specification:** See [`docs/design/genesis-experience.md`](../design/genesis-experience.md).

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

Define Mission Studio as a persistent application shell embedded in the SYNTH homepage. This specification governs the header, sidebar, workspace, status, footer, sticky behavior, animation, responsive behavior, accessibility, and every lifecycle phase displayed inside the workspace.

---

## Origin Evidence

The homepage must guide visitors through SYNTH's lifecycle without feeling like a sequence of separate pages or demos. Mission Studio is the container: it persists while the visitor scrolls, and scroll position drives phase transitions inside a single, coherent application.

---

## Required Change

### 1.1 Persistent application shell

Mission Studio is composed of:

```text
Header
  ↓
Sidebar    Workspace
  ↓          ↓
Footer
```

- **Header:** global identity, Mission title, current phase, governance status, theme toggle, documentation link.
- **Sidebar:** phase navigation, progress, status badges, runtime indicators.
- **Workspace:** artifact display area for the active phase.
- **Footer:** runtime status, evidence count, replay position, repository summary, commands.

### 1.2 Workspace lifecycle

Mission Studio drives the lifecycle:

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
  ↓
Architecture
  ↓
Repository Summary
  ↓
Complete
```

### 1.3 Header behavior

- Title updates to reflect active Mission or demo.
- Phase badge reflects current lifecycle phase.
- Governance status indicator shows approval state.
- Global actions: theme toggle, documentation link, reset demo.

### 1.4 Sidebar behavior

- Shows all phases in order.
- Highlights active phase.
- Shows completed, current, pending, and failed states.
- Progress indicator advances with lifecycle.
- Clicking a completed or reachable phase jumps the workspace to that phase.

### 1.5 Workspace behavior

- Displays artifacts relevant to the active phase.
- Supports scroll transitions tied to overall page scroll.
- Maintains focus management during phase changes.
- Preserves animation contracts defined in EXP-HOME-013.

### 1.6 Footer behavior

- Runtime status: idle, running, waiting, completed, failed.
- Evidence count and source summary.
- Replay position and state hash when in Replay phase.
- Repository status summary.
- Command suggestions relevant to the active phase.

### 1.7 Sticky behavior

- Mission Studio becomes sticky at a defined scroll threshold.
- It remains pinned while the visitor progresses through lifecycle phases.
- It releases when the lifecycle completes and supporting content begins.
- Sticky behavior degrades gracefully on small viewports.

### 1.8 Animation and responsive behavior

- Phase transitions use coordinated motion primitives from the component catalog.
- Responsive rules collapse the sidebar to a rail or drawer below the expanded breakpoint.
- Touch and pointer interactions are both supported.

### 1.9 Accessibility

- Keyboard-only navigation through phases and artifacts.
- Screen reader announcements for phase changes and status updates.
- Focus trap and restore during overlays.
- Reduced-motion support.

### 1.10 Runtime events

Mission Studio reacts to runtime events projected through the `MissionRuntime` interface:

```text
intent:captured
discovery:started
discovery:completed
constraint:identified
domain:mapped
mission:proposed
mission:approved
expedition:proposed
expedition:selected
governance:verified
replay:advanced
replay:completed
architecture:resolved
repository:synced
```

### 1.11 Phase definitions

For every phase, the specification defines:

```text
Purpose
Displayed artifacts
Sidebar state
Header state
Status badges
Commands
Timeline position
Animation
Scroll transition
Acceptance criteria
```

Phases are: Intent, Discovery, Mission, Expeditions, Governance, Replay, Architecture, Repository Summary.

---

## Deliverables

1. **Mission Studio UI Specification** under `docs/design/genesis-experience.md` (updated for v2 persistent application shell and scroll-driven state machine).
2. **Application shell layout** with header, sidebar, workspace, and footer specifications.
3. **Phase specification** for Intent, Discovery, Mission, Expeditions, Governance, Replay, Architecture, and Repository Summary.
4. **State machine definition** with transitions, triggers, guards, and side effects.
5. **Scroll integration contract** between page scroll and Mission Studio phase transitions.
6. **Accessibility and responsive behavior specification**.
7. **Runtime event mapping** to UI updates.

---

## Acceptance Criteria

- Mission Studio behaves as a single persistent application, not a series of separate pages.
- Header, sidebar, workspace, and footer are always present during the lifecycle.
- Every phase has documented purpose, artifacts, sidebar state, header state, status badges, commands, timeline, animation, and scroll transition.
- Sidebar progress synchronizes with workspace phase.
- Sticky behavior pins Mission Studio for the lifecycle and releases cleanly.
- Responsive behavior preserves usability across all breakpoints.
- Keyboard navigation and screen reader announcements work for all phase transitions.
- Runtime events project correctly into UI state.

---

## Out of Scope

- Component implementation details (EXP-HOME-002).
- Homepage hero handoff and sticky release mechanics (EXP-HOME-004).
- Motion choreography details (EXP-HOME-013).
- Homepage runtime implementation (EXP-HOME-016).
- Mission Studio state machine implementation (EXP-HOME-021).

---

## Success Criteria

The expedition succeeds when a designer or engineer can implement Mission Studio from the specification without ambiguity about shell behavior, phase content, or transitions.

---

## Related documents

- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/design/lds-002.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-002.md`
- `docs/expeditions/EXP-HOME-004.md`
- `docs/expeditions/EXP-HOME-021.md`
