# Convergence Certification Model — Program 027

**Status:** Design approved  
**Date:** 2026-07-22  
**Expedition:** EXP-GOVERNABILITY-004  
**Mission:** Governability Closure  
**Related:**

- `docs/governance/program-027/convergence-certification-criteria.md`
- `docs/design/convergence-certification.md`
- `docs/design/convergence-certification-interface.ts`

---

## Purpose

Apply the general Convergence Certification design to Program 027 (the homepage governability regression).

This document defines:

1. What the certification subject is for Program 027.
2. Which evidence sources are authoritative.
3. How each certification dimension is evaluated.
4. How failures are classified.
5. How the result maps to mission completion.

---

## Certification subject

For Program 027, the certification subject is the **delivered homepage outcome**:

```text
Program 027 Mission Outcome
    ├── website/ homepage artifacts
    ├── Runtime observation of homepage behavior
    ├── Execution event log for the homepage expedition
    └── Traceability to Alignment Contract
```

The subject is not:

- The original proposal (that is Proposal Evaluation).
- The implementation at Review Gate (that is gate enforcement).
- A human assertion of quality.

---

## Evidence sources

| Source | Artifact | Purpose |
|---|---|---|
| Approved Intent | `docs/governance/program-027/intent-model.json` | Baseline for intent fidelity |
| Alignment Contract | `docs/governance/program-027/alignment-contract.json` | Baseline for contract fidelity |
| Replay Specification | `docs/governance/program-027/replay-specification.json` | Known drift classes and valid branches |
| Implemented Artifacts | `website/index.html`, `website/js/`, `website/public/` | Concrete deliverables |
| Observed Runtime Evidence | Screenshot comparison, scroll behavior, DOM inspection | Observable behavior |
| Execution Evidence | Event log for the homepage expedition | Proof of governance path taken |

---

## Dimension evaluation

### 1. Intent fidelity

**Question:** Does the delivered homepage still represent the original intent?

**Check:**

- The homepage feels like Mission Studio, not a page containing Mission Studio.
- First-time visitor can understand SYNTH without external documentation.
- The experience matches the approved intent summary.

**Evidence:** Runtime observation, visitor comprehension test (future), intent model comparison.

### 2. Contract fidelity

**Question:** Does the homepage satisfy the Alignment Contract?

**Check:**

- Required properties are present.
- Forbidden properties are absent.
- Required behaviors are exhibited.
- Forbidden interpretations and drift are absent.

**Evidence:** Automated contract-field checks against observed homepage features.

### 3. Evidence fidelity

**Question:** Does the homepage match the reference evidence?

**Check:**

- Every objective maps to canonical evidence.
- Visual language traces to LDS-002 tokens.
- Every visible element corresponds to a real SYNTH concept.

**Evidence:** Token audit, coverage matrix, traceability audit.

### 4. Drift absence

**Question:** Did forbidden interpretations reappear in the final output?

**Check:**

- No generic dashboard (D01)
- No marketing-first landing (D02)
- No chat-primary interface (D03)
- No page-jump navigation (D04)
- No storybook aesthetic (D05)
- No placeholder artifacts (D06)
- No hardcoded values outside LDS-002 (D07)
- No workspace dilution (D08)

**Evidence:** Drift-class rule evaluation against observed homepage features.

---

## Failure classification for Program 027

| Failure class | Example |
|---|---|
| **Contract drift** | Final homepage uses marketing hero despite contract forbidding it. |
| **Implementation drift** | Accepted implementation specified persistent sidebar; delivered sidebar is not persistent. |
| **Outcome drift** | Homepage matches contract literally, but no longer communicates SYNTH as a deterministic execution system. |
| **Insufficient evidence** | No runtime observation available to evaluate scroll behavior. |

---

## Result mapping

| Convergence result | Mission completion |
|---|---|
| `converged` | Allowed |
| `diverged` | Blocked; corrective action required |
| `insufficient_evidence` | Blocked; additional evidence required |

---

## Relationship to Proposal Evaluation

For Program 027, Proposal Evaluation and Convergence Certification share the rule vocabulary (D01–D08, V01–V04) but operate on different inputs:

```text
Proposal Evaluation
    Input:  proposed features
    Output: predicted alignment
    Phase:  before implementation

Convergence Certification
    Input:  observed homepage outcome
    Output: observed convergence
    Phase:  after implementation
```

The same drift-class adapters can be reused, but the feature extraction path differs:

- Proposal Evaluation extracts features from a proposal.
- Convergence Certification extracts features from observed implementation artifacts and runtime behavior.

---

## Acceptance criteria for implementation expedition

The implementation expedition for Program 027 Convergence Certification completes when:

- [ ] `CertifyConvergence` interface is implemented.
- [ ] Program 027 drift-class adapters are reusable from observed homepage features.
- [ ] Certification subject can be constructed from homepage artifacts and runtime evidence.
- [ ] Certification result is deterministic and explainable.
- [ ] Mission completion checks for a valid certification.
- [ ] The Program 027 replay graph can be re-executed including the convergence branch.
