# EXP-PROGRAM-027 — Mission Studio Homepage

**Status:** Proposed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Homepage as the first interactive projection of the SYNTH lifecycle  
**Era:** III — Architecture  
**Architecture Impact:** Medium  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **The SYNTH homepage should be the first execution of the Genesis lifecycle. Rather than explaining SYNTH through marketing content, it should immerse visitors in a guided, interactive Mission Studio experience that transforms raw intent into governed software.**

The homepage is not a landing page. It is the first screen of SYNTH. Every interaction is a real projection of the SYNTH lifecycle. Visitors leave understanding SYNTH because they have experienced it.

---

## Purpose

Turn the SYNTH homepage into a deterministic, interactive projection of the platform:

- Teach Genesis without documentation.
- Demonstrate Discovery through interaction.
- Present Missions and Expeditions as first-class concepts.
- Explain Governance visually rather than textually.
- Show Replay as a core capability.
- Feel like entering an engineering workspace rather than browsing a website.
- Use only runtime concepts that exist in SYNTH.
- Remain deterministic and projection-driven.

---

## Core Abstraction — The Homepage as First Projection

> **Every element on the homepage must be a projection of a real SYNTH concept.**

If a card, animation, badge, panel, or interaction cannot be traced directly to a runtime artifact, lifecycle phase, or governed concept within SYNTH, it should not exist. The homepage is not a visualization *of* SYNTH—it is the first projection *from* SYNTH itself.

```text
Visitor Intent
        ↓
Genesis Protocol
        ↓
Interactive Workspace
        ↓
Artifacts (Intent, Discovery, Domain, Mission, Expedition, Replay)
        ↓
Governed Understanding
```

---

## Mission

Make the SYNTH homepage the canonical first experience of the SYNTH lifecycle:

- Define the Mission Studio Design System (LDS-002).
- Specify the homepage as an interactive Mission Workspace.
- Build a guided Genesis experience that produces real artifacts.
- Visualize workflow, governance, replay, architecture, and capabilities.
- Certify that a first-time visitor can understand SYNTH in under five minutes without reading external documentation.

---

## Program Composition

```text
EXP-PROGRAM-027
Mission Studio Homepage
│
├── EXP-HOME-001  Mission Studio Design Language
│       Design Expedition
│       Define the visual system, tokens, and principles.
│
├── EXP-HOME-002  Mission Workspace
│       Architecture Expedition
│       Define the workspace layout, panels, and state machine.
│
├── EXP-HOME-003  Genesis Experience
│       Product Expedition
│       Build the interactive Genesis session on the homepage.
│
├── EXP-HOME-004  Artifact System
│       Architecture Expedition
│       Define Artifact Card variants and behavior.
│
├── EXP-HOME-005  Workflow Visualization
│       Product Expedition
│       Visualize the SYNTH lifecycle as an interactive flow.
│       Status: Rewrite — must use the seven-concept public vocabulary.
│
├── EXP-HOME-006  Governance Visualization
│       Product Expedition
│       Explain governance through interactive before/after comparison.
│
├── EXP-HOME-007  Replay Experience
│       Product Expedition
│       Embed a replay timeline that updates artifacts on scrub.
│
├── EXP-HOME-008  Architecture Explorer
│       Product Expedition
│       Interactive layered architecture diagram.
│
├── EXP-HOME-009  Capabilities Explorer
│       Product Expedition
│       Grid of runtime concepts linking to documentation.
│
├── EXP-HOME-010  Responsive Implementation
│       Engineering Expedition
│       Adapt the workspace for all screen sizes.
│
├── EXP-HOME-011  Accessibility
│       Engineering Expedition
│       WCAG-compliant keyboard navigation, screen readers, contrast.
│
├── EXP-HOME-012  Performance
│       Engineering Expedition
│       Fast first paint, smooth animations, lazy loading.
│
├── EXP-HOME-013  Motion System
│       Design Expedition
│       Define calm, purposeful animation rules.
│
├── EXP-HOME-014  Documentation Integration
│       Product Expedition
│       Link homepage artifacts to canonical docs.
│
└── EXP-HOME-015  Production Certification
        Certification Expedition
        Certify the homepage meets acceptance criteria.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Defining the Mission Studio Design System | Modifying Protected Assets |
| Building interactive homepage projections | Inventing decorative UI not tied to SYNTH concepts |
| Visualizing workflow, governance, replay, architecture | Marketing copy disconnected from runtime |
| Implementing responsive, accessible, performant UI | Code generation as a homepage feature |
| Integrating documentation links | Bypassing ExecutionGate for mutations |
| Certifying visitor comprehension | Platform-specific lock-in |

### Hard Constraints

> **Runtime first:** Every visible component corresponds to a runtime object.
>
> **Projection only:** The homepage projects existing SYNTH concepts; it does not invent new ones.
>
> **Progressive disclosure:** Information density increases as Genesis progresses.
>
> **Workspace over pages:** Everything lives inside one workspace; scroll changes workspace state.
>
> **Calm computing:** Large whitespace, low noise, subtle motion, clear hierarchy.
>
> **Artifact driven:** Replace chat with objects; everything shown is an artifact.

---

## Out of Scope

- Changes to Genesis, Mission, or Expedition semantics.
- Changes to Replay or governance implementation.
- Code generation from the homepage.
- Backend API changes (unless required for projection).
- Commercial analytics or tracking integrations.

---

## Success Criteria

A first-time visitor should, within five minutes and without reading external documentation, be able to answer:

- What problem does SYNTH solve?
- What is Genesis?
- What is Discovery?
- What is a Mission?
- What is an Expedition?
- Why does Governance matter?
- What is Replay?
- How do Greenfield and Brownfield differ?
- Why doesn't SYNTH generate code immediately?
- How does SYNTH transform intent into governed software?

---

## Relationship to Other Work

- **EXP-PROGRAM-022 — Genesis** provides the lifecycle the homepage projects.
- **EXP-PROGRAM-023 — Semantic Modeling** provides intent and domain artifacts visualized on the homepage.
- **EXP-PROGRAM-024 — Canonical Knowledge & Validation** provides the knowledge graph and validation concepts.
- **EXP-PROGRAM-025 — Incremental Governance** ensures homepage changes are validated efficiently.
- **EXP-PROGRAM-026 — AI Agent Interoperability** provides the agent protocols the homepage may demonstrate.

---

## Long-Term Vision

The Mission Studio Homepage becomes the canonical entry point for both human visitors and AI agents. It is a living projection of SYNTH: as the platform evolves, the homepage evolves with it. It proves that SYNTH's concepts are not abstract—they can be seen, touched, and experienced from the very first interaction.
