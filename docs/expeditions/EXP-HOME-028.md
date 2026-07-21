# EXP-HOME-028 — Homepage Intent → Mission Flow

> **Proving-ground expedition.** Demonstrate the complete human-facing SYNTH journey from idea to accepted outcome, without exposing internal governance vocabulary.

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

Demonstrate the complete human-facing SYNTH journey on the Mission Studio homepage.

A first-time user must be able to arrive, state an idea, answer guided questions, confirm understanding, approve a contract, observe mission execution, review evidence, and accept the outcome—without encountering internal governance vocabulary.

This expedition is the acceptance test for the simplified interaction model.

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
| Question | `AskQuestion` | `RefinementQuestion`, `RefinementSession` |
| Understanding | `CreateRefinementReport` + `CreateAlignmentContract` | `RefinementReport`, `AlignmentContract` |
| Contract | `ApproveAlignmentContract` + `OpenDivergenceGate` + `ResolveDivergenceGate` | `AlignmentContract`, `DivergenceGate`, `DivergenceReport` |
| Mission | `ProjectMission` | `MissionProjectionPackage`, `ProjectionCertification`, `Mission` |
| Plan | `CreateExpedition` | `Expedition`, `RefinedIntent` |
| Execution | `StartExpedition` + `CompleteExpedition` | `ImplementationEvidence` |
| Review | `OpenReviewGate` + `ResolveReviewGate` | `ReviewGatePackage`, `ReviewDecision` |
| Acceptance | `OpenAcceptanceGate` + `ResolveAcceptanceGate` | `AcceptanceGatePackage`, `AcceptanceRecord` |

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

## Minimum missing pieces

The gap is not in governance machinery. The gap is in **public-vocabulary orchestration and presentation**.

### 1. Homepage orchestration layer

A controller that sequences the existing capabilities using public step names only. It must:

- Accept an Idea.
- Trigger question generation.
- Collect answers.
- Produce Understanding and Contract.
- Await Contract approval.
- Trigger Mission projection.
- Derive Plan (Expeditions).
- Execute Plan.
- Collect Evidence.
- Present Review.
- Present Acceptance.

This layer never exposes internal artifact names.

### 2. Public-vocabulary UI components

One component per public step:

| Component | Purpose |
|---|---|
| `IdeaInput` | Capture the user's initial idea. |
| `QuestionWizard` | Present one question at a time; collect answers. |
| `UnderstandingCard` | Summarize what SYNTH understood; allow correction. |
| `ContractApproval` | Present the Contract; approve or reject. |
| `MissionCard` | Display the derived Mission. |
| `PlanView` | Display Expeditions as plan steps. |
| `EvidencePanel` | Show implementation evidence. |
| `ReviewPrompt` | Ask whether evidence matches the Contract. |
| `AcceptancePrompt` | Final accept/reject action. |

### 3. Public step resolver

A small projection that maps internal state to the current public step:

```text
no IntentModel           → Idea
IntentModel, no approved RefinementReport → Question / Understanding
approved AlignmentContract, no aligned DivergenceGate → Contract
aligned DivergenceGate, no Mission        → Mission
Mission, no Expeditions                   → Plan
Expeditions not started/complete          → Execution
Expeditions complete, no Review decision  → Review
Review approved, no Acceptance            → Acceptance
```

### 4. Plain-language replay timeline

Replay must remain available, but labels use public vocabulary:

```text
Idea recorded
Questions answered
Understanding confirmed
Contract approved
Mission created
Plan created
Evidence produced
Review completed
Acceptance recorded
```

---

## Implementation plan

1. **Build the orchestration layer** using existing capabilities.
2. **Build the 9 UI components** using the public vocabulary.
3. **Add the public step resolver** to drive component visibility.
4. **Wire the homepage** to the orchestration layer.
5. **Verify forbidden vocabulary** is never displayed.
6. **Run the acceptance test** with a first-time user script.

---

## Definition of Done

- [ ] A first-time user can state an idea on the homepage.
- [ ] SYNTH generates and presents guided questions.
- [ ] SYNTH presents an Understanding summary for confirmation.
- [ ] SYNTH presents a Contract for approval.
- [ ] SYNTH derives and displays a Mission after Contract approval.
- [ ] SYNTH derives and displays a Plan after Mission creation.
- [ ] SYNTH executes the Plan and produces Evidence.
- [ ] SYNTH presents Evidence for Review.
- [ ] SYNTH presents a final Acceptance step.
- [ ] The user never sees the internal governance vocabulary listed below.

---

## Forbidden vocabulary

The homepage must never display these terms to the user:

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

---

## Acceptance Criteria

1. A first-time user can complete the entire flow without documentation.
2. The flow matches the 9-term public vocabulary: Idea, Question, Understanding, Contract, Mission, Plan, Evidence, Review, Acceptance.
3. Each step is visually distinct and explains what is happening in plain language.
4. The Contract step clearly states what is being approved.
5. The Mission and Plan steps visibly connect to the approved Contract.
6. Evidence in the Review step is tied back to the Contract.
7. Acceptance is a single, clear final action.
8. Replay timeline is available but labeled in plain language.

---

## Out of Scope

- Modifying internal governance types or events.
- Renaming code artifacts.
- Adding new gates or capabilities.
- Implementing the full homepage design system.
- Launching the homepage publicly.

---

## Related

- `docs/analysis/synth-consolidation-review.md`
- `docs/analysis/simplified-interaction-model-decision.md`
- `docs/analysis/homepage-simplicity-proving-ground.md`
- EXP-HOME-027 — Homepage Alignment Contract
- EXP-PROGRAM-027 — Mission Studio Homepage
