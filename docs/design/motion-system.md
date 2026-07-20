# Motion System Specification

> **Specification for animation timing, easing, and purpose on the SYNTH Mission Studio Homepage under EXP-HOME-013.**

---

## Purpose

Create a calm, purposeful motion system that supports the workspace metaphor without becoming decorative or distracting. Motion guides attention, explains state changes, and reinforces the calm-computing principle.

---

## Principles

1. **Purposeful, not decorative** — every animation answers a user need: entrance, state change, focus, or feedback.
2. **Fast enough to feel responsive** — micro-interactions complete in under 250 ms.
3. **Slow enough to be legible** — state changes take 300–400 ms so visitors perceive the transition.
4. **Respectful** — full `prefers-reduced-motion` support.

---

## Timing tokens

| Token | Value | Usage |
|---|---|---|
| `--ms-duration-instant` | 75 ms | Hover state feedback, subtle color shifts |
| `--ms-duration-fast` | 150 ms | Micro-interactions, button presses, focus rings |
| `--ms-duration-base` | 200 ms | Standard transitions, card hover, panel reveals |
| `--ms-duration-slow` | 300 ms | Workspace state changes, phase transitions |
| `--ms-duration-deliberate` | 400 ms | Major state reveals, hero-to-workspace transition |
| `--ms-stagger` | 60 ms | Delay between sequential artifact entrances |
| `--ms-stagger-loose` | 100 ms | Delay between major section entrances |

---

## Easing tokens

| Token | Value | Usage |
|---|---|---|
| `--ms-easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Incoming elements — decelerate to rest |
| `--ms-easing-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | State toggles — balanced movement |
| `--ms-easing-linear` | `linear` | Continuous scrubbing or looping indicators only |

Prohibited: spring, bounce, elastic, or overshoot easings.

---

## Animation categories

### Entrance

- Elements enter with a combination of opacity and transform.
- Prefer `translateY(8px → 0)` and `opacity(0 → 1)`.
- Artifacts enter in order of importance with a 60 ms stagger.
- Phase sections enter as the visitor scrolls them into view.

### State change

- Workspace phase transitions use 300 ms duration with `--ms-easing-in-out`.
- Outgoing content fades and translates up slightly; incoming content fades and translates in from below.
- Navigator highlight moves smoothly between phases.
- Status bar values cross-fade.

### Focus

- Selected artifact card lifts with `--ms-shadow-lg` and a visible focus ring.
- Non-selected cards dim slightly to emphasize selection.
- Focus rings use `--ms-accent` and appear instantly on keyboard focus.

### Feedback

- Button presses scale to 0.98 over 75 ms.
- Input confirmation shows a brief success color flash.
- Terminal content streams in line by line with a 30 ms character delay (for demo effect) and respects reduced motion.

---

## Property constraints

- Only animate `opacity`, `transform`, and `color`.
- Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`, or `box-shadow`.
- Use `transform: scale()` for card expansion feedback instead of changing dimensions.
- Use `will-change` sparingly and remove it after the animation completes.

---

## Reduced motion

When `prefers-reduced-motion: reduce` is active:

- All animated transitions become instant or near-instant (≤ 50 ms).
- Stagger delays collapse to 0 ms.
- Scrubbing still updates state but without interpolation.
- Terminal demo typewriter effect is disabled; content appears immediately.
- Focus and hover states remain visible without motion.

---

## Performance requirements

- All animations must target the compositor only (opacity + transform).
- Animation frame rate must remain at 60 fps during workspace transitions.
- Long-running animations (e.g., progress indicators) use CSS animations, not JavaScript loops.

---

## Acceptance criteria

- Every animation uses a documented timing and easing token.
- No spring, bounce, or elastic easings are used.
- Motion respects `prefers-reduced-motion`.
- Animations run at 60 fps on mid-range devices.
- Every animation has a stated purpose.

---

## Out of scope

- Design tokens (EXP-HOME-001).
- Performance budgets (EXP-HOME-012).
- Accessibility audit (EXP-HOME-011).

---

## Related documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Mission Workspace Specification](mission-workspace.md)
- [Performance Specification](performance.md)
- [EXP-HOME-013 — Motion System](../expeditions/EXP-HOME-013.md)
