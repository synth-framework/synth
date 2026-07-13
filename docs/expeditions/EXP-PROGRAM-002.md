# EXP-PROGRAM-002 — SYNTH Public Release Program

**Status:** Completed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Public adoption and release preparation  
**Architecture Impact:** None  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** None

---

## Purpose

Prepare SYNTH for public adoption by organizing the repository, documentation, examples, website, and community assets — without modifying the frozen architectural model.

This Program belongs to **Era II — Adoption** (ADR-004). It proves that the frozen v2 architecture can be presented, explained, and adopted by real operators.

> **Constitutional Rule:** This Program completes without touching architecture.

---

## Mission

Do not add new architectural capabilities. Prove that the existing frozen capabilities can be packaged, documented, demonstrated, and released to the public.

---

## Program Composition

```
EXP-PROGRAM-002
SYNTH Public Release Program
│
├── EXP-REL-001  Repository Organization
│       Release Expedition
│       Transform the repository into a public open-source project.
│
├── EXP-REL-002  Public Documentation
│       Release Expedition
│       Produce the public-facing documentation experience.
│
├── EXP-REL-003  Example Certification
│       Release Expedition
│       Produce canonical example repositories.
│
├── EXP-REL-004  Website
│       Release Expedition
│       Launch synth.dev (or equivalent).
│
└── EXP-REL-005  Open Source Readiness
        Release Expedition
        Satisfy GitHub Community Standards.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Post-Freeze Rule

All work in this Program stays in the Allowed column:

| Allowed | Forbidden |
|---|---|
| Documentation | New architectural concepts |
| Repository organization | New execution model |
| Examples | Changes to constitutional semantics |
| Website | New foundational abstractions |
| Tutorials | Changes that invalidate replay proofs |
| Public terminology | Changes that modify the deterministic execution contract |
| Developer experience | |
| Testing | |
| Benchmarking | |
| Bug fixes | |
| Missing capabilities required by approved Expeditions | |

---

## Governance

- The Program is sequenced. Dependencies are explicit in each Expedition.
- No Expedition may be promoted to executing without approval.
- No implementation work may proceed outside an approved Expedition.
- Each Expedition must produce evidence that satisfies its Definition of Done.
- The Program completes when EXP-REL-005 is accepted.

---

## Success Criteria

- Repository is organized and understandable to a first-time visitor.
- Public documentation lets a new operator complete the Quick Start in under five minutes.
- Canonical examples exist and each passes `npm run govern`.
- Website is live with landing page, docs, quick start, examples, and community links.
- Repository satisfies GitHub Community Standards.
- Architecture remains unchanged.

---

## Definition of Done

- [x] EXP-REL-001 completed and accepted.
- [x] EXP-REL-002 completed and accepted.
- [x] EXP-REL-003 completed and accepted.
- [x] EXP-REL-004 completed and accepted.
- [x] EXP-REL-005 completed and accepted.
- [x] Public Release Report is published.
- [x] Architecture is verified unchanged.

---

## Completion Notes

All five Expeditions of EXP-PROGRAM-002 are complete:

- EXP-REL-001 — Repository Organization
- EXP-REL-002 — Public Documentation
- EXP-REL-003 — Example Certification
- EXP-REL-004 — Website
- EXP-REL-005 — Open Source Readiness

The architecture remains unchanged. The project is ready for public release.

Final verification performed on closure:

- `npm run docs:check-links` — 932 internal links resolve.
- `npm run test:freeze-certification` — 10/10 checks pass.
- `npm run audit:repository` — 56/56 checks pass.
- All six certified examples pass `npm run govern`.
- No Protected Asset was modified during this Program.

Latest proof: see `docs/CONSTITUTIONAL_BASELINE.md`.
