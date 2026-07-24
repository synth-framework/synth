# EXP-WEB-001 — Homepage Hero: Intent to Deterministic Result

> **Design expedition.** This charter contains the design brief, copy, layout, and animation behavior for the SYNTH marketing homepage hero. It is an authored artifact under EXP-PROGRAM-020.

**Status:** Superseded  
**Started:** 2026-07-18  
**Closed:** 2026-07-20  
**Kind:** Design Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-020 — Website Experience  
**Superseded By:** EXP-HOME-003 — Genesis Experience  
**Depends On:** EXP-PROGRAM-004, EXP-PROGRAM-009

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

## Superseded

This expedition is **superseded** by [EXP-HOME-003 — Genesis Experience](EXP-HOME-003.md). Its design brief, copy, and scenario scripts are preserved as reference input for the Genesis Experience expedition under EXP-PROGRAM-027. See [EXP-CONVERGENCE-001](EXP-CONVERGENCE-001.md) for the convergence decision.

---

## Purpose

Design the SYNTH homepage hero so a visitor immediately understands: SYNTH takes any project starting point — greenfield, brownfield, knowledge, or conversation — and deterministically produces the planned result through a governed Agent ↔ SYNTH handshake.

---

## Objective

Create a split-screen hero that shows:

1. Human intent entering on the left.
2. A live terminal on the right showing the AI Agent and SYNTH coordinating.
3. Scenario switching that changes the conversation based on project source.

---

## Design brief

### Layout

```
+----------------------------------------------------------+
|  [nav]                                                   |
+----------------------------------------------------------+
|                                                          |
|  +------------------------+  +------------------------+  |
|  |                        |  |      TERMINAL          |  |
|  |   Phase 1              |  |  +--------+ +--------+ |  |
|  |                        |  |  | Your   | | SYNTH  | |  |
|  |   [input]              |  |  | AI     | |        | |  |
|  |                        |  |  | Agent  | |        | |  |
|  |   [source selector]    |  |  |        | |        | |  |
|  |                        |  |  +--------+ +--------+ |  |
|  +------------------------+  +------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

### Left zone (intent)

- Width: 45% on desktop, full width on mobile stacked above terminal.
- Vertical alignment: centered.

### Right zone (terminal)

- Width: 55% on desktop, full width on mobile.
- Aspect ratio: ~16:10.
- Rounded rectangle with subtle border and soft shadow.
- Monospace typeface inside.

---

## Copy

### Label above input

```
Phase 1 — Intent
```

### Input field

- Placeholder: `Build me a space mission tracker app`
- Helper text below: `Describe it in plain language. SYNTH will turn the intent into a governed plan.`

### Source selector

Section label:

```
Starting from
```

Options (icons + labels, horizontal chips on desktop, 2x2 grid on mobile):

| Icon suggestion | Label | Sub-label |
|---|---|---|
| Sparkles | Greenfield | A new idea |
| Archive | Brownfield | Existing code |
| FileText | Knowledge | Docs & specs |
| MessageCircle | Conversation | Chat or briefing |

Default selected: **Greenfield**.

### Terminal header

- Left: three dots (red, yellow, green) like a macOS window.
- Center: `synth status --watch`
- Right: small badge: `governed`

### Terminal columns

Left column header: `Your AI Agent`
Right column header: `SYNTH`

---

## Animation behavior

### General rules

- Messages appear one at a time, alternating between Agent and SYNTH.
- Typing indicator (three dots) shows for 400–700ms before each message.
- Each message slides in gently from its side.
- Total cycle: 12–18 seconds, then loops with a subtle fade reset.
- When the user changes the source selector, the animation cross-fades to the new scenario in ~600ms.

### Scenario 1 — Greenfield

Triggered by: input text + Greenfield selected.

```
Agent:  I need to build a space mission tracker.
        What kind of project is this?

SYNTH:  Repository uninitialized.
        Phase: uninitialized
        Suggested next action: synth init

Agent:  synth init --name "Space Mission Tracker"

SYNTH:  Initialized.
        Identity: application specification
        Lifecycle: planning

Agent:  synth mission create --subject "Space Mission Tracker" \
        --purpose "Track missions, crew, and launch windows."

SYNTH:  Mission draft created.
        Confidence: 0.71
        Evidence required: domain model, user roles

Agent:  Adding evidence: domain model, acceptance criteria.

SYNTH:  Mission approved.
        Expeditions ready.
```

### Scenario 2 — Brownfield

Triggered by: Brownfield selected.

```
Agent:  This repository already has code. What am I looking at?

SYNTH:  Scanning...
        Type: Node.js application
        Framework: Express
        Test coverage: 34%

Agent:  Is there an active SYNTH mission?

SYNTH:  No governed mission found.
        Phase: operational
        Suggested next action: mission create

Agent:  synth mission create --subject "Add authentication" \
        --purpose "Introduce identity and access control."

SYNTH:  Mission draft created.
        Detected constraints: existing user table, JWT in deps
        Confidence: 0.78

Agent:  Approve and create expeditions.

SYNTH:  Mission approved.
        Expedition "Auth Integration" created.
```

### Scenario 3 — Knowledge

Triggered by: Knowledge selected.

```
Agent:  I have specifications and architecture docs. Where do I start?

SYNTH:  Source detected: knowledge directory
        Artifacts: 32 documents, 8 decisions, 2 diagrams

Agent:  synth init --source ./knowledge

SYNTH:  Initialized from knowledge source.
        Classification: specification repository
        Phase: architecture definition

Agent:  What is the intended system?

SYNTH:  Domain: hospitality automation platform
        Current state: specification
        Implementation: not started

Agent:  synth mission create --subject "Hospitality Automation" \
        --purpose "Build the platform described in the knowledge base."

SYNTH:  Mission draft created and approved.
        Ready to plan expeditions.
```

### Scenario 4 — Conversation

Triggered by: Conversation selected.

```
Agent:  The user said "make the app better." That's vague.

SYNTH:  Intent unclear.
        Required: target outcome, user impact, current limitations, acceptance criteria.

Agent:  Asking the user for clarification.

SYNTH:  Waiting for evidence...

Agent:  User replied: "Reduce booking checkout from 5 steps to 2."

SYNTH:  Intent resolved.
        Outcome: reduce checkout steps
        Impact: booking conversion

Agent:  synth mission create --subject "Streamline Booking Checkout" \
        --purpose "Reduce checkout from 5 steps to 2."

SYNTH:  Mission approved.
        Ambiguity preserved as acceptance criteria.
```

---

## Visual specs

### Colors (dark mode default)

| Element | Color |
|---|---|
| Page background | `#0B0C0F` |
| Terminal background | `#111318` |
| Terminal border | `#1F232C` |
| Agent messages | `#1E2A3A` |
| Agent text | `#E8F4FF` |
| SYNTH messages | `#1A2E1A` |
| SYNTH text | `#E8FFEA` |
| Accent | `#7CFF79` |
| Secondary accent | `#6FB8FF` |
| Muted text | `#8A919C` |

### Typography

- Headlines: sans-serif, weight 600–700.
- Terminal: monospace, 13–14px.
- Input: sans-serif, 16px.
- Source chips: sans-serif, 14px.

### Terminal details

- Border radius: 16px.
- Inner padding: 24px.
- Column gap: 1px solid `#1F232C`.
- Message bubbles: border-radius 10px, padding 12px 14px, max-width 90%.

### Motion

- Message entrance: opacity 0→1, translateY 6px→0, 250ms ease-out.
- Typing indicator: three dots pulsing, 1.2s loop.
- Scenario switch: 300ms fade out, swap, 300ms fade in.
- Loop reset: pause 2s, fade to first message.

---

## Responsive behavior

### Desktop (>1024px)

- Side-by-side 45/55 split.
- Source selector as horizontal chips.
- Terminal two columns visible.

### Tablet (768–1024px)

- Side-by-side 50/50 split.

### Mobile (<768px)

- Stacked: input zone on top, terminal below.
- Source selector as 2x2 grid.
- Terminal columns stacked or shown as a single stream with side labels per message.

---

## Acceptance criteria

- [ ] Homepage hero renders the split-screen layout on desktop.
- [ ] Input placeholder reads "Build me a space mission tracker app".
- [ ] Source selector includes Greenfield, Brownfield, Knowledge, and Conversation.
- [ ] Terminal shows "Your AI Agent" and "SYNTH" columns.
- [ ] Changing the source selector plays the matching scenario animation.
- [ ] Animation loops cleanly without jarring resets.
- [ ] All copy uses SYNTH public vocabulary.
- [ ] Design assets are stored under version control.

---

## Governance

### Protected

- Public vocabulary.
- First Contact semantics.
- Deterministic projection model.

### Not included

- CLI changes.
- Runtime changes.
- Governance model changes.

---

## Related documents

- [EXP-PROGRAM-020 — Website Experience](EXP-PROGRAM-020.md)
- [EXP-PROGRAM-004 — Public Narrative](EXP-PROGRAM-004.md)
- [EXP-PROGRAM-009 — Canonical First Contact Experience](EXP-PROGRAM-009.md)
- [docs/first-contact/experience-v2.md](../first-contact/experience-v2.md)
