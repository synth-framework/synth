# Simplified Interaction Model — Decision Record

> Frozen simplified interaction model for SYNTH. No ADR. No code changes. No migrations. No new artifacts.
>
> Based on `docs/analysis/synth-consolidation-review.md`.

---

## 1. Which concepts are constitutional and cannot disappear?

These concepts are required for SYNTH to function as a deterministic intent-to-execution system. They may be renamed or hidden, but their semantic role cannot be removed.

| Concept | Why constitutional |
|---|---|
| **Intent** | Origin of all work. A system without human intent is not SYNTH. |
| **Contract** | The authorized boundary between "understanding" and "building." A machine cannot authorize its own execution. |
| **Mission** | The executable commitment derived from the Contract. |
| **Plan** | The decomposition of the Mission into actionable Expeditions. |
| **Evidence** | Proof of what was built during Execution. |
| **Acceptance** | The final human decision that work satisfies the Contract. |
| **Questioning** | The capability that resolves ambiguity before Contract formation. Without it, the agent guesses. |
| **Review** | The checkpoint between Execution and Acceptance. Without it, unreviewed work can be accepted. |

---

## 2. Which concepts are internal implementation details?

These exist for determinism, replay, audit, and agent execution. They are engineering necessities but not product concepts.

| Internal concept | Internal role |
|---|---|
| `IntentModel` | Structured representation of raw Intent. |
| `RefinementSession` | Tracks the question/answer loop. |
| `RefinementQuestion` | Generated clarification question. |
| `RefinementReport` | Record of what changed during refinement and why. |
| `AlignmentContract` | The internal form of the Contract. |
| `DivergenceGate` | Certification that the Contract matches Intent. |
| `DivergenceReport` | Audit record of the Divergence Gate decision. |
| `MissionProjectionPackage` | Complete derivation proof of Mission from Contract. |
| `ProjectionCertification` | Verification that the projection is complete and faithful. |
| `RefinedIntent` | Per-expedition contract derived from Mission. |
| `ReviewGatePackage` | Bundle under review. |
| `ReviewDecision` | Record of Review Gate resolution. |
| `RevisionRequest` | Structured feedback from reviewer to implementer. |
| `AcceptanceGatePackage` | Final sign-off bundle. |
| `AcceptanceRecord` | Immutable proof of Acceptance. |
| `ConvergenceReport` | End-to-end intent verification (proposed). |
| `GatePolicy` / `ReviewerKind` / `GateStatus` | Gate mechanics. |

---

## 3. Which concepts belong in public vocabulary?

The public vocabulary is what a first-time user must understand to use SYNTH.

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

### Mapping to internal concepts

| Public term | Internal machinery | User-facing meaning |
|---|---|---|
| Idea | `IntentModel` | "What do you want?" |
| Question | `RefinementQuestion` + `RefinementSession` | "SYNTH asks for clarification." |
| Understanding | `RefinementReport` + `AlignmentContract` | "Here is what SYNTH believes you mean." |
| Contract | `AlignmentContract` + `DivergenceGate` | "Approve this and SYNTH will build it." |
| Mission | `MissionProjectionPackage` + `ProjectionCertification` + `Mission` | "This is what SYNTH will build." |
| Plan | `Expedition` + `RefinedIntent` | "This is how SYNTH will build it." |
| Evidence | `ImplementationEvidence` | "This is what was built." |
| Review | `ReviewGatePackage` + `ReviewDecision` + `RevisionRequest` | "Does this match the Contract?" |
| Acceptance | `AcceptanceGatePackage` + `AcceptanceRecord` | "Is this complete?" |

---

## 4. Which CLI commands should remain user-facing?

Current commands exposed to the operator:

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

### Decision: simplified CLI surface

These commands remain user-facing:

```text
synth understand <input>            # create / refine intent
synth contract [draft|approve|show] # view and approve contract
synth mission [show|approve]        # view and approve mission
synth plan [create|show]            # view plan / expeditions
synth execute <plan-id>             # run expedition
synth review <plan-id>              # review evidence
synth accept <plan-id>              # accept outcome
synth explain                       # trace any public concept
```

Internal commands are hidden from help but may remain for development/debugging:

```text
synth alignment prepare             # internal convenience
synth mission project               # internal capability trigger
synth expedition commit/start/complete # internal lifecycle steps
```

### Rationale

The user thinks in verbs that match the lifecycle:

```text
understand → contract → mission → plan → execute → review → accept
```

They do not think in artifact names.

---

## 5. Which concepts should Program 027 demonstrate?

Program 027 — Mission Studio Homepage must demonstrate the complete human-facing SYNTH journey.

### Required flow

```text
1. Idea
   User states: "I want a homepage for my AI tool."

2. Question
   SYNTH asks: "Who is it for?" "What should they feel?" "What must it avoid?"

3. Understanding
   SYNTH presents: "Here is what I understand..."

4. Contract
   SYNTH asks: "Approve this contract?"

5. Mission
   SYNTH shows: "This is the Mission I derived."

6. Plan
   SYNTH shows: "These are the Expeditions."

7. Execution
   SYNTH executes and produces evidence.

8. Review
   SYNTH asks: "Does this match the Contract?"

9. Acceptance
   SYNTH asks: "Accept this outcome?"
```

### Concepts Program 027 must NOT expose

The user must never see:

- Alignment Contract
- Divergence Gate
- Mission Projection Package
- Projection Certification
- Review Gate Package
- Acceptance Gate Package
- Governance State Machine
- Refinement Session
- Refinement Report
- Refined Intent
- Gate Policy
- Reviewer Kind

### Homepage acceptance criteria

A first-time user can:

1. State an idea.
2. Answer guided questions.
3. Confirm understanding.
4. Approve the contract.
5. Observe mission execution.
6. Review evidence.
7. Accept the outcome.

If the user encounters internal governance vocabulary, the demonstration fails.

---

## Frozen decisions

| Decision | Status |
|---|---|
| Public vocabulary is 9 terms | Frozen |
| Internal model remains rich | Frozen |
| CLI simplifies to lifecycle verbs | Frozen |
| Program 027 demonstrates human-facing flow | Frozen |
| No runtime changes yet | Frozen |
| No code renames yet | Frozen |

---

## Open questions for later

1. Should `Plan` and `Expedition` be the same public concept?
2. Should `Review` and `Acceptance` merge into one final step?
3. Does Contract approval replace Mission approval, or are both needed?
4. Should the user ever see a "Refinement" label, or only "Questions"?
5. What does the homepage show when the flow is complete?

These do not block freezing the simplified model. They are implementation details.
