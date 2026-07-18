# EXP-PROGRAM-017 — Project Runtime Boundary Hardening Program

**Status:** Completed and accepted  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Harden the boundary between a SYNTH-governed project and its runtime state  
**Era:** II — Adoption  
**Architecture Impact:** Medium  
**Constitutional Impact:** Low  
**Public Impact:** Medium  
**Product Impact:** Medium  
**Execution Impact:** Low  
**Depends On:** EXP-PROGRAM-007  
**Blocks:** None

---

## Thesis

> A SYNTH-governed project should keep its runtime identity and runtime state inside a single, obvious, version-control-agnostic boundary.

---

## Purpose

Consolidate the runtime data of a SYNTH-governed project under the `.synth/` directory, separate derived artifacts from authority data, and ensure the source code of SYNTH itself never depends on the presence of a `.synth/` directory to build or test.

This program addresses follow-up work discovered after the Environment Independence Program closed, specifically the observation that v2 stores durable runtime authority in a repo-root `data/` directory rather than co-locating it with the project manifest.

---

## Problem Statement

After EXP-PROGRAM-007, the SYNTH Core is environment-independent, but the layout of a governed project still scatters state:

```
.synth/
  manifest.json       <- project identity
data/
  event-log.jsonl     <- durable authority
drafts/
canonical-state.json
...
```

This split:

- Pollutes the repository root with mutable runtime state.
- Makes the project layout harder to explain (`data/` looks like user data, not system state).
- Forces `.gitignore` to ignore a separate `data/` directory in addition to `.synth/data/`.
- Blurs the boundary between the SYNTH source repository and a SYNTH-governed project.

The source code of SYNTH must not require `.synth/` to exist; `.synth/` belongs to the project being governed, not to the tool that governs it.

---

## Guiding Principles

EXP-PROGRAM-017 shall:

- keep runtime authority and projections inside the governed project boundary (`.synth/data/`)
- leave derived artifacts (`proof/`) at the repository root unless a later expedition decides otherwise
- preserve the Constitutional Freeze
- preserve the public vocabulary
- make migration from the legacy `data/` layout automatic and lossless
- ensure the SYNTH source repository builds and tests without `.synth/`

EXP-PROGRAM-017 shall not:

- redesign Mission Studio, Genesis, Replay, or the Event Model
- change the authority model (event log remains authority; state remains projection)
- introduce new public concepts
- make the SYNTH compiler or core test suite depend on `.synth/`

---

## Constitutional Invariant

> **Project identity and project runtime state belong together.** A SYNTH-governed project is self-describing when its orientation artifact (`manifest.json`) and its runtime data live under the same project boundary (`./.synth/`).

---

## Program Composition

```text
EXP-PROGRAM-017
Project Runtime Boundary Hardening Program
│
└── EXP-ENV-013  Co-locate Runtime Data Under `.synth/`
       Environment Independence / Repository Layout
       Move runtime authority and projections from repo-root `data/`
       into `.synth/data/`; provide lossless migration.
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

Any change to a Protected Asset requires an Architecture Decision Record and explicit constitutional approval.

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. The event log remains the sole durable authority.
4. Canonical state remains a replay projection.
5. A governed project's runtime data lives under `./.synth/data/`.
6. The SYNTH source repository builds and passes core tests without a `.synth/` directory.
7. Legacy projects with repo-root `data/` migrate automatically without data loss.

---

## Success Criteria

- New SYNTH-governed projects create `.synth/data/` instead of `data/`.
- Existing governed projects with `data/` migrate automatically to `.synth/data/`.
- `synth explain replay` and `synth validate` continue to work on migrated projects.
- The SYNTH source tree builds and tests cleanly with no `.synth/` directory.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [x] EXP-ENV-013 completed and accepted.
- [x] Program accepted.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-PROGRAM-007.md` | Preceding Environment Independence Program. |
| `docs/expeditions/EXP-ENV-013.md` | First expedition under this program. |
| `docs/architecture/constitutional-baseline.md` | Defines Protected Assets and the freeze. |
