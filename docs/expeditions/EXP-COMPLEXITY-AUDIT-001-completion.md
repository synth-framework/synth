# EXP-COMPLEXITY-AUDIT-001 — Completion & Recommendation

> Final evidence-backed recommendation on SYNTH complexity and the path forward.

**Status:** Draft  
**Expedition:** `EXP-COMPLEXITY-AUDIT-001`  
**Date:** 2026-07-21  
**Authority:** Approved by operator  

---

## Deliverables produced

1. ✅ `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-essential-core.md`
2. ✅ `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-accidental-complexity.md`
3. ✅ `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-simplification-matrix.md`
4. ✅ `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-complexity-budget.md`
5. ✅ `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-kernel-boundary.md`
6. ✅ `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-completion.md` (this file)

---

## Repository baseline

The working tree at the start of this expedition contained uncommitted modifications from prior expeditions. Those modifications are **outside the scope of this audit**.

This expedition treats the current working tree as the repository baseline. It does not reconcile, judge, or modify prior expedition deltas.

## Expedition delta

This expedition introduced **no source-code modifications**. Its only output is documentation.

| Category | Count | Files |
|---|---|---|
| Markdown deliverables created | 6 | `EXP-COMPLEXITY-AUDIT-001*.md` |
| Source files modified | 0 | — |
| Tests modified | 0 | — |
| ADRs modified | 0 | — |

---

## Accounting invariant for future expeditions

Every expedition completion document must separate:

1. **Repository baseline** — working-tree state before and after the expedition.
2. **Expedition delta** — only what the expedition itself created, modified, or deleted.

No expedition completion may claim global repository cleanliness. It may only claim its own delta.

---

## Answers to the required questions

### Why does SYNTH have this much complexity?

SYNTH's **essential core** is justified: event store, canonical state, replay, ExecutionGate, runtime, domain logic, policy, bootstrap, and types/contracts protect the three canonical guarantees — history, authority, and determinism. That core is approximately **19% of the TypeScript source** (~10,180 of ~52,677 lines).

The remaining complexity comes from **parallel abstraction layers** added to address similar problems:

- **Two extension models:** `src/adapters/` and `src/environment/providers/` both integrate external systems.
- **Multiple knowledge extractors:** Planning, Workspace, Discovery, and Knowledge each extract repository facts.
- **Multiple gate engines:** Review gates, divergence gates, and execution graphs each track progress independently.
- **Multiple planning/intent models:** Genesis intent models, semantic modeling, and planning intent classification coexist.
- **Large CLI surface:** 19 CLI files include overlapping explain/briefing/report commands.

This is evolution-driven complexity, not necessity-driven. Each subsystem solved a real problem, but the problems were not always distinct.

### Which parts are indispensable?

The kernel subsystems are listed in `EXP-COMPLEXITY-AUDIT-001-essential-core.md`:

- Event Store
- CanonicalState + Replay
- ExecutionGate
- Runtime Engine / Executor
- Capability Registry
- Domain Logic
- Policy Engine
- State Store / Persistence
- Bootstrap
- Types / Contracts

Removing any of these breaks a core guarantee or stops SYNTH from starting.

Subsystems such as the Replay Verifier, Graph Integrity Validator, Review Gate Engine, and Divergence Gate Engine are **applications built on the kernel**, not part of the kernel itself. They may be simplified, merged, or moved without threatening canonical truth.

### Which parts are candidates for removal or simplification?

The strongest candidates, from highest to lowest leverage:

| Candidate | Action | Evidence |
|---|---|---|
| First Contact pipeline | Move out of core | `src/first-contact/`, 2,864 lines, product-specific |
| Semantic modeling | Merge into Genesis or delete | `src/semantic-modeling/`, 1,315 lines, overlaps with Genesis |
| Compiler | Delete or move to adapter | `src/compiler/`, 289 lines, no test script |
| Environment capability framework | Merge with adapters | 1 provider, 3,725 lines, dual model |
| Builder adapters | Merge into planning/mission-studio | 4 adapters with overlapping semantics |
| Knowledge extraction | Consolidate across subsystems | Planning, Workspace, Discovery, Knowledge all extract |
| Execution intent/graph | Demote to projection | Parallel expedition progress model |
| CLI explain/briefing commands | Merge into one query interface | 19 CLI files, overlapping commands |
| Discovery subsystem | Merge into Workspace/Knowledge/Environment | 5,617 lines, overlapping responsibilities |
| Repository dual model | Unify adapter + canonical state | Both model repository state |

### Is the architecture currently simpler, equally complex, or more complex than it needs to be?

**More complex than it needs to be.**

The essential core is appropriately complex for an event-sourced, governed execution system. The surrounding layers contain overlapping abstractions that could be consolidated without losing user-facing value.

Key metric: the essential core is ~19% of source. The remaining ~81% contains the simplification opportunities.

### The most important finding: the kernel boundary

The audit discovered that SYNTH is not a 50,000-line architecture. It is approximately a **10,000-line kernel surrounded by 40,000 lines of applications and implementation**.

The kernel protects SYNTH's irreducible guarantees. Everything outside the kernel is an application, adapter, or projection built on those guarantees.

This changes every future architecture debate. The question is no longer:

> "Should X become part of SYNTH?"

The question is:

> "Is X part of the kernel, or an application built on the kernel?"

The kernel boundary is documented in `EXP-COMPLEXITY-AUDIT-001-kernel-boundary.md`.

### Should governance enforcement proceed now, after simplification, or not at all?

**Implement the minimal safety enforcement now. Postpone broader governance architecture until after simplification.**

There are two kinds of governance work:

1. **Safety enforcement** — preventing unauthorized mutations. This is a kernel property and should be completed.
2. **Structural simplification** — removing overlapping applications. This should happen before broader governance evolution.

The evidence from `EXP-HOME-029` and `EXP-CAPABILITY-BOUNDARY-001` shows that the kernel's mutation-authority boundary is incomplete. The minimal fix — ensuring `ExecutionGate` blocks unauthorized mutations — is a safety property, not a complexity property. Safety properties reduce the risk of accidental damage during refactoring and should not wait.

Broader governance architecture (new authority states, convergence reviews, policy expansion) should wait until the application layer is simplified.

Specifically:

- **Proceed now** with completing the minimal `ExecutionGate` mutation-authority check.
- **Postpone** any new governance concepts, lifecycle states, or policy layers until after simplification.

---

## Recommendation

### Decision rule for every simplification expedition

Before any keep/merge/move/delete decision, classify the subsystem:

```
KERNEL → must stay in the kernel
APPLICATION → may be simplified, merged, moved, or deleted
```

Then apply:

```
KEEP   — kernel obligation or unique application value
MERGE  — duplicate responsibility
MOVE   — application in the wrong directory
DELETE — obsolete or unjustified
```

The kernel boundary in `EXP-COMPLEXITY-AUDIT-001-kernel-boundary.md` is the classification authority.

### Simplification program order

| Step | Target | Rationale |
|---|---|---|
| 0 | **Validate Kernel Boundary** | Confirm the kernel test holds under review |
| 1 | **Extension Model** | Unify `src/adapters/` and `src/environment/providers/` |
| 2 | **Knowledge** | Consolidate Planning / Workspace / Discovery / Knowledge extraction |
| 3 | **CLI** | Merge overlapping explain / briefing / report commands |
| 4 | **Planning** | Resolve planning vs. Genesis intent duplication |
| 5 | **Review** | Reclassify gate engines as applications; simplify their state |
| 6 | **Runtime** | Remove execution graph / intent projections from canonical state |
| 7 | **Re-audit** | Re-run complexity audit; target >30% reduction in application-layer surface |

### Immediate safety work

Complete the minimal `ExecutionGate` mutation-authority check before or in parallel with structural simplification. This is a kernel safety property and does not depend on simplifying applications first.

### Governance reassessment

Reassess broader governance architecture only after simplification. At that point the enforcement surface will be smaller and the model will be easier to prove correct.

---

## Risk of doing nothing

If SYNTH proceeds directly to broad governance architecture without simplification:

- The authority resolver will enforce a model that contains accidental complexity.
- Future simplification will require updating both the code and the enforcement rules.
- The system will continue to accumulate overlapping abstractions, making each subsequent change more expensive.

If SYNTH simplifies without completing the minimal mutation-authority check:

- Refactoring could introduce unauthorized mutations.
- The kernel safety gap that produced `EXP-HOME-029` remains open.

---

## Risk of the recommended path

- Simplification expeditions touch extension contracts and may require ADRs.
- There is a small risk that consolidation removes a capability a user currently relies on.
- Completing `ExecutionGate` enforcement may temporarily block some existing paths that currently bypass it.

These risks are manageable with expedition scoping and regression tests.

---

## Final verdict

SYNTH is not over-engineered at its core. Its kernel is appropriately complex for its guarantees.

SYNTH **is** carrying more application-layer structure than necessary. The right next step is to:

1. Close the kernel safety gap.
2. Collapse parallel application mechanisms.
3. Then evolve governance on the simplified structure.

**Safety first, then simplification, then broader governance.**
