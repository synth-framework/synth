# EXP-PROGRAM-019 — Universal Initialization

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Universal, natural-language-driven project initialization through adapter discovery  
**Era:** II — Adoption  
**Architecture Impact:** Low  
**Constitutional Impact:** Low  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium  
**Depends On:** EXP-PROGRAM-009 — Canonical First Contact Experience, EXP-GOV-008 — Initialization as a Governed State Transition  
**Blocks:** Future adoption programs that require deterministic initial project context

---

## Thesis

> **SYNTH initializes understanding, not infrastructure.**

First contact exposed the missing primitive: before an agent can reason about a project, SYNTH must establish the correct initial semantic context. The Windows experiments showed that the agent did not fail at execution; it selected the wrong attractor because the initial project model was missing.

The solution is not smarter agents. It is a better initialization handshake.

---

## Purpose

Establish a minimal, natural-language-driven project initialization experience where SYNTH can bootstrap any project from an external knowledge source through adapter discovery.

The operator provides:

```
Intent
Source location
Authority
```

SYNTH provides:

```
Interpretation
Normalization
Initial state
Evidence
Replayability
```

This Program introduces **no new governance concepts** and **no new public vocabulary**. It only establishes the first low-friction state transition.

> **Constitutional Rule:** This Program completes without touching Protected Assets.

---

## Mission

Deliver the universal initialization experience and the minimum adapter contract required to make it work, so that SYNTH can bootstrap understanding from any supported source without domain-coupled adapters or project-specific inference.

---

## Program Composition

```
EXP-PROGRAM-019
Universal Initialization
│
├── EXP-INIT-001  Adapter-based Project Bootstrap
│       Adoption Expedition
│       Implement the first-contact initialization path from source declaration to initial state.
│
└── EXP-INIT-002  Initialization Evidence & Replay
        Adoption Expedition
        Ensure initialization produces evidence and can be replayed deterministically.
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

All work in this Program stays in the Allowed column:

| Allowed | Forbidden |
|---|---|
| Natural-language initialization flow for `synth init` | Project-specific adapters |
| Generic `SourceAdapter` contract | Automatic application generation |
| Adapter discovery, inventory, classification, extraction, normalization | Architecture inference engine |
| Initial project model creation | Autonomous coding |
| Evidence-backed initialization output | New governance concepts |
| Replayable initialization transition | New public vocabulary |
| Integration with existing resolver/status projection | SYNTH redesign |
| Tests for initialization paths | Replacement for expeditions |

---

## Invariants

1. `npm run govern` remains the canonical final verification.
2. Initialization must produce a `PROJECT_INITIALIZED` event (EXP-GOV-008).
3. Initialization must not create fake missions, expeditions, or work items.
4. The adapter contract is source-agnostic; domain knowledge lives in normalized knowledge, not in adapters.
5. After initialization, the source type is indistinguishable to the rest of SYNTH.
6. Initialization must be replayable from input + adapter selection + evidence.

---

## Success Criteria

- A user can initialize a SYNTH project with a natural-language source declaration.
- SYNTH resolves the declared source to a generic `SourceAdapter`.
- The adapter produces an inventory and normalized knowledge model.
- Initialization emits a `PROJECT_INITIALIZED` event and produces evidence artifacts.
- `synth status` reports the correct initial phase and semantic context.
- Initialization replay reconstructs the same initial state.
- No Protected Asset is modified.
- Existing `synth init` behavior remains available or is migrated cleanly.

---

## Definition of Done

- [ ] EXP-INIT-001 completed and accepted.
- [ ] EXP-INIT-002 completed and accepted.
- [ ] Program accepted.

---

## Completion Notes

*(To be filled on acceptance.)*

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-PROGRAM-009.md` | Active First Contact Program; Universal Initialization extends the first-contact interaction model. |
| `docs/expeditions/EXP-GOV-008.md` | Established `PROJECT_INITIALIZED` and the initialized lifecycle phase. |
| `docs/expeditions/EXP-GOV-007.md` | Canonical State Resolver; initialization must feed the resolver. |
| `docs/expeditions/EXP-GOV-006.md` | Agent Lifecycle Enforcement; initialization is the first valid transition. |
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/adr/ADR-005-architecture-era-closure.md` | Architecture Era closure. |
