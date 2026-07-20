# EXP-PROGRAM-027 — Mission Studio Homepage

**Status:** Executing  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Mission Studio is the SYNTH homepage  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **Mission Studio is no longer a component of the homepage. It is the homepage.**
>
> Rather than explaining SYNTH through marketing content, the homepage immerses visitors in a guided, interactive Mission Studio experience that transforms raw intent into governed software. Supporting content exists only after Mission Studio has completed its lifecycle.

The SYNTH homepage is the first screen of SYNTH. Every interaction is a real projection of the SYNTH lifecycle. Visitors leave understanding SYNTH because they have experienced it.

---

## Purpose

Turn the SYNTH homepage into a production-quality Mission Studio experience:

- Define the canonical Mission Studio Design System.
- Build a persistent Mission Studio application shell embedded in the homepage.
- Guide visitors through Intent → Discovery → Mission → Expeditions → Governance → Replay → Architecture → Repository Summary.
- Release Mission Studio only after the lifecycle completes, then show supporting content (capabilities, examples, docs, community).
- Certify that a first-time visitor can understand SYNTH in under five minutes without reading external documentation.

---

## Core Abstraction — Mission Studio as the Homepage

> **Every element on the homepage must be a projection of a real SYNTH concept.**

If a component, animation, badge, panel, or interaction cannot be traced directly to a runtime artifact, lifecycle phase, or governed concept within SYNTH, it should not exist. The homepage is not a visualization *of* SYNTH — it is the first projection *from* SYNTH itself.

```text
Visitor Intent
        ↓
Genesis Protocol
        ↓
Mission Studio (persistent application shell)
        ↓
Workspace phases
        ↓
Artifacts (Intent, Discovery, Constraints, Domain, Mission, Expedition, Governance, Replay, Architecture, Repository)
        ↓
Governed Understanding
        ↓
Supporting sections
```

---

## Mission

Make Mission Studio the canonical first experience of SYNTH:

- Define the Mission Studio Design System (LDS-002) as the public visual language of SYNTH.
- Specify Mission Studio as a persistent application with header, sidebar, workspace, status, and footer.
- Build a scroll-driven, sticky Mission Studio experience on the homepage.
- Implement every lifecycle phase as a Mission Studio state, not a separate page.
- Visualize workflow, governance, replay, architecture, capabilities, and repository status as phases or extensions of Mission Studio.
- Certify that a first-time visitor can understand SYNTH in under five minutes.

---

## Homepage Structure

The homepage is organized into sequential sections:

```text
Section 0 — Hero
  Logo, tagline, CTA, install command, entry into Mission Studio

Section 1 — Mission Studio (sticky)
  Header
  Sidebar
  Workspace
  Footer

Section 2 — Mission Lifecycle (scroll-driven)
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
  Architecture
  ↓
  Repository Summary

Section 3 — Supporting Content (after Mission Studio releases)
  Capabilities
  Examples
  Documentation
  Open Source
  Community
  Footer
```

---

## Mission Studio State Machine

Mission Studio is driven by a finite state machine:

```text
Idle
  ↓
Intent
  ↓
Discovery
  ↓
Constraints
  ↓
Domain
  ↓
Mission
  ↓
Expeditions
  ↓
Governance
  ↓
Replay
  ↓
Architecture
  ↓
Repository Summary
  ↓
Complete → Mission Studio releases → Supporting sections
```

For every state the specification defines:

- Purpose
- Displayed artifacts
- Sidebar state
- Header state
- Status badges
- Commands
- Timeline position
- Animation
- Scroll transition
- Accessibility behavior
- Runtime events

---

## Program Composition

```text
EXP-PROGRAM-027
Mission Studio Homepage
│
├── EXP-HOME-001  Mission Studio Design Language
│       Design Expedition
│       Canonical public visual language of SYNTH: tokens, themes, principles.
│
├── EXP-HOME-002  Mission Studio Component Catalog
│       Design / Architecture Expedition
│       Reusable components for workspace, sidebar, artifact cards, motion, feedback.
│
├── EXP-HOME-003  Mission Studio UI Specification
│       Architecture Expedition
│       Persistent application shell, lifecycle phases, scroll-driven behavior.
│
├── EXP-HOME-004  Homepage / Mission Studio Integration
│       Architecture Expedition
│       How Mission Studio becomes the homepage: hero handoff, sticky behavior, release.
│
├── EXP-HOME-005  Intent Phase
│       Product Expedition
│       Mission Studio phase for capturing visitor intent.
│
├── EXP-HOME-006  Discovery Phase
│       Product Expedition
│       Mission Studio phase for Discovery artifacts and unknowns.
│
├── EXP-HOME-007  Mission Phase
│       Product Expedition
│       Mission Studio phase for Mission artifact and approval.
│
├── EXP-HOME-008  Expeditions Phase
│       Product Expedition
│       Mission Studio phase for Expedition proposals.
│
├── EXP-HOME-009  Governance & Replay Phase
│       Product Expedition
│       Mission Studio phase for governance visualization and replay timeline.
│
├── EXP-HOME-010  Responsive Implementation
│       Engineering Expedition
│       Adapt Mission Studio and homepage for all screen sizes.
│
├── EXP-HOME-011  Accessibility
│       Engineering Expedition
│       WCAG 2.2 AA compliance, keyboard navigation, screen readers, reduced motion.
│
├── EXP-HOME-012  Performance
│       Engineering Expedition
│       Fast first paint, 60 FPS scroll animations, bundle budgets, lazy loading.
│
├── EXP-HOME-013  Motion System
│       Design Expedition
│       Calm, purposeful animation rules for Mission Studio transitions.
│
├── EXP-HOME-014  Documentation Integration
│       Product Expedition
│       Link Mission Studio artifacts and homepage concepts to canonical docs.
│
├── EXP-HOME-015  Production Certification
│       Certification Expedition
│       Unit, integration, E2E, visual regression, accessibility, performance tests.
│
├── EXP-HOME-016  Homepage Runtime
│       Architecture Expedition
│       Browser-compatible, in-memory SYNTH runtime for the homepage.
│
├── EXP-HOME-017  Homepage Genesis Projection
│       Product Expedition
│       Homepage projection of the Genesis Protocol as TypeScript functions.
│
├── EXP-HOME-018  Homepage Replay Projection
│       Product Expedition
│       Scrubbable replay projection using the existing SYNTH replay engine.
│
├── EXP-HOME-019  Artifact Projection Layer
│       Architecture Expedition
│       Map runtime state to Mission Studio Artifact Cards.
│
├── EXP-HOME-020  Curated Demonstration Library
│       Product Expedition
│       Deterministic demo missions for regression testing and visitor exploration.
│
├── EXP-HOME-021  Mission Studio State Machine
│       Architecture Expedition
│       Unified state machine driving the homepage Mission Studio.
│
├── EXP-HOME-022  Runtime Abstraction Layer
│       Architecture Expedition
│       MissionRuntime interface decouples UI from runtime implementation.
│
├── EXP-HOME-023  AI Operator Adapter
│       Architecture Expedition
│       Demo operator adapter; later replaced by live AI adapters.
│
└── EXP-HOME-024  Projection Contract
        Architecture Expedition
        Stable interface between runtime and any UI.
```

---

## Phases

Program 027 is delivered in three phases. Only Phase 1 is implemented in the current development cycle; Phases 2 and 3 are chartered for future evolution.

### Phase 1 — Mission Studio as Homepage *(implement now)*

Deliver a production-quality Mission Studio experience embedded in the homepage using deterministic, browser-native execution.

```text
Visitor arrives
  ↓
Hero invites into Mission Studio
  ↓
Mission Studio becomes sticky
  ↓
Visitor types an idea
  ↓
Discovery executes
  ↓
Mission is generated
  ↓
Expeditions appear
  ↓
Governance is visualized
  ↓
Replay is interactive
  ↓
Architecture and Repository Summary complete
  ↓
Mission Studio releases
  ↓
Supporting sections scroll normally
  ↓
Visitor understands SYNTH
```

Phase 1 implements EXP-HOME-001 through EXP-HOME-024, with the AI Operator Adapter initially implemented as a deterministic `DemoOperator`. No backend, no filesystem, no remote AI, no repository mutation.

### Phase 2 — Shared Runtime SDK *(charter only)*

Define the extraction of the homepage runtime into a reusable `@synth/runtime-sdk` package and the migration of the CLI to consume it.

Phase 2 deliverables are specifications only:

- `@synth/runtime-sdk` package boundary
- Public `MissionRuntime` API
- CLI migration plan
- Browser compatibility requirements

### Phase 3 — Live Agent Integration *(charter only)*

Define the live AI experience through an `@synth/agent-sdk` and operator adapters.

Phase 3 deliverables are specifications only:

- `@synth/agent-sdk` package boundary
- Operator adapter interface
- ChatGPT, Gemini, Claude, and Cursor adapter charters
- Hosted runtime, authentication, streaming, and cost models

---

## Implementation Boundary

> **Program 027 will implement only Phase 1 during the current development cycle.**
>
> Phases 2 and 3 are architectural charters intended to guide future evolution. They are explicitly out of scope for this iteration and require a separate implementation decision after the validation and hardening era.

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
| Building Mission Studio as the homepage | Inventing decorative UI not tied to SYNTH concepts |
| Visualizing lifecycle phases inside Mission Studio | Marketing copy disconnected from runtime |
| Implementing responsive, accessible, performant UI | Code generation as a homepage feature |
| Integrating documentation links | Bypassing ExecutionGate for mutations |
| Certifying visitor comprehension | Platform-specific lock-in |

### Hard Constraints

> **Runtime first:** Every visible component corresponds to a runtime object.
>
> **Projection only:** The homepage projects existing SYNTH concepts; it does not invent new ones.
>
> **Progressive disclosure:** Information density increases as the lifecycle progresses.
>
> **Workspace over pages:** Mission Studio is one persistent application; scroll changes phase, not page.
>
> **Calm computing:** Large whitespace, low noise, subtle motion, clear hierarchy.
>
> **Artifact driven:** Replace chat with objects; everything shown is an artifact.
>
> **Mission Studio depends only on the `MissionRuntime` interface:** No React component, state controller, or projection layer may invoke the SYNTH CLI directly. Today the interface is satisfied by the Homepage Runtime; tomorrow by the Runtime SDK or a Hosted Runtime. Only dependency injection changes.
>
> **Mission Studio is the homepage:** Supporting content appears only after Mission Studio completes its lifecycle and releases.

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

Additionally:

- Mission Studio behaves as one persistent application.
- No page-jump feeling during the lifecycle.
- Supporting content appears only after Mission Studio releases.
- All components derive from documented tokens.

---

## Relationship to Other Work

- **EXP-PROGRAM-020 — Website Experience** is superseded by this program. EXP-CONVERGENCE-001 records the decision. EXP-WEB-001's hero design and scenario scripts feed into EXP-HOME-004.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle the homepage projects.
- **EXP-PROGRAM-023 — Semantic Modeling** provides intent and domain artifacts visualized on the homepage.
- **EXP-PROGRAM-024 — Canonical Knowledge & Validation** provides the knowledge graph and validation concepts.
- **EXP-PROGRAM-025 — Incremental Governance** ensures homepage changes are validated efficiently.
- **EXP-PROGRAM-026 — AI Agent Interoperability** provides the agent protocols the homepage may demonstrate.

---

## Long-Term Vision

The Mission Studio Homepage becomes the canonical entry point for both human visitors and AI agents. It is a living projection of SYNTH: as the platform evolves, the homepage evolves with it. It proves that SYNTH's concepts are not abstract — they can be seen, touched, and experienced from the very first interaction.
