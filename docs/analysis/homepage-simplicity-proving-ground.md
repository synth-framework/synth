# Homepage Simplicity Proving Ground

> **Test:** Can a new user say *"I want a homepage for my AI tool"* and have SYNTH guide them from idea to execution without exposing the machinery underneath?
>
> If yes, SYNTH is solved. If the user must understand Alignment Contracts, Projection Certification, or Governance State Machines, simplicity has failed.

---

## User story

```text
User:
  "I want a homepage for my AI tool."

SYNTH:
  "Great. I need to understand what you mean."

  ↓ questions

  "Who is it for?"
  "What should they feel?"
  "What is the one action they must take?"
  "What must it NOT look like?"
  "Which design reference is authoritative?"

  ↓ understanding

  "Here is what I believe you mean. Is this correct?"

  ↓ contract

  "Approved. I will build this."

  ↓ mission

  "Mission created. I am ready to execute."

  ↓ execution

  "Here is the work. Review and accept when ready."
```

The user never sees:

- Alignment Contract
- Divergence Gate
- Mission Projection Package
- Projection Certification
- Review Gate Package
- Acceptance Gate Package
- Governance State Machine

Those are implementation details.

---

## Diagram 1 — Current lifecycle as the user currently experiences it

```text
User says:
  "I want a homepage for my AI tool."

SYNTH exposes:

  Intent Model
    ↓
  Refinement Session
    ↓
  Refinement Report
    ↓
  Alignment Contract
    ↓
  Divergence Gate
    ↓
  Mission Projection
    ↓
  Projection Certification
    ↓
  Mission
    ↓
  Refined Intent
    ↓
  Expedition
    ↓
  Review Gate
    ↓
  Acceptance Gate
    ↓
  Convergence Check
    ↓
  Closed

User must implicitly understand:
  • what each artifact is
  • why each gate exists
  • when to approve what
  • that Mission Projection is not Mission Creation
  • that Review Gate and Acceptance Gate are different
```

**Verdict:** Too much machinery is visible. The user cannot navigate this naturally.

---

## Diagram 2 — Artifact dependency graph (current)

```text
User Intent
    │
    ▼
IntentModel ──────► RefinementSession
    │                   │
    │                   ▼
    │             RefinementReport
    │                   │
    │                   ▼
    │             AlignmentContract ◄──── ReferenceEvidence
    │                   │
    │                   ▼
    │             DivergenceGate ────► DivergenceReport
    │                   │
    │                   ▼
    │             MissionProjectionPackage
    │                   │
    │                   ▼
    │             ProjectionCertification
    │                   │
    ▼                   ▼
Mission ◄─────────────────────────────┘
    │
    ▼
Expedition ◄──── RefinedIntent
    │
    ▼
ImplementationEvidence
    │
    ▼
ReviewGatePackage
    │
    ▼
ReviewDecision
    │
    ▼
AcceptanceGatePackage
    │
    ▼
AcceptanceRecord
    │
    ▼
ConvergenceReport (proposed)
```

**What this reveals:**

- 14 named artifacts between intent and closed.
- At least 8 are projections or audit bundles that could be internal.
- The user is asked to approve multiple artifacts that express the same underlying understanding.

---

## Diagram 3 — Current gate inventory

```text
┌─────────────────────────────────────────────┐
│  Refinement Gate                              │
│  Purpose: approve refined intent              │
│  User sees: "Approve Refined Intent"          │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Divergence Gate                              │
│  Purpose: confirm contract matches intent     │
│  User sees: "Approve Alignment Contract"      │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Projection Certification Gate                │
│  Purpose: verify projection is complete       │
│  User sees: nothing (automatic)               │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Mission Approval Gate                        │
│  Purpose: authorize the projected Mission     │
│  User sees: "Approve Mission"                 │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Review Gate                                  │
│  Purpose: review implementation               │
│  User sees: "Review Work"                     │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Acceptance Gate                              │
│  Purpose: final sign-off                      │
│  User sees: "Accept Work"                     │
└─────────────────────────────────────────────┘
```

**Consolidation candidates:**

- Refinement Gate + Divergence Gate + Mission Approval Gate → **one Intent Approval boundary**
- Review Gate + Acceptance Gate → **one Completion Acceptance boundary**
- Projection Certification Gate → keep internal/automatic

**Minimum viable gates:** 3, not 6.

---

## Diagram 4 — Proposed simplified lifecycle

### What the user sees

```text
User:
  "I want a homepage for my AI tool."

SYNTH:

  GENESIS
  "Do we understand what should be built?"

    Idea
      ↓
    Questions
      ↓
    Understanding
      ↓
    Contract  ← user says "yes"

  SYNTHESIS
  "Do we know how to build it?"

    Mission
      ↓
    Plan / Expeditions

  EXECUTION
  "Did we build what we agreed?"

    Evidence
      ↓
    Review  ← user says "looks right"
      ↓
    Acceptance  ← user says "done"
```

### What the machinery does underneath

```text
Idea
  ↓
[IntentModel] ──internal──► [RefinementSession]
  ↓                            ↓
Understanding                [RefinementReport]
  ↓                            ↓
[IntentContract] ◄──────── [AlignmentContract + DivergenceGate]
  ↓
[Mission] ◄── [MissionProjectionPackage + ProjectionCertification]
  ↓
Plan / Expeditions
  ↓
Evidence
  ↓
Review ◄── [ReviewGatePackage + ReviewDecision]
  ↓
Acceptance ◄── [AcceptanceGatePackage + AcceptanceRecord]
```

**Everything in brackets is internal.** The user only interacts with the unbracketed concepts.

---

## What can be deleted from the public vocabulary

| Current public concept | New role | Can be hidden? |
|---|---|---|
| IntentModel | `Idea` capture | No — user must start here |
| RefinementSession | Internal question tracker | **Yes** |
| RefinementReport | Internal approval record | **Yes** |
| AlignmentContract | Becomes `IntentContract` | No — but renamed |
| DivergenceGate | Internal certification | **Yes** |
| DivergenceReport | Internal audit record | **Yes** |
| MissionProjectionPackage | Internal derivation proof | **Yes** |
| ProjectionCertification | Internal verification | **Yes** |
| RefinedIntent (expedition) | Internal to Expedition | **Yes** |
| ReviewGatePackage | Internal bundle | **Yes** |
| ReviewDecision | Internal record | **Yes** |
| RevisionRequest | Internal feedback | **Yes** |
| AcceptanceGatePackage | Internal bundle | **Yes** |
| AcceptanceRecord | Internal record | **Yes** |
| ConvergenceReport | Internal check | **Yes** |

**Public vocabulary reduces from ~15 concepts to 8:**

```text
Idea, Questions, Understanding, Contract,
Mission, Plan, Evidence, Review, Acceptance
```

(That is 9, but "Plan" and "Expeditions" may be the same concept.)

---

## Test for the homepage

The homepage itself should become the first demonstration of this simplification. A visitor landing on `synth.dev` should see:

```text
"What are you building?"

  [I want a homepage for my AI tool]

  ↓

"Tell me about it."

  ↓

"Here is what I understand. Is this right?"

  [Yes]  [Ask me more]

  ↓

"Here is the contract. Approve it to begin."

  [Approve]

  ↓

"Mission created. I will now execute."

  ↓

"Review the result."

  [Approve]  [Revise]
```

If the user encounters the words "Alignment Contract", "Divergence Gate", or "Projection Certification" during this flow, the test fails.

---

## Conclusion

The current architecture can support the simplified model. The change is not a runtime rewrite. It is a **public vocabulary deletion**:

- Keep the events.
- Keep the internal types.
- Delete the names from the user experience.

The next step is to decide whether to adopt this simplification formally and then refactor CLI commands, documentation, and expedition files to match.
