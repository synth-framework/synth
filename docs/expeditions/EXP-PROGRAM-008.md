# EXP-PROGRAM-008 — Documentation & Projections

**Status:** Completed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Deterministic documentation projection system and derived artifacts  
**Era:** II — Adoption  
**Architecture Impact:** Medium  
**Constitutional Impact:** Medium  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** None

---

## Thesis

> **Documentation is a projection system, not a collection of generated files.**

Every derived artifact in SYNTH shall be reproducible from constitutional sources through deterministic projections. Projection outputs are build artifacts and shall not be considered authoritative project state.

---

## Purpose

Establish the **Deterministic Projection Model** as a constitutional property of SYNTH by ensuring that all derived artifacts — documentation, website content, AI context, API references, and future projections — are produced deterministically from committed constitutional sources rather than authored or committed by hand.

This program separates **authoritative sources** (missions, expeditions, governance, policies, specifications, architecture, design documents) from **projections** (README, API docs, operator guides, website HTML, OpenAPI, search indexes, LLM context, and other derived representations).

> **Constitutional Rule — Projection Rule:**
>
> Every derived artifact in SYNTH shall be reproducible from constitutional sources through deterministic projections. Projection outputs are build artifacts and shall not be considered authoritative project state.

---

## Mission

Build a Documentation Projection System that transforms constitutional sources into deterministic, validated, consumable artifacts — and make every downstream consumer, including the website, installer, release pipeline, and AI tooling, depend on projections rather than hand-maintained copies.

---

## Program Composition

```
EXP-PROGRAM-008
Documentation & Projections
│
├── EXP-DOCS-001  Documentation Projection System
│       Adoption Expedition
│       Establish deterministic projections from constitutional sources to derived artifacts.
│
├── EXP-DOCS-002  Capability Model Documentation
│       Adoption Expedition
│       Bring public capability documentation in line with the Capability Graph
│       and the capability families delivered by EXP-PROGRAM-007.
│
├── EXP-DOCS-003  Agent Planning Guide Update
│       Adoption Expedition
│       Align AI agent guides with environment discovery and capability-aware planning.
│
├── EXP-DOCS-004  Environment Layer Reference
│       Adoption Expedition
│       Publish the canonical Environment Layer reference: architecture, provider
│       contracts, discovery evidence, and registration status.
│
├── EXP-DOCS-005  Example Synchronization
│       Adoption Expedition
│       Bring every example in `examples/` in line with the post-PROGRAM-007 architecture.
│
└── EXP-DOCS-006  Website Projection Verification
        Adoption Expedition
        Verify the website reflects the current documentation surface.
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

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Projection manifests and graphs | Modifying Protected Assets |
| Deterministic documentation generation | Hand-editing generated artifacts as authoritative |
| Projection validation | Committing projection outputs to version control |
| Consumer contracts for projection artifacts | Coupling projections to specific CI platforms |
| Website consumption of projection artifacts | Making projections environment-dependent |

---

## Invariants

1. Only constitutional artifacts are committed.
2. Every projection is deterministic: the same source produces the same output.
3. Projection outputs are build artifacts, not authoritative state.
4. Projections may run locally, in CI, in containers, or in releases without changing output.
5. Downstream consumers consume projection artifacts, not constitutional sources directly.

---

## Success Criteria

- `docs/generated/` is not tracked in version control.
- Projections run deterministically from committed sources.
- Projection graph validation passes in CI and locally.
- The Publish workflow consumes documentation projection artifacts without generating them itself.
- The public documentation surface (reference, architecture, agent guides, examples, website) accurately reflects the Environment Layer and Capability Graph delivered by EXP-PROGRAM-007.
- No generated artifact is treated as authoritative.
- No Protected Asset is modified.

---

## Definition of Done

- [x] EXP-DOCS-001 completed and accepted.
- [x] EXP-DOCS-002 completed and accepted.
- [x] EXP-DOCS-003 completed and accepted.
- [x] EXP-DOCS-004 completed and accepted.
- [x] EXP-DOCS-005 completed and accepted.
- [x] EXP-DOCS-006 completed and accepted.
- [x] Program accepted.

---

## Completion Notes

- EXP-DOCS-001 delivered the Documentation Projection System and Projection Rule.
- Projections are now generated deterministically in CI and treated as build artifacts.
- `docs/generated/` is excluded from version control.
- The Publish workflow consumes projection artifacts instead of generating or committing them.
- Program accepted and closed.

Program reopened on 2026-07-15 to synchronize the documentation surface with the Environment Layer architecture delivered by EXP-PROGRAM-007. EXP-DOCS-001 remains completed and accepted; EXP-DOCS-002 through EXP-DOCS-006 extend the program scope to capability model documentation, agent planning guides, the Environment Layer reference, example synchronization, and website projection verification.

Reopening completed on 2026-07-15:

- EXP-DOCS-002 documented all twelve environment capability families and the Capability Graph in the capability reference and architecture pages (PR #69).
- EXP-DOCS-003 aligned the agent handbook and index with environment discovery and capability-aware planning; full audit verdicts recorded (PR #70).
- EXP-DOCS-004 published the Environment Layer Reference with the provider registration matrix and honestly recorded gaps (PR #71).
- EXP-DOCS-005 verified all seven examples, untracked 49 projection outputs per the Projection Rule, and updated the examples index (PR #72).
- EXP-DOCS-006 migrated 22 dead website links to the canonical repository, added the new references to the website docs index, and extended website sync verification with a canonical-repository check (PR #73).

Program accepted and re-closed via PRs #68–#74. No Protected Assets modified.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/adr/ADR-005-architecture-era-closure.md` | Architecture Era closure. |
| `docs/expeditions/EXP-PROGRAM-007.md` | Related Environment Independence Program; shares projection architecture objective. |
| `docs/expeditions/EXP-PROGRAM-006.md` | Preceding Installation & Distribution Program; consumer of documentation projections. |
