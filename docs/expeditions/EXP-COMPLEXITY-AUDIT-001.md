# EXP-COMPLEXITY-AUDIT-001 — SYNTH Complexity Reduction Assessment

> Determine whether SYNTH is currently at its minimum necessary complexity by measuring every major subsystem against the user problems it solves and the guarantees it provides.

**Status:** Approved  
**Kind:** Read-Only Assessment Expedition  
**Priority:** Critical  
**Authority:** `EXP-SIMPLIFICATION-001`, Constitutional Baseline, ADR-004  
**Depends On:** `EXP-SIMPLIFICATION-001`  
**Blocks:** Decision on whether to proceed with `EXP-GOVERNANCE-ENFORCEMENT-001` or prioritize simplification

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: No code changes; no new public vocabulary
  Requires ADR: No
```

---

## Goal

Answer one question with evidence:

> **Is SYNTH currently at its minimum necessary complexity?**

Until now, architectural decisions have been driven by capability gaps and failure modes. This expedition steps back and asks whether the current system carries structure that no longer pays for itself.

The assessment is not a redesign. It is a measurement.

---

## Purpose

`EXP-SIMPLIFICATION-001` demonstrated that SYNTH can reduce complexity when the conceptual model and storage model diverge. It also showed that the system can stop at a design boundary instead of immediately adding the next enforcement layer.

Before implementing `EXP-GOVERNANCE-ENFORCEMENT-001`, we need to know whether the next right move is:

- adding governance enforcement,
- removing architecture,
- merging concepts,
- or doing nothing.

This expedition produces the evidence required to make that decision objectively.

---

## Objectives

### Objective 1 — Essential Core Report

Identify what cannot be removed without breaking SYNTH.

For each subsystem:

| Subsystem | Keep? | Why | Evidence |
|---|---|---|---|
| Event Store |  |  |  |
| CanonicalState |  |  |  |
| ExecutionGate |  |  |  |
| Capability Registry |  |  |  |
| Runtime Engine |  |  |  |
| Mission Studio |  |  |  |
| Planning Cognition Engine |  |  |  |
| Workspace Cognition Environment |  |  |  |
| Replay Verifier |  |  |  |
| Graph Integrity Validator |  |  |  |
| Adapter Registry |  |  |  |
| Genesis / Alignment subsystem |  |  |  |
| Review Gate Engine |  |  |  |
| Divergence Gate Engine |  |  |  |
| Execution Intent / Graph subsystem |  |  |  |
| Documentation projection pipeline |  |  |  |
| CLI surface |  |  |  |

Evidence sources:

- Which tests fail if the subsystem is removed?
- Which user workflows stop working?
- Which constitutional guarantees are violated?

### Objective 2 — Accidental Complexity Report

Identify what exists because of evolution rather than necessity.

Look for:

- Duplicated concepts
- Duplicated state
- Overlapping governance artifacts
- Unused abstractions
- Obsolete compatibility layers
- Concepts that are projections stored as truth
- Events that encode workflow rather than fact
- Subsystems with no test coverage
- Subsystems with no production callers

### Objective 3 — Simplification Candidate Matrix

For each candidate, propose one action:

| Candidate | Current Cost | Value Delivered | Proposed Action | Evidence | Risk |
|---|---|---|---|---|---|
|  |  |  | keep / merge / delete / inline / demote-to-projection / move-to-adapter |  |  |

Actions are constrained to:

- **keep** — required for a constitutional guarantee
- **merge** — two subsystems solve the same problem
- **delete** — no evidence of use or value
- **inline** — abstraction is thinner than its cost
- **demote-to-projection** — currently stored as truth but derivable
- **move-to-adapter** — belongs to implementation, not governance

### Objective 4 — Complexity Budget

Every major component receives a cost/value rating:

| Component | Complexity Cost | Value Delivered | Verdict |
|---|---|---|---|
|  | low / medium / high | low / medium / high | essential / simplify / candidate |

A component with high cost and low value becomes a simplification candidate.

A component with high cost and high value is essential but should be watched.

A component with low cost and low value is a candidate for deletion.

---

## Evaluation Criterion: Every Subsystem Must Prove Its Existence

The default assumption is:

> **Nothing survives because it already exists. It survives because it demonstrably earns its complexity.**

For every major subsystem, the audit must answer:

| Question | Purpose |
|---|---|
| What unique problem does it solve? | Justification |
| Which repository evidence proves it is used? | Usage |
| Can another existing subsystem solve the same problem? | Redundancy |
| What breaks if it is removed? | Necessity |
| Complexity cost (Low/Medium/High) | Maintenance burden |
| Value delivered (Low/Medium/High) | Return on complexity |

---

## Method

For each subsystem, answer:

1. What user problem does it solve?
2. Could another existing subsystem solve it?
3. Is it exercised by tests?
4. Is it exercised by production workflows (CLI paths, `npm run govern`, etc.)?
5. What breaks if we delete it?

Evidence must come from:

- Test coverage (`tests/`, `npm test`, `npm run test:*`)
- Source-code references (`src/`)
- CLI command paths (`src/cli/`)
- Documentation references (`docs/`, `README.md`)
- Event log and replay behavior
- Dependency graphs

No opinion without evidence.

### Essential vs. accidental complexity

The audit must distinguish:

- **Essential complexity** — inherent to deterministic event sourcing, immutable event logs, replay proofs, governance authority, and the public vocabulary. This complexity is justified by SYNTH's core guarantees.
- **Accidental complexity** — introduced by implementation history, overlapping abstractions, incomplete refactoring, or concepts that were promoted before their authority was resolved. This complexity is a simplification candidate.

These categories must never be mixed in the final reports.

---

## Constraints

1. **No code changes.** This expedition is read-only.
2. **No new concepts.** No new vocabulary, lifecycle states, or governance artifacts.
3. **No ADRs.** Findings may inform future ADRs, but this expedition produces no ADR.
4. **No protected asset modifications.** Architecture constitution and event model remain untouched.
5. **Evidence first.** Every claim must cite a file, test, command, or workflow.
6. **Do not implement.** The output is a report, not a refactor plan.

---

## Non-Deliverables

- No implementation of simplification candidates.
- No modification of `CanonicalState`, event model, or runtime behavior.
- No new expedition charters beyond this one.
- No changes to `AGENTS.md`, governance rules, or constitutional baseline.
- No new tests.

---

## Out of Scope

- Product-facing changes (homepage, UI, examples).
- New capabilities.
- Adapter redesign.
- Governance enforcement implementation.
- Genesis policy resolution.

---

## Deliverables

1. `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-essential-core.md`
2. `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-accidental-complexity.md`
3. `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-simplification-matrix.md`
4. `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-complexity-budget.md`
5. `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-kernel-boundary.md`
6. `docs/expeditions/EXP-COMPLEXITY-AUDIT-001-completion.md` — final recommendation

---

## Success Criteria

After this expedition:

- Every major subsystem has been evaluated against user value and test evidence.
- At least five concrete simplification candidates are identified with evidence.
- The Complexity Budget contains no un-rated components.
- The final recommendation explicitly states whether `EXP-GOVERNANCE-ENFORCEMENT-001` should proceed, be postponed, or be replaced by simplification work.
- No code has been modified.
- An independent engineer reading the reports can answer:
  - Why does SYNTH have this much complexity?
  - Which parts are indispensable?
  - Which parts are candidates for removal?
  - Is the architecture currently simpler, equally complex, or more complex than it needs to be?
  - Should governance enforcement proceed now, after simplification, or not at all?

---

## Risks

| Risk | Mitigation |
|---|---|
| Assessment becomes subjective | Require file/test/command evidence for every claim |
| Scope expands into redesign | Charter explicitly forbids implementation and new concepts |
| Findings are ignored because no action is mandated | Final recommendation must name the next expedition or explicit "do nothing" |
| Assessment takes too long | Time-box each subsystem; prioritize subsystems touched by recent expeditions |

---

## Definition of Done

- [x] Expedition approved.
- [x] Essential Core Report produced.
- [x] Accidental Complexity Report produced.
- [x] Simplification Candidate Matrix produced.
- [x] Complexity Budget produced.
- [x] Final recommendation produced.
- [x] No repository mutations occurred during the expedition.

---

## Recommended Next Step After Acceptance

If the assessment concludes that SYNTH is near minimum necessary complexity, proceed with `EXP-GOVERNANCE-ENFORCEMENT-001`.

If the assessment identifies high-cost, low-value components, create a new simplification expedition targeting those components before adding governance machinery.

---

## Related

- `docs/expeditions/EXP-SIMPLIFICATION-001.md`
- `docs/expeditions/EXP-SIMPLIFICATION-ASSESSMENT-001-report.md`
- `docs/expeditions/EXP-GOVERNANCE-ENFORCEMENT-001.md`
- `docs/adr/ADR-046-implementation-authority-ordering.md`
- `docs/architecture/constitutional-baseline.md`
