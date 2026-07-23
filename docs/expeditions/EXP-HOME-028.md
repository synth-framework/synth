# EXP-HOME-028 — Continuous Collapse Interaction

> **Interaction expedition.** Implement the continuous, physically-plausible transition between expanded and collapsed Mission Studio states. The workspace does not disappear — it dynamically compresses from full height to a persistent sticky toolbar through smooth height interpolation, rail collapse, and header reflow.

**Status:** Completed  
**Kind:** Interaction Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-026 (Workspace Shell), EXP-HOME-027 (Density & Layout)  
**Blocks:** None

---

## Objective

The current collapse implementation toggles CSS classes at discrete scroll thresholds, producing step-function transitions. The target model continuously interpolates between expanded and collapsed states as the user scrolls, with every visual change feeling like a reduction in density rather than a page transition.

---

## Required Change

### Pass 4 — Component Refactor

Rebuild high-impact components on top of the new workspace primitives:

| Component | Expanded State | Collapsed State |
|---|---|---|
| WorkspaceToolbar | Normal header with full content | Compact sticky toolbar (72px) |
| WorkspaceRail | Full labels + dots | Icons only → Hidden |
| WorkspaceHeader | Phase title + step indicator | Inline metadata row |
| ArtifactCard | Full card with body + metadata | Summary row |
| StatusCluster | Chips with full labels | Compact inline chips |
| ConfidenceBar | Full bar with percentage | Inline percentage only |

### Pass 5 — Interaction & Motion

Implement the continuous transition:

1. **Toolbar compression:** Height smoothly interpolates from ~420px to 72px based on scroll progress.
2. **Rail collapse:** Width smoothly transitions from 200px → 48px → 0px using CSS `width` + `transition`.
3. **Header reflow:** Content shifts from expanded layout to inline compact layout.
4. **Smooth height interpolation:** Scroll progress (0.0–1.0) maps to shell height via a CSS custom property (`--collapse-progress`) updated on scroll.
5. **Sticky behavior:** Once collapsed, the toolbar remains sticky at the top of the viewport for the remainder of the page.

No content should disappear abruptly. Every change should be a continuous reduction in density.

### Motion System

```
Duration: tied to scroll velocity, not clock
Easing: linear (scroll-driven)
Properties to animate: height, width, padding, gap, opacity (secondary), border-radius
Properties NOT to animate: transform (except hover), background-color, box-shadow

Timing:
  height: 0–500ms effective (scroll-distance-driven)
  width: sync with height
  opacity: 200ms delay after height begins
```

### Collapse Progress Mapping

```
scrollProgress 0.0–0.5: expanded (full workspace, rail visible)
scrollProgress 0.5–0.7: rail transitions to icons only
scrollProgress 0.7–0.85: rail hidden, content begins compressing
scrollProgress 0.85–1.0: toolbar compresses to 72px sticky bar
scrollProgress >1.0: sticky bar persists at viewport top
```

---

## Deliverables

1. Continuous scroll-driven collapse in `mission-studio-app.js` using `--collapse-progress` CSS custom property.
2. CSS interpolation for all animated properties (height, width, padding, gap, opacity).
3. WorkspaceToolbar expanded → collapsed transition.
4. WorkspaceRail 3-state transition (labels → icons → hidden).
5. WorkspaceHeader reflow from full to inline.
6. Sticky bar persistence after full collapse.
7. Reduced-motion fallback (`prefers-reduced-motion`).

---

## Acceptance Criteria

- Scrolling smoothly compresses the workspace from expanded to sticky toolbar.
- No step-function jumps — every visual change interpolates.
- The rail physically slides under content (width transition), not fades.
- The sticky toolbar spans full width at 72px with no sidebar.
- All content remains accessible in both expanded and collapsed states.
- Reduced-motion mode collapses opacity-only with no height/width animation.
- At no point does content "disappear" — it compresses.
- The sticky toolbar persists at the viewport top for all remaining content.

---

## Out of Scope

- Structural reframe of HTML (EXP-HOME-026).
- Token system expansion (EXP-HOME-027).
- Visual polish or density tightening.

---

## Completion Evidence

- `website/js/mission-studio-app.js` — `handleProgressiveCollapse()` rewritten to set continuous `--collapse-progress` CSS custom property (0.0–1.0) based on scroll position; no discrete state toggling
- `website/styles.css` — `--collapse-progress` driven interpolation: toolbar inner max-height/opacity/padding compress; collapsed bar fades in past 60% progress; rail width interpolates 200→0px; rail label opacity interpolates; `position: sticky` at `top: var(--nav-height)` for toolbar; reduced-motion fallback via `@media (prefers-reduced-motion: reduce)` (opacity-only)
- No step-function transitions — every visual change interpolates continuously
- Sticky bar persists at viewport top after full collapse
- Reduced-motion mode collapses opacity-only with no height/width animation

## Related documents

- `docs/design/lds-002.md`
- `docs/design/homepage-specification.md`
- `docs/expeditions/EXP-HOME-026.md`
- `docs/expeditions/EXP-HOME-027.md`
