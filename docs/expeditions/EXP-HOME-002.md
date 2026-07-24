# EXP-HOME-002 — Mission Studio Component Catalog (v3)

> **Architecture expedition.** Build the component catalog for Mission Studio: reusable, token-driven, state-machine-aware UI primitives that implement the Mission Studio Design System.

**Status:** Completed  
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

Create the component catalog that makes Mission Studio concrete. Every component must be reusable across phases, fully token-driven, state-machine-aware, and support the progressive collapse continuum (immersive → compact → sticky bar). This catalog supersedes any prior Mission Workspace component scope.

---

## Origin Evidence

Mission Studio requires a consistent vocabulary of workspace, sidebar, artifact, navigation, content, feedback, and motion components. Without a shared catalog, phase-specific expeditions will duplicate effort, diverge in behavior, and introduce inconsistent interactions. The v3 design introduces progressive collapse and a sticky workspace bar, requiring new components and morph behaviors.

---

## Required Change

### 1.1 Navigation components

| Component | Responsibility |
|---|---|
| Global Nav | Sticky top navigation (56px): logo, links (Product, Architecture, Docs, Community), GitHub, Start Mission button. |
| Mission Header | Inside the MS shell: logo, mission title, status chips (Planning, Governed, Replay Ready). Transitions into sticky bar. |
| Sticky Workspace Bar | Post-collapse bar (72px): mission context only, no sidebar. Always sticky. Contains logo, mission name, status chips, confidence, Open Workspace button. |

### 1.2 Workspace components

| Component | Responsibility |
|---|---|
| Mission Shell | Full-viewport container: header + body (sidebar + workspace) + footer. Collapses through 6 states. |
| Sidebar | Phase list with status dots (✓ completed, ● active, ○ pending). Retracts through 3 stages: full labels → icons only → removed. |
| Workspace | Artifact surface. Content changes per phase. Compresses from full cards to summary. |
| Footer | Status bar: phase name, progress, metadata. |

### 1.3 Artifact Card components

| Component | Responsibility |
|---|---|
| Intent | Blue-tinted card: visitor intent, goals, confidence. |
| Discovery | Teal-tinted card: findings, capabilities, constraints. |
| Mission | Purple-tinted card: name, purpose, objectives, success criteria. |
| Expedition | Indigo-tinted card: name, goal, status. |
| Governance | Green-tinted card: validation, approval, replay readiness. |
| Replay | Violet-tinted card: timeline, evidence, audit log. |
| Evidence | Card: observation, confidence, source. |
| Architecture | Card: layer, responsibility, dependencies. |
| Constraints | Card: discovered boundaries and limitations. |
| Repository Summary | Card: status, artifacts, event count. |

Artifact cards use a colored left border (3px) matching their semantic color. Cards have generous padding (24px), 16px border radius, and elevate on hover.

### 1.4 Input components

| Component | Responsibility |
|---|---|
| Textarea | Large, calm, generous padding. For intent input. |
| Input | Standard text input with clear focus state. |
| Segmented Control | Mode selector (Greenfield / Brownfield / Knowledge). |
| Select | Dropdown selector. |

### 1.5 Content components

| Component | Responsibility |
|---|---|
| Code | Syntax-highlighted or plain code block. |
| Command | CLI-style command display with copy action. |
| Empty State | Empty-state with call-to-action. |
| Loading | Loading spinner or progress indicator. |
| Error | Error message with recovery action. |
| Success | Success confirmation with evidence. |

### 1.6 Status components

| Component | Responsibility |
|---|---|
| Chip | Compact status indicator (Planning, Governed, Replay Ready). |
| Badge | Phase badge (current phase label). |
| Progress | Progress bar or stepper. |
| Confidence | Percentage confidence indicator. |

### 1.7 Timeline components

| Component | Responsibility |
|---|---|
| Replay Timeline | Horizontal timeline with event markers and scrubber. |
| Execution Timeline | Phase-by-phase execution progress. |

### 1.8 Feedback components

| Component | Responsibility |
|---|---|
| Toast | Transient notification. |
| Callout | Inline informational, warning, or error notice. |

### 1.9 Button components

| Component | Responsibility |
|---|---|
| Primary | Filled accent button. |
| Secondary | Subtle border button. |
| Ghost | Borderless button. |
| Icon | Circular minimal button. |
| Link | Text link. |

### 1.10 Collapse behavior

Every component must define its behavior across the 6 collapse states:

| State | Sidebar | Cards | Inputs | Header |
|---|---|---|---|---|
| Immersive | Full labels + dots | Full cards | Textarea | Normal |
| Replay | Full (✓ completed) | Timeline | Hidden | Normal |
| Begin Collapse | Narrower | Summary | Single line | Pinned |
| Compact | Icons only | One row | Hidden | Compact |
| Sidebar Retracted | Removed | Metadata | Hidden | Compact |
| Sticky Bar | None | None | None | 72px bar |

### 1.11 Storybook coverage

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
Collapse-state-immersive
Collapse-state-compact
Collapse-state-sticky
```

Where a state is not applicable, the story must explicitly document why.

---

## Deliverables

1. **Mission Studio Component Catalog Specification** under `docs/design/mission-workspace.md`.
2. **Implemented component library** covering Navigation, Workspace, Artifact Cards, Inputs, Content, Status, Timeline, Feedback, and Buttons.
   - `website/js/components.js` — canonical component catalog.
   - `website/storybook.html` + `website/js/storybook-app.js` — component preview/stories.
3. **Storybook workspace** with all required stories including collapse states.
4. **Component API documentation** for props, events, and accessibility attributes.
5. **State mapping table** linking each component to its valid states and transitions.
6. **Collapse behavior table** per component (how each component morphs through 6 states).
7. **Token-derivation audit** showing that every visual value resolves through EXP-HOME-001 tokens.

---

## Acceptance Criteria

- Every component listed in this charter is implemented and documented.
- All components derive their visual properties exclusively from EXP-HOME-001 tokens.
- Every component has Storybook stories for Default, Hover, Focus, Pressed, Loading, Completed, Failed, Selected, Disabled, and collapse states where applicable.
- Components are keyboard accessible and expose correct ARIA roles, states, and properties.
- Workspace, Sidebar, and Artifact Card components integrate correctly in the Mission Studio shell.
- The Sticky Workspace Bar renders correctly at 72px with no sidebar.
- The sidebar retracts physically through 3 stages (labels → icons → removed).
- Motion components respect reduced-motion preferences.
- The catalog supports light theme only.
- No decorative component exists without a runtime mapping.

---

## Out of Scope

- Mission Studio UI specification (EXP-HOME-003).
- Homepage / Mission Studio integration logic (EXP-HOME-004).
- Phase-specific content and behavior (EXP-HOME-005 through EXP-HOME-009).
- Motion choreography specification (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when any phase in Mission Studio can be assembled from existing catalog components, when the progressive collapse produces smooth, physically plausible transitions, and when a designer or engineer can reason about a new component by referencing the catalog's taxonomy, states, and stories.

---

## Completion Evidence

| Deliverable | Status | Evidence |
|---|---|---|
| Component catalog | ✅ Complete | `website/js/components.js` — 16 render functions covering all specs |
| Navigation components | ✅ Complete | Global Nav (`synth-nav`), Sticky Workspace Bar (`ms-sticky-bar`) |
| Workspace components | ✅ Complete | Mission Shell, Sidebar with 3 retraction stages, Workspace surface, Footer |
| Artifact cards | ✅ Complete | Intent, Discovery, Mission, Expedition, Governance, Replay, + internal kinds |
| Input components | ✅ Complete | Textarea, Input, Segmented Control, Select |
| Content components | ✅ Complete | Code, Command, Empty State, Loading, Error, Success |
| Status components | ✅ Complete | Chip, Badge, Progress, Confidence |
| Timeline components | ✅ Complete | Replay Timeline, Execution Timeline |
| Feedback components | ✅ Complete | Toast, Callout |
| Button components | ✅ Complete | Primary, Secondary, Ghost, Icon, Link |
| Collapse behavior | ✅ Complete | 6-state morph via `handleProgressiveCollapse()` in `mission-studio-app.js` |
| Light-only theme | ✅ Complete | No dark theme toggle or references |
| All render tests pass | ✅ Complete | `node website/js/components.test.js` — 9/9 pass |
| Runtime tests pass | ✅ Complete | `node website/js/homepage-runtime/runtime.test.js` — 8/8 pass |
| Public vocabulary audit | ✅ Complete | `node tests/homepage-public-vocabulary.test.js` — 2/2 pass |
| Pipeline step component | ✅ Complete | Pill-shaped containers with 100px radius, shadow, hover/active states |
| CTA button refinement | ✅ Complete | Border weight, shadow, hover/active transitions |
| Card label typography | ✅ Complete | 11px uppercase with 0.08em tracking, card body 14px at 1.7 line-height |

## Related documents

- `docs/design/mission-workspace.md`
- `docs/design/lds-002.md`
- `docs/design/homepage-specification.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-013.md`
