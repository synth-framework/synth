# EXP-PROGRAM-028 — Repository & Release Governance

**Status:** Completed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Version control, branching, promotion, versioning, releases, and forge interactions as governed SYNTH subsystems  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **Git and forge interactions should not remain incidental implementation details. SYNTH must govern repository evolution as a deterministic subsystem, with adapters for different hosting platforms and versioning strategies.**

Programs 022–024 establish how intent becomes governed knowledge and validated execution. Program 026 exposes those capabilities to AI agents. Program 028 completes the lifecycle by making **repository evolution** itself governed: branches, promotions, versions, releases, and forge interactions become replayable, auditable artifacts rather than manual Git operations.

---

## Purpose

Create a governed repository and release model that enables SYNTH to:

- Treat repositories as state machines, not file collections.
- Standardize branch taxonomy across all SYNTH projects.
- Make promotion a governed event with required evidence.
- Infer semantic versioning from Missions, Expeditions, and Evidence.
- Interact with forges through a common adapter contract.
- Treat pull requests as governance artifacts.
- Support multiple versioning strategies through adapters.

---

## Core Abstractions

### Repository

A governed container of project history, governed by SYNTH lifecycle rules.

### Branch Taxonomy

Canonical branches with deterministic semantics:

```text
main          — production truth
release/*     — stabilization branches
mission/*     — mission work branches
expedition/*  — expedition work branches
hotfix/*      — emergency fixes
```

### Promotion

A governed transition from one lifecycle stage to another, requiring evidence and approval.

```text
Discovery
      ↓
Mission Approved
      ↓
Expedition Complete
      ↓
Governance PASS
      ↓
Promote
      ↓
Release
```

### Version

A semantic or calendar identifier derived from canonical project knowledge and replay.

### Release

A governed publication event tied to a version, evidence, and deployment target.

### Forge

An abstract platform providing repository services: pull requests, reviews, checks, releases, labels.

### Pull Request

A governance artifact containing Mission, Expedition, Evidence, Replay, and Risk.

---

## Program Composition

```text
EXP-PROGRAM-028
Repository & Release Governance
│
├── EXP-REPO-001  Repository Governance Model
│       Architecture Expedition
│       Define repository as a governed state machine and forge abstraction.
│
├── EXP-REPO-002  Branch Taxonomy
│       Architecture Expedition
│       Standardize branch types and lifecycle semantics.
│
├── EXP-REPO-003  Promotion Pipeline
│       Architecture Expedition
│       Define governed transitions from expedition completion to release.
│
├── EXP-REPO-004  Semantic Version Governance
│       Architecture Expedition
│       Infer MAJOR/MINOR/PATCH from missions, evidence, and contracts.
│
├── EXP-REPO-005  Forge Adapter Contract
│       Architecture Expedition
│       Define the common interface for GitHub, GitLab, Bitbucket, Azure, Forgejo.
│
├── EXP-REPO-006  Pull Request Contract
│       Product Expedition
│       Treat PRs as governance artifacts generated from SYNTH state.
│
└── EXP-REPO-007  Release Governance
        Product Expedition
        Govern version tagging, release notes, and deployment promotion.
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
| Defining repository governance models | Modifying Protected Assets |
| Standardizing branch taxonomy | Changing Mission or Expedition lifecycle semantics |
| Creating forge adapter contracts | Bypassing ExecutionGate for mutations |
| Defining promotion and release events | Hardcoding GitHub-specific logic as canonical |
| Implementing versioning adapters | Repository-specific hard-coding |

### Hard Constraints

> **Repository as state machine:** A repository is governed by lifecycle rules, not arbitrary Git operations.
>
> **Forge abstraction:** GitHub is one adapter implementation among many.
>
> **Determinism:** The same project state and promotion request produce the same version and release artifacts.
>
> **Evidence-driven promotion:** No promotion without passing governance and attached evidence.
>
> **Auditability:** Every promotion, release, and forge mutation is recorded as a SYNTH event.

---

## Out of Scope

- Internal governance implementation (Programs 021, 022).
- Mission semantics, Expedition semantics, knowledge modeling (Programs 022–024).
- AI agent interoperability (Program 026).
- Specific IDE or MCP client integrations (Program 029).

This program is concerned solely with repository and release evolution as governed SYNTH concepts.

---

## Success Criteria

A SYNTH project should be able to:

- Define its branch taxonomy and versioning strategy in the project manifest.
- Promote completed Expeditions through a governed pipeline.
- Infer the next semantic version from canonical state.
- Open, update, and merge pull requests through a forge adapter.
- Produce releases with deterministic notes and evidence.
- Replay repository-level decisions from the event log.

without manual Git commands or forge-specific scripting.

---

## Relationship to Other Work

- **EXP-PROGRAM-021 — Incremental Governance** provides the performance foundation for repository validation.
- **EXP-PROGRAM-022 — Genesis** may request repository strategy during greenfield onboarding.
- **EXP-PROGRAM-026 — AI Agent Interoperability** agents will consume repository metadata produced by this program.
- **EXP-PROGRAM-029 — AI Ecosystem Distribution** distributes repository templates, Actions, and release artifacts produced by this program.
- **ADR-037 — Shell-Safe Command Construction** governs how SYNTH emits forge CLI commands.
