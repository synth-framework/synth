# EXP-PROGRAM-027 — Mission Studio Homepage

**Status:** Completed and accepted — Governance Architecture v1.0 Certified. All Phase 1 expeditions completed, all governance certifications passed, and the Mission Studio homepage is released as the canonical SYNTH first experience.  
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

> ## ▶️ Program 027 is the first program executed under Governance Architecture v1.0
>
> Program 027 is the **pilot validation project** for ADR-045 — Governance Lifecycle & State Machine Specification. It demonstrates the complete SYNTH governance lifecycle end-to-end.
>
> Completed expeditions (EXP-HOME-001, EXP-HOME-002, EXP-HOME-025) are frozen as baseline evidence. They will pass through the new governance gates rather than being rewritten. Downstream expeditions may not begin until upstream gates are resolved.
>
> Program 027 will execute under the five-phase lifecycle defined in ADR-045:
> **Genesis** (Intent → Refinement → Alignment → Approval) →
> **Synthesis** (Mission → Expeditions → Implementation) →
> **Governance** (Review → Revision → Acceptance → Convergence → Completion).

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

## Governance Lifecycle

Program 027 is the first program executed under **Governance Architecture v1.0** (ADR-047, ADR-048, ADR-045). The homepage itself must project this lifecycle.

```text
Genesis
────────────
Intent
Refinement
Alignment
Approval

↓

Synthesis
────────────
Mission
Expeditions
Implementation

↓

Governance
────────────
Review
Revision
Acceptance
Convergence
Completion
```

Every phase produces an artifact. Every gate requires an authorized satisfier. No downstream work may begin while an upstream gate is awaiting decision.

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

Program 027 is reorganized around the Governance Architecture v1.0 lifecycle. Existing expeditions are preserved; new Genesis expeditions are added to capture intent, alignment, and approval before implementation resumes.

```text
EXP-PROGRAM-027
Mission Studio Homepage
│
├── Genesis
│   │
│   ├── EXP-HOME-026  Homepage Intent Model
│   │       Genesis Expedition
│   │       Capture the explicit and implicit intent for the Mission Studio homepage.
│   │
│   ├── EXP-HOME-027  Homepage Alignment Contract
│   │       Genesis Expedition
│   │       Formalize allowed interpretation, forbidden drift, and reference evidence.
│   │
│   └── EXP-HOME-028  Homepage Mission Approval
│           Genesis Expedition
│           Approve the Mission only after the Divergence Gate resolves to aligned.
│
├── Synthesis
│   │
│   ├── Milestone A — Mission Studio Foundations
│   │   │
│   │   ├── EXP-HOME-001  Mission Studio Design Language        → Frozen baseline
│   │   │       Design Expedition
│   │   │
│   │   ├── EXP-HOME-002  Mission Studio Component Catalog      → Frozen baseline
│   │   │       Design / Architecture Expedition
│   │   │
│   │   ├── EXP-HOME-003  Mission Studio UI Specification
│   │   │       Architecture Expedition
│   │   │
│   │   └── EXP-HOME-025  Mission Studio Design Governance      → Frozen baseline
│   │           Design Expedition
│   │
│   ├── Milestone B — Homepage Experience
│   │   │
│   │   ├── EXP-HOME-004  Homepage / Mission Studio Integration
│   │   │       Architecture Expedition
│   │   │
│   │   ├── EXP-HOME-005  Intent Phase
│   │   │       Product Expedition
│   │   │
│   │   ├── EXP-HOME-006  Discovery Phase
│   │   │       Product Expedition
│   │   │
│   │   ├── EXP-HOME-007  Mission Phase
│   │   │       Product Expedition
│   │   │
│   │   ├── EXP-HOME-008  Expeditions Phase
│   │   │       Product Expedition
│   │   │
│   │   └── EXP-HOME-009  Governance & Replay Phase
│   │           Product Expedition
│   │
│   └── Milestone C — Runtime Integration
│       │
│       ├── EXP-HOME-016  Homepage Runtime
│       │       Architecture Expedition
│       │
│       ├── EXP-HOME-017  Homepage Genesis Projection
│       │       Product Expedition
│       │
│       ├── EXP-HOME-018  Homepage Replay Projection
│       │       Product Expedition
│       │
│       ├── EXP-HOME-019  Artifact Projection Layer
│       │       Architecture Expedition
│       │
│       ├── EXP-HOME-020  Curated Demonstration Library
│       │       Product Expedition
│       │
│       ├── EXP-HOME-021  Mission Studio State Machine
│       │       Architecture Expedition
│       │
│       ├── EXP-HOME-022  Runtime Abstraction Layer
│       │       Architecture Expedition
│       │
│       ├── EXP-HOME-023  AI Operator Adapter
│       │       Architecture Expedition
│       │
│       └── EXP-HOME-024  Projection Contract
│               Architecture Expedition
│
├── Governance
│   │
│   ├── Review Gate #1 — Mission Studio Foundations
│   ├── Review Gate #2 — Homepage Experience
│   ├── Review Gate #3 — Runtime Integration
│   ├── Acceptance Gate — Homepage Release
│   └── Convergence Certification — Intent Preserved
│
└── Completion
    │
    └── Milestone D — Production Certification
        │
        ├── EXP-HOME-010  Responsive Implementation
        │       Engineering Expedition
        │
        ├── EXP-HOME-011  Accessibility
        │       Engineering Expedition
        │
        ├── EXP-HOME-012  Performance
        │       Engineering Expedition
        │
        ├── EXP-HOME-013  Motion System
        │       Design Expedition
        │
        ├── EXP-HOME-014  Documentation Integration
        │       Product Expedition
        │
        └── EXP-HOME-015  Production Certification
                Certification Expedition
```

---

## Milestones & Gates

Program 027 is delivered through the complete Governance Architecture v1.0 lifecycle defined in ADR-045:

```text
Genesis
    │
    ├── Refinement Gate   → before Intent Model approval
    ├── Alignment Gate    → before Mission approval
    │
    ▼
Synthesis
    │
    ├── Implementation
    │
    ▼
Governance
    │
    ├── Review Gate       → after implementation
    ├── Acceptance Gate   → before promotion
    └── Convergence Gate  → before completion
```

```text
Program 027
│
├── Genesis
│       Intent Model → Alignment Contract → Mission Approval
│
├── Synthesis
│   │
│   ├── Milestone A — Mission Studio Foundations
│   │       Review Gate A
│   │
│   ├── Milestone B — Homepage Experience
│   │       Review Gate B
│   │
│   └── Milestone C — Runtime Integration
│           Review Gate C
│
├── Governance
│       Acceptance Gate → Convergence Gate
│
└── Completion
        Milestone D — Production Certification
```

### Governance Lifecycle

Every expedition in Program 027 follows the lifecycle defined in ADR-045:

```text
Raw Intent
    │
    ▼
Refinement Gate
    │
    ├──────── Refined Intent
    │
    └──────── Clarification Requested
    │
    ▼
Intent Model
    │
    ▼
Alignment Gate
    │
    ├──────── Aligned
    │
    ├──────── Revision Required ──→ Refinement
    │
    ├──────── Rejected
    │
    └──────── Superseded
    │
    ▼
Mission Approved
    │
    ▼
Implementation
    │
    ▼
Review Gate
    │
    ├──────── Approve
    │
    ├──────── Approve with Conditions
    │
    ├──────── Revision Required ──→ Implementation
    │
    ├──────── Reject
    │
    ├──────── Supersede / Split / Merge / Escalate
    │
    ▼
Acceptance Gate
    │
    ├──────── Accepted
    │
    └──────── Rejected
    │
    ▼
Convergence Gate
    │
    ├──────── Certified ──→ Closed
    │
    └──────── Not Certified ──→ Revision
```

### Gate Packages

Each gate produces a governed package:

**Refinement Gate Package**
```text
Raw intent
Evidence
References
Constraints
Assumptions
Unknowns
Decision → Refined Intent / Clarification Requested
```

**Alignment Gate Package**
```text
Intent Model
Refined Intent
Alignment Contract
Reference Evidence
Allowed / Forbidden Interpretation
Reviewer
Decision → Aligned / Revision Required / Rejected / Superseded
```

**Review Gate Package**
```text
Refined Intent reference
Current implementation
Known divergence
Accepted divergence
Rejected divergence
Reviewer
Decision → Approve / Approve with Conditions / Revision Required / Reject / Supersede / Split / Merge / Escalate
Evidence
```

**Acceptance Gate Package**
```text
Review decision
Certification evidence
Stakeholder approvals
Rollout readiness
Reviewer
Decision → Accepted / Rejected
```

**Convergence Gate Package**
```text
Original Alignment Contract
Implementation evidence
Final result
Divergence detected
Divergence accepted
Reviewer
Decision → Certified / Not Certified
```

### Mission Studio Review Package

A new artifact bundles everything a Review Gate evaluates for the homepage:

```text
Mission Studio Review Package

- Current implementation (Storybook / deployed preview)
- Design boards (canonical references)
- Design tokens (LDS-002)
- Component catalog
- Screenshot comparisons
- Visual diff against baseline
- Acceptance checklist
- Divergence report
- Replay trace
```

This package is what the Review Gate actually evaluates. "Please review" is no longer sufficient.

**Stop condition:** No downstream expedition may begin while an upstream gate is awaiting any gate decision.

### Genesis

**Expeditions:** EXP-HOME-026, EXP-HOME-027, EXP-HOME-028

**Deliverable:** An approved Mission chartered from an aligned Alignment Contract.

**Genesis Acceptance:**
- Intent Model captures explicit and implicit homepage intent.
- Alignment Contract binds reference evidence (design boards, tokens, storyboards).
- Allowed and forbidden interpretations are explicit.
- Divergence Gate resolves to `aligned`.
- Mission Approval Gate authorizes the Mission.

### Milestone A — Mission Studio Foundations

**Expeditions:** EXP-HOME-001, EXP-HOME-002, EXP-HOME-003, EXP-HOME-025

**Deliverable:** One functioning Mission Studio shell (header, sidebar, workspace, footer) rendered in Storybook.

**Gate A Acceptance:**
- Implementation visually converges to accepted Mission Studio design boards.
- Storybook renders the complete workspace in light and dark themes.
- Every component derives exclusively from LDS-002 tokens.
- Mission Studio Review Package is approved by a human reviewer.

### Milestone B — Homepage Experience

**Expeditions:** EXP-HOME-004, EXP-HOME-005, EXP-HOME-006, EXP-HOME-007, EXP-HOME-008, EXP-HOME-009

**Deliverable:** The complete guided homepage experience, scroll-driven through all lifecycle phases, without runtime integration.

**Gate B Acceptance:**
- Homepage reproduces the complete storyboard.
- Scroll recordings demonstrate smooth phase transitions.
- Sidebar progression, artifact evolution, and workspace persistence are verified.
- Mission Studio Review Package is approved by a human reviewer.

### Milestone C — Runtime Integration

**Expeditions:** EXP-HOME-016, EXP-HOME-017, EXP-HOME-018, EXP-HOME-019, EXP-HOME-020, EXP-HOME-021, EXP-HOME-022, EXP-HOME-023, EXP-HOME-024

**Deliverable:** The homepage runtime powers the already-approved UI with zero visual regression.

**Gate C Acceptance:**
- Deterministic browser runtime produces artifacts for curated examples.
- Genesis and Replay projections feed the Artifact Projection Layer.
- Mission Studio State Machine drives the same UI approved at Gate B.
- Visual regression against Gate B baseline shows zero unintended changes.
- Mission Studio Review Package is approved by a human reviewer.

### Milestone D — Production Certification

**Expeditions:** EXP-HOME-010, EXP-HOME-011, EXP-HOME-012, EXP-HOME-013, EXP-HOME-014, EXP-HOME-015

**Deliverable:** A production-certified homepage ready for release.

**Gate D Acceptance:**
- Responsive, accessible, performant, and motion-validated.
- Documentation links are stable and validated.
- Production certification tests pass (unit, integration, E2E, visual regression, accessibility, performance).
- Acceptance Gate confirms the homepage is approved for release.
- Convergence Gate certifies intent has been preserved.

---

## Governance Certification

Program 027 has been certified under the full Governance Architecture v1.0 lifecycle. The following certifications have completed:

| Certification | Status | Evidence |
|---|---|---|
| **EXP-GOVERNABILITY-001** — Governability Regression | ✅ Pass (full) | `docs/governance/program-027/governability-regression-certification.json` |
| **EXP-GATE-012** — Three-Gate Model (Program 035) | ✅ Pass | `tests/gate-012-certification.test.js` |
| **EXP-REFINE-009** — Alignment Governance (Program 036) | ✅ Pass | `tests/refine-009-certification.test.js` |

**Certified capabilities:**
- Deterministic Proposal Evaluation (D01–D08 drift class rejection, V01–V04 valid branch admission)
- Divergence Gate automated resolution
- Review Gate lifecycle (approve, revision_required, condition tracking, superseded mapping)
- Acceptance Gate enforcement
- Convergence Certification (post-implementation intent comparison)
- Alignment Contract invalidation on Mission change
- Upstream-gate stop condition (dependent expedition blocking)
- Dependency enforcement (GATE-013, ADR-050)

**Governance artifacts:**
- `docs/governance/program-027/governability-regression-certification.json` — Full certification report
- `docs/governance/program-027/intent-model.json` — Refined Intent baseline
- `docs/governance/program-027/alignment-contract.json` — Alignment Contract baseline
- `docs/governance/program-027/alignment-review-package.md` — Alignment evidence package
- `docs/governance/program-027/replay-specification.json` — Drift class definitions
- `docs/governance/program-027/convergence-certification-criteria.md` — Convergence criteria
- `docs/governance/program-027/governability-benchmark.json` — Benchmark specification

---

## Incident Review and Governability Closure

> **Merged from `docs/expeditions/EXP-PROGRAM-027-incident-review.md`.**
>
> The standalone incident-review file has been merged into this program charter to preserve a single authoritative record for EXP-PROGRAM-027. The historical analysis below is retained verbatim; certification status has been updated to reflect completion.

### Executive summary

Program 027 was chartered to make Mission Studio the SYNTH homepage. It had strong specifications, design tokens, component catalogs, explicit anti-goals, and approved expeditions. Despite this, the implementation drifted toward a generic SaaS dashboard aesthetic. The agent was **compliant with the expedition definitions of done** but **not converged with the originating human intent**.

This was a **governability certification failure**, not an implementation failure. The existing lifecycle governed execution correctness but did not provide a repeatable way to prove it prevented intent drift. The gap has since been addressed by ADR-047 (Intent Refinement and Alignment Governance) and ADR-048 (Genesis Lifecycle and Alignment Contracts). The failure is now reconstructed as an immutable benchmark so that the replay can prove the failure mode is preventable.

### Timeline

| Phase | Artifact / gate | What happened |
|---|---|---|
| Charter | EXP-PROGRAM-027 | Mission Studio becomes the SYNTH homepage. |
| Design baseline | EXP-HOME-001, EXP-HOME-002, EXP-HOME-025 | Design language, component catalog, and anti-drift rules approved. |
| Synthesis | EXP-HOME-004 through EXP-HOME-018 | Implementation expeditions executed against their individual DoDs. |
| Observation | Homepage drift detected | Implementation accumulated generic dashboard patterns (metric cards, promotional sections, disconnected widgets) despite explicit anti-goals. |
| Diagnosis | ADR-047, ADR-048 | Root cause identified: no governed transformation from raw intent to executable understanding. |
| Corrective Genesis | EXP-HOME-026 | Intent Model captured explicit, implicit, forbidden, and allowed interpretations. |
| Corrective alignment | EXP-HOME-027 | Alignment Contract approved; Divergence Gate resolves to `aligned`. |
| Certification | EXP-GOVERNABILITY-001 / EXP-GOVERNABILITY-006B | Full-lifecycle deterministic replay certified. |

### The failure mode

The lifecycle began at the Mission artifact:

```text
Intent
  ↓
Mission
  ↓
Expedition
  ↓
Implementation
```

There was no governed checkpoint that asked:

> "Does the Mission artifact accurately represent the human intent?"

The Mission allowed an **interpretation space** containing many admissible outcomes — generic dashboards, marketing pages, chat interfaces, persistent workspaces — all consistent with the same specification. Governance failed because it did not collapse that space to acceptable interpretations. The expeditions had strong DoDs, but each DoD validated a narrow slice of output. The aggregate output could satisfy every expedition while violating the overall experience contract.

### Why existing governance did not catch it

| Existing mechanism | What it checked | Why it failed |
|---|---|---|
| Expedition DoDs | Per-expedition acceptance criteria | Each expedition was locally correct; no artifact checked global intent convergence. |
| Review Gates | Implementation against expedition spec | Specs did not encode the full intent; compliance ≠ convergence. |
| Design governance rules (EXP-HOME-025) | Visual rules and anti-patterns | Rules were advisory relative to expeditions, not binding at Mission creation. |
| Replay | Event determinism and state correctness | Replay verifies what was built, not whether it should have been built. |

### What changed

```text
Human Intent
      ↓
Intent Model
      ↓
Refinement Session
      ↓
Refined Intent Artifact
      ↓
Alignment Contract
      ↓
Reference Evidence Binding
      ↓
Divergence Gate  ←  NEW: alignment checkpoint
      ↓
Mission
      ↓
Expedition
      ↓
Implementation
      ↓
Review Gate
      ↓
Acceptance Gate
      ↓
Convergence Certification  ←  NEW: outcome-vs-intent check
```

| Artifact | Purpose | Introduced by |
|---|---|---|
| Intent Model | Capture explicit, implicit, forbidden, and ambiguous intent | ADR-047 |
| Refined Intent Artifact | Contract-ready interpretation | ADR-047 |
| Alignment Contract | Formal agreement between operator and SYNTH | ADR-047 / ADR-048 |
| Reference Evidence Binding | Bind requirements to images, designs, examples | ADR-048 |
| Divergence Gate | Block Mission creation until alignment is proven | ADR-047 / ADR-048 |
| Convergence Certification | Compare final outcome to original intent | ADR-047 / ADR-048 |

### Failure-to-fix traceability matrix

| Failure observed | Addressed by | Mechanism | Status |
|---|---|---|---|
| Multiple infrastructure choices for same operation | EXP-PLATFORM-002 | Canonical Internal SDK | ✅ Complete |
| Hidden construction inputs | EXP-PLATFORM-003 | Explicit timestamp/id parameters | ✅ Complete |
| Capability ambiguity | EXP-PLATFORM-001 | Canonical Infrastructure Matrix | ✅ Complete |
| Intent captured incorrectly | EXP-PROGRAM-036 / ADR-047 | Intent Model + Refinement Layer | ✅ Certified |
| Agreement not validated before execution | EXP-PROGRAM-036 / ADR-048 | Alignment Contract + Divergence Gate | ✅ Certified |
| Drift detected before implementation | Divergence Gate | `revision_required` / `rejected` states | ✅ Certified |
| Drift detected before merge | EXP-PROGRAM-035 / Review Gate | Review Gate, Acceptance Gate | ✅ Certified |
| Implementation-vs-intent convergence | Convergence Certification | Compare outcome to Alignment Contract | ✅ Certified |
| Authority ordering violations | ADR-046 | Runtime evaluates authority chain before representing state | ✅ Certified |

### Governability closure status

Closure is declared in `docs/strategy/governability-closure-roadmap.md`:

- Every identified drift class (D01–D08) has at least one replay that is intercepted before implementation.
- Every valid interpretation branch (V01–V04) remains admissible.
- Replay results are deterministic across three consecutive executions.
- Missing mechanisms are implemented and re-certified.

### Related artifacts

- `docs/adr/ADR-047-intent-refinement-and-alignment-governance.md`
- `docs/adr/ADR-048-genesis-lifecycle-and-alignment-contracts.md`
- `docs/strategy/governability-closure-roadmap.md`
- `docs/governance/program-027/intent-model.json`
- `docs/governance/program-027/alignment-contract.json`
- `docs/governance/program-027/refinement-report.json`
- `docs/governance/program-027/governability-benchmark.json`
- `docs/governance/program-027/governability-regression-certification.json`

---

Frozen Work

The following expeditions are **frozen** exactly as implemented. They are not to be rewritten or silently improved. They become baseline evidence for the new governance model.

```text
EXP-HOME-001  Mission Studio Design Language        → Implementation Complete
EXP-HOME-002  Mission Studio Component Catalog      → Implementation Complete
EXP-HOME-025  Mission Studio Design Governance      → Implementation Complete
```

Each frozen expedition will be evaluated through a Review Gate under Governance Architecture v1.0. Until then, they remain baseline candidates. No silent improvements are permitted.

---

## Phases

Program 027 is delivered in three architectural phases. Only Phase 1 is implemented in the current development cycle; Phases 2 and 3 are chartered for future evolution.

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
- **EXP-PROGRAM-035 — Intent Refinement & Review Governance** provides Review Gates, Acceptance Gates, and execution governance. Certified by EXP-GATE-012.
- **EXP-PROGRAM-036 — Intent Refinement & Alignment Governance** provides the Genesis Layer, Alignment Contract, and Divergence Gate. Certified by EXP-REFINE-009.
- **EXP-GATE-013 — Dependency Graph & Enforcement** provides runtime dependency enforcement between governance stages. Uses Policy Engine (ADR-050).
- **EXP-REFINE-015, EXP-REFINE-016** provide evidence-file and artifact-validation CLI commands.
- **ADR-045 — Governance Lifecycle & State Machine Specification** is the canonical lifecycle under which Program 027 executes.
- **ADR-047 — Intent Refinement and Alignment Governance** defines the alignment model certified by REFINE-009.
- **ADR-048 — Genesis Lifecycle and Alignment Contracts** defines the Genesis layer structure.
- **ADR-050 — Execution Gate State Dependency Enforcement** documents the certified freeze lift for GATE-013 dependency enforcement.

---

## Long-Term Vision

The Mission Studio Homepage becomes the canonical entry point for both human visitors and AI agents. It is a living projection of SYNTH: as the platform evolves, the homepage evolves with it. It proves that SYNTH's concepts are not abstract — they can be seen, touched, and experienced from the very first interaction.
