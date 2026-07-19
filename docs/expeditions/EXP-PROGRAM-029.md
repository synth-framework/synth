# EXP-PROGRAM-029 — AI Ecosystem Distribution

**Status:** Completed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Distribution of SYNTH capabilities across AI models, agents, IDEs, repositories, package managers, forges, and humans  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **A protocol is only valuable if it is discoverable. SYNTH should be distributed through the channels where AI agents, developers, IDEs, and repositories naturally look for capabilities, enabling adoption without requiring prior knowledge of SYNTH.**

Programs 022–024 establish how intent becomes governed knowledge and validated execution. Program 026 defines the open interoperability layer and the Genesis Protocol. Program 028 governs repository evolution. Program 029 completes the ecosystem story by projecting SYNTH into every discovery surface: agent skills, IDE rules, package managers, forges, MCP servers, websites, documentation, and educational content.

The objective is to make SYNTH **findable and usable** wherever AI-native engineering work happens.

---

## Purpose

Create a canonical distribution strategy that enables SYNTH to:

- Project one canonical AI Capability Model into platform-specific skills and rules.
- Publish protocol specifications in language-neutral formats.
- Distribute SDKs and packages through npm, PyPI, and future registries.
- Provide an MCP server exposing SYNTH capabilities to MCP clients.
- Publish GitHub templates, Actions, and starter repositories.
- Make the website an interactive Genesis onboarding surface.
- Produce audience-specific documentation and educational content.
- Ensure every discovery surface answers a distinct adoption question.

---

## Core Abstraction — Canonical Projection

> **Maintain exactly one AI Capability Model. Every skill, rules file, MCP manifest, IDE extension, website page, and documentation section is a generated projection.**

```text
AI Capability Model
        ↓
├── Genesis Protocol Spec
├── Agent Skills (ChatGPT, Claude, Gemini, Codex)
├── IDE Rules (Cursor, Cline, Windsurf, Roo, Aider, Continue.dev)
├── MCP Server Manifest
├── npm / PyPI / crates.io Packages
├── GitHub Templates and Actions
├── Website
├── Documentation
└── Educational Content
```

This is consistent with the philosophy of Programs 022–028: **one canonical source of truth with many projections**. It prevents configuration drift and lets SYNTH evolve its interoperability story without maintaining dozens of platform-specific artifacts by hand.

---

## Distribution Layers

### Layer 1 — Protocol Specifications

Language-neutral, vendor-independent specifications:

- Genesis Protocol
- Semantic Modeling Protocol
- Repository Protocol
- Replay Protocol

Comparable to OpenAPI, Git, or MCP.

### Layer 2 — Agent Skills

Platform-specific projections of the Agent Skill Catalog from EXP-AI-002:

- ChatGPT Custom Skill / Custom GPT / Knowledge Pack
- Claude Skill / System Prompt
- Gemini Gem / Instructions
- Codex Repository Instructions
- Cursor `.cursor/rules`
- Windsurf Rules
- Cline Rules
- Roo Rules
- Aider Instructions
- Continue.dev Configuration

### Layer 3 — Package Managers

How developers and package-aware agents discover SYNTH:

- npm: `@synth-framework/genesis`, `@synth-framework/discovery`, `@synth-framework/agent-sdk`, `@synth-framework/protocol`
- PyPI: `synth-genesis`, `synth-sdk`
- Future: crates.io, NuGet

### Layer 4 — GitHub

Repository templates, issue/PR templates, Actions, starter repositories, and examples.

### Layer 5 — MCP Server

A live SYNTH MCP Server exposing:

- Discovery
- Mission
- Expedition
- Replay
- Knowledge
- Governance
- Documentation
- Architecture

### Layer 6 — Website

Interactive Genesis onboarding, not just documentation.

### Layer 7 — Documentation

Audience-specific projections:

- Operators
- AI Agents
- Plugin Authors
- Repository Maintainers
- Enterprise
- Researchers

### Layer 8 — Educational Content

Architecture papers, ADRs, walkthroughs, replay examples, design docs, certification guides.

### Layer 9 — Marketplaces

Future distribution through VS Code Marketplace, JetBrains Marketplace, Open VSX, GitHub Marketplace.

### Layer 10 — Package Metadata

Every package advertises keywords, homepage, repository, documentation, examples, AI tags, protocol version, and compatible skills.

---

## Discovery Surfaces

| Surface | Audience | Goal |
| --- | --- | --- |
| synth.run | Humans & AI | Experience Genesis |
| GitHub | Developers & coding agents | Evaluate, clone, contribute |
| npm / PyPI | Developers & package-aware agents | Install libraries and SDKs |
| MCP Registry | AI clients | Connect to live capabilities |
| IDE marketplaces | Developers | Integrate with daily workflow |
| Documentation | Humans & retrieval systems | Learn concepts and APIs |
| Repository metadata | AI agents | Understand project semantics |
| Skills / rules | Coding agents | Execute correct workflows |
| Example repositories | Humans & AI | Learn by concrete examples |
| Academic/technical papers | Architects & researchers | Understand underlying model |

Each surface answers a different question. The homepage answers "What is SYNTH?", the MCP server answers "What can I invoke?", repository metadata answers "How should I behave here?", and IDE extensions answer "How do I use this while I work?"

---

## Program Composition

```text
EXP-PROGRAM-029
AI Ecosystem Distribution
│
├── EXP-DIST-001  Canonical AI Capability Model
│       Architecture Expedition
│       Define the single source of truth from which all skills,
│       rules, manifests, and documentation are projected.
│
├── EXP-DIST-002  Agent Skill Projection Pipeline
│       Product Expedition
│       Generate platform-specific skills from the Capability Model.
│
├── EXP-DIST-003  MCP Server
│       Engineering Expedition
│       Expose SYNTH capabilities through the Model Context Protocol.
│
├── EXP-DIST-004  npm Package Distribution
│       Engineering Expedition
│       Publish and version SYNTH SDKs and protocol packages on npm.
│
├── EXP-DIST-005  IDE Rules Projection
│       Product Expedition
│       Generate Cursor, Cline, Windsurf, Roo, Aider, and Continue.dev rules.
│
├── EXP-DIST-006  GitHub Templates and Actions
│       Product Expedition
│       Publish repository templates, issue/PR templates, and Actions.
│
└── EXP-DIST-007  Website as Discovery Surface
        Product Expedition
        Transform the homepage into an interactive Genesis experience.
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
| Defining the Canonical AI Capability Model | Modifying Protected Assets |
| Projecting skills and rules from the model | Hardcoding platform logic into SYNTH core |
| Publishing packages, MCP servers, and templates | Changing Mission or Expedition lifecycle semantics |
| Generating documentation from canonical knowledge | Repository-specific hard-coding |
| Distributing through neutral protocols | Locking distribution to a single vendor |

### Hard Constraints

> **Canonical projection:** Every distributed artifact must be derivable from the Canonical AI Capability Model.
>
> **Protocol independence:** Distribution must not depend on a single agent platform, IDE, or forge.
>
> **Determinism:** The same Capability Model version produces the same projections.
>
> **Governance compliance:** Distributed skills and rules must respect SYNTH approval boundaries and mutation policies.
>
> **Shell safety:** All generated distribution commands follow ADR-037.

---

## Out of Scope

- Internal governance implementation (Programs 021, 022).
- Mission semantics, Expedition semantics, knowledge modeling (Programs 022–024).
- Genesis Protocol specification (Program 026).
- Repository and release governance (Program 028).

This program is concerned solely with distributing existing capabilities through stable, discoverable channels.

---

## Success Criteria

A user or agent should be able to discover SYNTH through at least three independent surfaces (e.g., npm, MCP, GitHub) and receive semantically equivalent guidance from the same Capability Model.

---

## Relationship to Other Work

- **EXP-PROGRAM-026 — AI Agent Interoperability** provides the Genesis Protocol, Skill Catalog, SDK, and repository metadata that this program distributes.
- **EXP-PROGRAM-028 — Repository & Release Governance** governs how distributed artifacts are promoted, released, and published through forge adapters.
- **ADR-037 — Shell-Safe Command Construction** governs how SYNTH emits distribution and forge commands.
