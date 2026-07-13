# EXP-PROGRAM-003 — SYNTH Validation Program

**Status:** Completed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Adoption validation for humans and AI agents  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** None

---

## Thesis

> **Humans explore. SYNTH remembers. AI executes deterministically.**

That single sentence explains Mission Studio, Replay, Genesis, Expeditions, and Governance.

Humans are allowed to be chaotic. AI needs to stay deterministic. SYNTH sits between them: it captures human intent as approved plans, records every action as immutable events, and lets AI agents execute within a replayable, trustworthy boundary.

---

## Purpose

Validate that SYNTH enables humans and AI agents to collaboratively build software while maintaining deterministic execution, replayability, and trust.

Unlike previous programs, this one introduces **no architectural changes**. Its purpose is to validate adoption.

> **Constitutional Rule:** This Program completes without touching architecture.

---

## Mission

Do not add new architectural capabilities. Prove that the existing frozen capabilities can be adopted by real humans and real AI agents on real repositories.

During EXP-VAL-006 a mismatch was discovered between the CLI's Mission lifecycle and SYNTH's planning architecture. EXP-VAL-007 corrects the public interface without weakening Mission Studio.

---

## Program Composition

```
EXP-PROGRAM-003
SYNTH Validation Program
│
├── EXP-VAL-001  Agent Onboarding
│       Validation Expedition
│       Transform SYNTH into an AI-native product.
│
├── EXP-VAL-002  Repository Bootstrap
│       Validation Expedition
│       Let an AI agent transform any repository into a SYNTH repository.
│
├── EXP-VAL-003  Continuous Publication
│       Validation Expedition
│       Guarantee deterministic publication from every merge.
│
├── EXP-VAL-004  Documentation Integrity
│       Validation Expedition
│       Treat documentation as a projection, never hand-written truth.
│
├── EXP-VAL-005  Adoption Validation
│       Validation Expedition
│       Validate SYNTH with real humans, frontier AI models, and brownfield repositories.
│
├── EXP-VAL-006  AI Benchmark
│       Validation Expedition
│       Produce SYNTH's compiler conformance suite for AI agents.
│
└── EXP-VAL-007  Agentic Mission Lifecycle Correction
        Validation Expedition
        Align the CLI Mission lifecycle with SYNTH's planning architecture.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio semantics
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
| Installation | New architectural concepts |
| AI onboarding | New execution model |
| Documentation | Changes to event model semantics |
| Repository bootstrap | Changes to capability model |
| Website | Changes to constitutional baseline |
| Examples | Changes that invalidate replay proofs |
| Testing | Changes that modify the deterministic execution contract |
| Validation | |
| Developer experience | |
| Repository organization | |

---

## Knowledge Graph Development Lock

The Knowledge Graph is **prohibited** until SYNTH demonstrates repeatable adoption by independent operators.

> **Architecture may not advance faster than understanding.**

No implementation work on the Knowledge Graph, semantic search, graph-driven documentation, graph-native AI context, or graph-centered architecture may begin until the Adoption Era produces evidence that the frozen architecture is insufficient for real users. Speculative architectural advances are not enough.

The lock may only be lifted when all of the following conditions are satisfied:

- EXP-VAL-001 through EXP-VAL-007 are completed. ✅
- A public GitHub repository is available.
- The documentation website is deployed and automatically published from `main`. ✅ (pipeline in place)
- The official installation experience is available and verified. ✅
- The certified example projects are published. ✅
- Human operator testing demonstrates successful onboarding by independent operators.
- AI benchmark testing demonstrates deterministic convergence across supported models for representative repositories.
- A documented, reproducible case exists where the frozen architecture prevented a real user from succeeding.

Upon satisfaction of these conditions, an Architecture Expedition and a new ADR are required to lift the lock. The Validation Report alone is necessary but not sufficient.

---

## Governance

- The Program is sequenced. Dependencies are explicit in each Expedition.
- No Expedition may be promoted to executing without approval.
- No implementation work may proceed outside an approved Expedition.
- Each Expedition must produce evidence that satisfies its Definition of Done.
- The Program completes when EXP-VAL-007 is accepted.

---

## Success Criteria

- A new developer can install SYNTH and tell their AI "Initialize this project with SYNTH" without reading architecture documentation.
- An AI agent can bootstrap any repository into a SYNTH repository.
- Every merge to `main` produces a verified proof, regenerated documentation, and an updated website automatically.
- Documentation remains synchronized with mission, replay, repository, and release.
- Human operators with zero SYNTH knowledge can create their first Mission.
- Frontier AI models converge on equivalent missions and replays for the same repository.
- The AI Benchmark produces a public SYNTH Validation Report.
- The CLI Mission lifecycle distinguishes Mission Draft creation from Mission approval.
- Mission Studio remains the sole authority for Mission approval.
- Architecture remains unchanged.

---

## Definition of Done

- [x] EXP-VAL-001 completed and accepted.
- [x] EXP-VAL-002 completed and accepted.
- [x] EXP-VAL-003 completed and accepted.
- [x] EXP-VAL-004 completed and accepted.
- [x] EXP-VAL-005 completed and accepted.
- [x] EXP-VAL-006 completed and accepted.
- [x] EXP-VAL-007 completed and accepted.
- [x] SYNTH Validation Report is published.
- [x] Architecture is verified unchanged after EXP-VAL-007.
- [x] Knowledge Graph lock conditions are documented and accepted.

---

## Completion Notes

- **Status:** Completed.
- **Expeditions:** EXP-VAL-001 through EXP-VAL-007 have been implemented, verified, and accepted.
- **Reason for additional expedition:** The AI Benchmark revealed that `synth mission create` attempted automatic approval, contradicting SYNTH's planning architecture. EXP-VAL-007 aligns the CLI with the architecture without modifying Mission Studio.
- **AI Benchmark:** The SYNTH AI Benchmark harness is operational and reflects the corrected agentic Mission lifecycle. Dry-run produced perfect convergence across five emulated frontier models and three synthetic repositories. Results published in `docs/audits/SYNTH-AI-BENCHMARK-001.md`.
- **Architecture unchanged:** No Protected Asset was modified by this Program. The Validation Program respected the Post-Freeze Rule.
- **Governance verification:** Full `npm run govern` passed after EXP-VAL-007, producing an accepted proof: `proof/proof-2026-07-13T03-29-32-198Z.json`.
- **Architecture Era Closure:** ADR-005 records that the Foundation Era is closed and that future architectural work is suspended until adoption evidence demonstrates insufficiency. The strengthened Knowledge Graph Lock is now in effect.
- **Knowledge Graph lock:** Conditions for lifting the lock are documented. Live model benchmarking and public brownfield validation remain as future evidence-gathering activities under the lock, not as architecture work.
- **Next era gate:** Era III (Evolution) may only begin after the Knowledge Graph lock conditions are satisfied by evidence.
