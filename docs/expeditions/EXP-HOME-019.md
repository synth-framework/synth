# EXP-HOME-019 — Artifact Projection Layer

> **Architecture expedition.** Map runtime state produced by Genesis and Replay into homepage Artifact Cards.

**Status:** Completed (pending acceptance)  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-004 (Artifact System), EXP-HOME-017 (Homepage Genesis Projection), EXP-HOME-018 (Homepage Replay Projection)  
**Blocks:** EXP-HOME-021, EXP-HOME-024

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Ensure that every UI artifact is a projection of runtime state, not a direct exposure of CLI objects or raw runtime collections.

---

## Origin Evidence

The homepage must remain runtime-honest. Visitors should see Intent, Discovery, Unknowns, Domain, Mission, Expedition, Evidence, and Replay artifacts, not the internal `CanonicalState` shape (`state.missions`, `state.expeditions`, `state.workItems`, etc.). A projection layer keeps the UI decoupled from runtime internals.

---

## Required Change

### 1.1 Projection contract

Define a stable projection contract such as:

```ts
interface ArtifactProjection {
  intent?: IntentCard
  discovery?: DiscoveryCard
  unknowns: UnknownsCard
  domain?: DomainCard
  mission?: MissionCard
  expeditions: ExpeditionCard[]
  evidence: EvidenceCard[]
  architecture?: ArchitectureCard[]
  replay?: ReplayState
}
```

### 1.2 Mapping functions

Implement functions that convert runtime outputs into the projection contract:

- Genesis state → `ArtifactProjection`
- Replay state at offset N → `ArtifactProjection`
- Workspace phase → which artifacts are visible

### 1.3 UI isolation

React components consume only `ArtifactProjection` and workspace phase. They never import runtime types or CLI types directly.

---

## Deliverables

1. **Artifact Projection Layer specification**.
2. **TypeScript projection contract**.
3. **Mapping functions** from Genesis and Replay state.
4. **Tests** verifying every projected artifact maps to a SYNTH concept.

---

## Acceptance Criteria

- Every Artifact Card receives data through the projection contract.
- No React component depends on runtime or CLI types.
- Projections are deterministic for the same runtime state.
- Every projected element maps to a documented SYNTH concept.

---

## Out of Scope

- Runtime SDK extraction (Phase 2).
- Agent SDK integration (Phase 3).
- Decorative UI without runtime mapping.

---

## Success Criteria

The expedition succeeds when any runtime state can be fed through the projection layer and rendered by the existing Artifact Card system without UI changes.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-004 — Artifact System](EXP-HOME-004.md)
- [EXP-HOME-017 — Homepage Genesis Projection](EXP-HOME-017.md)
- [EXP-HOME-018 — Homepage Replay Projection](EXP-HOME-018.md)
- [EXP-HOME-024 — Projection Contract](EXP-HOME-024.md)
