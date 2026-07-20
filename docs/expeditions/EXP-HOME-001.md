# EXP-HOME-001 — Mission Studio Design Language (v2)

> **Design expedition.** Define the canonical Mission Studio Design System: the public visual language of SYNTH, not merely a landing page design system.

**Status:** Completed (pending acceptance)  
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

Establish the Mission Studio Design System (LDS-002) as the single, canonical visual language for SYNTH's public-facing presence. This system must govern every color, type, space, motion, elevation, and interaction decision across the homepage and any future Mission Studio surface. It is not a marketing layer; it is the operating-system vocabulary that translates SYNTH's runtime concepts into visible, coherent UI.

---

## Origin Evidence

The current homepage explains SYNTH through static marketing content. There is no unified, portable design language that projects SYNTH's runtime concepts into a cohesive interactive experience. Without a canonical system, each expedition risks inventing local visual decisions, hardcoded values, and inconsistent motion.

A visual design reference was provided to establish tokens, color temperament, typography scale, and overall tone. The reference is not a locked layout specification; Mission Studio layout and component arrangement may evolve per EXP-HOME-002 and EXP-HOME-003.

---

## Required Change

### 1.1 Design philosophy

- **Runtime First:** Every visible component corresponds to a runtime object. Never invent decorative UI.
- **Progressive Disclosure:** Information density increases as the lifecycle progresses.
- **Workspace over Pages:** Everything lives inside one workspace; scrolling changes workspace state.
- **Calm Computing:** Large whitespace, low visual noise, subtle motion, clear hierarchy.
- **Artifact Driven:** Replace chat with artifacts. Everything shown is an object.
- **Themeable by Contract:** Every surface derives from tokens; themes are data, not overrides.

### 1.2 Visual principles

- Semantic color hierarchy: no arbitrary accent colors.
- Contrast discipline: WCAG 2.2 AA as the minimum contrast rule.
- Spatial rhythm: all spacing follows a modular scale derived from tokens.
- Typographic clarity: one sans-serif family for UI, one monospace family for code and runtime labels.
- Motion restraint: opacity and translation only; no springs, no bounces, no decorative flourish.
- Elevation as information: shadow and blur encode layer depth, not decoration.

### 1.3 Engineering-first UX principles

- Components are state machines, not static layouts.
- Every component exposes documented props, events, and accessibility attributes.
- Tokens must be machine-readable and exportable for Figma, Tailwind, and Storybook.
- Default state, loading state, error state, empty state, and completed state are first-class concerns.

### 1.4 Themes

- **Light theme (canonical):** default public presentation; validated for contrast, brand recognition, and readability.
- **Dark theme:** full semantic inversion; not a simple color invert but a re-mapped semantic system.
- Theme switching must be instantaneous and persisted across the session.

### 1.5 Semantic color system

Each SYNTH concept receives a semantic color family:

```text
Genesis       — origin / creation
Mission       — purpose / commitment
Expedition    — execution / work
Evidence      — observation / confidence
Governance    — approval / boundary
Replay        — history / determinism
Knowledge     — graph / domain
Repository    — source / state
Status        — success / warning / error / info / neutral
```

Every color role resolves to a token: foreground, background, border, subtle, muted, emphasis, hover, pressed, focus.

### 1.6 Typography

- Scale for display, heading, body, label, caption, code.
- Line-height ratios per role.
- Weight mapping: regular, medium, semibold, bold, mono.
- Letter-spacing for display and code roles.

### 1.7 Iconography

- Monoline icon set.
- Icons map to SYNTH concepts and component states.
- Sizing derived from typography scale.
- Every icon has an accessible label and a textual fallback.

### 1.8 Elevation

- Layer model: surface, raised, sticky, overlay, modal.
- Shadow tokens for y-offset, blur, spread, color, opacity.
- Backdrop blur tokens for translucent layers.

### 1.9 Motion

- Durations: instant (0ms), fast (150ms), normal (250ms), slow (350ms), deliberate (500ms).
- Easings: linear, ease-out, ease-in-out, emphasized.
- Primitives: fade, translate, scale, height, color.
- Reduced-motion mode must collapse motion to instant or opacity-only.

### 1.10 Grid

- Baseline grid: 4px or 8px base unit.
- Breakpoints: compact, medium, expanded, wide.
- Container constraints for Mission Studio workspace and sidebar.
- Responsive rules for collapsing, stacking, and scaling.

### 1.11 Responsive rules

- Sidebar collapses to a rail or drawer below the expanded breakpoint.
- Workspace maintains minimum usable width across all breakpoints.
- Sticky behavior degrades gracefully on short viewports.
- Touch targets meet minimum size across devices.

### 1.12 Foundation tokens

The token system must cover:

| Domain       | Examples |
|--------------|----------|
| Color        | semantic, brand, neutral, status, surface, text, border |
| Typography   | family, size, weight, line-height, letter-spacing |
| Spacing      | scale, inset, stack, inline, gap, padding, margin |
| Radius       | none, small, medium, large, pill, full |
| Elevation    | shadow, blur, layer, z-index |
| Motion       | duration, easing, stagger, delay |
| Duration     | named durations referenced by motion tokens |
| Opacity      | disabled, hover, pressed, backdrop, scrim |
| Blur         | none, small, medium, large |
| Borders      | width, color, style, dashed |
| Focus        | ring width, ring offset, ring color, outline style |
| Semantic Status | success, warning, error, info, neutral, pending, active, completed |

### 1.13 Homepage-specific tokens

Introduce tokens for Mission Studio surfaces:

```text
Workspace
Mission Window
Sticky Workspace
Scroll Sections
Sidebar Progress
Artifact Cards
Replay Timeline
Mission Header
Governance Status
Repository Status
```

Each surface has tokens for background, foreground, border, elevation, active state, hover state, disabled state, and focus state.

---

## Deliverables

1. **Mission Studio Design System** document under `docs/design/lds-002.md`.
2. **Foundation token specification** (Color, Typography, Spacing, Radius, Elevation, Motion, Duration, Opacity, Blur, Borders, Focus, Semantic Status).
3. **Homepage-specific token specification** for Mission Studio surfaces.
4. **Component taxonomy** mapping each component to a SYNTH concept and token set.
5. **Design principles checklist** for reviewing future Mission Studio work.
6. **Token export artifacts** for Figma variables, Tailwind config, and Storybook theming.
   - `website/tokens.json` — canonical machine-readable token source (light + dark themes).
   - `website/tailwind.config.js` — Tailwind re-export of `tokens.json`.
   - `website/styles.css` — runtime CSS variables derived from `tokens.json`.
7. **Theme switch specification** and reduced-motion policy.

---

## Acceptance Criteria

- Every homepage component derives exclusively from documented tokens.
- No hardcoded values exist in component source; all values resolve through tokens.
- Light and dark themes are fully specified and switchable without layout shift.
- Token export is available for Figma, Tailwind, and Storybook from a single source of truth.
- Motion tokens support reduced-motion and instantaneous fallback.
- Typography scale supports all heading, body, label, caption, and code roles.
- Semantic color system covers every SYNTH concept listed in this charter.
- Accessibility contrast targets are met or exceeded for both themes.
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

## Related documents

- `docs/design/lds-002.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-HOME-002.md`
- `docs/expeditions/EXP-HOME-013.md`
