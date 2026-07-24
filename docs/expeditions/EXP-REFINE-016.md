# EXP-REFINE-016 — Artifact Scope & Completion Validation

> **Genesis expedition.** Enforce scope boundaries on artifact edits and auto-verify completion criteria against referenced deliverables.

**Status:** Proposed  
**Kind:** Genesis Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 1 — Refinement Model  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-REFINE-015  
**Blocks:** EXP-HOME-028

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Gap Identified

During the Program 027 governability gap analysis, two framework gaps were identified in how expedition artifacts are maintained and completed:

### Gap 1: Scope boundary is documentary only

Expedition charters contain `Allowed Work` / `Forbidden` tables and `Out of Scope` sections. When an agent or operator updates a charter (e.g., marking deliverables complete, updating status), there is no guard that distinguishes:
- **Factual update** — correcting a status to reflect reality
- **Scope expansion** — silently adding new deliverables or modifying the charter's objective

**Evidence:** During the charter update cycle, I personally updated 6 expedition files. To prevent scope drift, I had to consciously ask "Is this a factual update or scope expansion?" for every edit. The framework provided no tooling — only my own discipline prevented silent scope creep.

### Gap 2: Completion criteria are not auto-verified

Expedition charters list `Deliverables` and `Acceptance Criteria`. When a human or agent marks a deliverable as `✅ Complete`, there is no automatic check that the referenced file path exists, that the export matches the claimed interface, or that the deliverable's acceptance criteria are actually satisfied.

**Evidence:** In EXP-REFINE-008, I marked deliverables 1-4 as `✅ Complete`. I manually verified that `intent-model.json`, `alignment-contract.json`, and `convergence-certification-criteria.md` existed at their claimed paths. But nothing forced this — I could have marked them complete without checking, and no mechanism would have caught it.

---

## Objective

Make scope boundaries enforceable and completion criteria verifiable:

1. **Scope-locked artifact zones** — Define which sections of an expedition charter are mutable (status, implementation details) and which are frozen after approval (objective, scope, allowed/forbidden, deliverables).
2. **Completion verification** — When a deliverable is marked complete, auto-check that the referenced artifact exists, its fingerprint matches, and its acceptance criteria are satisfied.
3. **Edit classification** — Distinguish factual updates from scope changes; warn or block scope-expanding edits.

---

## Design

### Scope-locked charter sections

| Section | Mutable after approval? | Notes |
|---|---|---|
| Status | ✅ Yes | Factual tracking |
| Implementation Status | ✅ Yes | New evidence |
| Deliverables (status column) | ✅ Yes | Complete/pending toggle |
| Objective | ❌ No | Locked at approval |
| Scope Boundary (in/out) | ❌ No | Locked at approval |
| Allowed / Forbidden | ❌ No | Locked at approval |
| Deliverables (description) | ❌ No | Locked at approval |
| Acceptance Criteria | ❌ No | Locked at approval |
| Dependencies | ⚠️ With review | Requires re-approval |

### Completion verification

When marking deliverable `N` as `✅ Complete`:

```text
synth verify deliverable EXP-REFINE-008.1
```

Checks:
- The referenced file path exists.
- The file's fingerprint matches any claimed reference (if provided).
- The acceptance criteria referencing this deliverable are satisfiable (all referenced paths exist).

### Edit classification

When editing an expedition charter:

```text
synth check-edit EXP-REFINE-008.md --diff
```

Classifies each change as:
- `factual` — status updates, implementation evidence additions
- `scope` — changes to objectives, deliverables descriptions, allowed/forbidden
- `dependency` — changes to Depends On / Blocks

Scope changes require re-approval through the normal governance flow.

---

## Deliverables

1. **Scope-locked section schema** — Machine-readable delineation of frozen vs mutable charter sections.
2. **`synth verify deliverable <ref>` command** — Checks file existence, fingerprint, and acceptance criteria.
3. **`synth check-edit <file>` command** — Classifies edits into factual/scope/dependency categories.
4. **Integration tests** proving:
   - A factual edit to status is permitted.
   - A scope edit to deliverables is flagged and blocked.
   - Completion verification correctly identifies missing or stale deliverables.
5. **Documentation** of the scope enforcement and completion verification model.

---

## Acceptance Criteria

1. Charter scope boundaries are enforceable: factual edits proceed, scope edits require re-approval.
2. `synth verify deliverable` correctly validates file existence for `✅ Complete` claims.
3. `synth check-edit` correctly classifies edit types.
4. Existing tests pass; new scope-enforcement and verification tests pass.
5. No changes to Protected Assets.

---

## Out of Scope

- Automatic charter regeneration — the tool validates, it does not rewrite.
- Visual diff tooling for non-markdown artifacts.
- Enforcement against non-expedition documentation files.

---

## Relationship to Other Work

- **EXP-REFINE-015** — Evidence-Grounded Mission Drafting; this expedition extends the verification pattern from Mission creation to expedition maintenance.
- **EXP-GATE-013** — Dependency Graph Enforcement; this expedition handles artifact integrity; GATE-013 handles dependency ordering.
- **EXP-GATE-012 / EXP-REFINE-009** — Certification expeditions; this expedition ensures their charters remain consistent with reality before they execute.
- **ADR-045** — Governance Lifecycle; scope enforcement is a runtime check that aligns with the lifecycle's stop conditions.

---

## After EXP-REFINE-016

- Charter edits are classified and gated — no more silent scope creep.
- Completion claims are verified against real artifacts before they are relied upon.
- The framework has symmetric validation: evidence grounding at creation (REFINE-015), scope enforcement during maintenance (this expedition), dependency enforcement at execution (GATE-013), and convergence certification at completion (GOVERNABILITY-005).
