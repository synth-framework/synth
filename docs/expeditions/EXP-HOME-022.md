# EXP-HOME-022 — Runtime Abstraction Layer

> **Architecture expedition.** Define the `MissionRuntime` interface that decouples Mission Studio from any concrete runtime implementation.

**Status:** Completed (pending acceptance)  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-016 (Homepage Runtime), EXP-HOME-019 (Artifact Projection Layer)  
**Blocks:** EXP-HOME-024 (Projection Contract)

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

Ensure Mission Studio depends only on an interface, not on the Homepage Runtime, CLI, or any future SDK directly.

---

## Origin Evidence

Without an abstraction layer, the homepage will be coupled to the Homepage Runtime. When Phase 2 extracts `@synth/runtime-sdk` and Phase 3 introduces live agents, the UI would require rewrites. A stable interface prevents that.

---

## Required Change

### 1.1 Interface definition

Define `MissionRuntime` with methods such as:

```ts
interface MissionRuntime {
  discover(input: string, mode: EntryMode): Promise<ArtifactProjection>
  clarify(state: GenesisState, answers: ClarificationAnswer[]): Promise<ArtifactProjection>
  buildMission(state: GenesisState): Promise<ArtifactProjection>
  buildExpeditions(state: GenesisState): Promise<ArtifactProjection>
  loadReplay(events: SampleEvent[]): Promise<ReplayState>
  stepReplay(state: ReplayState, direction: "forward" | "backward" | number): Promise<ReplayState>
  currentArtifacts(state: GenesisState | ReplayState): ArtifactProjection
}
```

### 1.2 Homepage Runtime adapter

Implement the interface with the in-memory Homepage Runtime. This is the only implementation in Phase 1.

### 1.3 Dependency injection

Mission Studio receives a `MissionRuntime` instance at initialization. No component imports the Homepage Runtime directly.

---

## Deliverables

1. **`MissionRuntime` interface** specification.
2. **Homepage Runtime adapter** implementing the interface.
3. **Dependency injection** wiring for Mission Studio.
4. **Tests** verifying the interface can be swapped without UI changes.

---

## Acceptance Criteria

- Mission Studio components depend only on `MissionRuntime`.
- The Homepage Runtime implements `MissionRuntime`.
- Swapping the runtime implementation requires no React component changes.
- The interface is stable enough to be satisfied by a future Runtime SDK.

---

## Out of Scope

- Implementing the Runtime SDK (Phase 2).
- Implementing live AI adapters (Phase 3).
- Changing the CLI.

---

## Success Criteria

The expedition succeeds when Mission Studio can run against a mock `MissionRuntime` implementation and against the Homepage Runtime without code changes in the UI layer.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-016 — Homepage Runtime](EXP-HOME-016.md)
- [EXP-HOME-017 — Homepage Genesis Projection](EXP-HOME-017.md)
- [EXP-HOME-018 — Homepage Replay Projection](EXP-HOME-018.md)
- [EXP-HOME-024 — Projection Contract](EXP-HOME-024.md)
