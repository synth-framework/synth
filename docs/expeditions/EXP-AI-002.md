# EXP-AI-002 — Agent Skill Catalog

> **Product expedition.** Publish reusable agent skills that encode SYNTH interaction patterns for common agent platforms.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AI-001 (Genesis Protocol)  
**Blocks:** EXP-AI-007

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

Define and publish a catalog of reusable agent skills. Each skill describes the behavior a compliant agent should exhibit when encountering a SYNTH-related situation, without prescribing implementation details.

---

## Origin Evidence

Agents currently learn to use SYNTH by reading CLI help and project-specific documentation. There is no reusable skill definition an agent platform can load. This forces every agent integration to rediscover SYNTH behavior.

---

## Required Change

### 1.1 Skill catalog

Initial skills:

```text
Genesis Skill            — recognize a greenfield request and begin Discovery.
Brownfield Discovery Skill — recognize an existing repository and begin baseline capture.
Mission Authoring Skill   — help an operator refine and approve a Mission draft.
Expedition Planning Skill — propose Expeditions for an approved Mission.
Governance Verification Skill — verify that agent actions comply with SYNTH governance.
Replay Inspection Skill   — inspect previous decisions and state through replay.
```

### 1.2 Skill contract

Each skill defines:

- **Trigger conditions:** when should the skill activate?
- **Expected behavior:** what does the agent do?
- **Inputs:** what information does the skill consume?
- **Outputs:** what artifacts does the skill produce?
- **Stopping conditions:** when is the skill finished?
- **Governance constraints:** what approval or mutation rules apply?

### 1.3 Platform-agnostic representation

Skills are represented in a platform-neutral format (e.g., YAML or JSON) that common agent platforms can consume. Platform-specific adapters may be provided as examples, but they are not the canonical definition.

---

## Deliverables

1. **Agent Skill Catalog** document under `docs/guides/agent-skill-catalog.md`.
2. **Skill schema** defining the skill contract.
3. **Reference skill definitions** for the seven initial skills.
4. **Example platform adapters** for at least one common agent framework.

---

## Acceptance Criteria

- Every skill has clear trigger, behavior, input, output, and stopping conditions.
- Skills do not depend on SYNTH implementation internals.
- A new agent platform can adopt the catalog by implementing the skill schema.

---

## Out of Scope

- Genesis Protocol specification (EXP-AI-001).
- Repository metadata schema (EXP-AI-003).
- Multi-agent coordination (EXP-AI-006).

---

## Success Criteria

The expedition succeeds when an agent platform can load the skill catalog and participate in a SYNTH workflow without custom instructions.
