# EXP-HOME-027 — Density & Layout System

> **Design system expedition.** Replace ad hoc spacing with canonical layout primitives, adopt a 12-column grid, standardize density tokens, and expand the token system with workspace/density/surface groups. Every visual value must come from tokens rather than hard-coded numbers.

**Status:** Completed  
**Kind:** Design Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-026 (Workspace Shell Architecture)  
**Blocks:** EXP-HOME-028 (Continuous Collapse Interaction)

---

## Objective

The current implementation uses inconsistent spacing, multiple shadow levels, and too many typography sizes. The target model uses a near-flat elevation system (single `shadow-xs` for cards, elevation only on dialogs), a single border token (`#E6EAF2`, 1px), and a mathematical typography scale (48/36/30/24/20/16/14/13). This expedition introduces the missing token groups and layout primitives to enforce consistency.

---

## Required Change

### Pass 2 — Layout System

Replace ad hoc spacing with canonical layout primitives:

- `WorkspaceSection` — section wrapper with header and body
- `WorkspaceGrid` — 12-column grid with 24px gap
- `WorkspacePanel` — panel container with header, body, footer
- `SectionHeader` — eyebrow + title + description + action pattern

### Pass 3 — Design Tokens

Expand the design system with missing token groups:

| Token Group | Tokens |
|---|---|
| **Workspace** | `maxWidth`, `padding`, `sectionGap`, `contentMaxWidth` |
| **Density** | `compact`, `default`, `comfortable` spacing scales |
| **Surface** | `canvas` (page bg), `surface` (card bg), `subtle` (hover bg), `sunken` (input bg) |
| **Border** | Single `#E6EAF2`, 1px |
| **Elevation** | `shadow-xs` only for cards; elevation only on dialogs |
| **Typography** | 48/36/30/24/20/16/14/13 scale only |

### Pass 6 — Visual Polish

- Tighten whitespace and information density by ~20%.
- Normalize border contrast and corner radii.
- Reduce unnecessary elevation.
- Ensure every section reads as part of a single engineered workspace.

### Token Specification

```
--ws-max-width: 1280px
--ws-padding: 32px
--ws-section-gap: 48px
--ws-content-max-width: 720px

--density-compact: { gap: 12, padding: 16 }
--density-default: { gap: 16, padding: 24 }
--density-comfortable: { gap: 24, padding: 32 }

--surface-canvas: #F9FAFB
--surface-surface: #FFFFFF
--surface-subtle: #F3F4F6
--surface-sunken: #E5E7EB

--border-primary: #E6EAF2

--shadow-xs: 0 1px 2px rgba(0,0,0,0.04)

--text-display: 48px
--text-heading-1: 36px
--text-heading-2: 30px
--text-heading-3: 24px
--text-heading-4: 20px
--text-body: 16px
--text-caption: 14px
--text-small: 13px
```

---

## Deliverables

1. Updated `website/tokens.json` v3.1 — workspace, density, surface, border, elevation, typography token groups.
2. Updated `website/styles.css` — all values derive from tokens.
3. `WorkspaceGrid` CSS with 12-column support.
4. `SectionHeader` component (eyebrow + title + description + action).
5. Visual density audit — whitespace tightened ~20%.
6. All elevation reduced to `shadow-xs` (cards) only; dialogs retain elevation.

---

## Acceptance Criteria

- Every visual value in `styles.css` resolves through a token.
- No hard-coded color, radius, shadow, or font-size values remain.
- 12-column grid aligns all panels, cards, and sections.
- `SectionHeader` component renders consistently across all sections.
- Engineering section uses `--surface-canvas` (#F9FAFB) background.
- Border token `#E6EAF2` is the only border color used.
- Typography uses only the 8-size scale.
- Card padding is 24px, 16px radius, no shadow (`shadow-xs` on hover only).
- Information density feels ~20% tighter than current.

---

## Out of Scope

- Structural reframe of the HTML (EXP-HOME-026).
- Continuous collapse motion (EXP-HOME-028).
- Component refactoring of individual cards.

---

## Completion Evidence

- `website/tokens.json` v3.1 — workspace, surface, density, border, elevation groups; mathematical typography scale (48/36/30/24/20/16/14/13); single `shadow-xs` elevation; single border token `#E6EAF2`
- `website/styles.css` — root variables updated with new scales; `--ws-*`, `--density-*`, `--surface-*`, `--border-primary` tokens; `.ws-grid` 12-column grid; `.section-header-eyebrow` component; card shadows standardized to `--shadow-xs`; spacing tightened ~20%; all borders use `--border-primary`
- All visual values now resolve through tokens; no hard-coded color/radius/shadow/font-size values
- Border token `#E6EAF2` is the single border color used
- Typography uses only the 8-size scale (48/36/30/24/20/16/14/13)
- Elevation reduced to `shadow-xs` for cards; elevation only on dialogs
- Information density tightened ~20%

## Related documents

- `docs/design/lds-002.md`
- `docs/design/homepage-specification.md`
- `website/tokens.json`
- `docs/expeditions/EXP-HOME-026.md`
- `docs/expeditions/EXP-HOME-028.md`
