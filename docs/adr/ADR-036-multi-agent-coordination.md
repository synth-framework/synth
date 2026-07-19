# ADR-036 — Multi-Agent Coordination Contracts

**Status:** Accepted  
**Date:** 2026-07-19  
**Deciders:** EXP-AI-006  
**Authority:** EXP-PROGRAM-026 — AI Agent Interoperability  

---

## Context

As SYNTH adoption grows, multiple AI agents may collaborate on the same repository. Each agent may specialize in a different domain: discovery, domain modeling, implementation, verification. Without coordination contracts, agents risk producing conflicting artifacts, duplicating work, or bypassing each other's governance boundaries.

## Decision

We will coordinate multiple agents through SYNTH itself rather than through a separate coordination service.

The coordination model is:

```text
Shared Context  →  Ownership Boundaries  →  Artifact Synchronization  →  Approval Propagation  →  Conflict Resolution
```

All coordination decisions are replayable because they are either SYNTH events or recorded as Decision artifacts.

## Consequences

### Positive

- Agents do not need a custom communication channel.
- Coordination state is governed by the same lifecycle as the rest of the project.
- Conflicts are surfaced to the operator rather than hidden.
- New agents can join by reading `.synth/ai/` metadata and replay.

### Negative

- Agents must refresh context frequently, which adds CLI calls.
- Ownership is advisory; enforcement relies on governance discipline.
- Conflict resolution is manual unless proposals are strict supersets.

## Alternatives Considered

- **Central coordinator service.** Rejected because it would introduce a new runtime dependency and violate SYNTH's deterministic, event-driven model.
- **Agent-to-agent direct messages.** Rejected because they would not be replayable or governable.

## Compliance

A compliant agent:

1. Refreshes shared context before acting.
2. Declares ownership for the domain it mutates.
3. Verifies active Mission and Expedition before mutations.
4. Escalates conflicts to the operator.
5. Records coordination decisions in the event log.
