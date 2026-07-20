# Accessibility Specification

> **Specification for making the SYNTH Mission Studio Homepage accessible.** Defined under EXP-HOME-011.

---

## Purpose

Make the homepage keyboard navigable, screen-reader friendly, and visually accessible with sufficient contrast and focus management.

---

## Keyboard navigation

- Tab order follows visual layout.
- Enter/Space activates cards and buttons.
- Arrow keys navigate timeline and workflow.
- Escape closes expanded panels.
- Skip link provided to jump to main workspace.

---

## Screen readers

- All interactive elements have accessible names.
- Live regions announce workspace state changes.
- Artifact cards expose role, state, and value.
- Headings follow a logical hierarchy.

---

## Contrast and visual

- Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- Focus indicators are visible (2 px outline using `--ms-accent`).
- Motion respects `prefers-reduced-motion`.

---

## Semantic HTML

- Use landmark regions (`header`, `main`, `footer`, `section`).
- Use headings hierarchically (`h1` → `h2` → `h3`).
- Use lists and buttons correctly.
- Terminal content is marked up as a non-interactive log region.

---

## Reduced motion

- When `prefers-reduced-motion: reduce` is active:
  - All transitions become instant.
  - Stagger delays are removed.
  - Scrolling still advances state but without animated transitions.

---

## Acceptance criteria

- Homepage passes automated WCAG 2.1 AA checks (axe-core or equivalent).
- All interactions are reachable by keyboard.
- Screen readers announce state changes correctly.
- Reduced-motion mode disables non-essential animation.

---

## Blockers / dependencies

- Depends on Artifact Cards defined in EXP-HOME-004.
- Automated tests require an accessibility testing library.

---

## Definition of Done

- [ ] Automated accessibility tests pass.
- [ ] Manual keyboard navigation checklist passes.
- [ ] Manual screen-reader checklist passes.
- [ ] Reduced-motion mode verified.

---

## Related documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Mission Workspace Specification](mission-workspace.md)
- [EXP-HOME-011 — Accessibility](../expeditions/EXP-HOME-011.md)
