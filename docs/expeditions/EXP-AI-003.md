# EXP-AI-003 — Repository Semantic Metadata

> **Architecture expedition.** Define the machine-readable metadata contracts a SYNTH repository exposes to AI agents.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AI-001 (Genesis Protocol)  
**Blocks:** EXP-AI-004, EXP-AI-005, EXP-AI-007

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

Define the semantic metadata contracts that allow an agent to inspect a repository and immediately understand its SYNTH context: lifecycle phase, governance version, supported protocols, classification, and execution policies.

---

## Origin Evidence

Agents currently determine repository state by running CLI commands and inspecting files. There is no stable, machine-readable surface that advertises SYNTH capabilities. This makes automatic discovery and safe interaction impossible.

---

## Required Change

### 1.1 Metadata directory

Repository metadata is exposed under:

```text
.synth/ai/
    discovery.json
    capabilities.json
    lifecycle.json
    protocols.json
    skills.json
```

### 1.2 Metadata files

- **discovery.json** — discovery behavior, supported input types, and output formats.
- **capabilities.json** — supported SYNTH capabilities and their current availability.
- **lifecycle.json** — current lifecycle phase, allowed transitions, and blockers.
- **protocols.json** — supported protocol names and versions.
- **skills.json** — recommended skills for this repository type and phase.

### 1.3 Derivation rules

Metadata is derived from canonical SYNTH state, not hand-edited. The derivation rules ensure that metadata stays consistent with the event log and canonical state.

### 1.4 Versioning

Metadata is versioned with the governance version. Older protocol versions are supported through compatibility shims where necessary.

---

## Deliverables

1. **Repository Semantic Metadata Specification** under `docs/reference/repository-semantic-metadata.md`.
2. **JSON Schemas** for each metadata file.
3. **ADR** on metadata location, derivation, and versioning.
4. **Reference generator** that produces `.synth/ai/` metadata from canonical state.

---

## Acceptance Criteria

- An agent can determine repository type and lifecycle phase by reading `.synth/ai/`.
- Metadata is always consistent with canonical SYNTH state.
- Metadata versioning aligns with governance versioning.

---

## Out of Scope

- Genesis Protocol semantics (EXP-AI-001).
- Project-specific interaction guidance (EXP-AI-004).
- SDK implementation (EXP-AI-005).

---

## Success Criteria

The expedition succeeds when a compliant agent can inspect `.synth/ai/` and understand how to interact with the repository before running any CLI command.
