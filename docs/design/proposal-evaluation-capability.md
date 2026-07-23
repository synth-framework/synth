# Proposal Evaluation Capability — Design Document

**Status:** Design approved  
**Date:** 2026-07-22  
**Expedition:** EXP-GOVERNABILITY-002  
**Classification:** Application  
**Kernel:** Protected

---

## Summary

This document designs the Proposal Evaluation Capability identified as missing by EXP-GOVERNABILITY-001. The capability evaluates an implementation proposal against an Alignment Contract and produces a deterministic, explainable alignment decision.

The Divergence Gate consumes this capability. Review Gate, Acceptance Gate, and Convergence Certification may also consume it in the future.

---

## Problem statement

SYNTH can create an Alignment Contract and open a Divergence Gate, but it cannot automatically compare an implementation proposal to the contract. The gate can only record a human reviewer's decision. This leaves the interpretation space uncollapsed.

Current:

```text
Proposal
    ↓
Human reviewer decides
    ↓
Divergence Gate records decision
```

Required:

```text
Proposal
    ↓
Proposal Evaluation Capability
    ↓
Alignment decision + evidence
    ↓
Divergence Gate records decision
```

---

## Design decisions

### D1 — Capability location

**Decision:** The capability lives in `src/governance/proposal-evaluation/`.

**Rationale:**

- It is governance logic, not platform infrastructure.
- It should not be owned by the Divergence Gate to preserve separation of concerns.
- It may be consumed by multiple gates, so it cannot be embedded in any single gate module.

**Rejected alternatives:**

- Inside `divergence-gate.ts` — would couple evaluation logic to one consumer.
- Inside `sdk/` — would blur the platform/governance boundary.
- Standalone service — overkill for current needs; function-based module is sufficient.

### D2 — Proposal representation

**Decision:** A proposal is a structured artifact description with two interchangeable forms:

1. **Feature list** — a normalized list of proposal features (e.g., `hasMetricCards`, `hasChatPrimaryInteraction`, `usesLdsTokens`).
2. **Artifact reference** — a path to an existing implementation (e.g., `website/index.html`) plus an extractor function that produces a feature list.

**Rationale:**

- Feature lists are deterministic and easy to test.
- Artifact references allow evaluation of real implementations without changing the core interface.
- The capability itself operates on feature lists; extraction is a separate adapter concern.

### D3 — Rule model

**Decision:** Contract-driven rules plus drift-class adapters.

The Alignment Contract fields are mapped to rule categories:

| Contract field | Rule category |
|---|---|
| `requiredProperties` | Must be present |
| `forbiddenProperties` | Must be absent |
| `requiredBehaviors` | Must be exhibited |
| `forbiddenInterpretation` | Must not match |
| `forbiddenDrift` | Must not match |
| `allowedInterpretation` | Permitted but not required |
| `allowedVariation` | Permitted variation |

Each rule evaluates one or more proposal features. Rules are deterministic pure functions.

Drift-class adapters map generic contract clauses to concrete feature checks for known drift classes (D01–D08). They are optional enhancements, not replacements for contract-driven rules.

### D4 — Output shape

**Decision:** `evaluateProposal` returns an `EvaluationResult` containing:

- `decision`: `"aligned" | "revision_required" | "rejected"`
- `confidence`: number in [0, 1]
- `matchedRules`: rules satisfied
- `violatedRules`: rules violated
- `matchedDriftClasses`: drift classes detected
- `reasoning`: human-readable evidence trace

See `docs/design/proposal-evaluation-interface.ts` for the full interface.

### D5 — Explainability model

**Decision:** Every rule result includes:

- `ruleId`
- `contractClauses`: which contract clauses the rule checks
- `proposalFeatures`: which proposal features were observed
- `outcome`: pass / fail
- `rationale`: why the rule produced this outcome
- `severity`: `"blocking" | "warning"`

The top-level `EvaluationResult.reasoning` is a summary of all rule results, suitable for operator review and certification replay.

### D6 — Determinism

**Decision:** `evaluateProposal` is a pure function.

Requirements:

- Same proposal + same contract + same rule set → same result.
- No dependency on `Date.now()`, `Math.random()`, `process.env`, filesystem state, or network state.
- Rule sets are versioned and passed explicitly.

### D7 — Ownership and consumption

**Decision:**

- **Owner:** `src/governance/proposal-evaluation/` owns the capability.
- **Consumers:** Divergence Gate, Review Gate, Acceptance Gate, Convergence Certification.
- The Divergence Gate calls `evaluateProposal` and uses the returned decision to resolve its state. It does not own the evaluation logic.

**Consumer-agnostic requirement:** The public `evaluateProposal` interface is the only supported entry point for proposal evaluation. No consumer may embed bespoke evaluation logic or bypass the capability. The interface must remain stable across all consumers.

---

## Architecture

```text
src/governance/
├── proposal-evaluation/
│   ├── index.ts              # public API: evaluateProposal
│   ├── types.ts              # Proposal, EvaluationResult, Rule, etc.
│   ├── rules/
│   │   ├── contract-rules.ts # contract-field-to-feature rules
│   │   └── drift-adapters.ts # D01–D08 drift class adapters
│   ├── extractors/
│   │   └── feature-list.ts   # proposal → feature list adapters
│   └── explainability.ts     # reasoning and evidence trace builders
├── divergence-gate.ts        # consumes evaluateProposal
├── review-gates.ts           # may consume evaluateProposal
└── ...
```

---

## Rule examples

### Example 1 — Generic dashboard drift (D01)

```text
Rule: forbidden-drift-generic-dashboard
Contract clauses: forbiddenDrift["Generic SaaS dashboard with metric cards and promotional banners"]
Features checked: hasMetricCards, hasPromotionalBanners, hasDisconnectedWidgets
Outcome if matched: fail, severity blocking
Rationale: "Proposal contains metric cards and promotional banners, which match the forbidden generic dashboard drift."
```

### Example 2 — Persistent workspace (V01)

```text
Rule: required-behavior-persistent-workspace
Contract clauses: requiredBehaviors["Workspace persists while phases change"]
Features checked: hasPersistentHeader, hasPersistentSidebar, hasScrollDrivenPhases
Outcome if matched: pass
Rationale: "Proposal exhibits a persistent workspace with scroll-driven phase transitions."
```

---

## Determinism contract

```text
∀ proposal, contract, ruleSet:
  evaluateProposal(proposal, contract, ruleSet) is identical across calls
```

Enforced by:

- Pure functions only.
- Rule sets passed explicitly.
- No hidden state.
- Feature extraction is deterministic (no environment coupling).

---

## Relationship to governance components

### Divergence Gate

```text
openDivergenceGate(contractId, intentModelId)
  ↓
proposal submitted
  ↓
evaluateProposal(proposal, contract, ruleSet)
  ↓
resolveDivergenceGate(gate, evaluation.decision, reviewer, evaluation.reasoning)
```

The reviewer still authorizes the final resolution, but the decision is now evidence-backed.

### Review Gate / Acceptance Gate

Future consumption: evaluate implementation evidence against the Alignment Contract before allowing the gate to pass.

### Convergence Certification

Future consumption: evaluate final implementation against the Alignment Contract and compare to original intent.

---

## Migration path

1. Implement `src/governance/proposal-evaluation/` module.
2. Add rule set for Program 027 drift classes and valid branches.
3. Wire Divergence Gate to call `evaluateProposal`.
4. Re-execute EXP-GOVERNABILITY-001.
5. Iterate on rules until recall, precision, and determinism are demonstrated.

---

## Open design questions for implementation expedition

1. Should feature extraction be pluggable per domain (homepage, CLI, documentation) or centralized?
2. Should rule sets be stored as JSON files or TypeScript modules?
3. How should the capability handle partial proposals vs. complete implementations?
4. What confidence threshold separates `revision_required` from `rejected`?

---

## Artifacts

- `docs/design/proposal-evaluation-capability.md` — this document
- `docs/design/proposal-evaluation-interface.ts` — TypeScript interface
- `docs/governance/program-027/replay-specification.json` — updated with rule mappings
