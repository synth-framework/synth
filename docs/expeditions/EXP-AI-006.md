> This expedition is part of **EXP-PROGRAM-026 — AI Agent Interoperability**.

# EXP-AI-006 — Multi-Agent Coordination

> **Architecture expedition.** Define contracts that let multiple AI agents collaborate on the same SYNTH repository without conflict.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AI-001 (Genesis Protocol), EXP-AI-003 (Repository Semantic Metadata)  
**Blocks:** EXP-AI-007

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Enable multiple agents to work on the same SYNTH project by defining coordination contracts for shared context, ownership boundaries, artifact synchronization, approval propagation, and conflict resolution.

---

## Origin Evidence

As SYNTH adoption grows, different agents may handle discovery, domain modeling, implementation, and verification. Without coordination contracts, agents can produce conflicting artifacts, duplicate work, or bypass each other's approval boundaries.

---

## Required Change

### 1.1 Coordination dimensions

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

### 1.2 Shared context

Agents share a common view of:

- Current lifecycle phase.
- Active Mission and Expedition.
- Pending approvals.
- Recent decisions and discoveries.

### 1.3 Ownership boundaries

- An agent declares the domain it owns (e.g., "domain modeling", "implementation", "verification").
- Ownership prevents multiple agents from mutating the same artifact without coordination.

### 1.4 Artifact synchronization

- Agents publish artifacts to a shared, versioned workspace.
- Artifact updates are visible to other agents through replay or the shared context.

### 1.5 Approval propagation

- Approval of a Mission or Expedition is visible to all agents.
- Agents do not act on stale approvals.

### 1.6 Conflict resolution

- Detect conflicting proposals (e.g., two agents propose different domain models).
- Escalate to the operator when automatic resolution is impossible.
- Record resolution decisions in the event log.

---

## Deliverables

1. **Multi-Agent Coordination Specification** under `docs/reference/multi-agent-coordination.md`.
2. **ADR** on ownership, synchronization, and conflict resolution.
3. **Reference coordination protocol** messages.
4. **Example scenarios** showing two agents collaborating without conflict.

---

## Acceptance Criteria

- Ownership boundaries prevent uncoordinated mutation.
- Approval state is consistent across agents.
- Conflicting proposals are detected and escalated.
- All coordination decisions are replayable.

---

## Out of Scope

- Agent skills (EXP-AI-002).
- SDK implementation (EXP-AI-005).
- Specific agent platforms or communication transports.

---

## Success Criteria

The expedition succeeds when two independent agents can collaborate on a SYNTH repository without producing conflicting state.
