# EXP-PROGRAM-039 — Documentation Remediation Program

**Status:** Active  
**Kind:** Program  
**Priority:** Medium  
**Authority:** Synth Architectural Constitution  
**Scope:** Governance documentation integrity  
**Era:** III — Architecture  
**Architecture Impact:** Low  
**Constitutional Impact:** Low  
**Public Impact:** Low  
**Execution Impact:** Medium

---

## Thesis

> **Governance documentation must remain as deterministic as the runtime it describes.**
>
> As SYNTH's governance model matures, the documentation that records programs, expeditions, incidents, and certifications accumulates drift: duplicate files, stale references, outdated statuses, and orphaned artifacts. This program treats documentation integrity as a first-class governance concern and remediates it through chartered expeditions.

---

## Purpose

Maintain the accuracy, traceability, and structural integrity of SYNTH governance documentation by:

1. Merging duplicate or overlapping program and expedition artifacts.
2. Updating references when files are moved, renamed, or merged.
3. Reconciling expedition statuses with actual implementation state.
4. Assigning orphaned expeditions to the correct programs or archiving them.
5. Recording the rationale for every documentation change.

---

## Core Abstraction — Documentation as Governance State

SYNTH documentation is not auxiliary. It is part of the governed state of the project:

```text
Runtime behavior
      ↓
Events
      ↓
Derived state
      ↓
Governance documentation  ←  must be consistent with runtime
```

When documentation drifts from implementation, the replay graph loses explanatory power. This program keeps the documentation layer aligned.

---

## Program Composition

```text
EXP-PROGRAM-039
Documentation Remediation Program
│
├── EXP-DOC-003  Merge Program 027 Incident Review into Charter
│       Merge docs/expeditions/EXP-PROGRAM-027-incident-review.md
│       into docs/expeditions/EXP-PROGRAM-027.md and remove the duplicate.
│
├── EXP-DOC-004  Update Program 027 Governability References
│       Update docs/strategy/governability-closure-roadmap.md
│       and docs/governance/program-027/*.json references to the merged artifact.
│
└── EXP-DOC-005  Reconcile Expedition Statuses for Programs 035 and 036
        Update child expedition statuses that lag behind parent program status.
```

---

## Protected Assets

- Program and expedition identifier conventions.
- Prefix registry (`docs/expeditions/prefix-registry.json`).
- Governance artifact paths referenced by tests and certification reports.

Any change to these assets requires explicit chartering and reference updating.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Merging duplicate documentation artifacts | Deleting certification evidence without migration |
| Updating references after a merge | Changing runtime behavior under the guise of documentation cleanup |
| Reconciling stale expedition statuses | Marking incomplete expeditions as completed without evidence |
| Archiving superseded artifacts with a redirect note | Silently removing files that are referenced by tests |

---

## Out of Scope

- Runtime implementation changes.
- Kernel or governance semantic changes.
- New architectural concepts.
- Large-scale website or homepage content rewrites.

---

## Success Criteria

- Every active program has exactly one authoritative program document.
- Every referenced file exists at the path recorded in referring artifacts.
- Expedition statuses reflect actual implementation state.
- Every documentation change has a recorded rationale.
- `npm run govern` documentation-integrity checks pass.

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** — receives the incident-review merge.
- **EXP-PROGRAM-035 / 036** — child expedition statuses are reconciled under this program.
- **docs/expeditions/prefix-registry.json** — DOC prefix is already registered for documentation remediation expeditions.

---

## Long-Term Vision

Documentation remediation becomes a routine governance hygiene activity. Future documentation drift is caught early by validation checks, and every structural doc change is chartered, traced, and replayable.
