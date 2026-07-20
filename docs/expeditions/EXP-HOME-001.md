# EXP-HOME-001 — Mission Studio Design Language

> **Design expedition.** Define the visual system, design tokens, and principles for the Mission Studio Homepage.

**Status:** Completed  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Design Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** none  
**Blocks:** EXP-HOME-002, EXP-HOME-004, EXP-HOME-013

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

Establish the Mission Studio Design System (LDS-002), superseding any prior design system work. The interface should feel like Linear, Notion, GitHub Projects, VS Code, and Figma—without resembling any of them. It should feel like an operating system.

---

## Origin Evidence

The current homepage explains SYNTH through static marketing content. There is no unified design language that projects SYNTH's runtime concepts into a cohesive interactive experience.

A visual design reference was provided to establish tokens, color temperament, typography scale, and overall tone. The reference is not a locked layout specification; the Mission Workspace layout and component arrangement may evolve per EXP-HOME-002.

---

## Required Change

### 1.1 Principles

- **Runtime First:** Every visible component corresponds to a runtime object. Never invent decorative UI.
- **Progressive Disclosure:** Information density increases as Genesis progresses.
- **Workspace over Pages:** Everything lives inside one workspace; scrolling changes workspace state.
- **Calm Computing:** Large whitespace, low visual noise, subtle motion, clear hierarchy.
- **Artifact Driven:** Replace chat with artifacts. Everything shown is an object.

### 1.2 Tokens

- **Colors:** Genesis, Mission, Expedition, Evidence, Governance, Replay, Knowledge. Each gets a semantic color; no arbitrary accent colors.
- **Radius:** Consistent. Large outer containers, smaller artifacts.
- **Shadows:** Very soft, almost invisible.
- **Motion:** 150–250 ms, opacity and translation only, no spring animations.

### 1.3 Typography

- Monospace for code and runtime labels.
- Sans-serif for headings and body.
- Clear hierarchy across workspace, artifacts, and status.

---

## Deliverables

1. **Mission Studio Design System** document under `docs/design/lds-002.md`.
2. **Token specification** (colors, radius, shadows, motion, typography).
3. **Component taxonomy** mapping each component to a SYNTH concept.
4. **Design principles checklist** for reviewing future homepage work.

---

## Acceptance Criteria

- Every token has a semantic rationale tied to SYNTH concepts.
- No decorative components exist without a runtime mapping.
- Motion is calm, purposeful, and consistent.

---

## Out of Scope

- Homepage layout (EXP-HOME-002).
- Artifact component implementation (EXP-HOME-004).
- Motion system details (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when designers and engineers can build any homepage element using the design system without inventing new visual language.
