# Program Ownership Matrix

> Canonical mapping of every SYNTH expedition to exactly one program. Generated during the EXP-PROGRAM-039 documentation remediation canonicalization pass.

**Status:** Completed  
**Date:** 2026-07-24  
**Updated:** 2026-07-25 — Phase 0 Repository Baseline Closure  
**Authority:** EXP-PROGRAM-039 — Documentation Remediation Program  
**Verification:** `node scripts/verify-expedition-governance.js` passes with zero errors and zero warnings.

---

## Formerly orphan expeditions

The following expeditions were unassigned before this canonicalization pass. Each is now owned by exactly one canonical program.

| Expedition | Canonical Program | Status |
|---|---|---|
| EXP-CAPABILITY-BOUNDARY-001 | EXP-PROGRAM-040 — Repository Simplification | Completed |
| EXP-COMPLEXITY-AUDIT-001 | EXP-PROGRAM-040 — Repository Simplification | Completed and accepted |
| EXP-CONVERGENCE-001 | EXP-PROGRAM-027 — Mission Studio Homepage | Accepted |
| EXP-GOVERNANCE-ENFORCEMENT-001 | EXP-PROGRAM-040 — Repository Simplification | Completed and accepted |
| EXP-MUTATION-LIFECYCLE-001 | EXP-PROGRAM-040 — Repository Simplification | Completed and accepted |
| EXP-PLATFORM-001 | EXP-PROGRAM-041 — Platform Canonicalization | Completed |
| EXP-PLATFORM-002 | EXP-PROGRAM-041 — Platform Canonicalization | Completed |
| EXP-PLATFORM-003 | EXP-PROGRAM-041 — Platform Canonicalization | Completed |
| EXP-PLATFORM-004 | EXP-PROGRAM-041 — Platform Canonicalization | Completed |
| EXP-SIMPLIFICATION-001 | EXP-PROGRAM-040 — Repository Simplification | Completed and accepted |
| EXP-SIMPLIFICATION-002 | EXP-PROGRAM-040 — Repository Simplification | Completed |
| EXP-SIMPLIFICATION-003 | EXP-PROGRAM-040 — Repository Simplification | Completed |
| EXP-SIMPLIFICATION-ASSESSMENT-001 | EXP-PROGRAM-040 — Repository Simplification | Completed and accepted |

### Identity collision resolved

- `docs/expeditions/EXP-SIMPLIFICATION-003A.md` was renamed to `docs/expeditions/EXP-PLATFORM-002.md`.
- The canonical expedition ID is **EXP-PLATFORM-002**.
- `EXP-SIMPLIFICATION-003A` is preserved only as a historical reference inside the charter.
- All internal references in `docs/strategy/simplification-program.md` and the charter itself were updated.

---

## Program inventory

| Program | Name | Status |
|---|---|---|
| EXP-PROGRAM-001 | SYNTH Productization Program | Completed |
| EXP-PROGRAM-002 | SYNTH Public Release Program | Completed |
| EXP-PROGRAM-003 | SYNTH Validation Program | Completed |
| EXP-PROGRAM-004 | First Contact Program | Completed and accepted |
| EXP-PROGRAM-005 | Adaptive Validation Program | Completed |
| EXP-PROGRAM-006 | Discovery Platform | Completed |
| EXP-PROGRAM-007 | Environment Independence Program | Completed |
| EXP-PROGRAM-008 | Documentation & Projections | Completed |
| EXP-PROGRAM-009 | Canonical First Contact Experience | Closed — Superseded pending Era III revision |
| EXP-PROGRAM-010 | Constitutional Hardening Program | Completed and accepted |
| EXP-PROGRAM-011 | Operator Trust & CLI Integrity | Completed and accepted |
| EXP-PROGRAM-012 | Runtime Self-Description | Completed and accepted |
| EXP-PROGRAM-013 | Cognitive Continuity | Completed and accepted |
| EXP-PROGRAM-014 | Governance Maturation | Completed and accepted |
| EXP-PROGRAM-015 | Repository Versioning Capability | Completed and accepted |
| EXP-PROGRAM-016 | Governed Expedition Execution | Completed and accepted |
| EXP-PROGRAM-017 | Project Runtime Boundary Hardening Program | Completed and accepted |
| EXP-PROGRAM-018 | Foundation Architecture Program | Completed and accepted |
| EXP-PROGRAM-019 | Universal Initialization | Completed and accepted |
| EXP-PROGRAM-020 | Website Experience | Closed — Superseded by EXP-PROGRAM-027 |
| EXP-PROGRAM-021 | Incremental Governance | Completed |
| EXP-PROGRAM-022 | AI-Native First Contact | Completed and accepted |
| EXP-PROGRAM-023 | Genesis | Completed and accepted |
| EXP-PROGRAM-024 | Semantic Modeling | Completed and accepted |
| EXP-PROGRAM-025 | Canonical Knowledge & Validation | Completed and accepted |
| EXP-PROGRAM-026 | AI Agent Interoperability | Completed |
| EXP-PROGRAM-027 | Mission Studio Homepage | Completed and accepted |
| EXP-PROGRAM-028 | Repository & Release Governance | Completed |
| EXP-PROGRAM-029 | AI Ecosystem Distribution | Proposed |
| EXP-PROGRAM-030 | Intelligent Governance Orchestration | Completed and accepted |
| EXP-PROGRAM-031 | Architectural Convergence | Proposed |
| EXP-PROGRAM-032 | Operator Optimization Pipeline | Proposed |
| EXP-PROGRAM-034 | Task Orchestration Engine | Proposed |
| EXP-PROGRAM-035 | Intent Refinement & Review Governance | Completed and accepted |
| EXP-PROGRAM-036 | Intent Refinement & Alignment Governance | Completed and accepted |
| EXP-PROGRAM-037 | Ecosystem Adoption & Community Growth | Proposed |
| EXP-PROGRAM-038 | Audit Remediation | Proposed |
| EXP-PROGRAM-039 | Documentation Remediation Program | Completed and accepted |
| EXP-PROGRAM-040 | Repository Simplification | Completed |
| EXP-PROGRAM-041 | Platform Canonicalization | Completed |
| EXP-PROGRAM-043 | Agent Onboarding & Operator Experience | Proposed |

---

## Cross-program references

Some expeditions are referenced by multiple programs because they provide shared primitives. Ownership remains single; references are noted below.

| Expedition | Owner | Referenced by |
|---|---|---|
| EXP-CAPABILITY-BOUNDARY-001 | EXP-PROGRAM-040 | EXP-PROGRAM-038 (Audit Remediation) |
| EXP-PLATFORM-002 | EXP-PROGRAM-041 | EXP-PROGRAM-034 (Task Orchestration Engine), EXP-PROGRAM-040 (Repository Simplification) |
| EXP-CONVERGENCE-001 | EXP-PROGRAM-027 | EXP-PROGRAM-020 (closed, superseded) |

---

## Verification

```bash
node scripts/verify-expedition-governance.js
```

**Result:** ✅ All identity governance rules satisfied — 0 errors, 0 warnings.

---

## Rationale for new programs

Two new programs were chartered because the existing program inventory had no owner for the simplification and platform canonicalization work defined in `docs/strategy/simplification-program.md`:

- **EXP-PROGRAM-040 — Repository Simplification** owns the structural simplification expeditions (complexity audit, canonical state reduction, extension model unification, test infrastructure, and the pending mutation-boundary enforcement chain).
- **EXP-PROGRAM-041 — Platform Canonicalization** owns the internal SDK and infrastructure-ownership expeditions (canonical infrastructure audit, internal platform SDK, construction canonicalization, and utility extraction).

These programs are not ad-hoc containers; each groups multiple completed and proposed expeditions around a single strategic objective from the roadmap.

- **EXP-PROGRAM-043 — Agent Onboarding & Operator Experience** was chartered because real-world TaskPRO onboarding feedback exposed operator-friction gaps (black-box bootstrap, missing capability transparency, vague errors, and derived-state edit risk) that no existing program owns.
