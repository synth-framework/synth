# EXP-HOME-026 — Workspace Shell Architecture

> **Structural expedition.** Reframe the entire homepage as a continuous Mission Studio workspace shell that transitions between expanded and collapsed density states. Introduce `WorkspaceShell` as the root layout primitive — every visible element becomes a child of the shell.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Design Language), EXP-HOME-002 (Component Catalog)  
**Blocks:** EXP-HOME-027, EXP-HOME-028

---

## Objective

The homepage is currently structured as a landing page with an embedded Mission Studio section. The target model treats the entire page as **one persistent Mission Studio workspace** whose density adapts with scrolling — not a sequence of independent sections. This expedition introduces `WorkspaceShell` as the root container that owns all content, and defines the expanded and collapsed states of the shell.

---

## Required Change

### Pass 1 — Structural Refactor

Reframe the homepage so that Mission Studio is the persistent application shell rather than a hero section.

1. Introduce `WorkspaceShell` as the root layout container.
2. Move Canonical Artifacts, Deterministic Engineering, AI Native sections inside the shell.
3. Define expanded and collapsed states of the shell.
4. Eliminate hero terminology — the initial state is `WorkspaceShell: expanded`, not a "landing hero."

**Exit criteria:** Every visible element on the homepage is a direct or transitive child of `WorkspaceShell`.

### Layout Primitives

Introduce workspace-level layout components:

| Component | Responsibility |
|---|---|
| `WorkspaceShell` | Root container. Owns expanded/collapsed states. Manages sticky behavior. |
| `WorkspaceToolbar` | Top bar inside shell: mission context, status, confidence. Becomes sticky bar on collapse. |
| `WorkspaceRail` | Left navigation rail. Three states: expanded (labels) → compact (icons) → hidden. |
| `WorkspaceContent` | Scrollable content area. Houses all sections. |
| `WorkspaceSection` | Named section within content: header + body. |
| `WorkspacePanel` | Generic panel container with header, body, footer. |
| `WorkspaceGrid` | 12-column grid container. |
| `WorkspaceFooter` | Bottom status bar. |

### Ownership Model

```
┌─────────────────────────────────────────────┐
│ Global Navigation (72px)                     │
├─────────────────────────────────────────────┤
│ WorkspaceShell                               │
│  ├── WorkspaceToolbar                        │
│  │   ├── Logo + Mission name                 │
│  │   ├── Status chips (Contract, Governed)   │
│  │   ├── Confidence indicator                │
│  │   └── Open Workspace button               │
│  ├── WorkspaceRail (expanded/collapsed/hidden)│
│  │   ├── Intent                              │
│  │   ├── Discovery                           │
│  │   ├── Mission                             │
│  │   ├── Expeditions                         │
│  │   ├── Governance                          │
│  │   └── Replay                              │
│  ├── WorkspaceContent                        │
│  │   ├── WorkspaceSection — Intent           │
│  │   ├── WorkspaceSection — Discovery        │
│  │   ├── WorkspaceSection — Mission          │
│  │   ├── WorkspaceSection — Expeditions      │
│  │   ├── WorkspaceSection — Governance       │
│  │   ├── WorkspaceSection — Replay           │
│  │   ├── WorkspaceSection — Canonical        │
│  │   ├── WorkspaceSection — Engineering      │
│  │   └── WorkspaceSection — Open Source      │
│  └── WorkspaceFooter                         │
└─────────────────────────────────────────────┘
```

All content — including what was previously "homepage sections" — lives inside the shell.

---

## Deliverables

1. `WorkspaceShell` CSS/component as the root layout container.
2. `WorkspaceToolbar` component with expanded/collapsed states.
3. `WorkspaceRail` component with 3-state transition.
4. `WorkspaceContent`, `WorkspaceSection`, `WorkspacePanel`, `WorkspaceGrid` primitives.
5. Restructured `index.html` — all elements as children of `WorkspaceShell`.
6. Ownership diagram in `docs/design/workspace-architecture.md`.

---

## Acceptance Criteria

- Every element on the homepage is a child of `WorkspaceShell`.
- `WorkspaceToolbar` renders correctly in expanded and collapsed states.
- `WorkspaceRail` transitions through 3 states (labels → icons → hidden).
- No "hero" section or terminology exists in the HTML structure.
- The shell transitions smoothly between expanded and collapsed states.
- All existing tests continue to pass.

---

## Out of Scope

- Visual styling or design token changes (EXP-HOME-027).
- Motion choreography or continuous interpolation (EXP-HOME-028).
- Component refactoring of individual cards or features.

---

## Completion Evidence

- `website/index.html` — all elements restructured under `WorkspaceShell`, `WorkspaceToolbar` replaces hero, `WorkspaceRail` sidebar added, `WorkspaceContent` wraps all sections, `WorkspaceFooter` added
- `website/styles.css` — `.workspace-shell`, `.workspace-toolbar`, `.workspace-toolbar-inner`, `.workspace-toolbar-collapsed`, `.workspace-rail`, `.ws-rail-nav`, `.ws-rail-item`, `.workspace-content`, `.workspace-section`, `.workspace-footer` structural styles
- `website/js/mission-studio-app.js` — element references updated to new workspace IDs, shell state management
- No "hero" section or terminology exists in HTML structure
- All 152 tests passing (synth: 121, proposal-evaluation: 15, governance-evaluation: 7, convergence-certification: 9)

## Related documents

- `docs/design/homepage-specification.md`
- `docs/expeditions/EXP-HOME-001.md`
- `docs/expeditions/EXP-HOME-027.md`
- `docs/expeditions/EXP-HOME-028.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
