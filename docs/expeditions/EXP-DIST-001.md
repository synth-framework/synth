# EXP-DIST-001 — Canonical AI Capability Model

> **Architecture expedition.** Define the single source of truth from which every SYNTH skill, rules file, MCP manifest, IDE extension, website page, and documentation section is projected.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Depends On:** EXP-AI-001 (Genesis Protocol), EXP-AI-002 (Agent Skill Catalog), EXP-AI-003 (Repository Semantic Metadata)  
**Blocks:** To be defined as downstream distribution expeditions are chartered

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Create a Canonical AI Capability Model that captures everything an AI system needs to know to interact correctly with SYNTH. All platform-specific artifacts are projections of this model.

The model must answer:

- What protocols does SYNTH expose?
- What skills can an agent activate?
- What triggers each skill?
- What is the expected behavior, inputs, outputs, and stopping condition?
- What governance constraints apply?
- What repository metadata informs behavior?
- What are the prohibited actions and escalation rules?

---

## Origin Evidence

Today SYNTH maintains skills, rules, manifests, and documentation separately. This leads to drift: a Cursor rule may contradict a Claude skill, or the MCP server may expose capabilities that the website does not document. A single canonical model eliminates this drift and makes distribution scalable.

---

## Required Change

### 1.1 Model contents

```text
Protocol Registry
    ↓
Skill Definitions
    ↓
Governance Constraints
    ↓
Repository Metadata Bindings
    ↓
Prohibited Actions
    ↓
Escalation Rules
    ↓
Platform Projection Rules
```

### 1.2 Source inputs

The Capability Model consumes:

- Genesis Protocol (EXP-AI-001)
- Agent Skill Catalog (EXP-AI-002)
- Repository Semantic Metadata (EXP-AI-003)
- AI Interaction Manifest (EXP-AI-004)
- Multi-Agent Coordination contracts (EXP-AI-006)

### 1.3 Output projections

The Capability Model drives generation of:

- ChatGPT / Claude / Gemini / Codex skills
- Cursor / Cline / Windsurf / Roo / Aider / Continue.dev rules
- MCP server manifest
- Website content
- Documentation sections
- Educational examples

---

## Deliverables

1. **ADR** defining the Canonical AI Capability Model.
2. **Schema** under `docs/reference/ai-capability-model-schema.md`.
3. **Reference model file** in a machine-readable format (YAML or JSON).
4. **Projection engine interface** describing how platform artifacts are generated.

---

## Acceptance Criteria

- The model is a single source of truth for SYNTH's public AI-facing contract.
- Two projections from the same model version are semantically equivalent.
- Adding a new skill or constraint updates all downstream projections deterministically.

---

## Out of Scope

- Specific platform projections (EXP-DIST-002, EXP-DIST-005).
- MCP server implementation (EXP-DIST-003).
- Package distribution (EXP-DIST-004).

---

## Success Criteria

The expedition succeeds when every SYNTH skill, rule, manifest, and documentation page can be traced back to the Canonical AI Capability Model.
