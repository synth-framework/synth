# EXP-HOME-002 — Mission Studio Component Catalog (v2)

> **Architecture expedition.** Build the component catalog for Mission Studio: reusable, token-driven, state-machine-aware UI primitives that implement the Mission Studio Design System.

**Status:** Completed (pending acceptance)  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language)  
**Blocks:** EXP-HOME-003, EXP-HOME-004, EXP-HOME-005, EXP-HOME-006, EXP-HOME-007, EXP-HOME-008, EXP-HOME-009, EXP-HOME-013

> **Specification:** See [`docs/design/mission-workspace.md`](../design/mission-workspace.md).

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

Create the component catalog that makes Mission Studio concrete. Every component must be reusable across phases, fully token-driven, state-machine-aware, and documented with Storybook stories covering all interactive states. This catalog supersedes any prior Mission Workspace component scope.

---

## Origin Evidence

Mission Studio requires a consistent vocabulary of workspace, sidebar, artifact, navigation, content, feedback, and motion components. Without a shared catalog, phase-specific expeditions will duplicate effort, diverge in behavior, and introduce inconsistent interactions.

---

## Required Change

### 1.1 Workspace components

| Component | Responsibility |
|-----------|----------------|
| Mission Window | Primary container for the active phase and artifacts. |
| Workspace Header | Persistent header showing Mission title, phase, governance status, and global actions. |
| Workspace Footer | Persistent footer showing runtime status, evidence count, replay position, and repository state. |
| Workspace Divider | Structural separator between sidebar, workspace, and footer. |
| Sticky Container | Scroll-sticky wrapper that pins Mission Studio during the lifecycle scroll. |

### 1.2 Sidebar components

| Component | Responsibility |
|-----------|----------------|
| Sidebar | Persistent phase navigation and status panel. |
| Sidebar Section | Grouping primitive for phases or related items. |
| Sidebar Phase | Interactive phase entry with state, progress, and highlight. |
| Sidebar Status | Compact status badge for a phase or section. |
| Sidebar Progress | Progress bar or stepper showing lifecycle advancement. |
| Sidebar Transition | Animated transition when the active phase changes. |

### 1.3 Artifact Card components

| Component | Responsibility |
|-----------|----------------|
| Intent | Raw visitor intent captured as an artifact. |
| Discovery | Discovery findings, unknowns, and observations. |
| Constraints | Discovered constraints and boundaries. |
| Domain | Domain entities, relationships, bounded contexts. |
| Mission | Mission purpose, objectives, success criteria. |
| Expedition | Expedition subject, goal, status, and dependencies. |
| Governance | Governance status, approval boundary, and audit trail. |
| Replay | Replay event, state transition, timestamp, state hash. |
| Evidence | Observation, confidence, source, and rationale. |
| Repository Summary | Repository state, branch, events, and readiness. |
| Unknown | Open question or unresolved unknown. |
| Finding | Validated discovery finding. |
| Recommendation | Proposed action or improvement. |

### 1.4 Navigation components

| Component | Responsibility |
|-----------|----------------|
| Breadcrumb | Location within Mission Studio hierarchy or phase flow. |
| Timeline | Phase or event timeline with current position. |
| Phase Indicator | Compact current-phase badge or pill. |
| Status Strip | Horizontal strip of status badges. |
| Workspace Navigation | Controls for advancing, returning, or jumping between phases. |

### 1.5 Content components

| Component | Responsibility |
|-----------|----------------|
| Code | Syntax-highlighted or plain code block. |
| Command | CLI-style command display with copy action. |
| Terminal | Terminal emulator surface for command output. |
| Metrics | Numeric metrics with labels, units, and trend indicators. |
| Empty State | Empty-state illustration and call-to-action. |
| Loading | Loading spinner or progress indicator. |
| Skeleton | Content placeholder respecting layout. |
| Error | Error message with recovery action. |
| Success | Success confirmation with evidence. |

### 1.6 Feedback components

| Component | Responsibility |
|-----------|----------------|
| Toast | Transient notification. |
| Callout | Inline informational, warning, or error notice. |
| Banner | Persistent top-level message. |
| Notification | Dismissible status update. |

### 1.7 Motion components

| Component | Responsibility |
|-----------|----------------|
| Crossfade | Opacity crossfade between two elements. |
| Artifact Morph | Layout-preserving transition between artifact states. |
| Timeline Progress | Animated timeline advancement. |
| Sidebar Advance | Smooth phase highlight movement in the sidebar. |
| Workspace Transition | Coordinated enter/leave transition for phase changes. |

### 1.8 Storybook coverage

Every component must include stories for:

```text
Default
Hover
Focus
Pressed
Loading
Completed
Failed
Selected
Disabled
Interactive
```

Where a state is not applicable, the story must explicitly document why.

---

## Deliverables

1. **Mission Studio Component Catalog Specification** under `docs/design/mission-workspace.md`.
2. **Implemented component library** covering Workspace, Sidebar, Artifact Cards, Navigation, Content, Feedback, and Motion categories.
   - `website/js/components.js` — canonical component catalog.
   - `website/storybook.html` + `website/js/storybook-app.js` — component preview/stories.
3. **Storybook workspace** with all required stories.
4. **Component API documentation** for props, events, slots, and accessibility attributes.
5. **State mapping table** linking each component to its valid states and transitions.
6. **Token-derivation audit** showing that every visual value resolves through EXP-HOME-001 tokens.

---

## Acceptance Criteria

- Every component listed in this charter is implemented and documented.
- All components derive their visual properties exclusively from EXP-HOME-001 tokens.
- Every component has Storybook stories for Default, Hover, Focus, Pressed, Loading, Completed, Failed, Selected, Disabled, and Interactive where applicable.
- Components are keyboard accessible and expose correct ARIA roles, states, and properties.
- Workspace, Sidebar, and Artifact Card components integrate correctly in the Mission Studio shell.
- Motion components respect reduced-motion preferences.
- The catalog supports both light and dark themes without per-component overrides.
- No decorative component exists without a runtime mapping.

---

## Out of Scope

- Mission Studio UI specification (EXP-HOME-003).
- Homepage / Mission Studio integration logic (EXP-HOME-004).
- Phase-specific content and behavior (EXP-HOME-005 through EXP-HOME-009).
- Motion choreography specification (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when any phase in Mission Studio can be assembled from existing catalog components, and when a designer or engineer can reason about a new component by referencing the catalog's taxonomy, states, and stories.

---

## Related documents

- `docs/design/mission-workspace.md`
- `docs/design/lds-002.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-013.md`
