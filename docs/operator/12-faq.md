---
Title: Frequently Asked Questions
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md
Knowledge Establishes: Answers to common questions about operating Synth systems
Depends On: 01-getting-started.md
Builds Toward: none (terminal document)
Version: 1.0.0
Status: stable
---

# Frequently Asked Questions

## General

**Q: What is Synth?**
A: Synth is a deterministic execution system for engineering work. It treats engineering as a discipline of knowledge, not just implementation.

**Q: Who should use Synth?**
A: Teams that want to preserve engineering knowledge, maintain audit trails, and operate deterministically.

**Q: Is Synth a project management tool?**
A: No. Synth is a foundation. Project management tools can be built on top of it.

## Operations

**Q: How do I create a work item?**
A: Work items are created through expedition objectives. First chart an expedition in Mission Studio, then approve the plan. Objectives become work items in execution. See [Your First Expedition](02-your-first-expedition.md).

**Q: What happens if my intent is rejected?**
A: The API returns an error with a reason. Common causes: policy violation, validation failure, or invariant violation.

**Q: Can I modify an event after it is written?**
A: No. Events are immutable. This is by design.

**Q: How do I fix a mistake?**
A: Create a correcting event. The original event remains, but the new event updates the state.

**Q: What does it mean that Synth v2 is frozen?**
A: The public concepts, proof classes, and execution rules are stable. No new architectural concepts can be introduced without an approved Expedition and ADR.

**Q: Can I change a public concept?**
A: No. The seven public concepts (Mission, Expedition, Evidence, Plan, Event, State, Replay) are part of the public contract.

## Expeditions

**Q: When should I create an expedition vs a work item?**
A: Create an expedition for bounded engineering objectives with uncertainty. Use work items for well-understood, routine tasks that need tracking but not planning.

**Q: How many objectives should an expedition have?**
A: 2-5 is ideal. More than 5 suggests the expedition should be split.

**Q: Can I change objectives after an expedition starts?**
A: Objectives themselves don't change (immutability). You can add new objectives or complete existing ones.

**Q: What is a side quest?**
A: A temporary objective that emerges during an expedition. See [Side Quests](07-sidequests.md).

**Q: How do I know if my expedition is going well?**
A: Check the confidence score, not just completion. See [Progress and Confidence](08-progress-and-confidence.md).

## Discoveries and Decisions

**Q: What is a discovery?**
A: Newly learned architectural knowledge. See [Reviewing Discoveries](05-reviewing-discoveries.md).

**Q: What is a decision?**
A: A chosen architectural direction. See [Approving Decisions](06-approving-decisions.md).

**Q: Should every decision be an ADR?**
A: No. Only decisions with architectural significance (multiple alternatives, significant consequences) become ADRs.

**Q: Can I reject a decision after accepting it?**
A: Decisions are immutable. You can make a new decision that supersedes the old one.

## Technical

**Q: How does replay work?**
A: Synth rebuilds state by applying every event in order. See [Replay](09-replay.md).

**Q: What if the event log is corrupted?**
A: Chain hashing detects corruption. See [Recovery](10-recovery.md).

**Q: Can I backup Synth?**
A: Backup the event log. State can always be reconstructed.

**Q: How do I verify system integrity?**
A: Run the replay verifier. See [Replay](09-replay.md).

**Q: What are invariants?**
A: Executable architectural rules. When they fail, something is seriously wrong.

## Agents

**Q: Can AI agents operate Synth?**
A: Yes. Agents use the same API as human operators. See [Agent Constitution](../guides/agents/constitution.md).

**Q: Do agents have special privileges?**
A: No. All participants are subject to the same governance.

**Q: How do agents plan expeditions?**
A: Agents use the same planning API as human operators. See [Agent Handbook](../guides/agents/handbook.md).

## Related Documents

- [Getting Started](01-getting-started.md) — First steps
- [Best Practices](11-best-practices.md) — Operational wisdom

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
