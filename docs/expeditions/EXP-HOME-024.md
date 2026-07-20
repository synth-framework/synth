# EXP-HOME-024 — Projection Contract

> **Architecture expedition.** Establish a stable interface between the SYNTH runtime and any UI, so Mission Studio can run on web, desktop, VS Code, mobile, or documentation previews without redesign.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-019 (Artifact Projection Layer), EXP-HOME-022 (Runtime Abstraction Layer)  
**Blocks:** EXP-HOME-015 (Production Certification)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Define the canonical contract that connects runtime state to presentation. Every UI consumer receives the same projection and renders it however it chooses.

---

## Origin Evidence

SYNTH's architecture principle is that the runtime owns canonical state and presentation layers own rendering. The homepage is the first presentation layer, but it will not be the last. A projection contract prevents each new consumer from reimplementing the runtime-to-UI mapping.

---

## Required Change

### 1.1 Contract definition

Define a stable `ArtifactProjection` interface that every runtime must produce:

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
  replay?: ReplayProjection
  status: WorkspaceStatus
}
```

### 1.2 Runtime obligations

Every `MissionRuntime` implementation must return `ArtifactProjection` from its discovery, clarification, mission, expedition, and replay operations.

### 1.3 UI obligations

UI components consume only `ArtifactProjection` and workspace phase. They do not reach into runtime state, CLI output, or event logs.

### 1.4 Versioning

The contract is versioned. Future runtime changes that alter the projection must bump the contract version and provide migration notes.

---

## Deliverables

1. **Projection Contract specification** document.
2. **TypeScript interfaces** for `ArtifactProjection`, card types, and `WorkspaceStatus`.
3. **Validation tests** ensuring runtimes produce contract-compliant projections.
4. **Documentation** for future consumers (desktop, VS Code, mobile, docs previews).

---

## Acceptance Criteria

- A single `ArtifactProjection` type is the only data shape UI components receive.
- Every `MissionRuntime` method returns `ArtifactProjection` or a derivative.
- The contract is versioned and documented.
- A future consumer can implement the contract without knowing runtime internals.

---

## Out of Scope

- Specific rendering implementations for other platforms.
- Runtime SDK extraction (Phase 2).
- Agent SDK design (Phase 3).

---

## Success Criteria

The expedition succeeds when Mission Studio can be rendered from `ArtifactProjection` alone, and a second hypothetical consumer (e.g., a VS Code extension) could consume the same contract without changing the runtime.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-004 — Artifact System](EXP-HOME-004.md)
- [EXP-HOME-019 — Artifact Projection Layer](EXP-HOME-019.md)
- [EXP-HOME-022 — Runtime Abstraction Layer](EXP-HOME-022.md)
