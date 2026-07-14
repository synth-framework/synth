# EXP-PROGRAM-004 — First Contact Program

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** First five minutes of external contact with SYNTH  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** None

---

## Thesis

> **What happens during the first five minutes after someone discovers SYNTH?**

If those five minutes are exceptional, the architecture built during the Foundation Era will finally have the opportunity to demonstrate its value.

---

## Purpose

Transform SYNTH from a well-architected repository into an AI-native product that can be installed, understood, and used in under five minutes without reading the architecture.

This program introduces **no architectural changes**. Its purpose is distribution, onboarding, narrative, and first-contact experience.

> **Constitutional Rule:** This Program completes without touching architecture.

---

## Mission

Remove repository cloning as the default installation method, make AI the primary interface, align the public narrative with the actual product experience, and polish the repository for external users.

---

## Program Composition

```
EXP-PROGRAM-004
First Contact Program
│
├── EXP-AX-001  Universal Distribution
│       Adoption Expedition
│       Remove repository cloning as the canonical installation method.
│
├── EXP-AX-002  AI First Experience
│       Adoption Expedition
│       Make AI the primary interface; deliver the root AGENTS.md contract.
│
├── EXP-AX-003  README & Narrative Alignment
│       Adoption Expedition
│       Rewrite the public narrative so a new visitor understands SYNTH in under one minute.
│
├── EXP-AX-004  Documentation Synchronization
│       Adoption Expedition
│       Make the repository the single source of truth for docs and website.
│
└── EXP-AX-005  Public Release Polish
        Adoption Expedition
        Prepare the repository for external users: badges, demos, example gallery.
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
| npm packaging and distribution | New architectural concepts |
| Root `AGENTS.md` and AI onboarding | New execution model |
| README and public narrative | Changes to event model semantics |
| Documentation projection and website sync | Changes to capability model |
| Badges, demos, and example gallery | Changes to constitutional baseline |
| Installation smoke tests | Changes that invalidate replay proofs |
| Repository polish | Changes that modify the deterministic execution contract |

---

## Knowledge Graph Development Lock

The Knowledge Graph remains prohibited until SYNTH demonstrates repeatable adoption by independent operators.

> **Architecture may not advance faster than understanding.**

No Expedition in this Program may begin Knowledge Graph implementation, semantic search, graph-driven documentation, graph-native AI context, or graph-centered architecture.

See ADR-005 — Architecture Era Closure and ADR-004 — Synth Eras and Protected Assets.

---

## Governance

- The Program is sequenced. Dependencies are explicit in each Expedition.
- No Expedition may be promoted to executing without approval.
- No implementation work may proceed outside an approved Expedition.
- Each Expedition must produce evidence that satisfies its Definition of Done.
- The Program completes when EXP-AX-005 is accepted.

---

## Success Criteria

- A new user installs SYNTH without cloning the repository.
- A frontier AI model initializes a SYNTH repository using only `AGENTS.md`.
- A new visitor understands the SYNTH value proposition in less than one minute.
- Documentation and website remain synchronized with the repository automatically.
- The repository communicates what SYNTH is, how to install it, how to use it, and how to contribute.
- No Protected Asset is modified.
- Architecture remains unchanged.

---

## Definition of Done

- [ ] EXP-AX-001 completed and accepted.
- [ ] EXP-AX-002 completed and accepted.
- [ ] EXP-AX-003 completed and accepted.
- [ ] EXP-AX-004 completed and accepted.
- [ ] EXP-AX-005 completed and accepted.
- [ ] AGENTS.md is published at repository root.
- [ ] README is aligned with the AI-native experience.
- [ ] Website and documentation synchronization is verified.
- [ ] Public release polish is in place.
- [ ] `npm run govern` passes without architectural changes.

---

## Completion Notes

- **Status:** Active — EXP-AX-002 documentation updates are in progress; EXP-AX-001 is blocked on npm publication.
- **Authority:** ADR-005 — Architecture Era Closure establishes that future architectural work is suspended and that this Adoption Program is the highest-leverage next step.
- **Alignment update:** All expeditions were reviewed against the current state of the art and updated to include `synth validate` and the root `AGENTS.md` AI operator contract as first-class deliverables.
- **Next milestone:** Publish `@synth-framework/synth` to npm (EXP-AX-001) so the remaining smoke tests and agent simulations can run against a real package.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/adr/ADR-005-architecture-era-closure.md` | Architecture Era closure and strengthened Knowledge Graph Lock. |
| `docs/expeditions/EXP-PROGRAM-003.md` | Preceding Validation Program, now closed. |
| `AGENTS.md` | AI operator contract; deliverable of EXP-AX-002. |
