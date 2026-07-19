# EXP-PROGRAM-006 — Discovery Platform

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Evidence acquisition and observed-system understanding  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** Low

---

## Thesis

> **How does SYNTH understand a system it did not create?**

Every brownfield workflow, migration, audit, and onboarding process begins with discovering what already exists. Discovery must be a first-class platform capability, not a one-off bootstrap utility.

---

## Purpose

Establish **Discovery** as a foundational SYNTH Capability that acquires observations from any source, preserves them as canonical evidence, synthesizes findings, and produces replayable ProjectModels without ever modifying the observed system.

This program introduces a new architectural capability. It does not modify Protected Assets.

> **Constitutional Rule:** Discovery shall never modify the system it is observing.

---

## Mission

Make SYNTH capable of understanding external systems—repositories, APIs, databases, deployments, knowledge packages, ticket systems, and more—through a source-agnostic, replayable, evidence-backed Discovery pipeline.

---

## Program Composition

```
EXP-PROGRAM-006
Discovery Platform
│
├── EXP-DISCOVERY-001  Source Adapter Framework
│       Architecture Expedition
│       Define source abstraction, adapter contract, adapter registry, and capability interface.
│
├── EXP-DISCOVERY-002  Discovery Engine
│       Architecture Expedition
│       Implement pipeline stages, session model, synthesizer, and replay verification.
│
├── EXP-DISCOVERY-003  First Observation Capabilities
│       Architecture Expedition
│       Define ObservationCapability contract and implement Filesystem & Git capabilities.
│
├── EXP-DISCOVERY-004  Projection Capability Mechanism
│       Architecture Expedition
│       Generic projection extension point and ProjectModelProjection implementation.
│
├── EXP-DISCOVERY-005  Brownfield Genesis Integration
│       Architecture Expedition
│       Make bootstrap consume DiscoverySession via a provider abstraction.
│
├── EXP-DISCOVERY-006  Replay & Determinism
│       Architecture Expedition
│       Full provenance replay, tamper detection, and cross-run equivalence.
│
├── EXP-DISCOVERY-007  IDE / MCP / Web Consumers
│       Product Expedition
│       Build non-CLI projections of Discovery sessions.
│
└── EXP-DISCOVERY-008  Operational Discovery
        Architecture Expedition
        Extend Discovery to deployments, databases, cloud, and containers.
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
| New `DiscoveryCapability` and supporting modules | Changes to event model semantics |
| Source abstraction and adapter framework | Changes to capability model governance |
| Discovery session, evidence, findings, and ProjectModel contracts | Changes to constitutional baseline |
| Adapter implementations for filesystem, Git, and future sources | Changes that invalidate replay proofs |
| CLI `discover` projection | Changes to deterministic execution contract |
| Brownfield bootstrap integration via provider | Direct bootstrap-to-Genesis coupling |
| Documentation of the Discovery Platform | New execution semantics |

---

## Architectural Invariants

1. **Discovery is a Capability, not a feature.** All interfaces consume the same `DiscoveryCapability`.
2. **DiscoverySession is the aggregate root and is immutable after completion.** Any new discovery execution creates a new session.
3. **Observations are immutable facts.** No interpretation.
4. **Evidence references observations.** Evidence is provenance, not a collection.
5. **Findings are deterministic, declarative, and immutable.** Findings may be superseded or resolved, never deleted.
6. **Findings are session artifacts but never canonical.** They are regenerated from Evidence during replay.
7. **Recommendations are projections.** Consumer-specific guidance is generated on demand.
8. **ProjectModel is projection-only and never canonical.** Evidence is canonical.
9. **Discovery exposes one API.** `DiscoveryCapability.discover(input) -> DiscoverySession`.
10. **Discovery shall never modify the system it is observing.**
11. **Discovery recommendations shall never modify the observed system.**
12. **Replay verifies the full provenance chain.**
13. **Discovery sessions have lineage.** `id`, `hash`, and optional `parentSessionId`.
14. **Persistence, approval, and governance live outside Discovery.**

---

## Pipeline Stages

```text
Acquire     → adapters produce observations
Normalize   → observations are validated and typed
Correlate   → observations are grouped into evidence claims
Synthesize  → findings are derived from evidence
Project     → ProjectModel is generated from evidence and findings
Verify      → replay checks determinism and provenance
```

Adapters participate only in **Acquire**. All downstream stages are engine-owned.

---

## Governance

- The Program was created on 2026-07-18.
- The Program is sequenced. Dependencies are explicit in each Expedition.
- No Expedition may be promoted to executing without approval.
- No implementation work may proceed outside an approved Expedition.
- Each Expedition must produce evidence that satisfies its Definition of Done.
- The Program completes when EXP-DISCOVERY-008 is accepted.

---

## Success Criteria

- SYNTH can discover any filesystem directory without modifying it.
- Discovery results are replayable from evidence alone.
- Brownfield Genesis requires and consumes an approved Discovery baseline.
- The same Discovery pipeline can be extended to new source types without redesign.
- CLI, Mission Studio, MCP, IDE, Web UI, and automation can consume the same DiscoveryCapability.
- No Protected Asset is modified.
- `npm run govern` passes after each Expedition.

---

## Definition of Done

- [x] EXP-DISCOVERY-001 completed and accepted.
- [x] EXP-DISCOVERY-002 completed and accepted.
- [x] EXP-DISCOVERY-003 completed and accepted.
- [x] EXP-DISCOVERY-004 completed and accepted.
- [x] EXP-DISCOVERY-005 completed and accepted.
- [x] EXP-DISCOVERY-006 completed and accepted.
- [x] EXP-DISCOVERY-007 completed and accepted.
- [ ] EXP-DISCOVERY-008 chartered, implemented, and accepted.
  - The existing charter references this expedition but no file exists.
  - It must be rewritten with scoped source contracts and adapter priorities before execution.
- [ ] Discovery Capability is documented as a platform pillar.
- [ ] `npm run govern` passes.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-DISCOVERY-001.md` | First expedition: Source Adapter Framework. |
| `docs/expeditions/EXP-PROGRAM-004.md` | Preceding First Contact Program; Brownfield Discovery originated there. |
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/adr/ADR-005-architecture-era-closure.md` | Architecture Era closure and strengthened Knowledge Graph Lock. |
