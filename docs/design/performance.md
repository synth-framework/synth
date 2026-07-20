# Performance Specification

> **Specification for homepage performance budgets, loading strategy, and runtime optimization under EXP-HOME-012.**

---

## Purpose

Ensure the Mission Studio Homepage loads quickly, stays responsive during interactions, and remains smooth on slower devices and networks.

---

## Performance budgets

| Metric | Budget | Measurement |
|---|---|---|
| First Contentful Paint (FCP) | ≤ 1.2 s | Lighthouse / Web Vitals |
| Largest Contentful Paint (LCP) | ≤ 2.5 s | Lighthouse / Web Vitals |
| Total Blocking Time (TBT) | ≤ 200 ms | Lighthouse |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | Lighthouse / Web Vitals |
| Time to Interactive (TTI) | ≤ 3.5 s | Lighthouse |
| Lighthouse Performance score | ≥ 90 | Desktop and mobile |
| Animation frame rate | 60 fps | Chrome DevTools FPS meter |

---

## Loading strategy

### Critical rendering path

- Inline critical CSS for above-the-fold content in the HTML response.
- Preload the primary font files and hero wordmark asset.
- Defer non-critical JavaScript until after First Contentful Paint.
- Load workspace scripts asynchronously once the intent surface enters the viewport.

### Resource priorities

| Resource | Priority | Strategy |
|---|---|---|
| Critical CSS | Highest | Inline |
| Fonts | High | `preload` + `font-display: swap` |
| Hero wordmark | High | Eager load or inline SVG |
| Workspace shell | Medium | Load after critical path |
| Below-the-fold sections | Low | Lazy load via intersection observer |
| Replay timeline data | Low | Fetch on demand |

### Lazy loading

- Below-the-fold capability grid, architecture explorer, and documentation links load only when scrolled into view.
- Replay sample event log is fetched after the workspace reaches the Replay state.
- Off-screen images use native lazy loading.

---

## Runtime performance

### Animation

- All animations use `requestAnimationFrame` or CSS transforms.
- No layout-triggering properties are animated.
- `will-change` is applied only during active animations and removed afterward.

### Layout

- Workspace panels use CSS Grid / Flexbox with stable dimensions.
- Artifact card expansions reserve space or use transform scaling to avoid reflow.
- Status bar height is fixed.

### Script execution

- Genesis demo logic is chunked and yields to the main thread.
- Event handlers are throttled or debounced where appropriate.
- Long computations are broken into smaller frames.

### Memory

- Discard off-screen phase content when it leaves the viewport.
- Limit the Replay sample log to a curated, bounded set of events.
- Reuse Artifact Card instances where possible.

---

## Asset optimization

- Icons are inlined as SVG or loaded from a single optimized sprite.
- Images are compressed and served in modern formats where appropriate.
- JavaScript and CSS are minified and tree-shaken.
- No unused design tokens or component variants are shipped.

---

## Monitoring

- Lighthouse CI runs on every pull request that touches `website/`.
- Core Web Vitals are measured on the production homepage monthly.
- Performance budgets are enforced as CI checks; regression causes build failure.

---

## Acceptance criteria

- Lighthouse performance score is 90 or above on desktop and mobile.
- FCP, LCP, TBT, and CLS meet documented budgets.
- Animations remain at 60 fps during workspace transitions.
- No layout shift occurs when artifacts appear or expand.
- Reduced-motion preference does not degrade performance.

---

## Out of scope

- Motion system details (EXP-HOME-013).
- Accessibility audit (EXP-HOME-011).
- Responsive breakpoints (EXP-HOME-010).

---

## Related documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Motion System Specification](motion-system.md)
- [Responsive Implementation Specification](responsive-implementation.md)
- [EXP-HOME-012 — Performance](../expeditions/EXP-HOME-012.md)
