# Mission Studio Homepage Specification

> **Canonical specification for the SYNTH homepage under EXP-PROGRAM-027 v2.** Mission Studio is the homepage; everything else is supporting content.

---

## Principle

The SYNTH homepage is not a marketing page with a demo attached. It is a production-quality Mission Studio experience embedded in a scroll-driven page. Visitors do not read about SYNTH — they use it.

---

## Homepage structure

```text
Section 0 — Hero
  Logo
  Tagline
  Primary CTA
  Install command
  Entry point into Mission Studio

Section 1 — Mission Studio (sticky)
  Header
  Sidebar
  Workspace
  Footer

Section 2 — Mission Lifecycle (scroll-driven)
  Intent
  Discovery
  Mission
  Expeditions
  Governance
  Replay
  Architecture
  Repository Summary

Section 3 — Supporting Content (after Mission Studio releases)
  Capabilities
  Examples
  Documentation
  Open Source
  Community
  Footer
```

---

## Section 0 — Hero

The hero is brief. Its only job is to orient the visitor and invite them into Mission Studio.

### Elements

- **Logo** — links to top of page.
- **Tagline** — "Humans explore. SYNTH remembers. AI executes deterministically."
- **Primary CTA** — "Try Mission Studio" or "Experience SYNTH"; scrolls to Mission Studio.
- **Install command** — `curl -fsSL https://synth-framework.github.io/synth/install.sh | sh`
- **Secondary link** — View on GitHub.

### Behavior

- Hero occupies full viewport height.
- Scrolling past the hero triggers Mission Studio to enter.
- No parallax or heavy animation.

---

## Section 1 — Mission Studio

Mission Studio is a persistent application shell that becomes sticky and remains pinned until the lifecycle completes.

### Shell

```text
+-----------------------------+
| Header                      |
+-----------------------------+
| Sidebar | Workspace         |
|         |                   |
|         |                   |
+-----------------------------+
| Footer (status bar)         |
+-----------------------------+
```

### Header

- Logo / wordmark
- Current phase label
- Governance status badge
- Documentation link

### Sidebar

- Vertical phase list
- Current phase highlighted
- Completed phases show checkmark
- Future phases muted
- Progress indicator

### Workspace

- Hosts phase-specific content
- Artifact cards appear here
- Replay timeline appears here
- Governance visualization appears here

### Footer / Status Bar

- Replay status
- Governance status
- Evidence count / confidence
- Runtime readiness
- Current state hash (during Replay)

---

## Section 2 — Mission Lifecycle

Scroll progress through this section drives the Mission Studio state machine. The workspace remains sticky; only its internal state changes.

### Phases

| Phase | Workspace Content | Sidebar Highlight | Status Message |
|---|---|---|---|
| Intent | Intent input + source selector + examples | Intent | Waiting for intent |
| Discovery | Discovery artifact + unknowns list | Discovery | Analyzing |
| Mission | Mission proposal artifact | Mission | Mission proposed |
| Expeditions | Expedition proposal cards | Expeditions | Expeditions ready |
| Governance | Before/after governance comparison | Governance | Governed |
| Replay | Replay timeline + scrubber | Replay | Replay available |
| Architecture | Layered architecture diagram | Architecture | Architecture projected |
| Repository Summary | Repository status summary | Repository | Repository ready |

### Scroll behavior

- Each phase occupies a scroll segment of equal height.
- Workspace pins at the top of Section 2.
- Scroll progress maps to phase index.
- Visitor can also click sidebar phases to jump.
- Reverse scrolling moves to previous phases.

### Animations

- Phase transitions use crossfade + subtle slide.
- Artifact cards enter with staggered delay.
- Sidebar highlight animates to new phase.
- Reduced motion disables transitions.

---

## Section 3 — Supporting Content

Mission Studio releases (unpins) after Repository Summary completes. The remaining page scrolls normally.

### Sections

1. **Capabilities** — grid of SYNTH capabilities, including adapters.
2. **Examples** — certified example projects.
3. **Documentation** — links to canonical guides and references.
4. **Open Source** — repository link and contribution info.
5. **Community** — ways to engage.
6. **Footer** — copyright, license, governance model link.

### Behavior

- No sticky behavior.
- Standard responsive grid.
- Lazy-load below-fold images if any.

---

## Mission Studio State Machine

```text
Idle
  ↓  trigger: hero scrolled out / CTA clicked
Intent
  ↓  trigger: visitor enters intent or selects example
Discovery
  ↓  trigger: discovery artifacts generated
Mission
  ↓  trigger: mission proposal generated
Expeditions
  ↓  trigger: expeditions proposed
Governance
  ↓  trigger: governance state visualized
Replay
  ↓  trigger: replay timeline shown
Architecture
  ↓  trigger: architecture diagram shown
Repository Summary
  ↓  trigger: repository summary shown
Complete
  ↓  trigger: Mission Studio releases
Supporting Content
```

### State definitions

Every state defines:

- **Purpose** — what the visitor learns in this phase.
- **Displayed artifacts** — which Artifact Cards are visible.
- **Sidebar state** — which phases are past/current/future.
- **Header state** — phase label, governance badge.
- **Status badges** — footer status messages.
- **Commands** — available actions (e.g., "Advance", "Show Replay").
- **Timeline** — replay or phase timeline position.
- **Animation** — how the transition looks.
- **Scroll transition** — how scroll maps to this state.
- **Accessibility** — screen reader announcements, focus management.
- **Runtime events** — which sample events correspond to this state.

---

## Sticky behavior

### Sticky start

Mission Studio becomes sticky when its top edge reaches the viewport top, as the visitor scrolls out of the Hero.

### Sticky release

Mission Studio releases when Repository Summary completes and the visitor scrolls into Supporting Content.

### Performance

- Use CSS `position: sticky` where possible.
- Avoid JavaScript scroll listeners for pinning.
- Use `IntersectionObserver` for sticky threshold detection if needed.

---

## Responsive behavior

### Desktop (>1024px)

- Full three-panel layout: sidebar, workspace, status bar.

### Tablet (768–1024px)

- Sidebar collapses to a compact horizontal stepper above the workspace.
- Workspace remains sticky.

### Mobile (<768px)

- Sidebar becomes a bottom sheet or hideable drawer.
- Workspace stacks vertically.
- Status bar remains visible.

---

## Accessibility

- Skip link to main content.
- Focus-visible styles on all interactive elements.
- Screen reader live region announces phase changes.
- Keyboard navigation: Tab through controls, Enter to activate, Arrow keys for replay scrubber.
- `prefers-reduced-motion` disables phase transitions.
- Color contrast meets WCAG 2.2 AA.

---

## Performance budgets

| Metric | Budget |
|---|---|
| First Contentful Paint | ≤ 1.2 s |
| Largest Contentful Paint | ≤ 2.5 s |
| Total Blocking Time | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Scroll animation frame rate | 60 fps |

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](../expeditions/EXP-PROGRAM-027.md)
- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Mission Workspace Specification](mission-workspace.md)
- [Artifact System Specification](artifact-system.md)
- [Motion System Specification](motion-system.md)
- [Performance Specification](performance.md)
- [Accessibility Specification](accessibility.md)
