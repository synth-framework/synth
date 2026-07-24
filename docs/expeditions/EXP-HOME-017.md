# EXP-HOME-017 — Homepage Genesis Projection

> **Product expedition.** Implement the homepage projection of the Genesis Protocol as deterministic TypeScript functions.

**Status:** Completed (pending acceptance)  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-003 (Genesis Experience), EXP-HOME-016 (Homepage Runtime)  
**Blocks:** EXP-HOME-019, EXP-HOME-021

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

Expose Genesis as a set of in-memory functions the homepage can call to progress from visitor intent to Mission and Expedition artifacts.

---

## Origin Evidence

The Genesis Protocol (`docs/reference/genesis-protocol.md`) defines how AI agents participate in SYNTH repositories, but the homepage needs a stateless, browser-native subset. The existing CLI first-contact commands write to `.synth/first-contact/`, which is unsuitable for a homepage demo.

---

## Required Change

### 1.1 Function surface

Provide functions such as:

```ts
discoverIntent(input: string, mode: EntryMode): IntentProjection
clarify(intent: IntentProjection, answers: ClarificationAnswer[]): DiscoveryProjection
buildMission(discovery: DiscoveryProjection): MissionProjection
buildExpeditions(mission: MissionProjection): ExpeditionProjection[]
projectArtifacts(state: GenesisState): ArtifactProjection
```

### 1.2 Deterministic rule-based adapters

Use the existing rule-based extraction, clarification, architecture projection, and capability verification adapters from `src/first-contact/`, wrapped by the Homepage Runtime.

### 1.3 Entry modes

Support the four homepage entry modes:

- Greenfield
- Brownfield
- Knowledge
- Conversation

For Phase 1, Brownfield, Knowledge, and Conversation may be simplified or stubbed as long as the function contract supports them.

---

## Deliverables

1. **Genesis projection function library**.
2. **Entry mode handling** for Greenfield, Brownfield, Knowledge, and Conversation.
3. **Deterministic adapter bundle** for the homepage.
4. **Tests** verifying artifact output for curated inputs.

---

## Acceptance Criteria

- A visitor can type an intent and receive projected artifacts.
- The same input and mode always produce the same artifacts.
- No filesystem or CLI dependencies are invoked.
- Output maps to the Artifact Projection Layer defined in EXP-HOME-019.

---

## Out of Scope

- Full Genesis Protocol compliance for agents.
- Repository mutation or materialization.
- Live AI model integration.

---

## Success Criteria

The expedition succeeds when the homepage can turn a visitor's typed intent into a projected Mission and Expeditions using only in-memory functions.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-003 — Genesis Experience](EXP-HOME-003.md)
- [EXP-HOME-016 — Homepage Runtime](EXP-HOME-016.md)
- [EXP-HOME-019 — Artifact Projection Layer](EXP-HOME-019.md)
- [docs/reference/genesis-protocol.md](../reference/genesis-protocol.md)
