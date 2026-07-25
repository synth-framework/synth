# Era IV — Post-v1.0 Portfolio Rebaseline

> **Status:** Active  
> **Last updated:** 2026-07-25  
> **Authority:** SYNTH Platform v1.0 Release (`@synth-framework/synth@2.4.1`)

---

## Purpose

With `v2.4.1` shipped and `v2.4.0` deprecated, SYNTH Platform v1.0 is the released baseline. Era III — Validation & Hardening is functionally complete.

This document performs a **Portfolio Rebaseline**: it classifies every remaining non-terminal program and expedition into one of five buckets so that future work has a clear home and the historical v1.0 record remains untouched.

---

## Platform Baseline

```text
SYNTH Platform v1.0

  Status:           Released
  npm package:      @synth-framework/synth@2.4.1
  GitHub release:   v2.4.1
  Deprecated:       v2.4.0
  Governance:       Certified
  Architecture:     Frozen
  Maintenance:      Patch releases only (2.4.x)
  Future work:      All new capabilities begin in Era IV
```

---

## Era transition

```text
Era III — Architecture & Release
  ✓ Completed

  ↓

Era IV — Ecosystem & Adoption
  Active
```

---

## Guiding principle

> **v1.0 is frozen.**
>
> No remaining item may change the kernel, SDK, event model, capability registry, governance lifecycle, or replay engine without becoming an explicit v2 architectural initiative.

---

## Release baseline

| Artifact | Version / State |
| --- | --- |
| npm package | `@synth-framework/synth@2.4.1` |
| GitHub release | `v2.4.1` |
| Deprecated | `@synth-framework/synth@2.4.0` |
| Governance | Certified, frozen |
| Platform surface | Frozen |

---

## Rebaseline buckets

| Bucket | Meaning | Action |
| --- | --- | --- |
| **Completed** | Delivered and historically closed | No further action |
| **Maintenance** | Bug fixes, security, docs, patch releases | Keep as open backlog |
| **v2 Roadmap** | Planned architectural evolution | Groom into Era IV programs |
| **Research** | Ideas without commitment | Move to draft or research tracks |
| **Archived** | No longer relevant | Close and note supersession |

---

## 1. Completed (to be closed formally)

These items are marked `Completed (pending acceptance)`. They delivered v1.0 capabilities and should be promoted to `Completed and accepted`.

### Discovery & reporting

- EXP-DISC-002 — Extraction Reporting
- EXP-DISC-003 — Adapter Introspection
- EXP-DISC-004 — Clean Machine Output
- EXP-DISC-005 — Runtime Integrity
- EXP-DISC-006 — Repository Identity

### Mission Studio homepage (v2)

- EXP-HOME-003 — Mission Studio UI Specification (v2)
- EXP-HOME-004 — Homepage / Mission Studio Integration (v2)
- EXP-HOME-005 — Intent Phase (v2)
- EXP-HOME-006 — Discovery Phase (v2)
- EXP-HOME-007 — Mission Phase (v2)
- EXP-HOME-008 — Expeditions Phase (v2)
- EXP-HOME-009 — Governance & Replay Phase (v2)
- EXP-HOME-010 — Responsive Implementation
- EXP-HOME-011 — Accessibility
- EXP-HOME-012 — Performance
- EXP-HOME-013 — Motion System
- EXP-HOME-014 — Documentation Integration
- EXP-HOME-015 — Production Certification (v2)
- EXP-HOME-016 — Homepage Runtime
- EXP-HOME-017 — Homepage Genesis Projection
- EXP-HOME-018 — Homepage Replay Projection
- EXP-HOME-019 — Artifact Projection Layer
- EXP-HOME-020 — Curated Demonstration Library
- EXP-HOME-021 — Mission Studio State Machine
- EXP-HOME-022 — Runtime Abstraction Layer
- EXP-HOME-023 — AI Operator Adapter
- EXP-HOME-024 — Projection Contract

### Release certification

- EXP-PROGRAM-042 — Release Certification — **Completed and accepted**

---

## 2. Maintenance

Small, non-architectural work that keeps v1.0 healthy. These do not need programs; they can live in a lightweight maintenance backlog.

- Security updates and dependency upgrades
- Documentation corrections
- Installer regressions (e.g., the `2.4.0 → 2.4.1` class of fix)
- Cross-platform install issues
- Patch releases (`2.4.x`)

---

## 3. v2 Roadmap

These are the candidate initiatives for Era IV. They are no longer "pending v1.0"; they are the next major evolution of the platform.

### Distribution & ecosystem

| Item | Theme | Status |
| --- | --- | --- |
| EXP-PROGRAM-029 — AI Ecosystem Distribution | AI Ecosystem | **Active** |
| EXP-DIST-001 — Canonical AI Capability Model | AI Ecosystem | Completed and accepted |
| EXP-DIST-002 — Agent Skill Projection Pipeline | AI Ecosystem | Completed and accepted |
| EXP-DIST-003 — SYNTH MCP Server | AI Ecosystem | **Executing** |
| EXP-DIST-004 — npm Package Distribution | Distribution | Proposed |
| EXP-DIST-005 — IDE Rules Projection | IDE Integration | Completed and accepted |

### Architecture convergence

| Item | Theme |
| --- | --- |
| EXP-PROGRAM-031 — Architectural Convergence | Convergence |
| EXP-GATE-013 — Gate State & Dependency Enforcement | Governance evolution |

### Operator experience

| Item | Theme |
| --- | --- |
| EXP-PROGRAM-032 — Operator Optimization Pipeline | Operator Experience |
| EXP-REFINE-010 — Interactive Decision Acquisition | Operator Experience |
| EXP-REFINE-014 — Mission Projection Capability | Operator Experience |

### Task orchestration

| Item | Theme |
| --- | --- |
| EXP-PROGRAM-034 — Task Orchestration Engine | Task Engine |

### Adoption & community

| Item | Theme |
| --- | --- |
| EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth | Adoption |
| EXP-ADOPT-001 — Brand Presence | Adoption |
| EXP-ADOPT-002 — Repository Readiness | Adoption |
| EXP-ADOPT-003 — Documentation Hub | Adoption |
| EXP-ADOPT-004 — Homepage Launch | Adoption |
| EXP-ADOPT-005 — Installation Experience | Adoption |
| EXP-ADOPT-006 — Examples Library | Adoption |
| EXP-ADOPT-007 — Video Library | Adoption |
| EXP-ADOPT-008 — Documentation Articles | Adoption |
| EXP-ADOPT-009 — Launch Campaign | Adoption |
| EXP-ADOPT-010 — Developer Outreach | Adoption |
| EXP-ADOPT-011 — Community Programs | Adoption |
| EXP-ADOPT-012 — OSS Contribution Experience | Adoption |
| EXP-ADOPT-013 — Conference Material | Adoption |
| EXP-ADOPT-014 — Social Media Assets | Adoption |
| EXP-ADOPT-015 — Content Calendar | Adoption |
| EXP-ADOPT-016 — AI Discoverability | Adoption |
| EXP-ADOPT-017 — Skill Ecosystem | Adoption |
| EXP-ADOPT-018 — Integration Showcase | Adoption |
| EXP-ADOPT-019 — Metrics | Adoption |
| EXP-ADOPT-020 — Launch Certification | Adoption |
| EXP-ADOPT-021 — Community Listening & Feedback Loop | Adoption |

---

## 4. Research / Incubation

These are not yet committed roadmap items. They should remain in draft or move to a research track until they have a clear v2 owner.

- EXP-GOV-023 — Agent Governance Adherence *(Draft)*
- EXP-REFINE-015 — Evidence-Grounded Mission Drafting
- EXP-REFINE-016 — Artifact Scope & Completion Validation

---

## 5. Archived / Superseded

These items are explicitly no longer relevant. Their current status should be preserved and, where necessary, linked to their successors.

| Item | Current status | Superseded by |
| --- | --- | --- |
| EXP-WEB-001 — Homepage Hero: Intent to Deterministic Result | Superseded | EXP-PROGRAM-027 / homepage work |
| EXP-FIRSTCONTACT-004 — Experience Projection System | Superseded | First-contact projection layer |
| EXP-PROGRAM-009 — Canonical First Contact Experience | Closed — Superseded by EXP-PROGRAM-027 | EXP-PROGRAM-027 |
| EXP-PROGRAM-020 — Website Experience | Closed — Superseded by EXP-PROGRAM-027 | EXP-PROGRAM-027 |

---

## Suggested Era IV themes

The v2 Roadmap items above naturally cluster into five themes:

1. **AI Ecosystem** — MCP server, canonical AI capability model, skill ecosystem
2. **Task Engine** — Task orchestration, operator optimization, mission projection
3. **Operator Experience** — Interactive decision acquisition, IDE integration, optimization pipeline
4. **Distribution** — npm distribution, packaging, discoverability, examples
5. **Community & Adoption** — Homepage, documentation hub, outreach, metrics

---

## Era IV readiness review

Applied acceptance criterion for every proposed item:

> **It must increase adoption or reduce operator effort.**

| Item | Advances adoption | Reduces operator effort | Assessment |
| --- | :---: | :---: | --- |
| EXP-PROGRAM-029 — AI Ecosystem Distribution | ✅ | ❌ | **Active** — first Era IV program |
| EXP-DIST-001 — Canonical AI Capability Model | ✅ | ❌ | Completed and accepted |
| EXP-DIST-002 — Agent Skill Projection Pipeline | ✅ | ❌ | Completed and accepted |
| EXP-DIST-005 — IDE Rules Projection | ✅ | ✅ | Completed and accepted |
| EXP-DIST-003 — SYNTH MCP Server | ✅ | ❌ | **Executing** — live MCP server exposing SYNTH tools |
| EXP-DIST-004 — npm Package Distribution | ✅ | ❌ | Keep proposed; core distribution |
| EXP-PROGRAM-031 — Architectural Convergence | ⚠️ | ⚠️ | Flag for review; structural rather than user-facing |
| EXP-GATE-013 — Gate State & Dependency Enforcement | ❌ | ⚠️ | Flag for review; governance correctness, not direct operator effort |
| EXP-PROGRAM-032 — Operator Optimization Pipeline | ❌ | ✅ | Keep proposed; pure operator effort reduction |
| EXP-REFINE-010 — Interactive Decision Acquisition | ❌ | ✅ | Keep proposed; operator effort reduction |
| EXP-REFINE-014 — Mission Projection Capability | ❌ | ✅ | Keep proposed; operator effort reduction |
| EXP-PROGRAM-034 — Task Orchestration Engine | ❌ | ✅ | Defer; major architecture, defer until ecosystem stabilizes |
| EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth | ✅ | ❌ | Keep proposed; pure adoption |
| EXP-ADOPT-001..021 | ✅ | ❌ | Keep proposed; adoption block |
| EXP-GOV-023 — Agent Governance Adherence | ❌ | ❌ | Move to Research |
| EXP-REFINE-015 — Evidence-Grounded Mission Drafting | ❌ | ✅ | Keep in Research; operator effort but not committed |
| EXP-REFINE-016 — Artifact Scope & Completion Validation | ❌ | ✅ | Keep in Research; operator effort but not committed |

### Flags

- **EXP-PROGRAM-031** and **EXP-GATE-013** should be explicitly justified before activation. They are architecture-facing and could expand conceptual surface area.
- **EXP-PROGRAM-034** is explicitly deferred. It changes the execution model and should wait until Era IV themes 1, 2, and 4 are stable.
- **EXP-GOV-023** does not clearly reduce operator effort or increase adoption in its current draft form. Keep in Research until it has a user-facing charter.

---

## Completed rebaseline actions

1. ✅ **Closed Program 042** — marked `Completed and accepted` now that `v2.4.1` is released.
2. ✅ **Promoted all `Completed (pending acceptance)`** HOME and DISC expeditions to `Completed and accepted`.
3. ✅ **Verified** the 4 superseded items point to the correct successors; added `Superseded By` to EXP-PROGRAM-009.

---

## Era IV governance rule

Every Era IV program must identify its adoption metric **before** it identifies its implementation plan.

| Program | Candidate adoption metric |
| --- | --- |
| EXP-PROGRAM-029 — AI Ecosystem Distribution | Number of supported AI ecosystems / integrations |
| EXP-PROGRAM-032 — Operator Optimization Pipeline | Time to complete common operator workflows |
| EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth | Successful first-time users and community engagement |
| EXP-PROGRAM-031 — Architectural Convergence | Defer until ecosystem feedback justifies convergence |
| EXP-PROGRAM-034 — Task Orchestration Engine | Reduction in orchestration complexity after ecosystem maturity |

This shifts governance from *"build this capability"* to *"improve this measurable outcome."*

## Suggested Era IV progression

```text
EXP-PROGRAM-029  AI Ecosystem Distribution
        ↓
EXP-PROGRAM-037  Community & Adoption
        ↓
EXP-PROGRAM-032  Operator Optimization
        ↓
EXP-PROGRAM-031  Architectural Convergence
        (only after significant ecosystem feedback)
        ↓
EXP-PROGRAM-034  Task Engine
        (largest architectural investment)
```

**Program 029 is the recommended first activation.** It creates value outside the repository by making SYNTH available in Claude, Codex, Cursor, Gemini, VS Code, and MCP ecosystems. Program 032 is multiplicative but only improves users who have already adopted SYNTH.

## Recommended next actions

1. ✅ **Activate EXP-PROGRAM-029** — active with adoption metric: number of supported AI ecosystems / integrations.
2. ✅ **Complete EXP-DIST-001** — canonical model, projection engine, and contract tests are done.
3. ✅ **Complete EXP-DIST-002** — agent skills expanded to Claude, Codex, ChatGPT, Gemini.
4. ✅ **Complete EXP-DIST-005** — IDE rules completed for Cursor, Cline, Windsurf, Roo, Aider, Continue.dev.
5. **Complete EXP-DIST-003** — live MCP server exposing SYNTH tools.
6. **Create Era IV program proposals** for remaining themes, or leave them as `Proposed` until intentional planning begins.
4. **Move research items** to a dedicated `research/` or `incubation/` track with no delivery commitment.
5. **Establish a maintenance backlog** document for `2.4.x` patch work.

---

## Notes

- This roadmap describes the post-v1.0 portfolio state after the Era III → Era IV transition.
- No source code changes are implied by this document.
- Any item that proposes changing the v1.0 frozen architecture must be chartered as a new Era IV program rather than slipped into maintenance.
