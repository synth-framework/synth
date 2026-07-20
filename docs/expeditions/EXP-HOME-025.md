# EXP-HOME-025 — Mission Studio Design Governance

> **Design governance expedition.** Ensure every homepage implementation conforms to the canonical Mission Studio visual language rather than defaulting to generic dashboard or component-library aesthetics.

**Status:** Executing  
**Kind:** Design Governance Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language), EXP-HOME-002 (Mission Studio Component Catalog)  
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

Prevent the homepage from drifting into generic developer-dashboard aesthetics. Mission Studio is the primitive of SYNTH's public interface; every visual decision must be evaluated against the complete Mission Studio workspace, not against isolated widgets.

---

## Origin Evidence

Initial implementation produced technically correct components that nevertheless felt like GitHub, Radix, or VS Code panels: small cards, dense labels, border-only semantic colors, and a component catalog organized around buttons and inputs. The accepted design direction is closer to Linear, Notion, Apple, or Raycast: document-like artifacts, whitespace as structure, semantic color applied to surfaces and progress, and a layout hierarchy rooted in Mission Studio itself.

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

- **Workspace** is the primary container: header, sidebar, artifact surface, footer.
- **Artifacts** are document-like, large, calm, and readable.
- **Sidebar** communicates lifecycle progress, not navigation.
- **Semantic color** is applied to surfaces, icons, progress indicators, and active states — not only borders.
- **Typography** follows an Apple-like scale: large headings, comfortable line height, low visual density.
- **Whitespace** is part of the information architecture.

### 1.3 Artifact composition rules

Every artifact must feel closer to a document than a widget:

- Clear artifact kind label.
- Large, scannable title.
- Measured confidence or status.
- Grouped metadata.
- Distinct semantic surface color.
- No arbitrary decorative elements.

### 1.4 Sidebar lifecycle semantics

Sidebar entries communicate:

```text
✓ Completed
● Active
○ Pending
```

Not:

```text
• Link
• Link
• Link
```

### 1.5 Color application rules

Each SYNTH concept receives a full color family:

- Surface background (subtle)
- Surface background (active)
- Icon
- Progress indicator
- Border
- Text emphasis

Examples:

- **Intent** — blue surface, blue icon, blue progress.
- **Replay** — purple timeline, purple badge, purple active state.
- **Governance** — green completion, green evidence, green status.

### 1.6 Density and whitespace ratios

- Workspace panels breathe; avoid compressed spacing.
- Artifact cards use generous padding and clear separation.
- Status metadata is grouped and aligned.
- Mobile preserves calmness through stacking, not crowding.

### 1.7 Storybook as Design Reference

The Storybook becomes:

```text
Workspace
Workspace States
Sidebar States
Mission Lifecycle
Artifact Catalog
Interactions
Motion
Typography
Tokens
```

Not a disconnected grid of buttons and cards.

---

## Deliverables

1. **Mission Studio visual grammar** documented in `docs/design/lds-002.md`.
2. **Layout hierarchy rules** for Mission Studio, Workspace, Artifacts, Interactions, and Primitives.
3. **Artifact composition rules** with before/after examples.
4. **Semantic color application rules** per SYNTH concept.
5. **Typography hierarchy** and density guidelines.
6. **Whitespace ratios** and responsive behavior.
7. **Iconography rules** and interaction principles.
8. **Storybook conformance checklist** ensuring components are shown in Mission Studio context.
9. **Visual regression baselines** against canonical design boards.

---

## Acceptance Criteria

- Every UI surface can be traced to the canonical Mission Studio design boards.
- No generic dashboard components exist unless explicitly specified.
- Components are evaluated in the context of the complete Mission Studio workspace, not in isolation.
- Storybook renders the Mission Studio Design Reference, not merely a collection of disconnected components.
- Semantic color is applied structurally, not only as borders.
- Artifacts feel document-like: large, calm, purposeful.
- Sidebar communicates lifecycle progress.
- Typography and whitespace match the accepted high-quality reference.

---

## Out of Scope

- New runtime functionality.
- New homepage sections outside Mission Studio.
- Real AI model integration.

---

## Success Criteria

The expedition succeeds when a reviewer can open the Storybook and immediately recognize it as Mission Studio, not as a generic component catalog, and when every visual element can be justified by the Mission Studio visual grammar.

---

## Related documents

- `docs/design/lds-002.md`
- `docs/design/genesis-experience.md`
- `docs/design/homepage-specification.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-002.md`
- `docs/expeditions/EXP-HOME-015.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
