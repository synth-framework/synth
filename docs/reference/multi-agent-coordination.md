> Part of **EXP-AI-006 — Multi-Agent Coordination**.

# Multi-Agent Coordination Specification

This document defines the contracts that let multiple AI agents collaborate on the same SYNTH repository without conflict.

---

## Principles

1. **Single source of truth.** Canonical state, the event log, and the active Mission/Expedition are the only shared references.
2. **Explicit ownership.** An agent must declare which domain it owns before mutating artifacts in that domain.
3. **Approval is global.** Once approved, a Mission or Expedition is visible to all agents.
4. **Conflict detection, not conflict hiding.** Conflicting proposals are surfaced and escalated.
5. **Replayable coordination.** Every coordination decision is recorded as an event or decision.

---

## Coordination Dimensions

```text
Shared Context
      ↓
Ownership Boundaries
      ↓
Artifact Synchronization
      ↓
Approval Propagation
      ↓
Conflict Resolution
```

---

## Shared Context

Agents share a common view derived from `.synth/ai/` metadata and public CLI outputs:

- `lifecyclePhase`
- `mutationPolicy`
- `activeMissionId`
- `activeExpeditionId`
- `blockers`
- `prohibitedActions`
- `expectedWorkflows`

Agents refresh shared context by running `synth status` or `synth ai refresh` before acting.

---

## Ownership Boundaries

An agent declares ownership of a domain before producing or mutating artifacts in that domain.

| Domain | Typical Artifacts | Coordination Rule |
| --- | --- | --- |
| Intent | Discovery artifact, intent model | Single writer per Discovery session |
| Domain | Domain model, ubiquitous language | Single writer per bounded context |
| Architecture | ADRs, architecture projection | Proposals only; approval required |
| Implementation | Code, tests | Only within active Expedition |
| Verification | Proofs, test results | Read-only unless assigned |

Ownership is advisory at the protocol level. Enforcement comes from governance: mutations outside an active Expedition are rejected.

---

## Artifact Synchronization

Agents publish artifacts to the repository through governed SYNTH commands. Other agents observe changes via:

- `synth status`
- `synth explain replay`
- `synth ai refresh` followed by reading `.synth/ai/`

No private agent state is authoritative. If an artifact is not in the repository or event log, it does not exist for coordination purposes.

---

## Approval Propagation

Approvals are recorded as events in the event log. Because all agents replay the same log, approval state is eventually consistent.

Agents must:

- Re-read `lifecycle.json` before acting on an approval.
- Not cache approval decisions across turns.
- Escalate if approval state is ambiguous.

---

## Conflict Resolution

A conflict occurs when two agents produce contradictory proposals that cannot both be accepted.

Examples:

- Two different domain models for the same bounded context.
- Two expeditions claiming ownership of the same work item.
- Conflicting Mission drafts.

Resolution protocol:

1. **Detect.** Compare proposals against canonical state and existing proposals.
2. **Surface.** Present both proposals with evidence to the operator.
3. **Decide.** Operator selects one, merges them, or rejects both.
4. **Record.** The decision becomes a Decision artifact or event.
5. **Replay.** Future agents see the resolution in replay.

Automatic resolution is allowed only when one proposal is a strict superset of the other and no semantic conflict exists.

---

## Reference Messages

### Declare ownership

```json
{
  "schema": "synth-agent-coordination-v1",
  "type": "declareOwnership",
  "agentId": "agent-domain-modeler",
  "domain": "domain-model",
  "boundedContext": "billing",
  "expiresAt": "2026-07-20T18:00:00.000Z"
}
```

### Propose artifact

```json
{
  "schema": "synth-agent-coordination-v1",
  "type": "proposeArtifact",
  "agentId": "agent-domain-modeler",
  "artifactType": "DomainModel",
  "artifactId": "billing-domain-v3",
  "dependsOn": ["intent-model-v2"]
}
```

### Detect conflict

```json
{
  "schema": "synth-agent-coordination-v1",
  "type": "conflictDetected",
  "artifactType": "DomainModel",
  "boundedContext": "billing",
  "proposals": ["billing-domain-v3", "billing-domain-v4"],
  "resolution": "await_operator"
}
```

---

## Example Scenario

Two agents, `A` and `B`, collaborate on a brownfield project.

```text
A: synth discover --export
   ↓ produces baseline-v1

B: synth status
   ↓ sees baseline-v1, lifecycle=initialized

B: synth mission create --subject "Modernize billing" --purpose "..."
   ↓ produces mission-draft-1

A: synth mission approve --draft-id mission-draft-1
   ↓ mission active

B: synth expedition create --mission mission-draft-1 --subject "Refactor payment service"
   ↓ produces expedition-draft-1

A: synth expedition approve --draft-id expedition-draft-1
A: synth expedition commit --proposal-id expedition-draft-1
A: synth expedition start --id expedition-draft-1
   ↓ expedition executing

B: observes expedition via synth status
B: contributes implementation within expedition

A: synth expedition complete --id expedition-draft-1 --evidence ./proof
```

Both agents relied on the same shared context and never mutated state outside the active expedition.

---

## Compliance Checklist

- [ ] Agent refreshes context before acting.
- [ ] Agent declares ownership when producing artifacts.
- [ ] Agent verifies active mission and expedition before mutations.
- [ ] Agent escalates conflicts instead of overwriting.
- [ ] Agent records coordination decisions in the event log.
