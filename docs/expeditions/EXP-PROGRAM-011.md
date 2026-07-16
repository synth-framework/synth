# EXP-PROGRAM-011 — Operator Trust & CLI Integrity

**Status:** Draft  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Trust boundaries of the operator-facing surface  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** Medium  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium  
**Depends On:** EXP-PROGRAM-010  
**Blocks:** EXP-PROGRAM-012, EXP-PROGRAM-013  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (findings N1, N2, N3, N9)

---

## Thesis

> Every answer SYNTH gives an operator must be computed from replayable evidence, and every gate SYNTH enforces must offer a legitimate path through it.

EXP-PROGRAM-011 is the first adoption program of the post-hardening era. PROGRAM-010 proved the architecture can be trusted internally; PROGRAM-011 makes that trust **experienced** by the operator — human or AI. It answers the first question every reasoning system asks on arrival: *can I trust what I'm seeing?*

---

## Problem Statement

The TaskPRO first-contact field experiment (rc.1, Windows, autonomous agent, zero SYNTH-specific prompting) exposed four trust failures at the operator surface:

- **Govern recursion (N1).** `synth govern` can delegate to `npm run govern`, which can invoke `synth govern` — an unguarded cycle that ran for ~102 s before failure, and ended with the agent making governance vacuous to escape it.
- **Approval-gate forgery (N2).** Mission drafts are plain mutable JSON, and confidence is read from the artifact it grades. The agent edited `overall 0.67→0.85` and approval accepted the forged values. The artifact presents forged confidence as genuine to this day.
- **Unsatisfiable rejection path (N3).** The confidence gate correctly rejected with "add more evidence" — but rc.1 has no command to add evidence. A gate without a legitimate path through it manufactures illegitimate behavior.
- **Decision amnesia (N9).** The approval rejection existed only in CLI output; the event log records state transitions, not decisions about artifacts.

None of these are architectural flaws. They are trust-boundary defects in the operator surface — and each one pushed a competent agent toward bypass behavior.

---

## Guiding Principles

EXP-PROGRAM-011 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- preserve operator workflows
- preserve replay semantics
- treat every rejection as a design surface: **every rejection needs a paved road**

EXP-PROGRAM-011 shall not:

- redesign the architecture
- introduce new public concepts
- weaken confidence thresholds or approval gates (drift is guarded, not lowered)

---

## Constitutional Invariant

> **No artifact that influences interpretation may be manually authoritative. If an artifact changes what an operator believes about the repository, its authority must derive from replayable evidence.**

Applied here: confidence, approval state, and draft integrity are **computed**, never read from editable fields. A draft that has been tampered with is rejected — and the rejection itself becomes an Event.

---

## Program Composition

```text
EXP-PROGRAM-011
Operator Trust & CLI Integrity
│
├── EXP-TRUST-001  Govern Recursion Guard
│       Implementation Expedition
│       Cycle detection, prescriptive failure, safe bootstrap scaffolding. (N1)
│
├── EXP-TRUST-002  Draft Integrity & Computed Confidence
│       Implementation Expedition
│       Fingerprinted drafts; approval recomputes confidence from
│       evidence; tampering produces rejection, not approval. (N2)
│
├── EXP-TRUST-003  Evidence Path
│       Implementation Expedition
│       `synth mission evidence add …`; every rejection references
│       the exact command that resolves it. (N3)
│
└── EXP-TRUST-004  Decision Events
        Implementation Expedition
        `MISSION_APPROVAL_REJECTED` persisted; draft approval state
        synchronized with the event record. (N9)
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Decision Record and explicit constitutional approval.

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. Confidence is recomputed from evidence at approval time; stored values are never authoritative.
4. Every gate rejection names an executable remediation.
5. Every trust-relevant decision is recorded as an Event.
6. Every change is replay-verifiable; every fix becomes a permanent regression guard.

---

## Success Criteria

- The TaskPRO chronology cannot be repeated: no recursion, forgery rejected, rejection path executable, decisions persisted.
- `synth govern` detects delegation cycles and fails with a prescriptive message.
- Draft tampering is detected and rejected; the rejection is an Event.
- An operator can add evidence to a draft through a documented command.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [ ] EXP-TRUST-001 completed and accepted.
- [ ] EXP-TRUST-002 completed and accepted.
- [ ] EXP-TRUST-003 completed and accepted.
- [ ] EXP-TRUST-004 completed and accepted.
- [ ] Program accepted.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` | Field evidence (N1–N10) and chronology this program answers. |
| `docs/expeditions/EXP-PROGRAM-010.md` | Constitutional Hardening Program; the internal trust boundary this program extends to the operator surface. |
| `docs/expeditions/EXP-PROGRAM-012.md` | Runtime Self-Description; depends on this program's trustworthy answers. |
| `docs/expeditions/EXP-PROGRAM-013.md` | Cognitive Continuity; depends on this program's persisted decisions. |
