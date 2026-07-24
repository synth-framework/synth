# EXP-GATE-006 — Refined Intent Artifact

> **Architecture expedition.** Define the canonical `Refined Intent` schema that turns raw human intent into a governed, reviewable contract before Mission approval.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Phase:** 2 — Artifacts  
**Depends On:** EXP-GATE-001, EXP-GATE-003  
**Blocks:** EXP-GATE-008, EXP-GATE-010, EXP-GATE-011  

---

```yaml
Impact:
  Constitutional: Low
  Product: Medium
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Establish a single, canonical schema for the `Refined Intent` artifact produced by the Refinement Gate. The schema must be complete enough to serve as the contract against which Review and Acceptance Gates evaluate implementation, and simple enough to be authored by a human operator or operator agent without ambiguity.

---

## Purpose

Before SYNTH commits to a Mission, the operator and the system must agree on what is actually being requested. The `Refined Intent` is that agreement: a deterministic, reviewable artifact that separates real intent from conversation, screenshots, and assumptions.

This expedition defines the schema; it does not implement the engine that produces or validates it. By the end of this expedition, every future Program and Mission can declare its `Refined Intent` in the same canonical shape.

---

## Origin Evidence

Program 035 introduces three gates to close the gap between intent and execution. The Refinement Gate is the first of those gates, and it is only as strong as the artifact it produces. Without a canonical `Refined Intent` schema:

- Reviewers have no stable contract to compare implementation against.
- Mission approval can be granted on ambiguous or incomplete understanding.
- Downstream expeditions inherit unstated assumptions and drift.
- Program 027 cannot be retrofitted as the pilot certification project.

The fields required by the schema are already identified in EXP-PROGRAM-035. This expedition turns that list into a typed, versioned, documented contract.

---

## Required Change

### Canonical `Refined Intent` schema

Every `Refined Intent` artifact SHALL contain the following fields. Each field is required unless explicitly marked optional.

| Field | Cardinality | Description |
|---|---|---|
| `objective` | 1 | A single, testable statement of what the Mission must achieve. |
| `scope` | 1 | The boundary of the work: what is in, what surfaces are affected, and what lifecycle phases are touched. |
| `non_goals` | 1..n | Deliberate exclusions that look related but are out of scope. |
| `success_criteria` | 1..n | Concrete, verifiable conditions that prove the objective is met. |
| `visual_references` | 0..n | Links or hashes to design boards, mockups, screenshots, tokens, or LDS documents. |
| `behavioral_references` | 0..n | Links or hashes to interaction scripts, state machines, user flows, or demo recordings. |
| `constraints` | 0..n | Hard limits the implementation must respect: performance, compatibility, dependency, accessibility, or policy. |
| `protected_assets` | 1..n | Assets that must not be modified without a separate Architecture Expedition and ADR. |
| `acceptance_examples` | 1..n | Minimal, concrete examples of what "done and accepted" looks like. |
| `known_unknowns` | 0..n | Open questions, assumptions, or areas where intent is provisional and may need clarification. |
| `risks` | 0..n | Risks that could invalidate the intent or make acceptance difficult, plus mitigation notes. |
| `version` | 1 | Schema version identifier for replay and migration. |
| `derived_from` | 1..n | References to raw intent, evidence, conversations, or prior artifacts. |
| `approved_by` | 1 | Reviewer and timestamp from the Refinement Gate. |

### Schema rules

1. **Contractual:** Once approved, the `Refined Intent` is the contract. Review and Acceptance Gates compare implementation against it.
2. **Immutable:** An approved `Refined Intent` SHALL NOT be edited in place. Changes require a new Refinement Gate event and a new version.
3. **Traceable:** Every field must be derivable from supplied evidence or explicit operator declaration.
4. **Machine-readable:** The schema must have a JSON Schema representation and a TypeScript type definition.
5. **Human-reviewable:** The canonical form must render cleanly in Mission Studio and in plain Markdown.

---

## Deliverables

1. `docs/artifacts/refined-intent-schema.json` — canonical JSON Schema.
2. `src/governance/refined-intent.ts` — TypeScript type definition.
3. `docs/artifacts/refined-intent.md` — human-readable field reference and authoring guide.
4. At least one complete example `Refined Intent` for a realistic SYNTH expedition.
5. A validation function that reports which required fields are missing or malformed.

---

## Acceptance Criteria

- [ ] The JSON Schema declares every required field with type, cardinality, and description.
- [ ] The TypeScript type is checked into source control and imported by any artifact-related code.
- [ ] The schema supports `objective`, `scope`, `non_goals`, `success_criteria`, `visual_references`, `behavioral_references`, `constraints`, `protected_assets`, `acceptance_examples`, `known_unknowns`, and `risks` as first-class fields.
- [ ] `protected_assets` in a `Refined Intent` can reference existing Protected Assets and declare new expedition-local protected artifacts.
- [ ] The validation function rejects artifacts with missing required fields and reports the specific gaps.
- [ ] At least one complete example demonstrates how a raw intent statement is converted into a fully populated `Refined Intent`.
- [ ] The artifact renders correctly in Mission Studio without layout or truncation issues.
- [ ] Program 027 can produce a `Refined Intent` for its current paused state using this schema.

---

## Definition of Done

- [ ] Schema documents and source types are merged.
- [ ] Example artifact is reviewed and approved by a human operator.
- [ ] Validation function passes targeted tests.
- [ ] No Protected Asset is modified.
- [ ] The `Refined Intent` schema is registered as a protected artifact of Program 035.

---

## Out of Scope

- Implementing the Refinement Gate engine (EXP-GATE-008).
- Implementing the Review Gate or Acceptance Gate packages (EXP-GATE-005, EXP-GATE-007).
- Runtime enforcement of gate decisions.
- Storing binary reference assets inside the event log.
- UI design for Mission Studio gate visualization.

---

## Protected Assets

This expedition does not modify the existing Protected Assets:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

However, this expedition **establishes** the `Refined Intent` schema, which Program 035 declares as a newly protected artifact. Once adopted, the schema SHALL NOT be changed without an Architecture Expedition and a new ADR.

---

## Success Criteria

This expedition succeeds when:

- Any operator or operator agent can author a `Refined Intent` in the canonical schema from raw intent and evidence.
- The schema is stable enough for EXP-GATE-008 to build validation and storage logic against it.
- Program 027 can produce `Refined Intent` artifacts for its existing frozen expeditions.
- Reviewers can compare future implementations directly to the `Refined Intent` without needing the original conversation.

---

## Relationship to Program 035

EXP-GATE-006 is a Phase 2 artifact expedition inside **EXP-PROGRAM-035 — Intent Refinement & Review Governance**, the final architectural program before the testing and stabilization era. It provides the canonical contract that makes the Refinement Gate, Review Gate, and Acceptance Gate meaningful.

It directly enables:

- **EXP-GATE-005** — Review Gate Package (consumes the `Refined Intent` reference).
- **EXP-GATE-007** — Acceptance Policies (uses the `Refined Intent` to decide readiness).
- **EXP-GATE-008** — Review Gate Engine (validates and stores `Refined Intent` artifacts).
- **EXP-GATE-011** — Retrofit Program 027 (the pilot certification project must express its paused state as `Refined Intent` artifacts).

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-GATE-001.md`
- `docs/expeditions/EXP-GATE-003.md`
- `docs/expeditions/EXP-GATE-005.md`
- `docs/expeditions/EXP-GATE-007.md`
