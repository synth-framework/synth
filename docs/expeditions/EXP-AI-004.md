> This expedition is part of **EXP-PROGRAM-026 — AI Agent Interoperability**.

# EXP-AI-004 — AI Interaction Manifest

> **Product expedition.** Standardize machine-readable interaction guidance so any AI agent can understand how to work with a specific SYNTH repository.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AI-003 (Repository Semantic Metadata)  
**Blocks:** EXP-AI-005, EXP-AI-007

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

Define the AI Interaction Manifest: a machine-readable file that tells an agent how to interact with a specific repository. It extends repository semantic metadata with project-specific guidance while remaining deterministic and reviewable.

---

## Origin Evidence

Even with generic SYNTH skills, an agent needs project-specific guidance: preferred interaction patterns, off-limits operations, required evidence, and escalation rules. Today this guidance lives in unstructured README files or agent prompts.

---

## Required Change

### 1.1 Manifest contents

```text
repositoryPurpose          — why the project exists.
expectedWorkflows          — typical SYNTH workflows for this repository.
prohibitedActions          — actions the agent must never take.
approvalRequirements       — which actions require explicit approval.
mutationPolicy             — READ_ONLY / PROPOSAL_ONLY / MUTATING.
preferredInteractionPattern — how the agent should engage the operator.
evidenceExpectations       — what evidence is required for approvals.
escalationRules            — when and how to escalate to the operator.
ownershipBoundaries        — which domains the agent may reason about.
```

### 1.2 Manifest location

```text
.synth/ai/interaction-manifest.json
```

### 1.3 Manifest lifecycle

- Created during bootstrap or generated from repository classification.
- Versioned and governed like any other SYNTH artifact.
- Changes require approval if they affect mutation or escalation policy.

---

## Deliverables

1. **AI Interaction Manifest schema** under `docs/reference/ai-interaction-manifest-schema.md`.
2. **Example manifests** for greenfield, brownfield, and hybrid repositories.
3. **CLI support** for generating and validating the manifest (`synth ai manifest` or equivalent).
4. **Tests** ensuring the manifest is parsed and enforced by agent-facing tooling.

---

## Acceptance Criteria

- The manifest is machine-readable and human-reviewable.
- It covers purpose, workflows, prohibited actions, approval requirements, and escalation.
- A compliant agent changes its behavior based on the manifest.

---

## Out of Scope

- Genesis Protocol (EXP-AI-001).
- Agent skills (EXP-AI-002).
- Multi-agent coordination (EXP-AI-006).

---

## Success Criteria

The expedition succeeds when an agent can read a repository's interaction manifest and adjust its behavior without additional instructions.
