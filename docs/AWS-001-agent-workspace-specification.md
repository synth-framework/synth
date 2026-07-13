# AWS-001 — Agent Workspace Architecture

**Status:** P0 Required
**Audience:** Implementation Agents
**Date:** 2026-06-29
**Version:** 1.0.0
**Depends On:** ASC-001, INTENT-001, SKR-001

---

## Objective

Implement the Agent Workspace as the deterministic entry point for every Synth engineering session.

The Agent Workspace is an orientation subsystem. It establishes repository context before any reasoning, planning, execution, or review. It is interface-independent. All interfaces (CLI, IDE, Web UI, autonomous agents) render the same canonical Workspace Context Model.

---

## Core Principle

> The Agent Workspace shall not become a source of architectural truth. It is a consumer and validator of canonical knowledge. Constitutions, the ubiquitous language, the workspace context model, architectural specifications, and the event history remain the authoritative sources. The Workspace assembles, verifies, and presents that knowledge deterministically, but it must never duplicate or redefine it. This preserves a single source of truth throughout the system and prevents the orientation layer from drifting into an independent architecture.

---

## Deliverables

```
docs/
    AWS-001-agent-workspace-specification.md  ← This document
    AWS-001-workspace-context-model.md        ← Schema specification

.synth/
    workspace.json
    health.json
    context.json
    architecture.json
    language.json
    memory.json
```

---

## Orientation Pipeline

Every session executes the following phases, in order.

| Phase | Method | Description |
|-------|--------|-------------|
| 1 | `getIdentity()` | Repository identity |
| 2 | `getEnvironment()` | Environment readiness |
| 3 | `verifyArchitecture()` | Architecture verification |
| 4 | `verifyLanguage()` | Canonical language verification |
| 5 | `verifySemantics()` | Semantic verification |
| 6 | `getHealth()` | Repository health |
| 7 | `getEngineeringContext()` | Engineering context |
| 8 | `getSuggestedActions()` | Suggested actions |

Each phase must be deterministic. No phase may mutate repository state.

---

## Phase 1: Identity

```
system:      "Synth v2"
version:     "2.0.0"
description: "Deterministic Execution Kernel + Planning Cognition Engine"
layers:      Authority, Mutation, Execution, Truth, Determinism
```

Answers: "What system is this?"

---

## Phase 2: Environment Verification

Verify:

| Check | PASS Criteria | WARN Criteria | FAIL Criteria |
|-------|--------------|---------------|---------------|
| Node.js | version >= 18 | version >= 16 | version < 16 |
| npm | executable found | — | not found |
| Git | executable found | not found | — |
| Dependencies | all in node_modules | some missing | node_modules missing |
| Repository structure | dist/, tests/, docs/ present | some missing | — |
| Workspace permissions | writable | read-only | — |

Overall status: **READY** | **DEGRADED** | **BLOCKED**

---

## Phase 3: Architecture Verification

Verify the following files exist:

| File | Purpose |
|------|---------|
| `docs/guides/agents/constitution.md` | Agent Constitution |
| `docs/README.md` | Knowledge base manifest |
| `docs/architecture/decisions/` | ADR directory |
| `docs/ubiquitous-language.md` | Vocabulary contract |
| `docs/architecture/SKR-001.md` | Knowledge representation |

Report: what, why, result.

---

## Phase 4: Canonical Language Verification

**Vocabulary originates exclusively from `docs/ubiquitous-language.md`.**

The verifier reads the ubiquitous language document at runtime. No hardcoded terminology.

Detect:
- Forbidden terminology in source code
- Projection leakage (tool vocabulary in planning)
- Architecture drift (unapproved terms)
- Vocabulary violations

Uses `CanonicalLanguageAuditor` with data-driven vocabulary.

---

## Phase 5: Semantic Verification

Verify architectural meaning. The semantic verifier checks:

| Assertion | Invariant |
|-----------|-----------|
| Capabilities operate only on canonical entities | KI-001 |
| Events are replayable | Determinism |
| Entities have documented lifecycles | State model |
| Planning is independent of infrastructure | KI-004 |
| Projections originate from canonical knowledge | KI-003 |
| Knowledge layer defines ubiquitous language | KI-008 |
| Execution vocabulary remains below planning | KI-002 |

Results: each assertion PASS / FAIL with explanation.

---

## Phase 6: Repository Health

Health dimensions:

| Dimension | Checks |
|-----------|--------|
| Runtime | Event log valid, Replay deterministic, Policies loaded |
| Architecture | Constitution, Knowledge base, ADRs, Ubiquitous language, SKR spec |
| Knowledge | Node type compliance, Relationship compliance |
| Documentation | Philosophy docs, Architecture docs, Operator docs |
| Quality | Tests directory, Kernel source present, No forbidden imports |
| Workspace | .synth directory |

Each reports: **PASS** | **WARN** | **FAIL**

---

## Phase 7: Engineering Context

Expose canonical engineering knowledge from the event-derived state:

```
Mission[]
Expedition[]
Objective[]
Discovery[]
Decision[]
WorkItem[]
Event count
```

Never infer context from Git alone.

Absence of data is valid — zero items is a valid state.

---

## Phase 8: Suggested Actions

Generate deterministic recommendations from repository state:

| Condition | Action |
|-----------|--------|
| Active expedition exists | Continue Expedition |
| No active expedition | Chart New Expedition |
| Architecture documents present | Review Architecture |
| Discoveries recorded | Inspect Discoveries |
| Health check available | Run Health Audit |

Suggestions are recommendations, not commands.

---

## Machine Interface

The Workspace Context Model is canonical. Renderings are projections.

Required descriptors:

| File | Content |
|------|---------|
| `workspace.json` | Full workspace descriptor (all phases) |
| `health.json` | Repository health report |
| `context.json` | Engineering context (missions, expeditions, etc.) |
| `architecture.json` | Architecture verification results |
| `language.json` | Canonical language verification results |
| `memory.json` | Session memory (orientation history) |

All interfaces consume these descriptors. No interface computes state independently.

Schema: See `AWS-001-workspace-context-model.md`.

---

## Determinism

Identical repositories produce identical workspace descriptors. No nondeterministic data unless explicitly observational (timestamps, process IDs).

---

## Governance

Orientation may block engineering work when:

| Condition | Block Level |
|-----------|-------------|
| Constitution invalid | BLOCK |
| Canonical language violated | WARN |
| Semantic integrity fails | BLOCK |
| Replay nondeterministic | BLOCK |
| Repository corrupted | BLOCK |

A block prevents mutation operations. Warnings permit operations but must be reported.

---

## Governance Principle

> The Agent Workspace is the operating system's boot sequence, not its kernel.

It validates truth. It does not create it.

---

## Success Criteria

- [ ] Every session begins with deterministic orientation
- [ ] Workspace descriptors are generated (all 6 files)
- [ ] CLI renders descriptors rather than computing state independently
- [ ] Canonical language verification executes (data-driven from ubiquitous-language.md)
- [ ] Semantic verification executes
- [ ] Repository health executes (actual filesystem checks)
- [ ] Orientation is interface-independent
- [ ] All existing tests pass
- [ ] New tests cover the orientation pipeline (phases 3-5)
- [ ] Architecture verification checks 5 files
- [ ] Language verification reads from ubiquitous language document
- [ ] Semantic verification checks 7 architectural assertions

---

## Companion Documents

| Document | Purpose |
|----------|---------|
| `AWS-001-workspace-context-model.md` | Schema for all 6 `.json` descriptors |
| `ubiquitous-language.md` | Vocabulary contract (source of truth) |
| `SKR-001.md` | Knowledge representation (source of truth) |
| `INTENT-001.md` | Execution as implementation of intent |

---

*Document: AWS-001*
*Status: P0 Required*
*Version: 1.0.0*
