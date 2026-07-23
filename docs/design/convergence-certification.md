# Convergence Certification — Design Document

**Status:** Design approved  
**Date:** 2026-07-22  
**Expedition:** EXP-GOVERNABILITY-004  
**Classification:** Application  
**Kernel:** Protected

---

## Summary

This document designs **Convergence Certification**: the post-execution capability that certifies whether an implemented outcome remains converged with the approved human intent after execution.

Convergence Certification is the final unproven transition in the Program 027 governability replay graph. All upstream controls are now demonstrated:

- Intent Model
- Alignment Contract
- Proposal Evaluation
- Divergence Gate
- Mission / Expedition
- Review Gate
- Acceptance Gate

The remaining question is:

> After a proposal has been approved and implemented, does the delivered outcome still represent the original intent?

---

## Problem statement

SYNTH can now prevent bad proposals and bad implementations from passing governance gates. What it cannot yet prove is that an accepted implementation, once realized, still matches the approved intent baseline.

Current lifecycle ends at Acceptance Gate:

```text
Implementation
    ↓
Review Gate
    ↓
Acceptance Gate
    ↓
Mission complete   ← drift can still occur here
```

Required lifecycle:

```text
Implementation
    ↓
Review Gate
    ↓
Acceptance Gate
    ↓
Convergence Certification
    ↓
Mission complete
```

---

## Design decisions

### D1 — Certification subject

**Decision:** The certification subject is the **mission outcome**, not the artifact, runtime state, or user-visible behavior in isolation.

**Rationale:**

- The original Program 027 failure was human intent drift, not merely code drift.
- "Mission outcome" captures the complete delivered result: artifacts, observable behavior, and traceability to the Alignment Contract.
- The subject must be concrete enough to evaluate deterministically.

**Subject composition:**

```text
Completed Implementation Outcome
    ├── Implemented artifacts
    ├── Runtime / observed evidence
    ├── Execution evidence
    └── Traceability to Alignment Contract
```

---

### D2 — Lifecycle position

**Decision:** Convergence Certification executes **after Acceptance Gate and before Mission completion**.

```text
Intent
    ↓
Alignment
    ↓
Mission
    ↓
Expedition
    ↓
Implementation
    ↓
Review Gate
    ↓
Acceptance Gate
    ↓
Convergence Certification
    ↓
Completion
```

**Rationale:**

- It must observe the actual implementation, so it cannot run before execution.
- It must gate mission completion, otherwise the lifecycle remains uncertified.
- It must not duplicate Review Gate or Acceptance Gate, which evaluate the proposal and implementation readiness.

**Decision required:** Mission completion is blocked without a valid Convergence Certification.

---

### D3 — Certification semantics

**Decision:** Convergence Certification is a **certification record with lifecycle authority**, not a generic gate.

```text
Outcome
    ↓
Convergence Certification
    ↓
Certification record
    ↓
Mission completion eligible / ineligible
```

**Rationale:**

- A gate produces `allowed / blocked`.
- A certification produces `evidence that a condition was true`.
- Convergence Certification must produce a falsifiable record that explains *why* the outcome is or is not converged.
- Completion is the responsibility of the lifecycle; the certification supplies the required evidence.

**Result values:**

| Result | Meaning |
|---|---|
| `converged` | Outcome matches approved intent baseline. |
| `diverged` | Outcome deviates from approved intent baseline. |
| `insufficient_evidence` | Cannot certify due to missing evidence. |

---

### D4 — Evidence sources

**Decision:** The certification consumes deterministic evidence from these authoritative sources:

```text
Approved Intent
        +
Alignment Contract
        +
Replay Specification
        +
Implemented Artifacts
        +
Observed Runtime Evidence
        ↓
Convergence Evaluation
```

| Source | Provided by | Purpose |
|---|---|---|
| Approved Intent | Intent Model | Original human intent baseline |
| Alignment Contract | Mission approval | Formal agreement of expected outcome |
| Replay Specification | EXP-GOVERNABILITY-001 | Known drift classes and valid branches |
| Implemented Artifacts | Expedition execution | Concrete deliverables |
| Observed Runtime Evidence | Runtime / environment | Observable behavior of the outcome |

---

### D5 — Evaluation dimensions

**Decision:** The minimum certification model evaluates four dimensions:

| Dimension | Question |
|---|---|
| **Intent fidelity** | Does the result still represent the original intent? |
| **Contract fidelity** | Does it satisfy the Alignment Contract? |
| **Evidence fidelity** | Does it match required references? |
| **Drift absence** | Did forbidden interpretations reappear? |

**Rationale:**

- These dimensions cover the complete intent → contract → evidence → outcome chain.
- They are falsifiable: each dimension can produce pass, fail, or insufficient evidence.
- They align with the existing Proposal Evaluation vocabulary without duplicating it.

---

### D6 — Relationship to Proposal Evaluation

**Decision:** Convergence Certification and Proposal Evaluation are distinct capabilities that may share rule infrastructure, evidence models, and explainability models. They must not become the same capability.

| | Proposal Evaluation | Convergence Certification |
|---|---|---|
| Phase | Before implementation | After implementation |
| Question | "What are we about to build?" | "What did we actually build?" |
| Input | Proposed features / artifact reference | Implemented mission outcome |
| Output | Predicted alignment decision | Observed convergence record |
| Failure mode | Block / request revision before build | Record divergence after build |

**Rationale:**

- Prediction and observation are different operations.
- Convergence Certification must be able to detect drift that only appears in the realized outcome.
- Reusing the rule vocabulary is fine; reusing the same function with the same inputs is not.

---

### D7 — Failure classification

**Decision:** Convergence Certification distinguishes three failure classes:

```text
Intent preserved
    |
    +-- Implementation correct

Intent lost
    |
    +-- Contract drift
    +-- Implementation drift
    +-- Outcome drift
```

| Failure class | Definition |
|---|---|
| **Contract drift** | Outcome violates the Alignment Contract. |
| **Implementation drift** | Outcome does not match the accepted implementation evidence. |
| **Outcome drift** | Outcome matches contract and implementation, but no longer serves the original intent. |

**Rationale:**

- Different failure classes require different corrective actions.
- Contract drift may be fixable by revising implementation.
- Outcome drift may require revisiting the Alignment Contract or intent model.

---

### D8 — Determinism and explainability

**Decision:** Convergence Certification is deterministic and explainable.

**Requirements:**

- Same inputs → same certification result.
- Every result includes a trace of which evidence supported or contradicted convergence.
- The certification record is reproducible from the event log.

---

## Architecture

```text
src/governance/
├── proposal-evaluation/       # existing: rule infrastructure
├── convergence-certification/ # new: certification capability
│   ├── index.ts               # public API: certifyConvergence
│   ├── types.ts               # CertificationSubject, ConvergenceResult, etc.
│   ├── evaluation.ts          # dimension evaluators
│   └── explainability.ts      # certification evidence trace
├── review-gate-engine.ts      # unchanged
└── ...
```

The capability is **not** placed inside:

- `proposal-evaluation/` — would blur the prediction/observation boundary.
- `review-gate-engine.ts` — would couple certification to gate lifecycle.
- Kernel — no kernel mutation authority is required.

---

## Interface

See `docs/design/convergence-certification-interface.ts` for the full TypeScript contract.

---

## Program 027 application

See `docs/governance/program-027/convergence-certification-model.md` for the Program 027-specific application of this design.

---

## Open design questions for implementation expedition

1. Should artifact observation use filesystem adapters, runtime introspection, or both?
2. How is "observed runtime evidence" captured and bound to the certification subject?
3. Should the certification record be signed by a specific actor kind (engine, human, council)?
4. What is the exact confidence threshold between `converged` and `diverged`?
5. How does residual divergence get documented and approved before certification?

---

## Artifacts

- `docs/design/convergence-certification.md` — this document
- `docs/design/convergence-certification-interface.ts` — TypeScript interface
- `docs/governance/program-027/convergence-certification-model.md` — Program 027 model
