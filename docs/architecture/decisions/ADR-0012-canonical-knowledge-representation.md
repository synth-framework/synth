# ADR-0012: Canonical Knowledge Representation (SKR)

**Status:** Accepted
**Date:** 2026-06-28
**Author:** Synth Architecture Team
**Supersedes:** Synth IR v1

---

## Context

The Synth platform has evolved from a task-tracking system into a full engineering operating system with planning, execution, governance, and projection layers. The original Synth IR specification mixed implementation concepts (Agents, Tools, Capabilities, Workflows) with canonical engineering concepts (Missions, Expeditions, Objectives).

As the architecture matured through ASC-001 (Ticket → WorkItem consolidation) and INTENT-001 (Execution is implementation of intent), it became clear that knowledge representation needed to be formally separated from execution concerns.

## Decision

Adopt the **Synth Knowledge Representation (SKR)** as the canonical format for engineering knowledge, formally separating it from execution, planning, and projection concerns.

### Canonical Node Types

```
Mission, Expedition, Objective, WorkItem,
Discovery, Decision, Artifact, Observation, Constraint
```

### Forbidden in Canonical Knowledge

```
Agent, Tool, Workflow, Capability, Runtime, Protocol,
Server, Adapter, Plugin, Transport, MCP, A2A,
GitHub, Jira, Linear
```

## Consequences

### Positive

- Engineering knowledge becomes independent of execution mechanisms
- Planning layer reasons only about engineering concepts, not implementation
- Projection adapters can evolve without affecting canonical knowledge
- The ubiquitous language is formally enforced at the knowledge layer

### Negative

- Requires migration from Synth IR v1 (superseded)
- Requires audit tooling to detect vocabulary leakage
- Requires conformance tests for SKR compliance

## Compliance

The CanonicalLanguageAuditor (WCE-001) is extended with SKR audit capability to enforce this ADR.

## Related Decisions

- [ADR-0011](ADR-0011-planning-cognition-engine.md) — Planning Cognition Engine
- ASC-001 — Ticket → WorkItem consolidation
- INTENT-001 — Execution is implementation of intent

---

*ADR-0012: Canonical Knowledge Representation*
