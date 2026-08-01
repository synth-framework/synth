# Convergence Review Record — Program 043 (Post-Implementation)

**Review ID:** EXP-REVIEW-003  
**Authority:** ADR-039 — Architectural Convergence Review  
**Date:** 2026-08-01  
**Reviewer:** Synth architectural baseline + Program 031 gating function  
**Program reviewed:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Outcome:** **CONVERGED** (with required Phase 3 and Workstream F actions)

---

## Program summary

`EXP-PROGRAM-043` closes the gap between SYNTH's sound governance kernel and the rough onboarding experience reported during the TaskPRO migration. Workstreams A–E have merged:

| Workstream | Status | Key deliverables |
|---|---|---|
| A — Guided Onboarding | Complete | `EXP-ONBOARD-001` (`synth first-contact`) |
| B — Actionable CLI Output | Complete | `EXP-CLI-002` (`--human`), `EXP-CLI-003` (list commands), `EXP-EXPLAIN-001` (actionable status), `EXP-DRYRUN-001` (dry-run), `EXP-OUTPUT-001` (clean output) |
| C — Capability Transparency | Complete | `EXP-CAPTRANS-001` (`synth capabilities`), `EXP-CAPTRANS-002` (graceful degradation), `EXP-ADP-001` (repository adapter surface) |
| D — Derived-State Protection & Guardrails | Complete | `EXP-GUARD-001` (derived-file edits rejected), `EXP-SCOPE-001` (expedition scope), `EXP-GATE-014` (completion gate) |
| E — Evidence, Audit & Tooling | Complete | `EXP-EVIDENCE-001` (evidence capture), `EXP-EVENTLOG-001` (`synth log`), `EXP-AGENTS-001` (AGENTS.md sync) |
| F — Agent Identity & Trust | Deferred | `EXP-IDENTITY-001`, `EXP-SIGN-001`, `EXP-APPROVAL-001`, `EXP-GIT-001` remain draft |

`EXP-PROGRAM-034` has left design phase and now provides a canonical task engine (`synth task run`, `synth task list`, `synth task explain`, `synth task doctor`) consumed by CI as of `EXP-TASK-007`.

---

## ADR-039 questionnaire

### 1. Is the charter still valid?

**Yes.** The original TaskPRO evidence — bootstrap black box, missing capability transparency, vague errors, mixed log/JSON streams, editable derived state, and no expedition scope — is still valid. Workstreams A–E directly address those pain points and have passing tests.

### 2. Are the acceptance criteria still correct?

**Mostly yes, with one tracker correction needed.**

The success criteria in `EXP-PROGRAM-043.md` are still correct and testable. However, the Definition of Done lists Workstream E as incomplete (`[ ]`) even though its three charters are marked `[COMPLETED]` in the workstream section. The tracker must be reconciled: mark Workstream E complete once `npm run govern` passes with the merged charters.

### 3. Has `EXP-PROGRAM-034` superseded or duplicated any 043 objectives?

**No supersession; one integration boundary to enforce.**

034 owns the canonical task engine. 043 owns the operator/agent experience. 043 must not build its own task runner or dependency graph. Phase 3 of 043 (migrate first-contact to the 034 task engine) is the natural consumption boundary, not duplication.

### 4. Do the remaining expeditions still represent the preferred implementation?

**Yes, with individual gates.**

Workstream F expeditions (`EXP-IDENTITY-001`, `EXP-SIGN-001`, `EXP-APPROVAL-001`, `EXP-GIT-001`) are the right direction, but each must pass its own Convergence Review if it touches Protected Assets or the event model. Identity and signing in particular may affect the Event Model and therefore require explicit architecture review.

### 5. Should any completed expeditions be rewritten to consume the 034 task engine?

**Not rewritten; a new charter should handle the migration.**

The existing charters are correct for their scope. The Phase 3 migration should be chartered separately (e.g., `EXP-MIGRATE-002` or `EXP-ONBOARD-002`) so that 043 consumes 034's task engine through a governed expedition rather than ad hoc refactoring.

### 6. Should any expeditions move to another program?

**No.** The boundary between 043 (operator experience) and 034 (task engine) is clear. No ownership transfer is required.

### 7. Should the program be archived?

**No.** Workstream F remains, and Phase 3 integration with 034 is pending.

---

## Overlap analysis

### 043 ↔ 034 — Task engine boundary

- **Risk:** 043 reimplements task scheduling or dependency tracking inside onboarding flows.
- **Finding:** No such duplication exists today. Onboarding commands invoke lifecycle operations directly through the CLI/S DK.
- **Required action:** Charter the migration of first-contact stages to `synth task run <stage>` before adding new onboarding stages.

### 043 ↔ 031 — Convergence gate

- **Risk:** Workstream F expeditions bypass the Convergence Review gate because they are "just tooling."
- **Finding:** Workstream F is explicitly deferred and its charters are still draft.
- **Required action:** Each Workstream F charter must be reviewed under ADR-039 before implementation begins, especially `EXP-IDENTITY-001` and `EXP-SIGN-001`.

### 043 ↔ 029 — Distribution

- **Risk:** Distribution work duplicates onboarding fixes instead of consuming them.
- **Finding:** 029 is chartered to consume 043's capability list in generated skills/MCP manifests.
- **Required action:** Maintain the dependency direction: 043 produces the experience; 029 distributes it.

---

## Outcomes

| Program | Outcome | Rationale | Required actions |
|---|---|---|---|
| `EXP-PROGRAM-043` | **CONVERGED** | Workstreams A–E align with the architecture, have passing tests, and do not duplicate 031/034 infrastructure. | 1. Reconcile Workstream E tracker status. 2. Charter Phase 3 migration to 034 task engine. 3. Run individual Convergence Reviews for Workstream F charters before implementation. |

---

## Required actions before 043 implementation continues

1. **Tracker update.** Mark Workstream E complete in `docs/expeditions/EXP-PROGRAM-043.md` and set Phase 3 as the current focus.
2. **Phase 3 charter.** Create a new expedition (e.g., `EXP-ONBOARD-002` or `EXP-MIGRATE-002`) that plans the migration of `synth first-contact` stages to `synth task run` invocations.
3. **Workstream F gates.** Before starting `EXP-IDENTITY-001`, `EXP-SIGN-001`, `EXP-APPROVAL-001`, or `EXP-GIT-001`, run an ADR-039 review for each. Identity/signing charters that touch the Event Model require Architecture Expedition status.
4. **No duplicate engines.** 043 must not add task scheduling, dependency-graph construction, or proof caching that overlaps with 034 or 031.

---

## Evidence

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-REVIEW-003.md`
- `docs/expeditions/EXP-TASK-006.md`
- `src/task/task-schema.ts`, `src/task/task-registry.ts`, `src/task/task-graph.ts`, `src/cli/task.ts`
- `tests/task-ci-adapter.test.js`
- `docs/governance/convergence-review-043-034.md`
- `docs/governance/convergence-review-034-002.md`

---

## Next steps

1. Merge this review record.
2. Update `EXP-PROGRAM-031.md` composition to include `EXP-REVIEW-003`.
3. Update `EXP-PROGRAM-043.md` Convergence Review section to reference `EXP-REVIEW-003` and record the Phase 3 actions.
4. Proceed with Phase 3 chartering while 034 continues implementation.
