> **Human flow validation expedition.** Prove that SYNTH can guide a first-time user from Idea → Acceptance without exposing internal governance vocabulary.

**Status:** Proposed  
**Kind:** Proving-Ground Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-027  
**Blocks:** EXP-HOME-001, EXP-HOME-002, EXP-HOME-003, EXP-HOME-025

> **Authority:** `docs/analysis/simplified-interaction-model-decision.md`

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

Prove that a first-time user can use SYNTH without knowing SYNTH exists.

The user states an idea, answers guided questions, reviews an understanding, approves a contract, observes a mission and plan, reviews evidence, and accepts the outcome. The internal governance machinery performs all deterministic work behind the scenes.

This expedition is the acceptance test for the simplified interaction model.

---

## The simplicity governor

> **Internal governance artifacts MUST NOT become public vocabulary unless they represent a user decision.**

| Concept | User decision? | Public |
|---|---|---|
| Idea | Yes | ✅ |
| Question | Yes | ✅ |
| Understanding | Yes | ✅ |
| Contract | Yes | ✅ |
| Mission | Yes | ✅ |
| Plan | Yes | ✅ |
| Evidence | Yes | ✅ |
| Review | Yes | ✅ |
| Acceptance | Yes | ✅ |
| IntentModel | No | ❌ |
| RefinementSession | No | ❌ |
| RefinementReport | No | ❌ |
| AlignmentContract | No | ❌ |
| DivergenceGate | No | ❌ |
| MissionProjection | No | ❌ |
| ProjectionCertification | No | ❌ |
| ReviewGate | No | ❌ |
| AcceptanceGate | No | ❌ |

The upper layer is the product. The lower layer is the engine.

---

## Human-facing flow

```text
1. Idea
   User states: "I want a homepage for my AI tool."

2. Question
   SYNTH asks:
   • "Who is it for?"
   • "What should they feel?"
   • "What is the one action they should take?"
   • "What must it NOT look like?"
   • "Which reference is authoritative?"

3. Understanding
   SYNTH presents: "Here is what I understand you want..."

4. Contract
   SYNTH asks: "Approve this contract and I will build it."

5. Mission
   SYNTH shows: "This is the Mission I derived from your contract."

6. Plan
   SYNTH shows: "This is how I will execute the Mission."

7. Execution
   SYNTH executes and produces evidence.

8. Review
   SYNTH asks: "Does this match what we agreed?"

9. Acceptance
   SYNTH asks: "Do you accept this outcome?"
```

---

## Internal mapping

The homepage uses the internal machinery but never exposes it.

| Human-facing step | Internal capability | Internal artifacts |
|---|---|---|
| Idea | `CreateIntentModel` | `IntentModel` |
| Question | `StartRefinementSession`, `AnswerRefinementQuestion` | `RefinementQuestion`, `RefinementSession` |
| Understanding | `CreateRefinementReport`, `CreateAlignmentContract` | `RefinementReport`, `AlignmentContract` |
| Contract | `ApproveAlignmentContract`, `OpenDivergenceGate`, `ResolveDivergenceGate` | `AlignmentContract`, `DivergenceGate`, `DivergenceReport` |
| Mission | `ProjectMission` | `MissionProjectionPackage`, `ProjectionCertification`, `Mission` |
| Plan | `CreateExpedition` | `Expedition`, `RefinedIntent` |
| Execution | `StartExpedition`, `CompleteExpedition` | `ImplementationEvidence` |
| Review | `OpenReviewGate`, `ResolveReviewGate`, `RequestRevision` | `ReviewGatePackage`, `ReviewDecision` |
| Acceptance | `OpenAcceptanceGate`, `ResolveAcceptanceGate`, `CloseExpedition` | `AcceptanceGatePackage`, `AcceptanceRecord` |

---

## Capability verification

All internal capabilities required for the flow already exist in `src/domain/execution.ts`:

| Public step | Internal capability | Status |
|---|---|---|
| Idea | `CreateIntentModel` | ✅ Implemented |
| Question | `StartRefinementSession`, `AnswerRefinementQuestion` | ✅ Implemented |
| Understanding | `CreateRefinementReport`, `CreateAlignmentContract` | ✅ Implemented |
| Contract | `SubmitAlignmentContract`, `ApproveAlignmentContract`, `OpenDivergenceGate`, `ResolveDivergenceGate` | ✅ Implemented |
| Mission | `ProjectMission` | ✅ Implemented |
| Plan | `CreateExpedition`, `ApproveExpedition` | ✅ Implemented |
| Execution | `CommitExpedition`, `StartExpedition`, `CompleteExpedition` | ✅ Implemented |
| Review | `OpenReviewGate`, `ResolveReviewGate`, `RequestRevision` | ✅ Implemented |
| Acceptance | `OpenAcceptanceGate`, `ResolveAcceptanceGate`, `CloseExpedition` | ✅ Implemented |

No new capabilities are required.

---

## Implementation order

### Step 1 — Public state resolver

Build a resolver that maps internal state to public experience state.

```text
Internal State
       ↓
Public Experience State
       ↓
UI
```

Example:

Internal:

```text
IntentModel.status = submitted
RefinementApproval = approved
AlignmentContract = approved
MissionProjection = certified
```

Public:

```text
CurrentStep: Contract
Message: "Review what I understand before I begin building."
```

This is the most important piece. It is the boundary between the engine and the product.

### Step 2 — Thin UI views

Build one view per public step. These are presentation components, not new concepts.

| View | Purpose |
|---|---|
| `IdeaInput` | Capture the user's initial idea. |
| `QuestionFlow` | Present one question at a time; collect answers. |
| `UnderstandingCard` | Summarize what SYNTH understood; allow correction. |
| `ContractApproval` | Present the Contract; approve or reject. |
| `MissionView` | Display the derived Mission. |
| `PlanView` | Display Expeditions as plan steps. |
| `EvidenceView` | Show implementation evidence. |
| `ReviewView` | Ask whether evidence matches the Contract. |
| `AcceptanceView` | Final accept/reject action. |

### Step 3 — Forbidden vocabulary test

Automated check that homepage output does not contain internal governance terms.

Forbidden terms in public mode:

```text
Alignment
Divergence
Projection
Certification
Gate
Artifact
Governance
RefinementSession
RefinementReport
RefinedIntent
AcceptanceRecord
```

These may appear only inside developer/debug mode.

---

## Definition of Done

- [ ] Public state resolver maps internal state to public experience state.
- [ ] Thin UI views exist for all 9 public steps.
- [ ] A first-time user can state an idea on the homepage.
- [ ] SYNTH generates and presents guided questions.
- [ ] SYNTH presents an Understanding summary for confirmation.
- [ ] SYNTH presents a Contract for approval.
- [ ] SYNTH derives and displays a Mission after Contract approval.
- [ ] SYNTH derives and displays a Plan after Mission creation.
- [ ] SYNTH executes the Plan and produces Evidence.
- [ ] SYNTH presents Evidence for Review.
- [ ] SYNTH presents a final Acceptance step.
- [ ] Forbidden vocabulary test passes for public UI output.

---

## Forbidden vocabulary

The homepage must never display these terms to the user in public mode:

- Alignment Contract
- Divergence Gate
- Mission Projection
- Mission Projection Package
- Projection Certification
- Refinement Session
- Refinement Report
- Refined Intent
- Review Gate
- Review Gate Package
- Review Decision
- Acceptance Gate
- Acceptance Gate Package
- Acceptance Record
- Convergence Report
- Gate Policy
- Reviewer Kind
- Governance State Machine
- Artifact
- Governance

---

## Acceptance Criteria

1. A first-time user can complete the entire flow without documentation.
2. The flow matches the 9-term public vocabulary: Idea, Question, Understanding, Contract, Mission, Plan, Evidence, Review, Acceptance.
3. Each step is visually distinct and explains what is happening in plain language.
4. The Contract step clearly states what is being approved.
5. The Mission and Plan steps visibly connect to the approved Contract.
6. Evidence in the Review step is tied back to the Contract.
7. Acceptance is a single, clear final action.
8. Public UI output passes the forbidden vocabulary test.

---

## Out of Scope

- Modifying internal governance types or events.
- Renaming code artifacts.
- Adding new gates or capabilities.
- Implementing the full homepage design system.
- Launching the homepage publicly.
- Creating new programs, ADRs, or artifact families.

---

## Related

- `docs/analysis/synth-consolidation-review.md`
- `docs/analysis/simplified-interaction-model-decision.md`
- `docs/analysis/homepage-simplicity-proving-ground.md`
- EXP-HOME-027 — Homepage Alignment Contract
- EXP-PROGRAM-027 — Mission Studio Homepage
