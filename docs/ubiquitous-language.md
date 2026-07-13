# Ubiquitous Language

## Status: Governance Document
## Classification: Architectural Constitution — Level 2
## Date: 2026-06-28
## Version: 1.0.0

---

## Hierarchy

```
Architectural Constitution
        ↓
Ubiquitous Language  ← YOU ARE HERE
        ↓
Agent Constitution
        ↓
Knowledge Base
        ↓
Implementation
```

No lower document may contradict this one.

---

## Purpose

This document defines the single vocabulary contract for Synth. Every future contributor — human or agent — must use these terms consistently.

The ubiquitous language prevents architectural drift. When everyone uses the same words for the same concepts, the system maintains coherent conceptual identity across all layers.

---

## Planning Layer

Terms that describe what the system plans.

| Term | Definition | Forbidden Aliases |
|------|-----------|-------------------|
| **Mission** | Long-term strategic direction for the engineering system | project, program, initiative |
| **Expedition** | A bounded engineering objective with a clear goal | sprint, iteration, phase, cycle |
| **Objective** | A specific, measurable outcome within an expedition | task, story, ticket, issue |
| **Discovery** | Newly learned architectural knowledge recorded during work | finding, note, observation |
| **Decision** | A chosen architectural direction with documented reasoning | choice, call, selection |
| **Side Quest** | A temporary objective that emerges during an expedition | tangent, spike, follow-up |
| **Planning Cognition Engine (PCE)** | The subsystem that resolves uncertainty before committing to action | planner, orchestrator, coordinator |
| **Engineering Intent** | What the engineer wants the system to do | command, request, prompt |

## Execution Layer

Terms that describe what the system executes.

| Term | Definition | Forbidden Aliases |
|------|-----------|-------------------|
| **Work Item** | The canonical execution entity — a trackable unit of work | ticket, issue, task, card |
| **Event** | An immutable record of something that happened | log entry, record, row |
| **Capability** | The smallest executable operation in the system | command, action, function, operation |
| **Intent** | An engineering request that the system interprets and executes | command, request, capability call |
| **Execution Plan** | A sequence of capability invocations derived from an intent | script, batch, workflow |
| **Execution Primitive** | A single, indivisible operation the runtime can perform | instruction, bytecode, micro-op |
| **Runtime Engine** | The pure, deterministic execution subsystem | executor, processor, runner |
| **CommandBus** | The single mutation authority for all state changes | bus, dispatcher, router |

## Governance Layer

Terms that describe how the system enforces rules.

| Term | Definition | Forbidden Aliases |
|------|-----------|-------------------|
| **Policy** | An executable rule evaluated on every mutation attempt | rule, check, guard |
| **Invariant** | A structural assertion that must always be true | constraint, check, assertion |
| **Seal** | The irreversible transition from bootstrap to operational mode | lock, freeze, finalize |
| **Permit** | Cryptographic authorization for a mutation attempt | token, pass, signature |
| **Attestation** | Cryptographic proof that a policy decision was made | proof, signature, stamp |
| **Genesis** | The initialization phase that creates the system's first state | bootstrap, init, setup |

## Infrastructure Layer

Terms that describe the system's foundation.

| Term | Definition | Forbidden Aliases |
|------|-----------|-------------------|
| **Event Store** | The append-only log of all events | database, log, journal |
| **State Store** | The derived state computed from the event log | cache, snapshot, database |
| **Replay** | Reconstructing state by applying all events in order | rebuild, restore, recompute |
| **Determinism** | The guarantee that the same events always produce the same state | consistency, idempotency |
| **Chain Hash** | The cryptographic link between consecutive events | hash chain, link, fingerprint |
| **Partition** | A sharded segment of the event log | shard, segment, slice |

## Projection Layer

Terms that describe how the system connects to external tools.

| Term | Definition | Forbidden Aliases |
|------|-----------|-------------------|
| **Projection** | A rendered view of canonical state for an external tool | export, sync, integration |
| **Execution Artifact Adapter** | Maps canonical work items to external artifact formats | adapter, connector, bridge |
| **Artifact Independence** | The principle that planning is independent of execution tools | tool-agnostic, portable |

## Workspace Layer

Terms that describe the agent orientation environment.

| Term | Definition | Forbidden Aliases |
|------|-----------|-------------------|
| **Workspace** | The deterministic orientation layer for every engineering session | environment, context, shell |
| **Orientation** | The fixed-sequence process of understanding the current system state | discovery, exploration, scanning |
| **Health** | The measured status of repository, runtime, and architecture | status, state, condition |
| **Confidence** | The estimated certainty that an expedition will succeed | probability, score, metric |
| **Suggested Action** | A recommended engineering activity based on current context | command, suggestion, hint |

---

## Forbidden Terms

These terms may not appear in architectural documentation, planning documents, or the cognition layer. They are execution-layer concepts only.

| Forbidden Term | Replacement | Reason |
|---------------|-------------|--------|
| Ticket | Work Item | Ticket is a specific tracker's vocabulary (Jira, GitHub) |
| Sprint | Expedition | Sprint is a Scrum term; Expedition is model-agnostic |
| Story | Objective | Story is a Scrum term; Objective is model-agnostic |
| Epic | Objective (parent) | Epic is a Jira term; Objective is model-agnostic |
| Task | Work Item | Task is overloaded; Work Item is precise |
| Command | Intent | Command implies imperative; Intent implies interpretation |
| Script | Execution Plan | Script is code; Execution Plan is architecture |

---

## Audit Rules

The following rules are enforced by the Canonical Language Auditor:

1. **Planning documents must use Planning Layer terms only.**
2. **Execution documents must use Execution Layer terms for execution, Planning Layer terms for planning.**
3. **Architecture documents must not use Projection Layer terms.**
4. **Governance documents must use Governance Layer terms consistently.**
5. **Forbidden terms may appear only in migration reports, historical ADRs, and compatibility documentation.**

---

## Cross-Reference

| Domain | Canonical Documents |
|--------|-------------------|
| Philosophy | `philosophy/*.md` |
| Planning | `agents/constitution.md`, `agents/handbook.md` |
| Execution | `developer/*.md`, `reference/*.md` |
| Governance | `architecture/decisions/*.md`, `docs/architecture/constitution.md` |
| Workspace | `INTENT-001.md`, `WCE-001.md` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial — consolidated from ASC-001, INTENT-001, and terminology audits |

---

*This document is the vocabulary contract for Synth. All contributors must use these terms consistently.*
