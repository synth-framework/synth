# EXP-HOME-015 — Production Certification (v2)

> **Certification expedition.** Certify that the Mission Studio Homepage meets all acceptance criteria before release, with massively expanded unit, integration, end-to-end, visual regression, accessibility, and performance testing.

**Status:** Completed (pending acceptance)  
**Kind:** Certification Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 through EXP-HOME-014, EXP-HOME-016 through EXP-HOME-024  
**Blocks:** none

> **Specification:** See [`docs/operator/homepage-certification-report.md`](../operator/homepage-certification-report.md).

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

Prove that the Mission Studio Homepage is ready for production. Certification now covers not only visitor comprehension but also comprehensive unit, integration, end-to-end, visual regression, accessibility, and performance testing. The homepage must function as a single, persistent application while remaining fast, accessible, and correct.

---

## Origin Evidence

Without certification, the homepage risks becoming a beautiful but ineffective or unreliable marketing layer. Expanded testing ensures that Mission Studio behaves correctly across browsers, devices, themes, input methods, and lifecycle phases.

---

## Required Change

### 1.1 Comprehension certification

Conduct structured tests with first-time visitors. Each participant must be able to answer:

- What problem does SYNTH solve?
- What is Genesis?
- What is Discovery?
- What is a Mission?
- What is an Expedition?
- Why does Governance matter?
- What is Replay?
- How do Greenfield and Brownfield differ?
- Why doesn't SYNTH generate code immediately?
- How does SYNTH transform intent into governed software?

### 1.2 Unit tests

#### Design system

- Token integrity: every token resolves to a valid value.
- Semantic color mapping: each concept maps to the expected color family.
- Typography scale: sizes, weights, and line heights follow the documented scale.
- Spacing scale: values follow the modular base unit.
- Elevation scale: shadows and blur match layer definitions.
- Motion token validation: durations and easings are within allowed ranges.

#### Components

- Rendering: each component renders without errors.
- Variants: each documented variant produces distinct output.
- Accessibility attributes: roles, states, and properties are correct.
- State transitions: hover, focus, pressed, loading, completed, failed, selected, disabled behave correctly.
- Keyboard interaction: focus order and activation work with keyboard only.
- Theme switching: components adapt to light and dark themes.

#### Mission Studio UI

- Sidebar state machine: phase highlighting and progress update correctly.
- Header state updates: title, phase badge, and governance status reflect current state.
- Artifact rendering: phase artifacts render from runtime projection.
- Footer status rendering: runtime status, evidence count, replay position, and repository summary update correctly.
- Sticky workspace logic: sticky threshold, pinning, and release behave as specified.

### 1.3 Integration tests

#### Mission Studio

- Scroll synchronization: page scroll advances and reverses phases correctly.
- Phase transitions: state machine advances through all phases in order.
- Artifact lifecycle: artifacts appear, update, and disappear with phase changes.
- Runtime → UI projection: runtime events produce the expected UI updates.
- Sidebar ↔ workspace synchronization: sidebar highlight matches workspace phase.
- Header ↔ runtime synchronization: header status reflects runtime state.

#### Homepage

- Hero → Mission Studio handoff: transition is smooth and deterministic.
- Sticky release: Mission Studio unpins and supporting content scrolls normally.
- Lower section navigation: supporting sections are reachable and functional.
- Documentation links: all links resolve to canonical documentation.
- Responsive layouts: layout adapts correctly across breakpoints.

### 1.4 End-to-end tests

Validate the complete guided experience:

```text
Homepage load
  ↓
Hero visible and interactive
  ↓
Scroll into Mission Studio
  ↓
Enter Intent
  ↓
Advance through Discovery
  ↓
Approve Mission
  ↓
Review Expeditions
  ↓
Scrub Governance & Replay timeline
  ↓
Mission Studio releases
  ↓
Navigate supporting sections
```

### 1.5 Visual regression tests

- Full homepage at default scroll position.
- Every Mission Studio phase: Intent, Discovery, Mission, Expeditions, Governance & Replay.
- Sidebar states: collapsed, expanded, all phases highlighted in sequence.
- Artifact cards: every variant at every interactive state.
- Component catalog: all Storybook stories.
- Responsive breakpoints: compact, medium, expanded, wide.
- Light and dark themes for all of the above.

### 1.6 Accessibility tests

- WCAG 2.2 AA conformance across all pages and components.
- Keyboard-only navigation through the full lifecycle.
- Screen reader announcements for phase changes and status updates.
- Focus management during sticky transitions and phase changes.
- Reduced-motion support: animations collapse or disable.
- Color contrast: text, icons, badges, and interactive elements meet contrast requirements.

### 1.7 Performance tests

- First Contentful Paint (FCP) within budget.
- Largest Contentful Paint (LCP) within budget.
- Time to Interactive (TTI) within budget.
- Scroll animation 60 FPS on target devices.
- Sticky workspace responsiveness: no jank during pin/release.
- Bundle size budgets for initial and lazy-loaded chunks.
- Lazy-loading verification: supporting content loads only when needed.

---

## Deliverables

1. **Production Certification Report** under `docs/operator/homepage-certification-report.md`.
2. **Comprehension test script** and results.
3. **Unit test suite** covering design system, components, and Mission Studio UI.
4. **Integration test suite** covering Mission Studio and homepage integration.
5. **End-to-end test suite** for the full visitor journey.
6. **Visual regression test suite** with baseline images and diff reports.
7. **Accessibility audit report** with WCAG 2.2 AA evidence.
8. **Performance test report** with metrics, budgets, and traces.
9. **Technical certification checklist** with pass/fail evidence.
10. **Runtime-honesty audit** of every homepage element.

---

## Acceptance Criteria

- At least 80% of first-time visitors answer all ten comprehension questions correctly within five minutes.
- Unit tests pass for design system, components, and Mission Studio UI.
- Integration tests pass for Mission Studio scroll, phase, artifact, and synchronization behavior.
- End-to-end tests pass for the complete guided experience.
- Visual regression tests pass for homepage, phases, sidebar, artifacts, components, breakpoints, and themes.
- Accessibility audit passes WCAG 2.2 AA.
- Performance tests meet FCP, LCP, TTI, FPS, bundle, and lazy-loading budgets.
- Every homepage element maps to a SYNTH concept.
- Documentation links are valid.
- No decorative or invented UI remains without justification.

---

## Out of Scope

- New homepage features.
- Changes to SYNTH runtime or governance.
- Changes to Protected Assets.

---

## Success Criteria

The expedition succeeds when the Mission Studio Homepage is certified for production release and the certification report is accepted.

---

## Related documents

- `docs/operator/homepage-certification-report.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-HOME-001.md` through `docs/expeditions/EXP-HOME-014.md`
- `docs/expeditions/EXP-HOME-016.md` through `docs/expeditions/EXP-HOME-024.md`
