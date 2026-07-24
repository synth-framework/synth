# EXP-PROGRAM-020 — Website Experience

> **Program charter.** This document defines the Website Experience program for the SYNTH public website and its derived onboarding surfaces.

**Status:** Closed — Superseded by EXP-PROGRAM-027  
**Started:** 2026-07-18  
**Closed:** 2026-07-20  
**Kind:** Product Program  
**Priority:** High  
**Depends On:** EXP-PROGRAM-004, EXP-PROGRAM-009  
**Superseded By:** EXP-PROGRAM-027 — Mission Studio Homepage

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

Own the SYNTH public website as a deterministic projection of product intent. The website is not a separate creative effort; it is the first contact surface that translates SYNTH's value proposition into an experience a visitor can understand in under one minute.

---

## Objective

- Make the SYNTH value proposition immediately comprehensible to first-time visitors.
- Demonstrate SYNTH in action through interactive, scenario-driven hero experiences.
- Keep website copy, structure, and assets synchronized with the canonical product narrative.
- Treat design work as governed artifacts with traceable intent, evidence, and acceptance criteria.

---

## Convergence

This program has been superseded by **EXP-PROGRAM-027 — Mission Studio Homepage**. The overlap was reviewed in **EXP-CONVERGENCE-001**. Program 027 absorbs all 020 scope and reframes the homepage as the first interactive projection of the SYNTH lifecycle rather than a separate marketing surface. EXP-WEB-001 is superseded and its scenario content feeds into EXP-HOME-003.

---

## Problem Statement

The current website explains SYNTH, but it does not yet *demonstrate* SYNTH. A visitor can read what SYNTH does, but they cannot see how intent becomes a governed, deterministic result.

The homepage should answer:

> "I have an idea, an existing project, or a pile of documents. How does SYNTH turn that into the result I planned?"

---

## Scope

### Included

- Homepage hero design and copy.
- Scenario-driven interactive demonstrations.
- Design system decisions for the public website.
- Projection of canonical product narrative into website pages.
- Verification that website copy aligns with expedition charters and public vocabulary.

### Explicitly not included

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
EXP-PROGRAM-020  Website Experience
        |
        +-- EXP-WEB-001  Homepage hero
        +-- EXP-WEB-002  Scenario pages
        +-- EXP-WEB-003  Design system
```

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

- A first-time visitor can state SYNTH's purpose after 30 seconds on the homepage.
- Interactive scenarios accurately reflect the behavior of `synth init`, `synth mission create`, `synth expedition create`, and `synth approve` workflows.
- Website copy passes a public-vocabulary audit.
