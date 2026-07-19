# EXP-DISCOVERY-001 — Repository Discovery & Brownfield Genesis

> **Discovery expedition.** This charter defines a read-only Discovery phase that establishes an evidence-backed baseline for existing projects before SYNTH governance is initialized.

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-19  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-AX-002, EXP-INIT-001  
**Blocks:** Brownfield Genesis missions

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

Introduce a deterministic, read-only Discovery phase that establishes an evidence-backed baseline for existing projects before SYNTH governance is initialized.

---

## Problem Statement

Current Brownfield adoption conflates two independent concerns:

1. Understanding an existing repository.
2. Initializing SYNTH governance.

This causes governance initialization to occur before the project has been assessed, allowing implementation changes during what should be an observational phase.

As a result:

- Repository inspection is no longer deterministic.
- The inspected system changes during assessment.
- Generated Missions are based on repository metadata instead of project intent.
- Governance begins without an approved baseline.

---

## Motivation

A project that predates SYNTH should first be understood.

Only after the operator approves an accurate representation of the project's current state should SYNTH establish governance.

Discovery is therefore a prerequisite for Brownfield Genesis.

---

## Goals

The Discovery phase shall:

- Be completely read-only.
- Produce identical results when run repeatedly against the same repository.
- Build an evidence-backed model of the project.
- Detect inconsistencies without modifying them.
- Stop before governance initialization.

---

## Non-Goals

Discovery shall not:

- Create `.synth/`
- Generate Missions
- Generate Expeditions
- Modify `package.json`
- Create scripts
- Repair the repository
- Execute governance
- Produce events

---

## Lifecycle

```text
Repository
        |
        v
    Discovery
        |
        v
  Baseline Report
        |
        v
 Operator Approval
        |
        v
Brownfield Genesis
        |
        v
     Mission
        |
        v
  Expeditions
        |
        v
   Execution
```

---

## Discovery Outputs

### Repository Summary

- Languages
- Frameworks
- Build system
- Runtime
- Package managers
- Deployment configuration

### Knowledge Inventory

Discovered sources of truth:

- README
- `knowledge/`
- ADRs
- Architecture documents
- Specifications
- Tickets
- Tests
- CI configuration
- Database schema

### Capability Model

For every identified capability:

- Name
- Status: Complete, Partial, Planned, or Missing
- Confidence
- Supporting evidence

### Current State

Assessment of:

- Architecture
- Documentation
- Implementation
- Knowledge coverage
- Test coverage
- Governance presence

### Conflict Report

Examples:

- Documentation differs from implementation.
- Tests reference missing functionality.
- Specifications conflict with source.
- Missing dependencies.
- Broken scripts.

### Unknowns

Explicitly identify areas where insufficient evidence prevents confident conclusions.

### Confidence Report

Every major conclusion shall include:

- Evidence references
- Confidence score
- Unknown impact

Confidence computation must be transparent and reproducible.

### Recommended Mission

Discovery may recommend a Mission. It shall never approve or create one.

---

## Acceptance Criteria

A successful Discovery:

- [ ] Produces no repository modifications.
- [ ] Produces no governance artifacts.
- [ ] Produces no events.
- [ ] Produces no canonical state.
- [ ] Produces a deterministic baseline.
- [ ] Can be rerun with identical output if the repository is unchanged.

---

## Brownfield Genesis Changes

`bootstrap` shall require an approved Discovery baseline.

If none exists:

```text
No approved Discovery baseline found.

Brownfield repositories must be assessed before governance can begin.

Run:

  synth discover
```

---

## CLI Changes

Introduce a new command:

```bash
synth discover
```

Possible options:

```bash
synth discover
synth discover --json
synth discover --report
synth discover --refresh
```

---

## Architectural Principles

This expedition establishes the following invariant:

> **Understanding precedes governance.**

Inspection must never modify the system being inspected.

Governance begins only after an approved understanding of the current state exists.

---

## Expected Outcome

After completion:

- Greenfield and Brownfield projects follow distinct entry paths while converging into the same governance lifecycle.
- Brownfield adoption becomes deterministic and reproducible.
- Missions are synthesized from project intent rather than repository metadata.
- Operators review an evidence-backed baseline before any governance artifacts or implementation changes occur.
- Repository assessment and governance initialization become cleanly separated responsibilities.

---

## Governance

### Protected

- Discovery intent
- Read-only boundary
- Evidence model
- Baseline report format

### Not included

- SYNTH architecture changes
- CLI command semantics beyond `synth discover`
- Governance model changes
- Event model changes
- Mission creation automation

---

## Related Documents

- [EXP-PROGRAM-004 — First Contact Program](EXP-PROGRAM-004.md)
- [EXP-INIT-001 — Adapter-based Project Bootstrap](EXP-INIT-001.md)
- [docs/first-contact/experience-v2.md](../first-contact/experience-v2.md)
