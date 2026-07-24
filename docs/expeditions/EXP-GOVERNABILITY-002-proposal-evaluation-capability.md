# EXP-GOVERNABILITY-002 — Proposal Evaluation Capability Design

**Status:** Accepted  
**Kind:** Design Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Authority:** Synth Architectural Constitution  
**Depends on:** EXP-GOVERNABILITY-001, ADR-047, ADR-048  
**Classification:** Application  
**Kernel:** Protected

---

## Objective

Design the deterministic **Proposal Evaluation Capability** that EXP-GOVERNABILITY-001 identified as missing.

The capability must be able to evaluate an implementation proposal against an Alignment Contract and produce a structured, explainable alignment assessment. The Divergence Gate — and potentially Review Gate, Acceptance Gate, and Convergence Certification — should consume this capability rather than own it.

A deterministic evaluator must produce not only an alignment decision but also the evidence explaining why:

```text
Proposal
    ↓
Proposal Evaluation
    ├── Alignment decision
    ├── Violated intent clauses
    ├── Violated contract clauses
    ├── Matched drift classes
    └── Evidence trace
```

---

## Background

EXP-GOVERNABILITY-001 attempted to execute the Program 027 Replay Graph. It found that:

- The Divergence Gate exists as a state machine.
- The Alignment Contract exists as a structured artifact.
- There is no deterministic mechanism that compares a proposal to the contract.

Current flow:

```text
Proposal
    ↓
Human decision
    ↓
Divergence Gate state
```

Required flow:

```text
Proposal
    ↓
Proposal Evaluation Capability
    ↓
Alignment Decision
    ↓
Divergence Gate state
```

This expedition designs the missing capability.

---

## Scope

### In scope

1. Define the inputs, outputs, and contract of the Proposal Evaluation Capability.
2. Evaluate candidate architectures (function library, service, adapter pattern, rule engine).
3. Specify how the capability interacts with:
   - Divergence Gate
   - Review Gate
   - Acceptance Gate
   - Convergence Certification
4. Define how drift classes from the Replay Specification map to evaluation rules.
5. Design the explainability model: every decision must be accompanied by evidence trace, violated clauses, and matched drift classes.
6. Produce a design document and interface specification.
7. Recommend an implementation expedition.

### Out of scope

- Implementation of the capability.
- Changes to the kernel, EventStore, StateStore, Replay, or ExecutionGate.
- Changes to ADR-047 or ADR-048.
- Full Convergence Certification design (only the proposal evaluation dependency).

---

## Design questions

### Q1 — What is a proposal?

Possible forms:

- Structured artifact description (e.g., homepage component tree)
- Textual description of intended implementation
- Reference to existing implementation (e.g., `website/index.html`)
- Diff or patch

The capability must define a canonical proposal representation.

### Q2 — What does the capability evaluate against?

The Alignment Contract contains:

- `requiredProperties`
- `forbiddenProperties`
- `requiredBehaviors`
- `forbiddenInterpretation`
- `forbiddenDrift`
- `allowedInterpretation`
- `allowedVariation`
- `successCriteria`
- `referenceEvidenceIds`

The capability must map proposal features to these contract fields.

### Q3 — What does the capability produce?

Possible output:

```text
{
  aligned: boolean,
  decision: "aligned" | "revision_required" | "rejected",
  confidence: number,
  matchedRules: RuleResult[],
  violatedRules: RuleResult[],
  unmatchedDriftClasses: string[],
  reasoning: string[]
}
```

### Q4 — Where does the capability live?

Candidates:

| Location | Pros | Cons |
|---|---|---|
| Inside `src/governance/divergence-gate.ts` | Simple coupling | Divergence Gate owns evaluation logic |
| `src/governance/proposal-evaluation.ts` | Clear separation | New module |
| `src/sdk/governance/` | Reusable across gates | Blurs platform/governance boundary |
| Adapter pattern per drift class | Extensible | More files |

This expedition must select one or reject all and propose a new location.

### Q5 — How are drift classes encoded?

Options:

- Hardcoded rules derived from Program 027 contract
- Configurable rule set loaded from contract fields
- Adapter registry per drift class
- Hybrid: contract-driven rules + drift-class adapters

### Q6 — How does determinism apply?

The same proposal + same contract + same rule set must produce the same evaluation. The capability must not depend on non-deterministic inputs (e.g., wall-clock time, randomness, environment state).

### Q7 — How is explainability modeled?

Every evaluation must produce:

- the alignment decision
- the violated intent clauses
- the violated contract clauses
- the matched drift classes
- the evidence trace linking proposal features to contract clauses

The explainability model must be stable enough to support operator review, audit, and future certification replay.

---

## Mandatory artifacts

1. `docs/expeditions/EXP-GOVERNABILITY-002-proposal-evaluation-capability.md` — this document.
2. `docs/design/proposal-evaluation-capability.md` — design document with selected architecture, interface, and rule model.
3. `docs/design/proposal-evaluation-interface.ts` — TypeScript interface definition (not implementation).
4. `docs/governance/program-027/replay-specification.json` updated with rule-to-drift-class mappings.

---

## Acceptance criteria

The expedition is complete only when:

1. The Proposal Evaluation Capability has a defined capability specification.
2. A stable interface contract is documented.
3. The architectural placement is decided and justified against alternatives.
4. The rule model maps drift classes and valid branches to evaluation outcomes.
5. Determinism requirements are explicit.
6. The explainability model is defined: every decision includes violated clauses, matched drift classes, and evidence trace.
7. Ownership is clear: which components consume the capability and which component owns it.
8. A follow-on implementation expedition is recommended.
9. Build and tests remain green.

---

## Dependencies

| Dependency | Status | Why it blocks |
|---|---|---|
| EXP-GOVERNABILITY-001 | ✅ Accepted | Identified the missing capability and produced the Replay Specification |
| ADR-047 | ✅ Accepted | Defines Alignment Contract fields |
| ADR-048 | ✅ Accepted | Defines Genesis Layer and reference evidence |
| EXP-HOME-027 | ✅ Approved | Provides the concrete Alignment Contract to design against |

---

## Relationship to other work

- **EXP-GOVERNABILITY-001:** This expedition designs the capability that 001 identified as missing.
- **EXP-PROGRAM-036:** Corrective action program; this capability is part of its scope.
- **EXP-PROGRAM-035:** Will consume this capability for Review Gate / Acceptance Gate enforcement.
- **EXP-PROGRAM-027:** Remains paused until the capability is implemented and the replay is re-executed.

---

## Non-goals

- Do not implement the capability.
- Do not modify the Divergence Gate state machine.
- Do not change the SYNTH kernel.
- Do not modify ADR-047 or ADR-048.
- Do not perform a full `npm run govern`; agents run only targeted validations per ADR-043.

---

## Recommended follow-on expedition

After this design expedition is accepted, charter an implementation expedition to:

1. Implement the Proposal Evaluation Capability according to the approved design.
2. Wire the Divergence Gate to consume the capability.
3. Re-execute EXP-GOVERNABILITY-001 to determine whether the certification can advance.
