# EXP-GATE-004 — Decision Model

> **Governance model expedition.** Define the rich decision vocabulary used at every gate: Approve, Approve with Conditions, Revision Required, Reject, Supersede Expedition, Split Expedition, Merge Expedition, Escalate to Mission, Escalate to Program.

**Status:** Proposed  
**Kind:** Governance Model Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Era:** III — Architecture  
**Depends On:** none  
**Blocks:** EXP-GATE-005, EXP-GATE-006, EXP-GATE-007, EXP-GATE-008, EXP-GATE-009, EXP-GATE-012

---

## Purpose

SYNTH gates currently imply a binary outcome: pass or fail. Real review is richer. A reviewer may accept work with enforceable conditions, send it back for revision, reject it outright, or recognize that the artifact under review has changed scope so dramatically that the expedition itself must be superseded, split, merged, or escalated. This expedition defines a complete, unambiguous decision vocabulary that every gate can emit, and the rules that determine which decisions are valid at which gates.

---

## Goal

Produce a governed decision model that:

1. Enumerates every decision type available at the Refinement Gate, Review Gate, and Acceptance Gate.
2. Defines the exact semantics, preconditions, and downstream effects of each decision.
3. Specifies which decisions apply only to the Review Gate versus the Refinement or Acceptance Gates.
4. Establishes how each decision is recorded as a replayable governance event.
5. Provides the vocabulary that later expeditions will use to implement gate packages, engine logic, and Mission Studio visualizations.

---

## Decision Vocabulary

### Refinement Gate decisions

| Decision | Meaning |
|---|---|
| `refined_intent_approved` | The interpreted intent is clear, bounded, and ready to become a Mission. |
| `clarification_requested` | The intent is ambiguous, incomplete, or conflicts with constraints; return to intent gathering. |

### Review Gate decisions

| Decision | Meaning |
|---|---|
| `approve` | The implementation satisfies the Refined Intent and may proceed to Acceptance. |
| `approve_with_conditions` | The implementation is directionally correct but requires specific, enforceable changes before Acceptance. |
| `revision_required` | The implementation does not satisfy the Refined Intent and must return to implementation. |
| `reject` | The implementation is fundamentally wrong, out of scope, or unsafe and will not be accepted. |
| `supersede_expedition` | The original expedition is replaced by a new expedition with revised intent; dependents pause. |
| `split_expedition` | The expedition is divided into multiple independent expeditions, each with its own intent and gates. |
| `merge_expedition` | The expedition is combined with one or more other expeditions into a single expedition. |
| `escalate_to_mission` | The issue cannot be resolved at expedition scope and requires Mission-level reconsideration. |
| `escalate_to_program` | The issue affects program-level assumptions and requires Program-level reconsideration. |

### Acceptance Gate decisions

| Decision | Meaning |
|---|---|
| `accepted` | The work is production-worthy and the expedition may close. |
| `rejected` | The work is not production-worthy; return to revision, review, or Mission review. |

---

## Semantics and Preconditions

### `approve_with_conditions`

- Conditions must be expressed as discrete, verifiable requirements.
- Conditions do not send the expedition back to implementation; they are gates on Acceptance.
- Failure to meet a condition at Acceptance must produce `rejected` or `revision_required`, not silent waiver.

### `revision_required`

- Must reference the Refined Intent clauses that are not satisfied.
- Must produce a `Revision Request` event in the event log.
- Must block dependent expeditions until the revision is resolved.

### `reject`

- Terminates the current implementation path.
- Requires a new plan or a new Mission before work may resume.
- Does not delete history; the rejection and reasoning remain replayable evidence.

### `supersede_expedition`

- The original expedition is marked `superseded` and becomes read-only evidence.
- A successor expedition is created with a new Refined Intent reference.
- Expeditions that depended on the superseded expedition are paused pending re-evaluation.

### `split_expedition`

- The original expedition is marked `split` and becomes read-only evidence.
- Each child expedition receives a distinct Refined Intent, boundary, and gate sequence.
- Dependencies are reassigned to the appropriate child expedition.

### `merge_expedition`

- Two or more source expeditions are marked `merged` and become read-only evidence.
- A single merged expedition is created with a unified Refined Intent and gate sequence.
- Source evidence is preserved and referenced by the merged expedition.

### `escalate_to_mission`

- Pauses the expedition until the Mission is reconsidered.
- May result in a revised Refined Intent, a new expedition plan, or expedition rejection.

### `escalate_to_program`

- Pauses the expedition and all related Mission work until the Program is reconsidered.
- Reserved for architectural, policy, or scope conflicts that exceed Mission authority.

---

## Definition of Done

- [ ] A decision vocabulary document exists under `docs/governance/decision-model.md` or equivalent canonical location.
- [ ] Each decision type has a stable machine identifier, human-readable label, and normative definition.
- [ ] The valid decisions for the Refinement Gate, Review Gate, and Acceptance Gate are explicitly enumerated and non-overlapping.
- [ ] Preconditions and downstream effects are defined for every Review Gate decision.
- [ ] Event schemas for `ReviewDecision`, `RevisionRequest`, `Superseded`, `Split`, `Merge`, `Escalated` reference the decision vocabulary.
- [ ] The decision vocabulary is reviewed and approved as a Program 035 governance artifact.

---

## Protected Assets

This expedition touches governance schemas and vocabulary that become Protected Assets once approved:

- Decision vocabulary identifiers and definitions
- `ReviewDecision` event schema
- `RevisionRequest` event schema
- Gate-to-decision validity rules

Any subsequent change to these artifacts requires an Architecture Expedition and a new ADR.

---

## Out of Scope

- Implementing gate engine enforcement (EXP-GATE-008).
- Defining the Review Gate Package schema (EXP-GATE-005).
- Defining the Refined Intent schema (EXP-GATE-006).
- Defining Acceptance policies (EXP-GATE-007).
- Mission Studio UI for rendering gate decisions (EXP-GATE-010).

---

## Success Criteria

The expedition succeeds when every gate decision in SYNTH can be expressed using the defined vocabulary, reviewers cannot invent ad-hoc decision categories, and downstream engine and UI expeditions have a stable contract to implement against.

---

## Relationship to Program 035

EXP-GATE-004 is a Phase 1 governance model expedition in **EXP-PROGRAM-035 — Intent Refinement & Review Governance**. It establishes the decision language that makes the three-gate lifecycle operational. Without a rich decision model, the Review Gate collapses to binary approve/reject, and the governance extensions introduced by Program 035 cannot be enforced or replayed.

This expedition does not modify runtime code. It defines the contract that EXP-GATE-005 (Review Gate Package), EXP-GATE-008 (Review Gate Engine), EXP-GATE-010 (Mission Studio Integration), and EXP-GATE-012 (Certification) will implement and prove.

Program 027 (Mission Studio Homepage) is the pilot certification project; its paused expeditions will be the first real artifacts evaluated with this decision vocabulary once Program 035 is certified.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-GATE-001.md` *(Review Lifecycle)*
- `docs/expeditions/EXP-GATE-002.md` *(Completion Policies)*
- `docs/expeditions/EXP-GATE-003.md` *(Refinement Lifecycle)*
- `docs/expeditions/EXP-GATE-005.md` *(Review Gate Package)*
- `docs/expeditions/EXP-GATE-008.md` *(Review Gate Engine)*
