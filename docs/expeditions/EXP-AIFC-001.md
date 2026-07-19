# EXP-AIFC-001 — Discovery Lifecycle Specification

> **Architecture expedition.** Define the canonical greenfield discovery workflow and approval gates before any intent-extraction or materialization work begins.

**Status:** Completed and accepted  
**Started:** 2026-07-19  
**Completed:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** none  
**Blocks:** EXP-AIFC-002, EXP-AIFC-003, EXP-AIFC-004

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Establish the canonical lifecycle for greenfield onboarding. The lifecycle must separate **intent capture** from **project creation** and define the exact approval gates that allow state to be materialized.

It must answer:

- What phases does a First Contact Discovery session move through?
- What is the input and output of each phase?
- Which phases are read-only, proposal-only, or mutating?
- What approval is required before repository materialization?
- Which CLI commands transition between phases?

---

## Origin Evidence

Current greenfield onboarding relies on the agent to infer how an unstructured idea becomes a Mission. There is no documented workflow, no approval boundary, and no guarantee that repository state will not be created before intent is validated.

---

## Required Change

### 1.1 Define phases

A greenfield Discovery session moves through:

```text
Intake
  ↓
Intent Extraction
  ↓
Clarification
  ↓
Architecture Projection
  ↓
Capability Verification
  ↓
Discovery Approval
  ↓
Mission Materialization
  ↓
Expedition Proposal
```

### 1.2 Classify phase mutation risk

| Phase | Classification |
|---|---|
| Intake | READ_ONLY |
| Intent Extraction | READ_ONLY |
| Clarification | PROPOSAL_ONLY |
| Architecture Projection | PROPOSAL_ONLY |
| Capability Verification | READ_ONLY |
| Discovery Approval | MUTATING (intent approval) |
| Mission Materialization | MUTATING |
| Expedition Proposal | PROPOSAL_ONLY |

### 1.3 Define approval gates

- **Discovery Approval:** operator confirms the Discovery artifact is accurate and complete.
- **Mission Approval:** operator approves the generated Mission before Expeditions are proposed.

No repository state may be created before Discovery Approval.

---

## Deliverables

1. **Discovery Lifecycle Specification** document under `docs/guides/greenfield-discovery-lifecycle.md`.
2. **Phase transition diagram** showing read-only, proposal, and mutating boundaries.
3. **CLI command proposal** for `synth first-contact` subcommands.
4. **ADR** on the greenfield Discovery lifecycle and approval gates.

---

## Acceptance Criteria

- The lifecycle explicitly separates intent capture from project creation.
- Every phase has a defined classification and output.
- Approval gates are required before any mutating phase.
- Subsequent expeditions can be implemented against the specification without ambiguity.

---

## Out of Scope

- Discovery artifact schema details (EXP-AIFC-002).
- Intent extraction implementation (EXP-AIFC-003).
- Architecture projection implementation (EXP-AIFC-005).
- Mission materialization implementation (EXP-AIFC-007).

---

## Success Criteria

The expedition succeeds when a reviewer can read the specification and confidently implement the rest of the program.
