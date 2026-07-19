# EXP-AIFC-010 — Certification and UX Validation

> **Product expedition.** Certify the greenfield workflow with real operators and agents.

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-009  
**Blocks:** none

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

Validate that the greenfield onboarding workflow is deterministic, self-guiding, and operator-friendly. Certification must:

- Exercise the normal path from idea to Mission.
- Exercise ambiguity and clarification.
- Exercise capability failure and recovery.
- Exercise approval gating.
- Gather feedback from real operators and agents.

---

## Required Change

### 10.1 Certification scenarios

Define scenarios for:

```text
Normal greenfield onboarding
Ambiguous idea requiring clarification
Unsupported architecture blocked by capability verification
Operator rejects proposed architecture
Operator approves and materializes
```

### 10.2 Operator and agent trials

Run the scenarios with:

- Operators unfamiliar with SYNTH.
- AI agents using only public CLI commands and documentation.

### 10.3 Feedback loop

Collect evidence on:

- Where the workflow was unclear.
- Where the agent had to invent steps.
- Where the CLI was misleading.
- Whether the produced Mission matched intent.

---

## Deliverables

1. **Certification suite** under `tests/first-contact-certification/`.
2. **Scenario matrix** covering normal, ambiguous, failure, and approval cases.
3. **UX report** with operator and agent feedback.
4. **Evidence package** for program acceptance.

---

## Acceptance Criteria

- Normal scenario completes without invented workflow steps.
- Ambiguous ideas reach approval through clarification.
- Capability failures block materialization with a clear explanation.
- Operators and agents can derive the workflow from the CLI.
- Feedback is incorporated into CLI/help/specification updates.

---

## Out of Scope

- Implementing new backend engines.
- Changes to Mission or Expedition execution semantics.
- Brownfield onboarding certification.

---

## Success Criteria

The expedition succeeds when greenfield onboarding is certified as deterministic, teachable, and aligned with operator intent.
