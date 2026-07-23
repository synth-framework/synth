# EXP-HOME-001 — Mission Studio Design Language (v3)

> **Design expedition.** Define the canonical Mission Studio Design System: the public visual language of SYNTH, not merely a landing page design system.

**Status:** Completed  
**Kind:** Design Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** none  
**Blocks:** EXP-HOME-002, EXP-HOME-003, EXP-HOME-013

> **Specification:** See [`docs/design/lds-002.md`](../design/lds-002.md).

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

Establish the Mission Studio Design System (LDS-002 v3) as the single, canonical visual language for SYNTH's public-facing presence. This system must govern every color, type, space, motion, elevation, and interaction decision across the homepage and any future Mission Studio surface. It is not a marketing layer; it is the operating-system vocabulary that translates SYNTH's runtime concepts into visible, coherent UI.

---

## Origin Evidence

The current homepage explains SYNTH through static marketing content. There is no unified, portable design language that projects SYNTH's runtime concepts into a cohesive interactive experience. Without a canonical system, each expedition risks inventing local visual decisions, hardcoded values, and inconsistent motion.

Design boards at `docs/design/boards/` establish the intended visual direction: document-like artifacts, semantic color applied to surfaces, lifecycle sidebar, and a calm, Apple/Linear/Notion-inspired aesthetic.

---

## Required Change

### 1.1 UX Principles

- **The user never leaves the application.** No visual breakpoint where "homepage ends."
- **Context is never lost.** Mission, Status, Replay, and Governance always remain available.
- **Scrolling changes density, not hierarchy.** Expanded → Condensed → Persistent. The information hierarchy stays the same; only the interface density changes.
- **Every state is the same interface.** Not three pages. One interface interpolated through scroll progress.
- **Nothing disappears. Everything transforms.** Mission Studio compresses into a sticky bar rather than vanishing.

### 1.2 Design philosophy

- **Runtime First:** Every visible component corresponds to a runtime object. Never invent decorative UI.
- **Progressive Disclosure:** Information density increases as the lifecycle progresses.
- **Workspace over Pages:** Everything lives inside one workspace; scrolling changes workspace state.
- **Calm Computing:** Large whitespace, low visual noise, subtle motion, clear hierarchy.
- **Artifact Driven:** Replace chat with artifacts. Everything shown is an object.
- **Themeable by Contract:** Every surface derives from tokens. Light theme only.

### 1.3 Visual principles

- Semantic color hierarchy: no arbitrary accent colors.
- Contrast discipline: WCAG 2.2 AA as the minimum contrast rule.
- Spatial rhythm: all spacing follows a modular scale derived from tokens (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Typographic clarity: Inter for UI, JetBrains Mono for code and runtime labels.
- Motion restraint: opacity, scale, translate, height, radius, padding only; no springs, no bounces, no decorative flourish.
- Elevation as information: 4-level soft shadow system, no hard Material Design shadows.
- Radius: cards 16px, inputs/buttons 12px, dialogs 24px, workspace shell 24px.

### 1.4 Theme

- **Light theme only.** Dark theme is removed. Tokens are designed for white/light backgrounds with semantic colors applied as surface fills, not just borders.

### 1.5 Semantic color system

Each SYNTH concept receives a semantic color family:

```text
Intent       — Blue     (#3B82F6)
Discovery    — Teal     (#14B8A6)
Mission      — Purple   (#8B5CF6)
Expedition   — Indigo   (#6366F1)
Governance   — Green    (#10B981)
Replay       — Violet   (#7C3AED)
Warning      — Orange   (#F59E0B)
Danger       — Red      (#EF4444)
```

Every color role resolves to a token: main, soft (light background), bg (page background), text.

### 1.6 Typography

Typeface: Inter (sans-serif), JetBrains Mono (monospace).

| Role | Size | Weight |
|---|---|---|
| Hero | 3.5rem / 56px | 700 |
| H1 | 2.5rem / 40px | 700 |
| H2 | 2rem / 32px | 700 |
| H3 | 1.5rem / 24px | 600 |
| Body | 1rem / 16px | 400 |
| Caption | 0.875rem / 14px | 400-500 |
| Small | 0.75rem / 12px | 500 |

Generous spacing. Editorial rhythm. Apple-like scale.

### 1.7 Iconography

- Monoline icon set.
- Icons map to SYNTH concepts and component states.
- Sizing derived from typography scale.
- Every icon has an accessible label and a textual fallback.

### 1.8 Elevation

Four levels only:

| Level | Shadow | Usage |
|---|---|---|
| 1 | `0 1px 3px rgba(0,0,0,0.04)` | Cards |
| 2 | `0 4px 12px rgba(0,0,0,0.06)` | Dialogs |
| 3 | `0 8px 24px rgba(0,0,0,0.08)` | Floating |
| 4 | `0 16px 48px rgba(0,0,0,0.10)` | Navigation |

Soft shadows. No hard Material Design shadows.

### 1.9 Motion

Durations: fast (150ms), base (250ms), slow (400ms), collapse (500ms).

Easings:
- `--easing-out`: `cubic-bezier(0.16, 1, 0.3, 1)` — Apple-like, snappy
- `--easing-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)` — smooth
- `--easing-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — springy pop

Use: opacity, scale, translate, height, radius, padding.
Avoid: instant disappearance, hard cuts, opacity-only transitions.
Prefer: FLIP animations, shared element transitions, morphing layouts.

Reduced-motion mode must collapse motion to instant or opacity-only.

### 1.10 Progressive Collapse

Mission Studio does not disappear when scrolled past. It compresses through six states driven by scroll progress:

| State | Height | Sidebar | Content |
|---|---|---|---|
| 01 — Immersive | 100vh | Full labels + dots | Full cards, form inputs |
| 02 — Replay | 100vh | Full (✓ completed) | Timeline + evidence |
| 03 — Begin Collapse | ~75vh | Narrower | Summary cards |
| 04 — Compact | ~50vh | Icons only | Single row summary |
| 05 — Sidebar Retracted | ~40vh | Removed | Metadata row |
| 06 — Sticky Bar | 72px | None | Inline chips |

The sidebar retracts physically (slides under content). Content compresses from full forms to compact summary to inline metadata. The sticky bar remains at the viewport top throughout the remainder of the page.

### 1.11 Grid

- Baseline grid: 4px base unit.
- Breakpoints: 1024px (desktop), 768px (tablet), below (mobile).
- Container constraints for Mission Studio workspace and sidebar.

### 1.12 Responsive rules

- Desktop: full three-panel (sidebar 200px + workspace + footer), labels visible.
- Tablet: sidebar icons only (labels hidden), 2-column grids.
- Mobile: sidebar hidden, single column, full-width grids.

### 1.13 Foundation tokens

The token system must cover:

| Domain | Examples |
|---|---|
| Color | semantic, surface, text, border |
| Typography | family, size, weight, line-height |
| Spacing | scale (4/8/12/16/24/32/48/64/96) |
| Radius | sm (8px), md (12px), lg (16px), xl (24px), full |
| Elevation | 4 levels (1–4) |
| Motion | duration, easing, collapse duration |
| Semantic Status | success, warning, danger |

### 1.14 Homepage-specific tokens

Introduce tokens for Mission Studio surfaces:

```text
Workspace
Mission Header
Sidebar (expanded / compact / hidden)
Sticky Workspace Bar (72px)
Artifact Cards
Replay Timeline
Phase Progress Dots
Status Chips
```

Each surface has tokens for background, foreground, border, elevation, active state, hover state, disabled state, and focus state.

---

## Deliverables

1. **Mission Studio Design System** document under `docs/design/lds-002.md` (v3).
2. **Foundation token specification** (Color, Typography, Spacing, Radius, Elevation, Motion, Semantic Status).
3. **Homepage-specific token specification** for Mission Studio surfaces including collapse states.
4. **Component taxonomy** mapping each component to a SYNTH concept and token set.
5. **Design principles checklist** for reviewing future Mission Studio work.
6. **Token export artifacts:**
   - `website/tokens.json` — canonical machine-readable token source (light only).
   - `website/styles.css` — runtime CSS variables derived from `tokens.json`.
7. **Progressive collapse specification** documenting the 6-state scroll-driven transition.

---

## Acceptance Criteria

- Every homepage component derives exclusively from documented tokens.
- No hardcoded values exist in component source; all values resolve through tokens.
- Token export is available from a single source of truth.
- Motion tokens support reduced-motion and instantaneous fallback.
- Typography scale supports all hero, heading, body, caption, and code roles (size 56, 40, 32, 24, 16, 14, 12).
- Semantic color system covers every SYNTH concept listed in this charter.
- Accessibility contrast targets are met or exceeded (WCAG 2.2 AA).
- The progressive collapse produces 6 distinct states from immersive to sticky bar.
- Foundation tokens are comprehensive enough to rebuild any Mission Studio surface without inventing new values.

---

## Out of Scope

- Mission Studio component implementation (EXP-HOME-002).
- Mission Studio UI specification (EXP-HOME-003).
- Homepage / Mission Studio integration (EXP-HOME-004).
- Motion choreography details (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when designers and engineers can build any Mission Studio or homepage element from the token system without inventing new visual language, and when every token is traceable to a SYNTH concept or a foundational design decision.

---

## Completion Evidence

| Deliverable | Status | Evidence |
|---|---|---|
| LDS-002 v3 design document | ✅ Complete | `docs/design/lds-002.md` |
| Token specification | ✅ Complete | `website/tokens.json` v3.0.0 |
| CSS variables from tokens | ✅ Complete | `website/styles.css` — light-only, Inter, semantic palette |
| Progressive collapse spec | ✅ Complete | `docs/design/lds-002.md` section 1.10 |
| Design principles checklist | ✅ Complete | `docs/expeditions/EXP-HOME-001.md` section 1.1–1.14 |
| Semantic color system | ✅ Complete | 8 semantic families (Intent–Danger) with main/soft/bg/text per color |
| Typography scale | ✅ Complete | Inter at Apple-like scale (56px–12px), JetBrains Mono for code |
| Motion tokens | ✅ Complete | 3 durations, 3 easings, 6-state collapse duration: 500ms |
| Light-only theme | ✅ Complete | No dark theme CSS or JS in any source file |
| All cards test pass | ✅ Complete | `node website/js/components.test.js` — 9/9 pass |
| Hero typography refinement | ✅ Complete | 52px heading, 17px lead text, tightened letter-spacing |
| CTA button specification | ✅ Complete | 12px radius, `#D1D5DB` border, `0 1px 2px` shadow, hover darkening |
| Card gradient borders | ✅ Complete | `::before` pseudo-element with `linear-gradient(180deg, color → 20% transparent)` |
| Pipeline pill component spec | ✅ Complete | 100px border-radius, structured container with shadow, hover lift |

## Related documents

- `docs/design/lds-002.md`
- `docs/design/homepage-specification.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-HOME-002.md`
- `docs/expeditions/EXP-HOME-013.md`
