# SYNTH Platform

> **Current release:** `@synth-framework/synth@2.4.1` — SYNTH Platform v1.0  
> **Era:** IV — Ecosystem & Adoption  
> **Previous era:** III — Architecture & Release (completed)

---

## What SYNTH is

SYNTH is a deterministic execution system for engineering work.

It turns human intent into a governed, replayable history of events. Every action that changes state flows through a single control boundary, is recorded in an append-only event log, and can be reconstructed through deterministic replay.

In practice, SYNTH is:

- **A governance lifecycle** for missions, expeditions, and decisions.
- **A deterministic runtime** that reconstructs state from events rather than mutating it directly.
- **A CLI** that exposes the entire platform as a stable, machine-readable interface.
- **An SDK** that lets external tools and agents interact with SYNTH without bypassing its guarantees.

---

## What problems it solves

Engineering work is usually recorded in tickets, commits, pull requests, chat threads, and meeting notes. Over time, the relationship between intent, decision, and outcome becomes hard to reconstruct.

SYNTH solves this by making the lifecycle explicit:

| Problem | SYNTH approach |
| --- | --- |
| Decisions are scattered | Every review and acceptance produces a recorded event |
| State is mutated directly | All mutations flow through the ExecutionGate |
| History is hard to audit | Replay reconstructs the exact state from the event log |
| Tools bypass governance | The SDK enforces the same boundary as the CLI |
| Onboarding is tribal | Operator workflows are documented and executable |

---

## Core philosophy

> **Humans explore. SYNTH remembers. AI executes deterministically.**

Three principles shape the platform:

1. **Event-sourced state.** Canonical state is the result of replaying an append-only event log, not the contents of a database.
2. **Single mutation authority.** The ExecutionGate is the only path through which state changes.
3. **Deterministic governance.** The same inputs, in the same order, always produce the same state.

---

## Public vocabulary

SYNTH exposes exactly seven concepts to operators:

- **Mission** — What we want to achieve.
- **Expedition** — A scoped effort that proves or builds part of a mission.
- **Evidence** — Recorded observations that support a decision.
- **Plan** — The proposed path for an expedition.
- **Event** — An immutable record of something that happened.
- **State** — The derived view produced by replaying events.
- **Replay** — The process of reconstructing state from the event log.

Everything else is implementation detail.

---

## Stable architectural pillars (frozen in v1.0)

These components are frozen as of SYNTH Platform v1.0. Changes require a new architectural initiative, not a patch.

| Pillar | Responsibility | Frozen contract |
| --- | --- | --- |
| **Kernel** | Domain logic for missions, expeditions, and work items | Event semantics, state transitions |
| **Event model** | Append-only log of immutable events | Event schemas, ordering guarantees |
| **Replay engine** | Reconstruct state from events | Deterministic output for identical inputs |
| **ExecutionGate** | Single mutation authority | All writes flow through this boundary |
| **Capability registry** | Declared system capabilities | Sealed at platform freeze |
| **Governance lifecycle** | Mission / expedition / review / acceptance flow | ADR-045 lifecycle |
| **SDK** | Public programmatic interface | Stable surface for v1.x |
| **CLI contract** | Stable operator protocol | JSON output schemas, exit codes |

---

## Repository map

```text
src/              TypeScript source
├── core/         Bootstrap and execution context
├── control/      ExecutionGate and mutation authority
├── domain/       Pure domain logic
├── runtime/      Governance and replay runtime
├── infra/        Event store and persistence
├── cli/          Operator interface
├── sdk/          Public programmatic surface
├── discovery/    Repository analysis capabilities
└── capabilities/ Capability definitions

docs/             Governance and reference documentation
├── adr/          Architecture Decision Records
├── expeditions/  Expedition and program charters
├── programs/     Program charters
├── generated/    Deterministic documentation projections
├── certifications/ Release and freeze certificates
└── Era-IV-Roadmap.md  Post-v1.0 portfolio rebaseline

data/             Runtime event log and derived state
proof/            Governance proof artifacts
tests/            Test suites
scripts/          Build, audit, and certification scripts
```

---

## How the eras fit together

| Era | Focus | State |
| --- | --- | --- |
| **I** | Foundation | Completed |
| **II** | Adoption surfaces | Completed |
| **III** | Architecture & Release | Completed — v1.0 released |
| **IV** | Ecosystem & Adoption | Active — planning |

Era III produced the frozen v1.0 platform. Era IV extends that platform through distribution, operator experience, task orchestration, and community growth.

---

## Current release

- **npm:** `@synth-framework/synth@2.4.1`
- **GitHub release:** `v2.4.1`
- **Deprecated:** `v2.4.0` (broken global install)
- **Governance:** Certified and frozen
- **Maintenance policy:** Patch releases only on the `2.4.x` line

---

## Where new contributors should start

1. Read this document.
2. Read the [Operator Guide](operator/01-getting-started.md) for day-to-day workflows.
3. Read [ADR-045](./adr/ADR-045-governance-lifecycle-state-machine.md) for the governance lifecycle.
4. Read [Era III Retrospective](history/ERA-III-RETROSPECTIVE.md) for how v1.0 was reached.
5. Run `synth doctor` in a checkout to verify the environment.
6. Explore `docs/expeditions/` for examples of chartered work.

---

## Era IV direction

Era IV work is organized around five themes. All remain in the **Proposed** state until intentional planning begins.

1. **AI Ecosystem** — MCP server, IDE integrations, AI assistant distribution.
2. **Operator Experience** — Interactive workflows, guided repair, dashboards.
3. **Task Engine** — Canonical orchestration engine for engineering work.
4. **Distribution** — npm, documentation site, examples, templates.
5. **Community & Adoption** — Tutorials, talks, blog posts, contribution experience.

The acceptance criterion for any Era IV program is simple:

> It must increase adoption or reduce operator effort.

---

## Governance note

This document is a product-level overview, not a governance artifact. Changes here describe the platform; they do not change it. Any proposal to modify a frozen pillar must be chartered as a new Era IV architectural program.
