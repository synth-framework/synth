# EXP-GOVERNABILITY-003 — Proposal Evaluation Capability Implementation

**Status:** Accepted  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Authority:** Synth Architectural Constitution  
**Depends on:** EXP-GOVERNABILITY-001, EXP-GOVERNABILITY-002, ADR-047, ADR-048  
**Classification:** Application  
**Kernel:** Protected

---

## Objective

Implement the Proposal Evaluation Capability designed in EXP-GOVERNABILITY-002 and integrate it with the Divergence Gate.

The capability must remain **consumer-agnostic**: the Divergence Gate consumes it, but the API must support future consumption by Review Gate, Acceptance Gate, and Convergence Certification without modification.

---

## Background

EXP-GOVERNABILITY-001 established that no deterministic proposal evaluation capability exists. EXP-GOVERNABILITY-002 designed the capability with:

- Location: `src/governance/proposal-evaluation/`
- Interface: `evaluateProposal(proposal, contract, ruleSet) => EvaluationResult`
- Rule model: contract-driven rules + drift-class adapters
- Explainability: every decision includes violated clauses, matched drift classes, and evidence trace
- Determinism: pure function, no hidden state

This expedition implements that design.

---

## Scope

### In scope

1. Implement `src/governance/proposal-evaluation/` module.
2. Implement the Program 027 rule set covering drift classes D01–D08 and valid branches V01–V04.
3. Implement deterministic feature extraction for artifact references.
4. Wire the Divergence Gate to consume `evaluateProposal`.
5. Preserve the published interface contract from `docs/design/proposal-evaluation-interface.ts`.
6. Preserve determinism and explainability.
7. Add tests for the capability, rule set, and integration.
8. Re-execute EXP-GOVERNABILITY-001 against the implemented capability.

### Out of scope

- Implementing Review Gate / Acceptance Gate integration (EXP-PROGRAM-035).
- Implementing Convergence Certification.
- Modifying ADR-047 or ADR-048.
- Modifying the kernel, EventStore, StateStore, Replay, or ExecutionGate.

---

## Consumer-agnostic API requirement

The Proposal Evaluation Capability must be a reusable governance service, not an implementation detail of the Divergence Gate.

```text
Proposal Evaluation Capability
            │
    ┌───────┼────────┬────────────┐
    │       │        │            │
Divergence  Review  Acceptance  Convergence
   Gate      Gate      Gate    Certification
```

Even though this expedition only integrates the Divergence Gate, the public interface must remain stable and independent. No consumer may bypass the capability with bespoke evaluation logic.

---

## Acceptance criteria

The expedition is complete only when:

1. `src/governance/proposal-evaluation/` is implemented according to `docs/design/proposal-evaluation-capability.md`.
2. The public interface matches `docs/design/proposal-evaluation-interface.ts`.
3. The Program 027 rule set covers all drift classes D01–D08 and valid branches V01–V04.
4. Every replay branch in `docs/governance/program-027/replay-specification.json` is executable using only the public Proposal Evaluation interface.
5. The Divergence Gate resolves using `evaluateProposal` results.
6. Determinism is verified: same proposal + same contract + same rule set produces the same result.
7. Explainability is verified: every decision includes violated clauses, matched drift classes, and evidence trace.
8. EXP-GOVERNABILITY-001 is re-executed and the certification report is updated.
9. Build and full test suite pass.

---

## Exit condition

The expedition does **not** claim success by unit tests alone.

Success requires re-running **EXP-GOVERNABILITY-001** to determine whether:

- Recall becomes demonstrable (all drift-class replays intercepted).
- Precision becomes demonstrable (all valid-branch replays admitted).
- Determinism becomes demonstrable (identical replays produce identical outcomes).
- Coverage is actually exercised (all replay branches executed).

Only then may the governability closure status be reconsidered.

---

## Mandatory artifacts

1. `docs/expeditions/EXP-GOVERNABILITY-003-proposal-evaluation-implementation.md` — this document.
2. `src/governance/proposal-evaluation/` — implemented module.
3. Updated `docs/governance/program-027/governability-regression-certification.json` — re-executed replay results.
4. Updated `docs/expeditions/EXP-GOVERNABILITY-001-regression-certification.md` — updated certification status if changed.

---

## Dependencies

| Dependency | Status | Why it blocks |
|---|---|---|
| EXP-GOVERNABILITY-001 | ✅ Accepted | Provides the Replay Specification and benchmark |
| EXP-GOVERNABILITY-002 | ✅ Accepted | Provides the design and interface |
| ADR-047 | ✅ Accepted | Defines Alignment Contract |
| ADR-048 | ✅ Accepted | Defines Genesis Layer |
| EXP-HOME-027 | ✅ Approved | Provides the concrete Alignment Contract |

---

## Relationship to other work

- **EXP-GOVERNABILITY-001:** This expedition enables its re-execution.
- **EXP-GOVERNABILITY-002:** Implements the approved design.
- **EXP-PROGRAM-036:** Corrective action program; this capability is part of its scope.
- **EXP-PROGRAM-035:** Will consume this capability for Review Gate / Acceptance Gate enforcement in a future expedition.
- **EXP-PROGRAM-027:** Remains paused until the replay is re-executed and certification advances.

---

## Success metrics

| Metric | Target |
|---|---|
| Public interface preserved | 100% |
| Drift-class rules implemented | 8/8 |
| Valid-branch rules implemented | 4/4 |
| Replay branches executable via public API | 12/12 |
| Determinism verified | Yes |
| Explainability verified | Yes |
| EXP-GOVERNABILITY-001 re-executed | Yes |
| Build/test failures | 0 |

---

## Non-goals

- Do not implement Review Gate / Acceptance Gate integration.
- Do not implement Convergence Certification.
- Do not change the SYNTH kernel.
- Do not modify ADR-047 or ADR-048.
- Do not perform a full `npm run govern`; agents run only targeted validations per ADR-043.

---

## Recommended follow-on activity

After this expedition completes and EXP-GOVERNABILITY-001 is re-executed:

1. If certification passes: reconsider Program 027 closure status.
2. If certification is still OPEN: identify remaining gaps, charter corrective expeditions, and repeat the replay.
