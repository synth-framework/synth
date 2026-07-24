# EXP-GATE-002 — Completion Policies

> **Governance expedition.** Define the three completion policies — Automatic, Human Approval Required, and AI Approval Required — map them to expedition kinds, and establish the rule that an implementation agent cannot approve its own work.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Gate staffing rules for every expedition  
**Era:** III — Architecture  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Depends On:** none  
**Blocks:** EXP-GATE-004, EXP-GATE-007, EXP-GATE-008

```yaml
Impact:
  Constitutional: Medium
  Product: Low
  User Facing: Low
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Purpose

Make gate resolution deterministic by declaring, for every expedition, *who* is allowed to resolve its Review and Acceptance Gates. Without a clear completion policy, high-risk work can be silently promoted and low-risk work can be blocked by unnecessary ceremony. This expedition turns staffing decisions into governed, replayable rules.

---

## Goal

Produce a canonical completion-policy model that:

1. Names and defines the three policies: **Automatic**, **Human Approval Required**, and **AI Approval Required**.
2. Assigns a default policy to each expedition kind (Design, Architecture, Engineering, Product, Certification, Governance, etc.).
3. Formalizes the self-approval prohibition for non-Automatic policies.
4. Updates the expedition charter template so every future charter declares its completion policy up front.

The model becomes part of SYNTH's public governance vocabulary and is used immediately by Program 027 as the pilot certification project.

---

## Completion Policies

Every expedition declares one completion policy before entering execution. The policy determines how its Review and Acceptance Gates are staffed.

### 1. Automatic

The gate advances as soon as the required evidence is present. No human or AI reviewer is assigned.

- Typical use: documentation cleanup, refactoring, generated projections, low-risk mechanical changes, typo fixes, metadata updates.
- Requirement: the expedition charter must list the exact evidence that satisfies the gate.
- Risk guard: if the evidence is missing or the diff touches anything outside the declared scope, the policy reverts to Human Approval Required.

### 2. Human Approval Required

A human reviewer resolves the gate.

- Typical use: design, architecture, product behavior, user-facing experience, public vocabulary, anything touching Protected Assets, anything experience-shaping.
- Requirement: the reviewer's identity and approval decision are recorded as a replayable governance event.
- Risk guard: the implementation agent — human or AI — cannot be the reviewer.

### 3. AI Approval Required

A different AI agent resolves the gate. The implementation agent cannot approve its own work.

- Typical use: documentation quality, test quality, generated assets, naming consistency, style consistency, checklist-based code review, low-stakes generated artifacts.
- Requirement: reviewer identity must be distinct from the implementation agent identity (different session, model instance, or agent registration).
- Risk guard: if the AI reviewer and implementation agent share the same identity, the gate is invalid and must be re-reviewed by another agent or a human.

---

## Self-Approval Prohibition

Under **Human Approval Required** and **AI Approval Required**, the agent that performed the implementation is ineligible to resolve the gate.

- For human implementers: the same person cannot approve their own work.
- For AI implementers: the same agent identity/session cannot approve its own work.
- **Automatic** policies are exempt because they have no reviewer.

This rule applies to Review Gates and Acceptance Gates. Violations are treated as governance events requiring correction before the expedition can close.

---

## Definition of Done / Acceptance Criteria

- [ ] The three completion policies are named, defined, and documented with resolution semantics.
- [ ] A policy-assignment table maps each expedition kind to a default policy and states when an override is allowed.
- [ ] Program 027 expeditions are classified under the new policy model as a pilot exercise.
- [ ] The self-approval prohibition is written as a formal rule that covers both human and AI implementers.
- [ ] The expedition charter template includes a `Completion Policy` field and a reviewer-identity field.
- [ ] The Review Gate Package references the completion policy and the reviewer's identity.
- [ ] An ADR is accepted that ratifies the policy model and the self-approval rule.
- [ ] No Protected Asset is modified; only governance policy artifacts are introduced.

---

## Protected Assets

This expedition produces governance rules, not engine changes. The following are the protected artifacts it introduces:

- Completion Policy definitions (Automatic, Human Approval Required, AI Approval Required).
- Policy-to-expedition-kind assignment table.
- Self-approval prohibition rule.
- The `Completion Policy` field in the expedition charter template.

This expedition SHALL NOT modify:

- Refined Intent schema
- Review Gate Package format
- Review Decision event schema
- Acceptance Gate Package format
- Revision Request event schema
- ExecutionGate logic
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary

Any change to those assets requires an Architecture Expedition and a new ADR.

---

## Out of Scope

- Implementing enforcement logic in the execution engine (EXP-GATE-008).
- Changing the schemas of gate packages or decisions.
- Building review tooling or Mission Studio UI for policy selection.
- Certifying the policy behavior end-to-end (EXP-GATE-012).

---

## Relationship to Program 035

This expedition is part of **Phase 1 — Governance Model** of EXP-PROGRAM-035. It supplies the staffing rules that make the three-gate lifecycle operational.

- **EXP-PROGRAM-035** defines Refinement, Review, and Acceptance Gates.
- **EXP-GATE-002** defines who may resolve Review and Acceptance Gates.
- **EXP-PROGRAM-027 — Mission Studio Homepage** is the pilot certification project; its expeditions will be the first classified under these completion policies.

After this expedition is accepted, every future expedition charter must declare its completion policy before execution begins.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-GATE-001.md` (Review Lifecycle)
- `docs/expeditions/EXP-GATE-004.md` (Decision Model)
- `docs/expeditions/EXP-GATE-007.md` (Acceptance Policies)
- `docs/expeditions/EXP-GATE-008.md` (Review Gate Engine)
- `docs/architecture/constitution.md`
