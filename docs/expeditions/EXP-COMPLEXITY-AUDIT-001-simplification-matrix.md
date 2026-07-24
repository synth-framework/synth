# EXP-COMPLEXITY-AUDIT-001 — Simplification Candidate Matrix

> Concrete simplification actions backed by repository evidence.

**Status:** Draft  
**Expedition:** `EXP-COMPLEXITY-AUDIT-001`  
**Date:** 2026-07-21  

---

## Method

Each candidate is evaluated against:

- **Current cost** — lines of code, test surface, conceptual load.
- **Value delivered** — user-facing capability or core guarantee protected.
- **Proposed action** — one of: keep, merge, delete, inline, demote-to-projection, move-to-adapter.
- **Evidence** — file paths, test counts, production usage.
- **Risk** — what could go wrong if the action is taken.

No action is implemented in this expedition. This matrix is input to the next decision.

---

## Candidate matrix

| # | Candidate | Current Cost | Value Delivered | Proposed Action | Evidence | Risk |
|---|---|---|---|---|---|---|
| 1 | Builder adapters (`mission-builder`, `expedition-builder`, `objective-builder`, `wizard`) | Medium (4 adapters + 4 type files + 4 test scripts) | Medium | **Merge** into Planning Cognition Engine / Mission Studio | `src/adapters/mission-builder/`, `src/adapters/expedition-builder/`, `src/adapters/objective-builder/`, `src/adapters/wizard/`, `src/planning/`, `src/mission-studio/` | Removes an alternative path; ensure CLI/tests still cover the use cases |
| 2 | Environment capability framework (`src/environment/`) | High (18 files, 3,725 lines, 10 test scripts) | Low-Medium | **Merge** with adapter model or **demote** to a thin provider registry | `src/environment/`, `src/environment/providers/reference.ts`, `src/adapters/registry.ts` | May require consolidating two different extension contracts |
| 3 | Knowledge extraction in Planning + Workspace + Discovery + Knowledge | Medium-High (scattered across 4 subsystems) | Medium | **Merge** into one canonical knowledge extractor used by all consumers | `src/planning/knowledge-extractor.js`, `src/workspace/language-auditor.ts`, `src/discovery/`, `src/knowledge/` | Consumers may have different extraction needs; need stable interface |
| 4 | First Contact pipeline | High (24 files, 2,864 lines, 4 test scripts) | Medium | **Move-to-adapter** or **move-to-example** | `src/first-contact/`, `src/cli/first-contact.ts`, `tests/first-contact-*.test.js` | Product-specific workflow should not be in core; moving it tests integration boundary |
| 5 | Discovery subsystem overlap with Workspace/Knowledge/Environment | High (27 files, 5,617 lines) | Medium-High | **Merge** repository discovery into Workspace; merge environment discovery into Environment providers; merge knowledge discovery into Knowledge | `src/discovery/`, `src/workspace/`, `src/environment/`, `src/knowledge/` | Large surface area; merge must be incremental |
| 6 | Semantic modeling (`src/semantic-modeling/`) | Medium (8 files, 1,315 lines) | Low | **Merge** into Genesis intent model or **delete** if redundant | `src/semantic-modeling/`, `src/genesis/`, `src/governance/intent-model.js` | Need to verify no unique callers |
| 7 | Multiple gate engines (review, divergence, execution graph) | High (3,388 lines in `src/governance/` plus derived state builders) | Medium-High | **Merge** into one parameterized gate primitive; derive workflow state instead of storing it | `src/governance/review-gate-engine.ts`, `src/governance/divergence-gate.ts`, derived execution graphs, `src/state/derived/` | Touches event model (Protected Asset); requires ADR if events change |
| 8 | Execution intent / graph events and derived state | Medium (3 files in `src/execution/`, derived builders, dedicated tests) | Medium | **Demote-to-projection** — derive execution progress from expedition lifecycle + capability events | `src/execution/`, `src/state/derived/build-derived-state.ts`, `tests/execution-intent.test.js` | Need to ensure execution audit trail is preserved |
| 9 | CLI explain/briefing command proliferation | High (19 CLI files, 8,236 lines) | Medium | **Merge** `explain-governance`, `explain-observability`, `status-briefing`, `resume-briefing` into one query/report CLI | `src/cli/explain-governance.ts`, `src/cli/explain-observability.ts`, `src/cli/status-briefing.ts`, `src/cli/resume-briefing.ts` | Users may depend on specific command names; keep aliases |
| 10 | Verification vs. Validation naming | Low (2 subsystems, name overlap) | Low-Medium | **Merge** or rename to clarify lifecycle phase (e.g., `input-validation` and `evidence-verification`) | `src/validation/`, `src/verification/` | Renames affect documentation and tests |
| 11 | Compiler (`src/compiler/`) | Low (2 files, 289 lines, no test script) | Low | **Delete** or **move-to-adapter** if unused; **keep** if a real caller exists | `src/compiler/`, `package.json` scripts | Verify no hidden dependency before deletion |
| 12 | Repository dual model (canonical state + repository adapter) | Medium (`src/repository/`, `src/adapters/repository/`, repository capabilities) | Medium | **Merge** — make repository adapter the canonical observation source; canonical state stores only derived projection | `src/repository/`, `src/adapters/repository/git.ts`, `src/capability/registry.ts` (repository capabilities) | Requires careful separation of observations from derived state |

---

## Candidate grouping

### High-impact, lower-risk merges

- **Candidate 1** (builder adapters into planning/mission-studio)
- **Candidate 3** (knowledge extraction consolidation)
- **Candidate 9** (CLI explain/briefing consolidation)
- **Candidate 10** (verification/validation naming)

These do not touch the event model or canonical truth. They reduce surface area.

### High-impact, higher-risk merges

- **Candidate 2** (environment vs. adapters)
- **Candidate 5** (discovery consolidation)
- **Candidate 7** (gate engine unification)
- **Candidate 8** (execution graph demotion)

These touch extension contracts or derived-state/event shape. They require careful design expeditions.

### Scope/migration candidates

- **Candidate 4** (First Contact out of core)
- **Candidate 11** (compiler delete/move)

These are about removing non-core concerns from the main source tree.

### Architecture alignment candidates

- **Candidate 6** (semantic modeling into Genesis)
- **Candidate 12** (repository dual model)

These align the storage model with the authority model.

---

## What this matrix does not do

- It does not propose deleting essential core subsystems.
- It does not introduce new concepts.
- It does not modify code.
- It does not approve any simplification expedition.

It provides the evidence basis for deciding whether to proceed with `EXP-GOVERNANCE-ENFORCEMENT-001` or prioritize simplification.
