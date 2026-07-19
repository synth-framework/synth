# EXP-PROGRAM-032 — Operator Optimization Pipeline

**Status:** Proposed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Operator-specific projection of canonical SYNTH knowledge  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** Medium  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** Medium  

---

## Thesis

> **AI operators have different context windows, reasoning models, latency characteristics, and interaction constraints. SYNTH should preserve a canonical internal representation while projecting optimized interaction contexts tailored to the active operator and its available resources.**

Today, operator optimization is applied externally: an operator may use a token compressor, a session optimizer, or model-specific prompts, but SYNTH does not know it happened. The Mission does not know. Replay does not know. The AI skill does not know. This program moves that pipeline inside SYNTH so optimization becomes deterministic, explainable, and replayable.

---

## Purpose

Create an operator-aware projection pipeline that:

- Preserves canonical Mission knowledge unchanged.
- Reduces token usage when appropriate.
- Improves session continuity across long interactions.
- Supports operator-specific projections without hardcoding operator internals.
- Makes optimization deterministic and replayable.
- Allows pluggable optimization adapters.

---

## Core Principle

> **Optimization is a projection, never a mutation.**

Canonical artifacts remain untouched. Only the interaction projection changes.

---

## Mission

Make operator optimization a first-class, adapter-based SYNTH capability that produces the best possible interaction context for each operator without altering canonical knowledge or governance evidence.

---

## Program Composition

```text
EXP-PROGRAM-032
Operator Optimization Pipeline
│
├── EXP-OOP-001  Optimization Pipeline
│       Architecture Expedition
│       Define the canonical stages: Filter → Summarize → Compress → Project.
│
├── EXP-OOP-002  Token Optimization Adapter
│       Architecture Expedition
│       Define the adapter interface for token-reduction strategies.
│
├── EXP-OOP-003  Session Optimization Adapter
│       Architecture Expedition
│       Define adapters that maintain summaries, checkpoints, and resumable sessions.
│
├── EXP-OOP-004  Operator Profiles
│       Product Expedition
│       Describe operator capabilities: context size, streaming, session support, etc.
│
├── EXP-OOP-005  Optimization Policies
│       Product Expedition
│       Define configurable objectives: minimize tokens, preserve reasoning,
│       preserve history, reduce latency.
│
├── EXP-OOP-006  Replay Integration
│       Architecture Expedition
│       Record optimization decisions and their projections in Replay.
│
├── EXP-OOP-007  Explainability
│       Product Expedition
│       Surface why and how a session was optimized.
│
├── EXP-OOP-008  Skill Integration
│       Product Expedition
│       Wire optimization policy into generated skills and rules.
│
├── EXP-OOP-009  Model Capability Registry
│       Architecture Expedition
│       Maintain a descriptive registry of operator characteristics.
│
└── EXP-OOP-010  Optimization Certification
        Certification Expedition
        Certify that optimization never mutates canonical knowledge, evidence, or Replay.
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

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
| --- | --- |
| Defining optimization pipeline stages and adapter interfaces | Modifying canonical Mission knowledge |
| Implementing token, session, and projection optimizers | Changing governance evidence |
| Recording optimization decisions in Replay | Mutating Replay events |
| Describing operator capabilities in a registry | Hardcoding proprietary tools into core governance |
| Generating skills that reference optimization policies | Introducing non-deterministic optimization without explanation |

### Hard Constraints

> **Canonical artifacts are immutable.**
>
> **Optimization is replayable.**
>
> **Optimization decisions are explainable.**
>
> **Adapters are interchangeable.**
>
> **No proprietary tool is required.**

---

## Out of Scope

- Modifying Mission, Expedition, or Genesis semantics.
- Modifying Replay or event model semantics.
- Implementing architectural convergence reviews (see EXP-PROGRAM-031).
- Implementing AI agent interoperability protocols (see EXP-PROGRAM-026).

---

## Success Criteria

- A canonical Mission can be projected into an operator-optimized context.
- Optimization never alters canonical knowledge or governance evidence.
- Replay records the original projection, the optimized projection, and the operator response.
- `synth optimize --explain` produces a clear rationale for optimization decisions.
- New optimizers can be added without changing the pipeline contract.
- Generated skills automatically reference the active optimization policy.
- No Protected Asset is modified.

---

## Definition of Done

- [ ] EXP-OOP-001 completed and accepted.
- [ ] EXP-OOP-002 completed and accepted.
- [ ] EXP-OOP-003 completed and accepted.
- [ ] EXP-OOP-004 completed and accepted.
- [ ] EXP-OOP-005 completed and accepted.
- [ ] EXP-OOP-006 completed and accepted.
- [ ] EXP-OOP-007 completed and accepted.
- [ ] EXP-OOP-008 completed and accepted.
- [ ] EXP-OOP-009 completed and accepted.
- [ ] EXP-OOP-010 completed and accepted.
- [ ] Optimization pipeline is documented as a projection capability.
- [ ] `npm run govern` passes.

---

## Relationship to Other Work

- **EXP-PROGRAM-026 — AI Agent Interoperability** defines the open protocols and skills that this program optimizes.
- **EXP-PROGRAM-029 — AI Ecosystem Distribution** distributes generated skills and rules that reference optimization policies.
- **EXP-PROGRAM-031 — Architectural Convergence** reviews this program before implementation proceeds.

---

## Long-Term Vision

Every AI operator interacting with SYNTH receives a projection tailored to its constraints, while SYNTH retains a single canonical source of truth. Optimization becomes just another deterministic projection from canonical knowledge, consistent with every other SYNTH capability.

