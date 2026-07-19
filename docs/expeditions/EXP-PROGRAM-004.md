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
├── EXP-AX-005  Public Release Polish
│       Adoption Expedition
│       Prepare the repository for external users: badges, demos, example gallery.
│
├── EXP-DISCOVERY-001  Repository Discovery & Brownfield Genesis
│       Adoption Expedition
│       Introduce a deterministic, read-only Discovery phase before governance begins.
│
├── EXP-BROWNFIELD-001  Brownfield Bootstrap Experience
│       Product Expedition
│       Make brownfield onboarding deterministic, mutation-safe, and self-guiding.
│
├── EXP-CLI-001  CLI UX and Diagnostics Hardening
│       Product Expedition
│       Harden operator-facing diagnostics and the CLI output contract.
│
├── EXP-RUNTIME-001  Runtime Correctness and Recovery
│       Runtime Expedition
│       Guarantee atomic, replayable, recoverable runtime lifecycle transitions.
│
└── EXP-CERT-001  Failure Certification Framework
        Certification Expedition
        Establish deterministic failure and recovery certification using public workflows.
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

- The Program was reopened on 2026-07-18 to add EXP-DISCOVERY-001.
- The Program was reopened again on 2026-07-19 to add EXP-BROWNFIELD-001 and the operational hardening expeditions EXP-CLI-001, EXP-RUNTIME-001, and EXP-CERT-001.
- The Program is sequenced. Dependencies are explicit in each Expedition.
- No Expedition may be promoted to executing without approval.
- No implementation work may proceed outside an approved Expedition.
- Each Expedition must produce evidence that satisfies its Definition of Done.
- The Program completes when EXP-DISCOVERY-001, EXP-BROWNFIELD-001, EXP-CLI-001, EXP-RUNTIME-001, and EXP-CERT-001 are accepted.

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

- [x] EXP-AX-001 completed and accepted.
- [x] EXP-AX-002 completed and accepted.
- [x] EXP-AX-003 completed and accepted.
- [x] EXP-AX-004 completed and accepted.
- [x] EXP-AX-005 completed and accepted (quick-start media deferred to follow-up).
- [x] EXP-DISCOVERY-001 completed and accepted.
- [x] EXP-BROWNFIELD-001 completed and accepted.
- [x] EXP-CLI-001 completed and accepted.
- [x] EXP-RUNTIME-001 completed and accepted.
- [ ] EXP-CERT-001 completed and accepted.
- [x] AGENTS.md is published at repository root.
- [x] README is aligned with the AI-native experience.
- [x] Website and documentation synchronization is verified.
- [x] Public release polish is in place.
- [x] `npm run govern` passes without architectural changes.
- [ ] Brownfield entry path requires an approved Discovery baseline.

---

## Completion Notes

EXP-PROGRAM-004 — First Contact Program is active.

The first five expeditions were accepted:

- **EXP-AX-001 Universal Distribution** — `@synth-framework/synth` is published on npm; global install, `npx`, `synth doctor`, and `synth init` are smoke-tested on macOS.
- **EXP-AX-002 AI First Experience** — `AGENTS.md` is published at repository root and defines the AI operator contract, responsibilities, prohibitions, and full mission/validation/replay lifecycle.
- **EXP-AX-003 README & Narrative Alignment** — README leads with the AI-native value proposition, npm install, 60-second demo, `AGENTS.md` reference, and secondary architecture.
- **EXP-AX-004 Documentation Synchronization** — `docs/generated/` projection, link checking, and website-to-README copy sync are enforced in CI.
- **EXP-AX-005 Public Release Polish** — Badges, example gallery, contributor section, and quick-start media placeholder are in place.

Operational hardening expeditions have been completed except for the certification framework:

- **EXP-DISCOVERY-001 Repository Discovery & Brownfield Genesis** — ✅ completed; deterministic, read-only Discovery phase before governance.
- **EXP-BROWNFIELD-001 Brownfield Bootstrap Experience** — ✅ completed; deterministic, mutation-safe brownfield onboarding.
- **EXP-CLI-001 CLI UX and Diagnostics Hardening** — ✅ completed; trustworthy, actionable, machine-clean CLI diagnostics.
- **EXP-RUNTIME-001 Runtime Correctness and Recovery** — ✅ completed; atomic, replayable, recoverable runtime lifecycle transitions.
- **EXP-CERT-001 Failure Certification Framework** — remaining; deterministic certification of failure and recovery scenarios.

**Deferred work:** The quick-start GIF/video asset for EXP-AX-005 is tracked as a follow-up task and does not block program closure.

The architecture remained untouched throughout this program, consistent with ADR-005 — Architecture Era Closure.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/adr/ADR-005-architecture-era-closure.md` | Architecture Era closure and strengthened Knowledge Graph Lock. |
| `docs/expeditions/EXP-PROGRAM-003.md` | Preceding Validation Program, now closed. |
| `AGENTS.md` | AI operator contract; deliverable of EXP-AX-002. |
