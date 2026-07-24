# Mission Workspace Specification

> **Architecture specification for the SYNTH Mission Studio Homepage.** Defines the workspace layout, panels, state machine, and component architecture under EXP-HOME-002.

---

## Overview

The Mission Workspace is the persistent, central surface of the SYNTH homepage. It remains pinned in the viewport as the visitor scrolls. Scrolling does not navigate to new pages; it advances the workspace through the Genesis lifecycle states.

The workspace is composed of three panels:

- **Genesis Navigator** (left): shows lifecycle phases and current state.
- **Artifact Display** (center): shows the artifact or interaction surface for the current phase.
- **Status Bar** (bottom): shows runtime status indicators.

---

## State Machine

```text
Idle
  │  trigger: page load / scroll into workspace
  ▼
Intent
  │  trigger: visitor types intent or selects a source
  ▼
Discovery
  │  trigger: workspace advances; discovery artifacts appear
  ▼
Constraints
  │  trigger: unknowns and limitations are identified
  ▼
Domain
  │  trigger: domain model is projected
  ▼
Mission
  │  trigger: mission proposal is formed
  ▼
Expeditions
  │  trigger: expeditions are proposed
  ▼
Governance
  │  trigger: governance state is visualized
  ▼
Replay
       trigger: replay timeline is shown
```

### State definitions

| State | Display in Artifact Area | Navigator Highlight | Status Bar |
|---|---|---|---|
| Idle | Hero title and short value proposition | None | Ready |
| Intent | Intent input + source selector | Intent | Waiting for intent |
| Discovery | Discovery artifact | Discovery | Analyzing |
| Constraints | Unknowns / questions list | Constraints | Constraints detected |
| Domain | Domain model artifact | Domain | Domain projected |
| Mission | Mission proposal artifact | Mission | Mission proposed |
| Expeditions | Expedition proposals | Expeditions | Expeditions ready |
| Governance | Governance visualization | Governance | Governed |
| Replay | Replay scrubber + timeline | Replay | Replay available |

### Transitions

- **Idle → Intent:** visitor scrolls to the workspace or interacts with the hero CTA.
- **Intent → Discovery:** visitor enters an intent and confirms, or selects a source.
- **Discovery → Constraints:** discovery artifacts surface unknowns.
- **Constraints → Domain:** visitor resolves enough unknowns to form a domain model.
- **Domain → Mission:** domain model is accepted; mission proposal is generated.
- **Mission → Expeditions:** mission is approved; expeditions are proposed.
- **Expeditions → Governance:** expeditions are committed; governance state is shown.
- **Governance → Replay:** governance proof is linked to replayable event history.

Transitions are deterministic and driven by scroll position or explicit interaction. Each transition updates the navigator, artifact area, and status bar in sync.

---

## Panels

### Genesis Navigator (left)

- Fixed width on desktop (~240px).
- Vertical list of lifecycle phases.
- Current phase is highlighted with `--ms-accent`.
- Completed phases show a check indicator.
- Future phases are muted.
- On tablet/mobile, collapses into a compact horizontal stepper or hideable drawer.

### Artifact Display (center)

- Occupies remaining width between navigator and page margins.
- Hosts the content surface for the current state:
  - Intent: input + source selector.
  - Discovery/Constraints/Domain/Mission/Expeditions: artifact cards.
  - Governance: before/after comparison.
  - Replay: timeline + scrubber.
- Content animates in and out on state change.

### Status Bar (bottom)

- Fixed height (~48px).
- Spans the full workspace width.
- Shows:
  - **Replay:** current event count or replay status.
  - **Governance:** governance state (e.g., "governed").
  - **Evidence:** confidence level or evidence count.
  - **Kernel:** runtime readiness indicator.

---

## Wireframes

### Desktop (>1024px)

```text
+----------------------------------------------------------+
|  [Genesis Navigator]  |  [Artifact Display Area]          |
|                       |                                   |
|  ○ Intent             |  +-----------------------------+  |
|  ○ Discovery          |  |                             |  |
|  ○ Constraints        |  |   Current phase content     |  |
|  ● Domain             |  |   (artifact, input,         |  |
|  ○ Mission            |  |    terminal, replay, etc.)  |  |
|  ○ Expeditions        |  |                             |  |
|  ○ Governance         |  +-----------------------------+  |
|  ○ Replay             |                                   |
+-----------------------+-----------------------------------+
|  [Replay] [Governance] [Evidence] [Kernel]                 |
+----------------------------------------------------------+
```

### Tablet (768–1024px)

```text
+----------------------------------------------------------+
|  [Compact stepper: Intent → Discovery → ... → Replay]     |
+----------------------------------------------------------+
|  [Artifact Display Area]                                  |
|                                                           |
|  +-----------------------------------------------------+  |
|  |                                                     |  |
|  |              Current phase content                  |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
+----------------------------------------------------------+
|  [Replay] [Governance] [Evidence] [Kernel]                |
+----------------------------------------------------------+
```

### Mobile (<768px)

```text
+----------------------------------------------------------+
|  [Stepper or drawer toggle]                               |
+----------------------------------------------------------+
|  [Artifact Display Area]                                  |
|                                                           |
|  +-----------------------------------------------------+  |
|  |                                                     |  |
|  |              Current phase content                  |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
+----------------------------------------------------------+
|  [Replay] [Governance] [Evidence] [Kernel]                |
+----------------------------------------------------------+
```

---

## Component Architecture

### Workspace shell

`WorkspaceShell` is the root container. It:
- pins itself to the viewport during scroll;
- manages the current lifecycle state;
- renders the three panels;
- coordinates state transitions.

### State controller

`WorkspaceController` holds the state machine. It:
- maps scroll progress to state;
- handles explicit interactions that advance state;
- emits state change events for panels to consume.

### Panel components

- `GenesisNavigator` — renders phase list and current highlight.
- `ArtifactDisplay` — renders the active phase content.
- `StatusBar` — renders runtime indicators.

### Phase content components

Each state delegates to a phase-specific component:
- `IntentPhase`
- `DiscoveryPhase`
- `ConstraintsPhase`
- `DomainPhase`
- `MissionPhase`
- `ExpeditionsPhase`
- `GovernancePhase`
- `ReplayPhase`

---

## Persistence

The workspace shell remains mounted and visible throughout the homepage experience. Scroll triggers state transitions; it does not unmount or replace the workspace. Phase content animates within the artifact display area while the shell and panels stay stable.

---

## Acceptance Criteria

- The workspace state advances deterministically as the visitor scrolls or interacts.
- Panels are clearly delineated and consistent across phases.
- The workspace is the dominant visual element on the homepage.
- State transitions are reversible by scrolling up.
- The workspace remains pinned and does not feel like a sequence of separate pages.

---

## Relationship to other documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [EXP-HOME-002 — Mission Workspace](../expeditions/EXP-HOME-002.md)
- [EXP-HOME-003 — Genesis Experience](../expeditions/EXP-HOME-003.md)
- [EXP-HOME-004 — Artifact System](../expeditions/EXP-HOME-004.md)
- [EXP-HOME-007 — Replay Experience](../expeditions/EXP-HOME-007.md)
- [EXP-HOME-010 — Responsive Implementation](../expeditions/EXP-HOME-010.md)
