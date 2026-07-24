# SYNTH Mission Studio Homepage

## Product UX Specification

### Homepage → Workspace → Persistent Application Shell

**Version:** 1.0 (Exploration Baseline)

---

# 1. Vision

The homepage is **not separate from the product.**

The homepage *is* Mission Studio.

Instead of navigating away from marketing into an application, the visitor is immediately placed inside the product.

As the visitor scrolls, the interface continuously transforms until it becomes the permanent application shell that accompanies every subsequent section.

The experience should feel closer to:

- macOS window minimization
- VisionOS transitions
- Dynamic Island morphing
- Apple keynote storytelling
- Linear
- Arc Browser
- Figma

The important principle is:

> **Nothing disappears. Everything transforms.**

---

# 2. UX Principles

## Principle 1

The user never leaves the application.

There is no visual breakpoint where "homepage ends."

---

## Principle 2

Context is never lost.

Mission / Status / Replay / Governance always remain available.

---

## Principle 3

Scrolling changes interface density — not information hierarchy.

Expanded → Condensed → Persistent

---

## Principle 4

Every state is the same interface.

Not three pages. One interface.

---

# 3. Experience Timeline

```
Page loads

↓

Hero

↓

Mission Studio (full viewport)

↓

Intent

↓

Discovery

↓

Mission

↓

Expeditions

↓

Governance

↓

Replay

↓

Workspace begins collapsing

↓

Homepage sections appear

↓

Workspace becomes sticky header

↓

Homepage continues

↓

Footer
```

---

# 4. Scroll Storyboard

## Scene 01 — Hero

```
Logo
Navigation
Headline
Mission Studio preview
CTA
≈ 100vh
Mission Studio dominates the viewport.
```

## Scene 02 — Mission Studio (Full Height)

```
Sidebar
Mission Header
Intent
  Inputs
  Cards
  Selectors
  Metadata
  Status Chips
```

Workspace fills almost entire screen.

## Scene 03 — Discovery

Mission Studio content changes only. Outer shell remains identical. Only center content animates.

## Scene 04 — Mission

Same shell. Mission definition.

## Scene 05 — Expeditions

Cards become expedition cards.

## Scene 06 — Governance

Validation. Approval. Replay readiness.

## Scene 07 — Replay

Timeline. Evidence. Replay summary. User has completed Mission Studio.

---

# 5. Progressive Collapse

Begins immediately after Replay exits the viewport. Mission Studio does NOT disappear. It compresses.

Animation duration: ≈300–500px scroll distance

## Sidebar

Expanded → Icon + Label → Icons only → Removed

The sidebar disappears completely by the final state. Navigation responsibility transfers to the homepage.

## Content Area

Large cards → Compact cards → Single row summary

## Inputs

Textarea → Single line → Mission title only

## Metadata

Large blocks → Inline chips → Header badges

## Header

Normal → Pinned → Sticky

---

# 6. Final State

Mission Studio becomes **Sticky Workspace Bar.**

Height: 64–80px

```
Mission Studio
  Mission: Space Mission Tracker
  Status: Governed
  Replay Ready
  Confidence
  Replay
  [Open Workspace button]
```

No sidebar. No left navigation. No floating panels. The sticky workspace spans the entire page width, directly below global navigation. This is the permanent application context.

---

# 7. Homepage Sections

After collapse, homepage becomes traditional content while preserving application context.

1. **Canonical Artifacts** — Grid: Mission Brief, Architecture, Constraints, Expeditions, Replay, Evidence
2. **Deterministic Engineering** — Feature section: Deterministic, Replayable, Governed, Observable, Immutable
3. **AI Native Development** — Cards: Intent, Planning, Execution, Governance, Replay
4. **Architecture** — Kernel, Planning Engine, Execution Engine, Ledger, Replay
5. **Open Source** — Community, GitHub, Documentation, CLI

---

# 8. Design References

Apple / Linear / Figma / Arc / Notion

Minimal. Editorial. Soft. Professional.

---

# 9. Color Tokens

```
--bg-primary           #FFFFFF
--surface              #FCFCFD
--border               #E8E8EC
--divider              #F2F2F4
--text-primary         #111827
--text-secondary       #6B7280
```

### Semantic

| Concept | Color |
|---|---|
| Intent | Blue |
| Discovery | Teal |
| Mission | Purple |
| Expedition | Indigo |
| Governance | Green |
| Replay | Violet |
| Warning | Orange |
| Danger | Red |

---

# 10. Elevation

4 levels only:

| Level | Usage |
|---|---|
| 0 | No shadow |
| 1 | Cards |
| 2 | Dialogs |
| 3 | Floating |
| 4 | Navigation |

Soft shadows only. No hard Material Design shadows.

---

# 11. Radius

| Element | Radius |
|---|---|
| Cards | 16px |
| Inputs | 12px |
| Buttons | 12px |
| Dialogs | 24px |
| Workspace | 24px |

---

# 12. Typography

Typeface: Inter

| Role | Size |
|---|---|
| Hero | 56px |
| H1 | 40px |
| H2 | 32px |
| H3 | 24px |
| Body | 16px |
| Caption | 14px |
| Small | 12px |

Generous spacing. Editorial rhythm.

---

# 13. Spacing Scale

```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
```

Never invent arbitrary spacing.

---

# 14. Motion Language

Everything should feel physically connected.

**Use:** Opacity, Scale, Translate, Height, Radius, Padding

**Avoid:** Instant disappearance, hard cuts, opacity-only transitions

**Prefer:** FLIP animations, shared element transitions, morphing layouts

---

# 15. Component Catalog

## Navigation
- Global Nav
- Mission Header
- Sticky Workspace Bar

## Workspace
- Mission Studio
- Sidebar
- Mission Canvas
- Inspector

## Inputs
- Textarea, Input, Segmented Control, Select, Checkbox, Radio

## Cards
- Mission Card, Artifact Card, Status Card, Evidence Card, Expedition Card, Feature Card

## Status
- Chip, Badge, Progress, Confidence, Validation

## Timeline
- Replay Timeline, Execution Timeline, Audit Timeline

## Buttons
- Primary, Secondary, Ghost, Icon, Link

## Empty States
- Discovery Empty, Mission Empty, Artifacts Empty, Replay Empty

## Feedback
- Loading, Skeleton, Success, Error, Warning

---

# 16. Component Behavior

Mission Studio is stateful across the scroll journey. Rather than remounting new UIs, the same component tree should be preserved to enable shared-element transitions and maintain context.

The collapse should primarily be driven by layout properties: width, height, padding, gap, opacity (secondary content only), border radius, typography scale.

Avoid replacing components with different implementations when a responsive variant can achieve the same result.

---

# 17. Implementation Architecture

```
<HomePage>
  <Hero/>
  <MissionStudio>
    Expanded → Compact → StickyWorkspace
  </MissionStudio>
  <CanonicalArtifacts/>
  <DeterministicEngineering/>
  <AINative/>
  <Architecture/>
  <OpenSource/>
  <Footer/>
</HomePage>
```

`MissionStudio` should own its presentation state driven by scroll progress (0.0 to 1.0). The homepage interpolates a single interface through expanded, condensed, and sticky variants.

---

# 18. Success Criteria

- The homepage feels like entering the product immediately.
- Users perceive a single, continuous interface rather than separate marketing and application pages.
- The transition from immersive workspace to sticky contextual shell is smooth and physically plausible.
- The final sticky workspace bar contains only mission context (no sidebar) and remains visible throughout the remainder of the homepage.
- Every animation reinforces continuity, preserving orientation and reducing cognitive load.
- The visual language remains consistent with the established SYNTH design system and component catalog throughout the entire experience.
