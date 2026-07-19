# EXP-PROGRAM-026 — AI Agent Interoperability

**Status:** Completed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Open interoperability layer, agent skills, semantic repository metadata, and agent certification  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **SYNTH should not require AI agents to be explicitly programmed or fine-tuned to use it. Instead, SYNTH should expose an open interoperability layer that allows any capable AI agent to discover, understand, and participate in the SYNTH lifecycle through standardized protocols, skills, and semantic contracts.**

Programs 022–024 establish the upstream architecture that turns intent into governed knowledge and validated execution. Program 025 improves the performance of governance. Program 026 focuses on ecosystem adoption: making SYNTH discoverable, composable, and executable by any AI agent without repository-specific instructions.

The objective is to make **SYNTH discoverable**, not merely usable.

---

## Purpose

Create a public interoperability layer enabling AI agents to:

- Discover SYNTH capabilities.
- Understand repository intent and lifecycle phase.
- Follow governance contracts.
- Execute deterministic workflows.
- Exchange semantic knowledge.
- Produce compliant artifacts.

---

## Core Abstraction — Genesis Protocol

> **The Genesis Protocol is the implementation-independent contract through which any AI agent participates in SYNTH Discovery, Mission creation, and Expedition execution.**

```text
AI Agent
        ↓
Genesis Protocol
        ↓
Repository Metadata
        ↓
SYNTH Lifecycle
        ↓
Discovery / Mission / Expedition
```

The protocol separates agent behavior from SYNTH implementation. A compliant agent does not need to know the internals of Mission Studio, Genesis, or Replay; it only needs to understand the protocol contracts and the semantic metadata exposed by a repository.

---

## Mission

Make SYNTH an open protocol for AI-native software engineering:

- Define the public Genesis Protocol for agent interaction.
- Publish reusable agent skills for common platforms.
- Standardize machine-readable repository metadata under `.synth/ai/`.
- Provide an agent context contract that prevents incorrect assumptions.
- Publish language-agnostic SDKs for protocol parsing and artifact exchange.
- Define multi-agent coordination contracts.
- Certify agent compliance through deterministic test suites.

---

## Program Composition

```text
EXP-PROGRAM-026
AI Agent Interoperability
│
├── EXP-AI-001  Genesis Protocol
│       Architecture Expedition
│       Specify the discovery lifecycle, interaction model, approval
│       boundaries, outputs, and replay semantics.
│
├── EXP-AI-002  Agent Skill Catalog
│       Product Expedition
│       Publish reusable skills with triggers, behavior, inputs, outputs,
│       and stopping conditions.
│
├── EXP-AI-003  Repository Semantic Metadata
│       Architecture Expedition
│       Define lifecycle, governance version, supported protocols,
│       repository classification, and execution policy metadata.
│
├── EXP-AI-004  AI Interaction Manifest
│       Product Expedition
│       Standardize machine-readable interaction guidance: purpose,
│       workflows, prohibited actions, approval requirements, mutation
│       policy, and preferred patterns.
│
├── EXP-AI-005  Interoperability SDK
│       Engineering Expedition
│       Publish language-agnostic SDKs for protocol parsing, discovery
│       execution, artifact exchange, replay consumption, and governance
│       validation.
│
├── EXP-AI-006  Multi-Agent Coordination
│       Architecture Expedition
│       Define contracts for shared context, ownership boundaries,
│       artifact synchronization, approval propagation, and conflict
│       resolution.
│
└── EXP-AI-007  Agent Certification
        Certification Expedition
        Create deterministic suites validating protocol compliance,
        governance compliance, replay determinism, discovery quality,
        and semantic consistency.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Defining the Genesis Protocol | Modifying Protected Assets |
| Publishing agent skills and manifests | Changing Mission or Expedition lifecycle semantics |
| Adding `.synth/ai/` metadata contracts | Changing Genesis or Semantic Modeling semantics |
| Building interoperability SDKs | Bypassing ExecutionGate for mutations |
| Defining multi-agent coordination contracts | Repository-specific agent hard-coding |
| Certifying agent compliance | Commercial platform lock-in as a requirement |

### Hard Constraints

> **Discoverability first:** A compliant agent must recognize a SYNTH repository without repository-specific instructions.
>
> **Behavior over implementation:** Skills describe what an agent should do, not how SYNTH implements it.
>
> **Determinism:** The same repository metadata and protocol version produce the same agent behavior.
>
> **Governance compliance:** Agents must respect approval boundaries and mutation policies expressed in repository metadata.
>
> **Protocol independence:** The Genesis Protocol must not depend on a specific agent platform, IDE, or runtime.

---

## Out of Scope

- Internal governance implementation (Programs 021, 022).
- Mission semantics, Expedition semantics, knowledge modeling, or domain modeling (Programs 022–024).
- Incremental governance performance (Program 021).
- Specific IDE, MCP, or Web client integrations.

This program is concerned solely with exposing existing capabilities through stable interoperability contracts.

---

## Success Criteria

A compliant AI agent should be able to:

- Detect a SYNTH repository automatically.
- Determine whether it is Greenfield, Brownfield, or Hybrid.
- Understand the current lifecycle phase.
- Execute the appropriate Discovery workflow.
- Produce deterministic Discovery artifacts.
- Respect approval boundaries.
- Participate in Mission and Expedition workflows.
- Replay previous decisions.
- Collaborate with other compliant agents.

without requiring repository-specific instructions.

---

## Relationship to Other Work

- **EXP-PROGRAM-022 — Genesis** provides the greenfield/brownfield discovery workflows the protocol exposes.
- **EXP-PROGRAM-023 — Semantic Modeling** provides the intent and domain models agents exchange.
- **EXP-PROGRAM-024 — Canonical Knowledge & Validation** provides the knowledge graph and validation contracts agents consume.
- **EXP-PROGRAM-025 — Incremental Governance** provides the performance foundation for agent-driven validation.
- **EXP-PROGRAM-028 — Repository & Release Governance** governs how agents participate in promotions, pull requests, and releases.
- **EXP-PROGRAM-029 — AI Ecosystem Distribution** projects the Genesis Protocol, skills, and SDK into every major discovery surface.
- **docs/adr/ADR-034-replay-recovery.md** defines recovery primitives agents must respect.
- **docs/adr/ADR-037-shell-safe-command-construction.md** governs how SYNTH emits forge and distribution commands.

---

## Long-Term Vision

Program 026 positions SYNTH not simply as a framework, but as an **open protocol for AI-native software engineering**. Just as Git provides a universal protocol for version control and OpenAPI provides a standard for describing HTTP services, SYNTH should provide a protocol for **intent discovery, governed execution, and replayable software evolution**.

The measure of success is no longer "Can an agent use SYNTH?" but rather:

> **Can any capable AI agent recognize a SYNTH-enabled project, understand its governance model, and participate correctly without prior knowledge of that specific repository?**

That shifts SYNTH from being a methodology into an ecosystem, enabling interoperability across AI assistants, coding agents, IDEs, CI systems, and future autonomous engineering tools.
