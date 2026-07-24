# EXP-HOME-025 — Mission Studio Design Governance (v3)

> **Design governance expedition.** Ensure every homepage implementation conforms to the canonical Mission Studio visual language rather than defaulting to generic dashboard or component-library aesthetics.

**Status:** Completed  
**Kind:** Design Governance Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language v3), EXP-HOME-002 (Mission Studio Component Catalog v3)  
**Blocks:** EXP-HOME-015 (Production Certification)

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

Prevent the homepage from drifting into generic developer-dashboard aesthetics. Mission Studio is the primitive of SYNTH's public interface; every visual decision must be evaluated against the complete Mission Studio workspace, not against isolated widgets. The v3 design establishes progressive collapse as the canonical behavior — Mission Studio does not disappear, it compresses into a sticky contextual bar.

---

## Origin Evidence

Initial implementation produced technically correct components that nevertheless felt like GitHub, Radix, or VS Code panels: small cards, dense labels, border-only semantic colors, and a component catalog organized around buttons and inputs. The accepted design direction is closer to Linear, Notion, Apple, or Raycast: document-like artifacts, whitespace as structure, semantic color applied to surfaces and progress, and a layout hierarchy rooted in Mission Studio itself. Design boards at `docs/design/boards/` establish the visual reference.

---

## Required Change

### 1.1 Invert the design system hierarchy

From:

```text
Tokens → Components → Pages
```

To:

```text
Mission Studio
  ↓
Workspace
  ↓
Artifacts
  ↓
Interactions
  ↓
Primitives
```

Buttons, inputs, and badges become derived concerns, not top-level definitions.

### 1.2 Define Mission Studio visual grammar

- **Mission Studio** is a persistent application shell, not a page component.
- **Workspace** is the primary container: header, sidebar, artifact surface, footer.
- **Artifacts** are document-like, large, calm, and readable. Colored left border (3px) matching semantic concept.
- **Sidebar** communicates lifecycle progress via dots (✓ completed, ● active, ○ pending), not navigation links.
- **Semantic color** is applied to surfaces, progress indicators, and status chips — not only borders.
- **Typography** uses Inter at Apple-like scale: hero 56px, H1 40px, H2 32px, H3 24px, body 16px.
- **Whitespace** is part of the information architecture. Never compress spacing.
- **Progressive collapse** is the defining behavior. Nothing disappears; everything transforms.

### 1.3 Progressive collapse rules

Mission Studio transitions through 6 states as the user scrolls:

```text
Immersive (100vh)
  → Replay (100vh, last full state)
  → Begin Collapse (~75vh, sidebar narrows)
  → Compact (~50vh, icons only)
  → Sidebar Retracted (~40vh, sidebar gone)
  → Sticky Bar (72px, always visible)
```

Governance rules for collapse:
- Sidebar must retract physically (slide under content), not fade abruptly.
- Content must compress through clear stages: full cards → summary → inline metadata.
- The sticky bar must contain only mission context: logo, mission name, status chips, Open Workspace button.
- No sidebar in the sticky bar state.
- Height transitions must be smooth over 300–500ms scroll distance.

### 1.4 Artifact composition rules

Every artifact must feel closer to a document than a widget:

- Clear artifact kind label (uppercase, muted, small).
- Large, scannable title.
- Measured confidence or status.
- Grouped metadata.
- Distinct colored left border (3px) matching semantic concept.
- No arbitrary decorative elements.
- Generous padding inside cards (24px).

### 1.5 Sidebar lifecycle semantics

Sidebar entries communicate:

```text
✓ Intent        (past — green dot)
● Discovery     (active — blue dot)
○ Mission       (pending — empty dot)
○ Expeditions
○ Governance
○ Replay
```

Not:

```text
• Link
• Link
• Link
```

### 1.6 Color application rules

Each SYNTH concept receives a full color family:

| Concept | Main Color | Surface Role |
|---|---|---|
| Intent | Blue (#3B82F6) | Origin / creation |
| Discovery | Teal (#14B8A6) | Understanding / analysis |
| Mission | Purple (#8B5CF6) | Purpose / commitment |
| Expedition | Indigo (#6366F1) | Work / execution |
| Governance | Green (#10B981) | Approval / boundary |
| Replay | Violet (#7C3AED) | History / determinism |

Colors are applied as left borders on cards, status chip backgrounds, sidebar dot fills, and progress indicators. Light theme only — no dark variant required.

### 1.7 Density and whitespace ratios

- Workspace panels breathe; avoid compressed spacing.
- Artifact cards use 24px padding with 16px border radius.
- Status metadata is grouped and aligned.
- Mobile preserves calmness through stacking, not crowding.
- After collapse, the sticky bar is 72px tall — the only compressed element.

### 1.8 Storybook as Design Reference

The Storybook becomes:

```text
Mission Studio
  Immersive State
  Collapse States
  Sticky Bar
Workspace
  Sidebar States
  Phase Lifecycle
Artifact Catalog
  All Card Kinds
  Collapse Morph
Typography
Tokens
```

Not a disconnected grid of buttons and cards. Every component must be shown in its Mission Studio context.

---

## Deliverables

1. **Mission Studio visual grammar** documented in `docs/design/lds-002.md` (v3).
2. **Layout hierarchy rules** for Mission Studio, Workspace, Artifacts, Interactions, and Primitives.
3. **Progressive collapse specification** documenting the 6-state transition.
4. **Artifact composition rules** with semantic color mapping per concept.
5. **Typography hierarchy** and density guidelines (Inter, Apple-like scale).
6. **Whitespace ratios** and responsive behavior.
7. **Sidebar retraction specification** (physical slide, not fade).
8. **Storybook conformance checklist** ensuring components are shown in Mission Studio context.
9. **Visual regression baselines** against canonical design boards.

---

## Acceptance Criteria

- Every UI surface can be traced to the canonical Mission Studio design boards.
- No generic dashboard components exist unless explicitly specified.
- Components are evaluated in the context of the complete Mission Studio workspace, not in isolation.
- The progressive collapse produces 6 distinct, smooth states from immersive to sticky bar.
- The sidebar retracts physically through 3 stages (full → icons → removed).
- The sticky bar is 72px, spans full width, contains no sidebar.
- Storybook renders the Mission Studio Design Reference, not merely a collection of disconnected components.
- Semantic color is applied structurally (left borders, chip fills, dot fills), not only as thin borders.
- Artifacts feel document-like: large, calm, purposeful.
- Sidebar communicates lifecycle progress via dots (✓ ● ○).
- Typography and whitespace match the accepted high-quality reference (Apple / Linear / Notion).
- Light theme only. No dark theme artifacts exist.

---

## Out of Scope

- New runtime functionality.
- New homepage sections outside Mission Studio.
- Real AI model integration.

---

## Success Criteria

The expedition succeeds when a reviewer can open the Storybook and immediately recognize it as Mission Studio, not as a generic component catalog, when the progressive collapse feels physically continuous, and when every visual element can be justified by the Mission Studio visual grammar.

---

## Completion Evidence

| Deliverable | Status | Evidence |
|---|---|---|
| Visual grammar | ✅ Complete | `docs/design/lds-002.md` — Mission Studio visual grammar |
| Layout hierarchy | ✅ Complete | Workspace shell → Sidebar → Artifact surface → Footer |
| Progressive collapse | ✅ Complete | 6-state scroll-driven collapse in `mission-studio-app.js` |
| Artifact composition | ✅ Complete | Document-like cards with colored left border, generous padding |
| Typography hierarchy | ✅ Complete | Inter at Apple-like scale, no hardcoded font values |
| Sidebar retraction | ✅ Complete | Physical slide via CSS width transition (200px → 48px → 0px) |
| Light-only conformance | ✅ Complete | No dark theme code anywhere in source |
| Semantic color application | ✅ Complete | Colors on borders, chip fills, dot fills — structural, not decorative |
| Lifecycle dots (✓ ● ○) | ✅ Complete | Sidebar uses past/active/future dot states |
| Sticky bar 72px | ✅ Complete | `ms-sticky-bar` — fixed, full width, no sidebar |
| No generic dashboard | ✅ Complete | All components map to SYNTH runtime concepts |
| Card gradient border verification | ✅ Complete | `::before` pseudo-element gradients match design boards |
| Pipeline pill encapsulation | ✅ Complete | `border-radius: 100px`, structured box with `box-shadow`, hover lift |
| Pipeline active/hover states | ✅ Complete | `transform: translateY(-1px)`, border color darkens on hover |

## Related documents

- `docs/design/lds-002.md`
- `docs/design/homepage-specification.md`
- `docs/design/genesis-experience.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-002.md`
- `docs/expeditions/EXP-HOME-015.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
