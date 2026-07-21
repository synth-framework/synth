# EXP-HOME-027 — Homepage Alignment Contract

> **Genesis expedition.** Formalize the agreement between operator and SYNTH about what the Mission Studio homepage must and must not be.

**Status:** Proposed  
**Kind:** Genesis Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-026  
**Blocks:** EXP-HOME-028, EXP-HOME-001, EXP-HOME-002, EXP-HOME-003, EXP-HOME-025

> **Authority:** ADR-045 — Governance Lifecycle & State Machine Specification

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Produce an approved `Alignment Contract` for the Mission Studio homepage. The contract makes explicit what interpretations are allowed, what constitute forbidden drift, and what reference evidence is authoritative. No Mission may be approved for Program 027 without this contract.

---

## Origin Evidence

The Program 027 homepage incident exposed a missing contract between human intent and agent interpretation. Strong specifications existed, but nothing forced the agent to prove that its interpretation matched the approved intent. The Alignment Contract closes that gap by making the interpretation itself a governed, reviewable artifact.

---

## Required Change

### 1.1 Contract fields

```text
Intent Summary
Expected Experience
Required Behaviors
Visual References
Functional Expectations
Technical Constraints
Success Criteria
Explicit Non-Requirements
Allowed Interpretation
Allowed Variation
Forbidden Interpretation
Forbidden Drift
Approval Record
```

### 1.2 Non-negotiables

- Mission Studio must be the dominant visual artifact on the homepage.
- The homepage must feel like a persistent application workspace, not a website.
- All visual design derives from LDS-002 tokens.
- No generic dashboard cards unless explicitly specified.
- Supporting content appears only after Mission Studio releases.

### 1.3 Allowed variation

- Typography adjustments within the token scale.
- Minor spacing refinement.
- Specific animation timing within the motion system.
- Implementation details that do not change the experience.

### 1.4 Forbidden drift

- Replacing Mission Studio with a marketing hero.
- Introducing chat bubbles as the primary interaction.
- Adding decorative sections before the workspace.
- Generic SaaS dashboard components.
- Hardcoded values outside the token system.

---

## Definition of Done

- [ ] Alignment Contract artifact is created from the approved Intent Model / Refined Intent.
- [ ] Contract references all canonical evidence (design boards, LDS-002, component catalog, artifact catalog).
- [ ] Allowed interpretation, forbidden interpretation, allowed variation, and forbidden drift are explicit.
- [ ] Divergence Gate evaluates the contract and resolves to `aligned`.
- [ ] Contract is approved by an authorized reviewer.

---

## Out of Scope

- Intent Model creation (EXP-HOME-026).
- Mission approval execution (EXP-HOME-028).
- Homepage implementation.

---

## Acceptance Criteria

- The Alignment Contract can be evaluated independently of the conversation that produced it.
- A reviewer can approve or reject the contract based on its contents and evidence alone.
- The contract explicitly prevents the generic-dashboard failure mode observed in the original homepage incident.
