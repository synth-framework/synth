# EXP-PROGRAM-014 — Governance Maturation

**Status:** Draft  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Capture architectural lessons discovered through the first end-to-end governed bootstrap, without redesigning the governance kernel  
**Era:** II — Adoption  
**Architecture Impact:** Low  
**Constitutional Impact:** Medium  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** Low  
**Depends On:** EXP-PROGRAM-011, EXP-PROGRAM-012  
**Blocks:** None  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (governed bootstrap E1)

---

## Thesis

> SYNTH's governance model proved itself not by being refined in isolation, but by successfully governing real implementation work.

EXP-PROGRAM-014 captures the lessons of the first fully governed bootstrap (E1) and hardens the governance layer around them. The kernel does not change. The focus is on the surrounding machinery that makes governance observable, verifiable, and reproducible: replay as the single source of truth, clear boundaries between governance and implementation, a formal projection model, and an executable verification engine.

---

## Problem Statement

The E1 exercise demonstrated that the governance kernel is mature enough to govern real work. It also exposed four gaps in the surrounding governance machinery:

1. **Governance transitions are scattered.** Initialization proof, governance records, bootstrap evidence, and approvals live in different conceptual places. The unifying abstraction — a single replay lineage — is implied but not formalized.
2. **Constitutional boundaries are implicit.** Tool versions, package managers, and third-party configuration were treated as governance concerns during bootstrap; they are implementation concerns. The boundary between *governance* and *implementation* must be explicit.
3. **Projection authority is ambiguous.** Expedition status, project identity, and readiness are computed from events, but the rules for what may be cached, what must be replay-derived, and what must never be duplicated are not written down.
4. **Invariants are checked manually.** Replay continuity, evidence referential integrity, provenance completeness, and cross-file consistency were verified by inspection during E1. These must become executable and automatic.

---

## Guiding Principles

EXP-PROGRAM-014 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- preserve the governance kernel (ExecutionGate, Event Model, Replay, Proof)
- formalize what already exists rather than invent new governance concepts
- make governance observable, verifiable, and replay-derived

EXP-PROGRAM-014 shall not:

- redesign the governance kernel
- introduce new public concepts
- redefine `synth init` semantics
- turn expeditions into bootstrap artifacts

---

## Constitutional Invariant

> **Identifiers are allocated, never assumed.** Expedition, Program, Mission, Evidence, Replay, and every other sequential identifier must be discovered from the governed state, not predicted by an agent. The allocation algorithm is: inspect existing governed state, determine the highest allocated sequence number, allocate the next unused identifier, verify uniqueness, and commit.

This applies uniformly across all governed artifact families and prevents collisions, supports concurrent work, preserves replay determinism, and keeps identifier assignment independent of any individual planning session.

---

## Program Composition

```text
EXP-PROGRAM-014
Governance Maturation
│
├── EXP-GOV-002  Replay as the Constitutional Source of Truth
│       Implementation Expedition
│       Define a canonical GovernanceRecord schema and state
│       projection rules from replay; unify governance
│       transitions in one replay lineage.
│
├── EXP-GOV-003  Constitutional Layer Boundaries
│       Documentation Expedition
│       Formalize the boundary between Governance and
│       Implementation; document discovered examples.
│
├── EXP-GOV-004  Projection Model
│       Documentation / Architecture Expedition
│       Define canonical state, projections, replay-derived
│       surfaces, cacheable caches, and forbidden duplicates.
│
└── EXP-GOV-005  Verification Engine
        Implementation Expedition
        Executable `synth verify` for replay chain integrity,
        projection consistency, evidence referential integrity,
        assertion provenance, governance invariants, and drift.
```

Execution order reflects dependency: the replay record is formalized first, then boundaries are documented, then the projection model is defined, and finally the verification engine is built on top of all three.

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
- Proof schema and hash algorithm

Any change to a Protected Asset requires an Architecture Decision Record and explicit constitutional approval.

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. Governance transitions are replay-derived; no governance record exists outside the event lineage.
4. Implementation concerns (tool versions, package managers, environment configuration) never cross into governance semantics.
5. Projections are computed on read or cached with a provenance link to the source state hash; mutable projection stores are prohibited.
6. Every governance invariant becomes an executable check under `synth verify`.
7. Identifier allocation follows the governed-state discovery rule for all sequential artifact families.

---

## Success Criteria

- A canonical `GovernanceRecord` schema exists and every governance transition is representable in replay.
- A constitutional-layer-boundaries document defines Governance vs. Implementation with concrete examples from E1.
- The Projection Model document resolves the authority question for expedition status, repository identity, and readiness.
- `synth verify` runs automatically and verifies replay integrity, projection consistency, evidence referential integrity, provenance, governance invariants, and drift.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [x] EXP-GOV-002 completed and accepted.
- [x] EXP-GOV-003 completed and accepted.
- [x] EXP-GOV-004 completed and accepted.
- [ ] EXP-GOV-005 completed and accepted.
- [ ] Program accepted.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` | Field evidence from the governed bootstrap E1 that motivates this program. |
| `docs/expeditions/EXP-PROGRAM-011.md` | Operator Trust & CLI Integrity; governance answers must be trustworthy. |
| `docs/expeditions/EXP-PROGRAM-012.md` | Runtime Self-Description; projection surfaces this program formalizes. |
| `docs/expeditions/EXP-GOV-001.md` | Prior Continuous Governance expedition; this program extends the governance layer without duplicating it. |
