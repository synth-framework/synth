# EXP-PROGRAM-013 — Cognitive Continuity

**Status:** Accepted  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Continuity of intent across interrupted reasoning sessions  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** Low  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** Low  
**Depends On:** EXP-PROGRAM-012  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N8; regression journey)

---

## Thesis

> A SYNTH repository must survive the conversation.

EXP-PROGRAM-013 answers the third question of adoption: *can another reasoning system continue from here?* Operators — human and AI — get interrupted. Sessions die, contexts reset, machines reboot. Today, continuity depends on what the operator remembers; the repository itself cannot yet explain *why it is the way it is*. This program makes the repository carry its own cognitive state forward.

---

## Problem Statement

The TaskPRO field experiment demonstrated the failure directly (N8):

- Session 1 ended in system errors after a mission was approved and then lost to memory-only persistence.
- Session 2 began with only a summary of Session 1. The disk could not convey "a mission was approved and lost"; the agent reconstructed intent from priors — and reconstructed it imperfectly.
- Nothing in the repository could answer the three questions an interrupted operator actually asks: **what happened, what was decided, what is next.**

Trust (PROGRAM-011) makes the repository's answers believable. Self-description (PROGRAM-012) makes them available. Continuity (this program) makes them sufficient for a zero-history reasoning system to resume correctly.

---

## Guiding Principles

EXP-PROGRAM-013 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- preserve operator workflows
- build on the projection surfaces of PROGRAM-012 and the persisted decisions of PROGRAM-011
- measure continuity, not just assert it — the benchmark is the deliverable

EXP-PROGRAM-013 shall not:

- redesign the architecture
- introduce new public concepts
- store cognitive state as mutable, hand-authored artifacts

---

## Constitutional Invariant

> **No artifact that influences interpretation may be manually authoritative.** The Resume Briefing is a deterministic projection of the event history, persisted decisions, and current State — recomputed on every read. It answers *why am I here?* (cognitive reconstruction), complementing the Operator Briefing's *what should I do next?* (decision latency).

---

## Program Composition

```text
EXP-PROGRAM-013
Cognitive Continuity
│
├── EXP-CONT-001  Resume Briefing
│       Implementation Expedition
│       `synth explain resume`: generated "what happened / what was
│       decided / what's next" for an agent with zero conversation
│       history. (N8) (S in form, O in need)
│
├── EXP-CONT-002  Interruption Benchmark
│       Certification Expedition
│       Intentional kill-at-checkpoint matrix measuring the
│       Repository Authority Index: how much of intent the
│       repository alone reconstructs. (N8) (S)
│
└── EXP-CONT-003  Regression Journey
        Certification Expedition
        Re-run the exact TaskPRO scenario on the hardened build —
        same repo shape, same initial prompt — asserting: no
        recursion, rejection path executable, approval persists,
        forgery rejected, status/explain answer without source
        reading, resume correct after interruption. (O in value)
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
3. The Resume Briefing is computed from replayable evidence on every read — never stored as editable narrative.
4. Continuity is asserted by benchmark evidence, not by inspection.
5. Every change is replay-verifiable; every assertion becomes a permanent regression guard.

---

## Success Criteria

- An agent with zero conversation history resumes an interrupted repository correctly using only `synth explain resume`.
- The interruption benchmark publishes a Repository Authority Index for the kill-at-checkpoint matrix.
- The TaskPRO regression journey passes end to end on the hardened build.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [x] EXP-CONT-001 completed and accepted.
- [x] EXP-CONT-002 completed and accepted.
- [x] EXP-CONT-003 completed and accepted.
- [x] Program accepted.

---

## Completion Notes

All three Cognitive Continuity expeditions are implemented, merged, and individually verified:

- **EXP-CONT-001 — Resume Briefing:** `synth explain resume` projects "what happened / what was decided / what is next" from events, state, decisions, and certified snapshots.
- **EXP-CONT-002 — Interruption Benchmark:** `scripts/interruption-benchmark.js` measures Repository Authority Index across checkpoints A–F; baseline aggregate RAI is **0.87**.
- **EXP-CONT-003 — Regression Journey:** `scripts/taskpro-regression.js` re-runs the TaskPRO first-contact scenario and passes all 14 assertions covering N1–N6/N8.

Key architectural insight from this program: mission approval persists an `ApprovedMissionModelSnapshot` before emitting execution events, so `synth explain resume` was enhanced to read `data/snapshots/` and reconstruct approved missions for zero-history operators.

Program accepted after CI `proof` check passed on the implementing PRs:
- PR #105 (EXP-CONT-001)
- PR #106 (EXP-CONT-003 + snapshot-aware resume)
- PR #107 (EXP-CONT-002)
- PR #108 (program status finalization)

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` | Field evidence (N8) and the scenario the Regression Journey re-runs. |
| `docs/expeditions/EXP-PROGRAM-011.md` | Operator Trust & CLI Integrity; persisted decisions are Resume's raw material. |
| `docs/expeditions/EXP-PROGRAM-012.md` | Runtime Self-Description; Resume Briefing composes its projection surfaces. |
| `docs/expeditions/EXP-PROGRAM-009.md` | Canonical First Contact Experience; comprehension validation is the Regression Journey's sibling. |
