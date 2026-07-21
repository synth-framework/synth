# SYNTH Consolidation Review

> **Controlled consolidation effort.** No new artifacts. No new gates. No new programs. No ADRs. No runtime changes. No code renames.
>
> Goal: reduce cognitive load while preserving determinism.

---

## Executive summary

The refinement/review model has been validated by using it on SYNTH itself. The architecture now contains the right machinery, but the public vocabulary has drifted. Too many internal artifacts are exposed to the operator.

This review proposes a clean split:

- **Internal governance model** — rich, deterministic, auditable. Keep it.
- **Human interaction model** — minimal, comprehensible, trust-building. Expose only this.

The consolidation is vocabulary compression, not architecture deletion.

---

## 1. The irreducible lifecycle

```text
Intent
  ↓
Contract
  ↓
Mission
  ↓
Execution
  ↓
Evidence
  ↓
Acceptance
```

This is the constitutional spine. Every other artifact exists to support one of these six transitions.

| Transition | Question answered | Public concept |
|---|---|---|
| Intent → Contract | "Do we understand what should be built?" | Understanding / Contract |
| Contract → Mission | "Do we know how to build it?" | Plan / Mission |
| Mission → Execution | "Are we authorized to do the work?" | Approve plan |
| Execution → Evidence | "What was built?" | Evidence |
| Evidence → Acceptance | "Did we build what we agreed?" | Review / Acceptance |

---

## 2. Artifact classification

### Constitutional artifacts

These are first-class, user-visible concepts. They anchor the lifecycle.

| Artifact | Why constitutional | Cannot be derived because... |
|---|---|---|
| **Intent** | Origin of all work | It comes from the human. Nothing precedes it. |
| **Contract** | Boundary between understanding and building | It is the human authorization. A machine cannot authorize itself. |
| **Mission** | Executable plan derived from the Contract | It is the commitment to act. Requires authorization. |
| **Plan** | Decomposition of the Mission into Expeditions | It is the operational roadmap. Requires operator visibility. |
| **Evidence** | Proof of what was built | It comes from execution. Nothing precedes it. |
| **Acceptance** | Final human authorization | It is the decision that work is complete. |

### Derived artifacts

These exist in the event log and replay, but should not drive the user experience.

| Current name | Derived from | Becomes internal to... |
|---|---|---|
| IntentModel | Intent | Intent capture |
| RefinementSession | IntentModel + questions/answers | Contract formation |
| RefinementReport | RefinementSession + IntentModel | Contract formation |
| AlignmentContract | IntentModel + RefinementReport | Contract (public surface) |
| ReferenceEvidence | External artifacts | Contract / Evidence |
| DivergenceGate | AlignmentContract + IntentModel | Contract approval |
| DivergenceReport | DivergenceGate | Contract approval audit |
| MissionProjectionPackage | AlignmentContract + IntentModel + RefinementReport | Mission creation |
| ProjectionCertification | MissionProjectionPackage | Mission creation |
| MissionDraft | Mission | Mission approval (not currently used) |
| RefinedIntent | Mission / AlignmentContract | Expedition charter |
| ReviewGatePackage | RefinedIntent + Evidence | Review |
| ReviewDecision | ReviewGatePackage | Review |
| RevisionRequest | ReviewDecision | Review feedback |
| AcceptanceGatePackage | ReviewDecision | Acceptance |
| AcceptanceRecord | AcceptanceGatePackage | Acceptance |
| ConvergenceReport | All upstream artifacts | Acceptance / post-acceptance |

### Classification verdict

- **6 constitutional artifacts**
- **17 derived artifacts**

The derived artifacts support determinism, replay, and audit. They are engineering necessities. They are not product concepts.

---

## 3. User-facing vs internal concepts

### User-facing vocabulary

```text
Idea
Question
Understanding
Contract
Mission
Plan
Evidence
Review
Acceptance
```

### Internal vocabulary

```text
IntentModel
RefinementSession
RefinementQuestion
RefinementReport
AlignmentContract
ReferenceEvidence
DivergenceGate
DivergenceReport
MissionProjectionPackage
ProjectionCertification
MissionDraft
RefinedIntent
ReviewGatePackage
ReviewDecision
RevisionRequest
AcceptanceGatePackage
AcceptanceRecord
ConvergenceReport
GatePolicy
ReviewerKind
GateStatus
```

### Mapping table

| User sees | Internal machinery | What the agent does |
|---|---|---|
| Idea | IntentModel | Structures the user's raw input into objectives, constraints, references |
| Question | RefinementQuestion + RefinementSession | Generates targeted clarification requests |
| Understanding | RefinementReport + AlignmentContract | Synthesizes answers into an explicit contract |
| Contract | AlignmentContract + DivergenceGate | Presents the contract for approval; certifies alignment |
| Mission | MissionProjectionPackage + ProjectionCertification | Projects and certifies the executable Mission |
| Plan | Expedition + RefinedIntent | Decomposes the Mission into Expeditions |
| Evidence | ImplementationEvidence | Collects proof of work |
| Review | ReviewGatePackage + ReviewDecision + RevisionRequest | Presents evidence; records review outcome; requests changes |
| Acceptance | AcceptanceGatePackage + AcceptanceRecord | Presents final sign-off; records acceptance |

---

## 4. Where questioning belongs

Questioning is not a separate artifact or program. It is an **agent capability**.

The primitive is:

```text
AskQuestion
```

not:

```text
CreateRefinementSession
```

The session is an internal trace. The user experience is:

> "SYNTH asks the right questions until it understands."

### Proposed agent capability model

```text
Agent
 ├── Discover
 ├── Ask
 ├── Explain
 ├── Propose
 ├── Execute
 └── Verify
```

`Ask` is the capability that produces `RefinementQuestion` artifacts internally. The operator only sees questions and answers.

---

## 5. What stays, what goes, what maps

### Stays exactly as-is

- Event log schema
- Replay engine
- State materialization
- Internal types and functions
- Capability implementations
- Deterministic guarantees

### Goes from public vocabulary

- RefinementSession
- RefinementReport
- AlignmentContract (renamed conceptually to Contract)
- DivergenceGate
- MissionProjectionPackage
- ProjectionCertification
- ReviewGatePackage
- AcceptanceGatePackage
- RefinedIntent
- ConvergenceReport (if implemented)

### Maps to simpler public names

| Internal name | Public name | Rationale |
|---|---|---|
| IntentModel | Idea / Intent | The user's starting point |
| AlignmentContract | Contract | The authorized agreement |
| Mission | Mission | Already simple |
| Expedition | Plan step / Task | Less foreign terminology |
| ReviewGate | Review | Already common language |
| AcceptanceGate | Acceptance | Already common language |
| ReferenceEvidence | Reference / Source | More intuitive |
| ImplementationEvidence | Evidence | Already simple |

---

## 6. CLI command consolidation

Current user-facing commands:

```text
synth intent create
synth intent approve
synth alignment create
synth alignment submit
synth alignment approve
synth alignment prepare
synth mission project
synth mission create
synth mission approve
synth expedition create
synth expedition approve
synth expedition commit
synth expedition start
synth expedition complete
```

### Proposed simplified command surface

```text
synth understand <input>          # maps to intent + refinement
synth contract [approve|review]   # maps to alignment contract + divergence
synth mission [project|approve]   # maps to mission projection + approval
synth plan <mission-id>           # maps to expedition planning
synth execute <plan-id>           # maps to expedition execution
synth review <expedition-id>      # maps to review gate
synth accept <expedition-id>      # maps to acceptance gate
```

**Note:** This is a UX proposal only. The runtime commands and events would remain unchanged.

---

## 7. Homepage acceptance test

The homepage proves the simplification works if a visitor can:

1. Enter an idea.
2. Answer clarifying questions.
3. Confirm what SYNTH understood.
4. Approve the contract.
5. See a Mission and Plan produced.
6. Review evidence and accept the result.

Without ever seeing:

- Alignment Contract
- Divergence Gate
- Mission Projection Package
- Projection Certification
- Review Gate Package
- Acceptance Gate Package
- Governance State Machine

---

## 8. What we are NOT doing

| Not doing | Why |
|---|---|
| New ADR | The evidence is in the existing analyses; no new decision needed yet |
| New artifact types | We already have the machinery |
| New gates | The gate model works; we are hiding it, not adding to it |
| New programs | This is consolidation, not expansion |
| Runtime changes | Internal model is correct; only exposure changes |
| Code renames | Premature; map vocabulary first, rename after acceptance |

---

## 9. Open decisions before acceptance

1. **Contract vs. Refined Intent:** Is the approved `RefinedIntent` the same as the `Contract`, or is the Contract a stricter, evidence-bound version?
2. **Mission Approval:** If the Contract is approved, is a separate Mission Approval step necessary, or does Contract approval authorize the Mission?
3. **Review + Acceptance:** Can these merge into one final `Review and Accept` step, or does the two-step separation prevent real failures?
4. **Plan vocabulary:** Should `Expedition` become `Plan step`, `Task`, or remain `Expedition`?
5. **Questioning visibility:** Should the user ever see a "Refinement" label, or only "Questions"?

---

## 10. Recommendation

Adopt the split:

- **Keep the rich internal governance model.** It is correct.
- **Expose only the 9-term human interaction vocabulary.**
- **Update CLI and documentation to the simplified surface.**
- **Use the homepage as the acceptance test.**

The next concrete step is a vocabulary mapping ADR or CLI redesign, not a runtime change.
