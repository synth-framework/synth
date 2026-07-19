# EXP-PROGRAM-020 — Website Experience

> **Program charter.** This document defines the Website Experience program for the SYNTH public website and its derived onboarding surfaces.

**Status:** Accepted  
**Started:** 2026-07-18  
**Kind:** Product Program  
**Priority:** High  
**Depends On:** EXP-PROGRAM-004, EXP-PROGRAM-009  
**Blocks:** Future public narrative and onboarding improvements

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

## Purpose

Own the SYNTH public website **infrastructure** so that the user-facing experience built by EXP-PROGRAM-027 is deployable, discoverable, accessible, and performant.

> **Convergence decision:** All user-facing homepage, scenario, and design-system work moves to EXP-PROGRAM-027 — Mission Studio Homepage. Program 020 is now the infrastructure layer beneath it.

---

## Objective

- Provide production-grade hosting and deployment for the SYNTH public website.
- Ensure the website is fast, accessible, and search-engine discoverable.
- Keep website copy, structure, and assets synchronized with the canonical product narrative.
- Treat infrastructure decisions as governed artifacts with traceable intent, evidence, and acceptance criteria.

---

## Problem Statement

The current website explains SYNTH, but it does not yet *demonstrate* SYNTH. A visitor can read what SYNTH does, but they cannot see how intent becomes a governed, deterministic result.

The homepage should answer:

> "I have an idea, an existing project, or a pile of documents. How does SYNTH turn that into the result I planned?"

---

## Scope

### Included

- Hosting, build, and deployment pipeline for the public website.
- SEO, analytics, and performance instrumentation.
- Accessibility and responsiveness certification.
- Verification that website copy aligns with expedition charters and public vocabulary.

### Explicitly not included

- Homepage hero design and copy (moved to EXP-PROGRAM-027).
- Scenario-driven interactive demonstrations (moved to EXP-PROGRAM-027).
- Design system decisions (superseded by EXP-HOME-001 / LDS-002).
- Changes to SYNTH architecture, CLI, or governance model.
- Non-public tooling or internal dashboards.
- Rebranding outside the established SYNTH identity.

---

## Relationship to other programs

```text
EXP-PROGRAM-004  Public Narrative
        |
        v
EXP-PROGRAM-009  Canonical First Contact Experience
        |
        v
EXP-PROGRAM-027  Mission Studio Homepage  (user-facing experience)
        |
        v
EXP-PROGRAM-020  Website Experience  (infrastructure)
```

**Expedition reconciliation:**

- **EXP-WEB-001** — Homepage hero. **Rewrite** to align with EXP-HOME-001 / LDS-002; move under EXP-PROGRAM-027.
- **EXP-WEB-002** — Scenario pages. **Rewrite** to align with EXP-PROGRAM-027; no file exists yet.
- **EXP-WEB-003** — Design system. **Archive**; superseded by EXP-HOME-001 / LDS-002.

---

## Governance

### Protected

- Public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Deterministic projection model: website copy must trace to a canonical source.
- First Contact semantics and trajectory patterns.

### Not included

- Protected Assets internal to SYNTH runtime.
- Event model or governance model changes.

---

## Success metrics

- The website deploys automatically from the canonical source.
- Core Web Vitals and accessibility audits pass.
- Website copy passes a public-vocabulary audit.
- Analytics and SEO metadata are present and accurate.
