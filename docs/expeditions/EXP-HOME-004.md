# EXP-HOME-004 — Homepage / Mission Studio Integration (v2)

> **Architecture expedition.** Define how Mission Studio becomes the SYNTH homepage: the hero handoff, sticky threshold, scroll controller, section synchronization, state machine, animation contracts, and performance constraints.

**Status:** Completed (pending acceptance)  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language), EXP-HOME-002 (Mission Studio Component Catalog), EXP-HOME-003 (Mission Studio UI Specification)  
**Blocks:** EXP-HOME-005, EXP-HOME-006, EXP-HOME-007, EXP-HOME-008, EXP-HOME-009, EXP-HOME-015

> **Specification:** See [`docs/design/homepage-specification.md`](../design/homepage-specification.md).

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

Replace the former Artifact System scope with a new, integrated specification: Mission Studio is the homepage. This expedition defines how the public page transitions from a lightweight hero into a sticky, persistent Mission Studio application, drives lifecycle phases through scroll, and releases into supporting content only after the lifecycle completes.

---

## Origin Evidence

A visitor arriving at the SYNTH homepage should not feel like they are moving from a marketing page into a demo. The entire homepage is the Mission Studio experience; supporting content exists only after Mission Studio has completed its work. This requires careful coordination between page scroll, application state, animation, and performance.

---

## Required Change

### 1.1 Hero → Mission Window handoff

- The hero contains the SYNTH identity, tagline, install command, and a single primary call-to-action.
- Scrolling past the hero transitions the visitor into Mission Studio.
- The transition is animated: hero content fades or translates while Mission Studio fades in and becomes the dominant element.
- No page jump or route change occurs.

### 1.2 Sticky threshold

- Mission Studio becomes sticky at a well-defined scroll position.
- Threshold is configurable and testable across breakpoints.
- The threshold accounts for header, footer, and safe-area insets.
- A fallback exists for viewports too short to support sticky behavior.

### 1.3 Scroll controller

- A scroll controller maps overall page scroll progress to Mission Studio phase progress.
- Each phase occupies a configurable scroll range.
- Scroll snapping is optional and must not break keyboard or reduced-motion accessibility.
- Reverse scroll must reverse phase transitions deterministically.

### 1.4 Section synchronization

- Page sections correspond to lifecycle phases.
- As a section enters the active scroll range, Mission Studio advances to the matching phase.
- Supporting sections (capabilities, examples, docs, community) are only active after Mission Studio releases.

### 1.5 State machine

- Mission Studio state machine is driven by scroll progress and by user interaction.
- States: Idle, Intent, Discovery, Constraints, Domain, Mission, Expeditions, Governance, Replay, Architecture, Repository Summary, Complete.
- Transitions are guarded by runtime readiness and by scroll position.

### 1.6 Animation contracts

- Phase enter/leave animations are declarative and parameterized.
- Animation durations and easings derive from EXP-HOME-001 motion tokens.
- Contracts define which elements animate together and which animate independently.
- Reduced-motion contracts collapse animations.

### 1.7 Performance constraints

- Scroll-driven animations target 60 FPS.
- Layout thrashing is avoided: prefer transform and opacity animations.
- Long-running computations are chunked or offloaded.
- Lazy loading is used for below-the-fold supporting content.

### 1.8 Supporting content release

- Supporting content begins only after Mission Studio reaches the Complete state.
- The release transition unsticks Mission Studio and restores normal document scroll.
- Supporting content remains anchored in SYNTH concepts and links to canonical documentation.

---

## Deliverables

1. **Homepage / Mission Studio Integration Specification** under `docs/design/homepage-specification.md` (v2 structure already specifies hero handoff, sticky shell, scroll controller, and release).
2. **Hero handoff specification** with animation and timing.
3. **Sticky threshold definition** and breakpoint behavior.
4. **Scroll controller design** with phase-to-scroll-range mapping.
5. **Section synchronization contract** between page sections and Mission Studio phases.
6. **State machine integration contract** tying scroll and interaction to phase transitions.
7. **Animation contracts** for hero handoff, phase transitions, sticky release, and supporting content entry.
8. **Performance budget and test plan**.

---

## Acceptance Criteria

- Mission Studio behaves as one persistent application; there is no page-jump feeling.
- Hero handoff transitions smoothly into Mission Studio.
- Sticky threshold is deterministic across breakpoints.
- Scroll progress drives phase transitions forward and backward.
- Supporting content appears only after Mission Studio releases.
- Animation contracts are documented and derive from EXP-HOME-001 tokens.
- Performance targets: 60 FPS scroll animations, first contentful paint within budget, lazy-loaded supporting content.
- Keyboard and reduced-motion users can navigate the full experience.

---

## Out of Scope

- Design tokens (EXP-HOME-001).
- Component catalog implementation (EXP-HOME-002).
- Mission Studio shell and phase content specification (EXP-HOME-003).
- Phase-specific behavior (EXP-HOME-005 through EXP-HOME-009).
- Motion system choreography (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when the homepage can be described as a single, continuous experience from hero through Mission Studio to supporting sections, with no perceptible boundary between page and application.

---

## Related documents

- `docs/design/artifact-system.md`
- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/design/lds-002.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-002.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-005.md`
- `docs/expeditions/EXP-HOME-006.md`
- `docs/expeditions/EXP-HOME-007.md`
- `docs/expeditions/EXP-HOME-008.md`
- `docs/expeditions/EXP-HOME-009.md`
