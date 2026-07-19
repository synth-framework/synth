> This expedition is part of **EXP-PROGRAM-026 — AI Agent Interoperability**.

# EXP-AI-001 — Genesis Protocol

> **Architecture expedition.** Specify the canonical protocol through which any AI agent participates in SYNTH Discovery, Mission creation, and Expedition execution.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AIFC-001 (Discovery Lifecycle Specification), EXP-RUNTIME-001 (Runtime Correctness and Recovery)  
**Blocks:** EXP-AI-002, EXP-AI-003, EXP-AI-005, EXP-AI-007

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

Define the Genesis Protocol: an implementation-independent contract that lets any capable AI agent discover and interact with a SYNTH repository without repository-specific instructions.

The protocol must answer:

- How does an agent recognize a SYNTH repository?
- What inputs can trigger a Discovery workflow?
- What are the phases of Discovery?
- What approval boundaries exist?
- What outputs must the agent produce?
- How are those outputs replayed and verified?

---

## Origin Evidence

Current agent interaction with SYNTH requires the agent to infer the workflow from CLI help and documentation. There is no standardized protocol a third-party agent can implement. This limits ecosystem adoption and makes multi-agent coordination impossible.

---

## Required Change

### 1.1 Protocol scope

The Genesis Protocol covers:

```text
Repository Discovery
        ↓
Context Classification
        ↓
Discovery Execution
        ↓
Artifact Production
        ↓
Approval Participation
        ↓
Mission / Expedition Interaction
        ↓
Replay Consumption
```

### 1.2 Repository discovery contract

An agent must be able to determine from repository metadata:

- Whether the repository is SYNTH-governed.
- The governance version.
- The current lifecycle phase.
- The repository type (greenfield, brownfield, hybrid).
- The mutation policy.

### 1.3 Discovery execution contract

Inputs:

- Natural language
- Existing repository artifacts
- Documents
- URLs
- Diagrams
- Images

Outputs:

- Discovery Artifact
- Intent Model
- Domain Model
- Mission Proposal
- Uncertainty Report

### 1.4 Approval boundary contract

- Read-only discovery never mutates repository state.
- Proposal-only phases produce artifacts for operator review.
- Mutating phases require explicit operator approval.
- Agents must not bypass approval gates.

### 1.5 Replay semantics

- Every agent-produced artifact must be reproducible from inputs and decisions.
- Agent actions that mutate state must emit events through the ExecutionGate.

---

## Deliverables

1. **Genesis Protocol Specification** document under `docs/reference/genesis-protocol.md`.
2. **Protocol message schemas** for discovery requests, artifact responses, and approval requests.
3. **ADR** on the Genesis Protocol and its relationship to SYNTH governance.
4. **Reference implementation sketch** showing protocol flow without binding to a specific agent platform.

---

## Acceptance Criteria

- A reviewer can implement a compliant agent from the specification alone.
- The protocol explicitly separates read-only, proposal-only, and mutating phases.
- Approval boundaries are unambiguous.
- Replay semantics are consistent with the SYNTH event model.

---

## Out of Scope

- Specific agent skill implementations (EXP-AI-002).
- Repository metadata schema details (EXP-AI-003).
- SDK implementation (EXP-AI-005).
- Certification suite (EXP-AI-007).

---

## Success Criteria

The expedition succeeds when the Genesis Protocol is accepted and downstream expeditions can be implemented against it without ambiguity.
