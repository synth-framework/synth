# EXP-PROGRAM-012 — Runtime Self-Description

**Status:** Draft  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Discoverability and self-description of the running system  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** Low  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Low  
**Depends On:** EXP-PROGRAM-011  
**Blocks:** EXP-PROGRAM-013  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (findings N4, N5, N6, N8)

---

## Thesis

> A reasoning system should never need to read SYNTH's source code to understand a SYNTH repository.

EXP-PROGRAM-012 answers the second question every operator asks on arrival: *can I understand where I am?* In the TaskPRO field experiment, the agent read ~15 runtime source files, wrote 3 scratch scripts, and scripted internal APIs — not because the information was secret, but because the runtime would not say it. Every one of those workarounds is a discoverability defect.

---

## Problem Statement

The experiment exposed a self-description floor at the operator surface:

- **Counts-only status (N5).** `synth status` reports `Mission: 1, Expeditions: 6` — never which mission, what state it is in, or what should happen next. The agent wrote `print_state_details.js` calling `ctx.runtime.getState()` just to see its own project.
- **Silent empty extraction (N4).** `docs generate` reported `status: ok` with filenames while extracting zero concepts; the `.md`-only filter skipped the entire `*.md.txt` knowledge base with no warning.
- **No adapter introspection (N5).** There is no `synth adapter info`; capabilities must be discovered by reading source.
- **Noisy machine output (N5).** ~22 bootstrap INFO lines precede every JSON payload, forcing agents to parse around log noise.
- **Invisible repository identity (N8).** Nothing states what kind of repository this is, what phase it occupies, or which direction it is transforming — the agent converged on the wrong attractor ("incomplete React Native app" instead of "knowledge repository moving toward specification").

---

## Guiding Principles

EXP-PROGRAM-012 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- preserve operator workflows
- build on `synth explain` (HARDEN-007) rather than inventing parallel surfaces
- prefer **less, more precise information** over more information — minimize decision latency

EXP-PROGRAM-012 shall not:

- redesign the architecture
- introduce new public concepts
- turn self-description into mutable, hand-authored metadata

---

## Constitutional Invariant

> **No artifact that influences interpretation may be manually authoritative. Repository Identity, status, readiness, and operator guidance are deterministic projections of replayable evidence — computed on every read, never stored as editable facts.**

Repository Identity is the semantic frame through which every file is interpreted — kind, current phase, authority, expected inputs and outputs, transformation direction. It is the boundary condition of the synthesis, and like State itself it must be projected, never authored.

---

## Program Composition

```text
EXP-PROGRAM-012
Runtime Self-Description
│
├── EXP-DISC-001  Status That Answers (Operator Briefing)
│       Implementation Expedition
│       Ids, names, states, current phase, next actions:
│       "you are here; this is what happens next." (N5)
│
├── EXP-DISC-002  Extraction Reporting
│       Implementation Expedition
│       Files scanned/matched/concepts extracted; loud
│       zero-extraction warning; documented filter behavior. (N4)
│
├── EXP-DISC-003  Adapter Introspection
│       Implementation Expedition
│       `synth adapter info <name>` — capabilities without source reading. (N5)
│
├── EXP-DISC-004  Clean Machine Output
│       Implementation Expedition
│       `--json` free of bootstrap log noise. (N5)
│
├── EXP-DISC-005  Runtime Integrity
│       Implementation Expedition
│       `synth doctor` verifies installed dist hashes. (N6) (S)
│
└── EXP-DISC-006  Repository Identity
        Implementation Expedition
        Projected identity: kind, phase, authority, expected
        inputs/outputs, transformation direction. (N8)
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
3. Every self-description surface is a deterministic projection of events and State — nothing hand-authored.
4. Operator Briefing answers *what should I do next?* — operational, minimizing decision latency. (Cognitive reconstruction after interruption belongs to EXP-PROGRAM-013's Resume Briefing.)
5. Silence is a defect: any operation that can produce an empty result must say so loudly.
6. Every change is replay-verifiable; every surface becomes a permanent regression guard.

---

## Success Criteria

- A fresh operator (human or AI) can answer "what is this repository, where is it going, and what happens next" without reading source code or writing scratch scripts.
- `docs generate` reports extraction counts and warns loudly on zero extraction.
- `synth adapter info` describes any registered adapter.
- `--json` output is machine-clean.
- Repository Identity is projected from evidence on every read.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [ ] EXP-DISC-001 completed and accepted.
- [ ] EXP-DISC-002 completed and accepted.
- [ ] EXP-DISC-003 completed and accepted.
- [ ] EXP-DISC-004 completed and accepted.
- [ ] EXP-DISC-005 completed and accepted.
- [ ] EXP-DISC-006 completed and accepted.
- [ ] Program accepted.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` | Field evidence (N4, N5, N6, N8) and chronology this program answers. |
| `docs/expeditions/EXP-PROGRAM-011.md` | Operator Trust & CLI Integrity; this program's answers are only useful once they can be trusted. |
| `docs/expeditions/EXP-PROGRAM-013.md` | Cognitive Continuity; Resume Briefing builds on the projection surfaces established here. |
| `docs/expeditions/EXP-HARDEN-007.md` | Observability; the `synth explain` foundation this program extends. |
