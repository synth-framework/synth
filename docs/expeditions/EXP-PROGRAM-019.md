# EXP-PROGRAM-019 — Universal Initialization

**Status:** Completed and accepted  
**Accepted:** 2026-07-18  
**Completed:** 2026-07-18  
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
**Blocks:** EXP-INIT-001 — Adapter-based Project Bootstrap; future adoption programs that require deterministic initial project context

---

## Thesis

> **SYNTH initializes understanding, not infrastructure.**

First contact exposed the missing primitive: before an agent can reason about a project, SYNTH must establish the correct initial semantic context. The Windows experiments showed that the agent did not fail at execution; it selected the wrong attractor because the initial project model was missing.

The solution is not smarter agents. It is a better initialization handshake.

---

## Purpose

Establish the deterministic initialization substrate for SYNTH: a minimal, natural-language-driven project initialization experience where SYNTH transforms an unknown external project context into a governed SYNTH project model.

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

> **Distinction from First Contact:** `EXP-PROGRAM-009` owns the human/agent first-contact *experience*; `EXP-PROGRAM-019` owns the deterministic initialization *mechanism* underneath it.

> **Constitutional Rule:** This Program completes without touching Protected Assets.

---

## Mission

Deliver the universal initialization experience and the minimum `InitializationAdapter` contract required to make it work, so that SYNTH can bootstrap a governed project model from any supported source without domain-coupled adapters or project-specific inference.

---

## Program Composition

```
EXP-PROGRAM-009
Canonical First Contact Experience
        |
        |   experience layer
        v
EXP-PROGRAM-019
Universal Initialization
        |
        |   mechanism layer
        |
        ├── EXP-INIT-001  Adapter-based Project Bootstrap
        │       Adoption Expedition
        │       Transform external project context into a governed SYNTH project model.
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
| Generic `InitializationAdapter` contract | A competing `SourceAdapter` abstraction |
| Adapter discovery, extraction, normalization into a project model | Automatic application generation |
| Initial governed project model creation | Architecture inference engine |
| Evidence-backed initialization output | Autonomous coding |
| Replayable initialization transition | New governance concepts |
| Integration with existing resolver/status projection | New public vocabulary |
| Tests for initialization paths | SYNTH redesign |
| Reuse of lower-level adapters (filesystem, repository, knowledge) | Replacement for expeditions |

---

## Invariants

1. `npm run govern` remains the canonical final verification.
2. Initialization must produce a `PROJECT_INITIALIZED` event (EXP-GOV-008).
3. Initialization must not create fake missions, expeditions, or work items.
4. The `InitializationAdapter` contract is source-agnostic; domain knowledge lives in the normalized project model, not in adapters.
5. **SYNTH initialization must be source-agnostic. Adapters may vary by input source, but the resulting governed project model must be identical regardless of whether initialization begins from a knowledge directory, repository, specification set, or existing codebase.**
6. After initialization, the source type is indistinguishable to the rest of SYNTH.
7. Initialization must be replayable from input + adapter selection + evidence.
8. The physical storage boundary remains `.synth/data/`; conceptual separations (`state`, `evidence`, `knowledge`, `replay`) live underneath it, not as sibling directories.

---

## Success Criteria

- A user can initialize a SYNTH project with a natural-language source declaration.
- SYNTH resolves the declared source to a generic `InitializationAdapter`.
- The adapter transforms external project context into a governed SYNTH project model.
- Initialization emits a `PROJECT_INITIALIZED` event and produces evidence artifacts.
- `synth status` reports the correct initial phase and semantic context.
- Initialization replay reconstructs the same initial state.
- No Protected Asset is modified.
- Existing `synth init` behavior remains available or is migrated cleanly.
- The physical storage boundary remains `.synth/data/`.

---

## Definition of Done

- [x] EXP-INIT-001 completed and accepted.
- [x] EXP-INIT-002 completed and accepted.
- [x] Program accepted.

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
