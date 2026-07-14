---
Title: Getting Started
Domain: operator
Audience: operators
Prerequisites: none
Knowledge Establishes: How to interact with a Synth system for the first time
Depends On: philosophy/00-introduction.md
Builds Toward: 02-your-first-expedition.md, 03-understanding-genesis.md
Version: 2.0.0
Status: stable
---

# Getting Started with Synth

## What You Need to Know First

Synth is a system for doing engineering work with a permanent, replayable history. You interact with it by asking for actions through the CLI. A request says what you want to do. Synth checks it against the approved Plan, executes it if allowed, and records what happened as an Event.

You do not edit State directly. You request actions. Synth handles the rest.

For the seven public concepts that explain Synth, see the [Public Vocabulary](../reference/public-vocabulary.md).

## Install and Initialize

Install the CLI from npm:

```bash
npm install -g @synth-framework/synth
```

Initialize a project:

```bash
synth init --name "My Project"
```

This creates the project manifest and the data directory where Events are recorded.

## Your First Interaction

The most common first interaction is creating a Mission:

```bash
synth mission create --subject "Adopt Synth" --purpose "Make our engineering work replayable"
```

Synth returns a Mission Draft with confidence, unknowns, questions, and proposals. Review them. If you are satisfied, approve the Draft:

```bash
synth mission approve --draft-id <draft-id>
```

Approval emits an Event. The current State is now derived from that Event.

To validate your work locally:

```bash
synth validate
```

To run the full governance pipeline and generate a proof:

```bash
npm run govern
```

To verify that the current State is consistent with its Event history:

```bash
synth explain replay
```

## Key Concepts for Operators

| Concept | What It Means |
|---------|---------------|
| **Mission** | The strategic goal you are working toward |
| **Expedition** | A bounded piece of work that moves the Mission forward |
| **Evidence** | What you know and how confidently you know it |
| **Plan** | The approved path forward, including the work to do |
| **Event** | An immutable record that something happened |
| **State** | The current picture of the world, derived from Events |
| **Replay** | Rebuilding State from Events to prove correctness |

## Checking System Status

To see the current State:

```bash
synth status
```

This reports the event count, state hash, and counts of Missions, Expeditions, Objectives, and Work Items.

To verify consistency:

```bash
synth explain replay
```

A consistent result means the State is valid.

## Common Workflows

### Create a Mission

```bash
synth mission create --subject "Platform Build" --purpose "Build the core platform"
```

### Approve a Mission

```bash
synth mission approve --draft-id <draft-id>
```

### Create an Expedition

```bash
synth expedition create --mission "Platform Build" --subject "Design data model" --goal "Define the domain model"
```

### Validate changes

```bash
synth validate
```

### Run governance

```bash
npm run govern
```

## What Happens When Things Go Wrong

If a request is rejected, Synth returns a structured response with a reason. Common reasons:

- **Mission Studio rejected approval** — The Draft lacks sufficient evidence. Review the `unknowns` and `questions`, add more evidence, and create a new Draft.
- **Validation failed** — A check in `synth validate` or `npm run govern` did not pass. Fix the issue and run the command again.
- **Replay is inconsistent** — The State does not match the Event history. Do not edit Events or State by hand. Use `synth explain replay` to diagnose and ask for guidance.

## Next Steps

Now that you understand the basics, learn to plan work through Synth:

→ [Your First Expedition](02-your-first-expedition.md)

## Related Documents

- [Operator Journey](13-operator-journey.md) — The complete end-to-end journey
- [Your First Expedition](02-your-first-expedition.md) — Planning and executing work
- [Understanding Genesis](03-understanding-genesis.md) — How systems are initialized
- [FAQ](12-faq.md) — Common questions
- [Public Vocabulary](../reference/public-vocabulary.md) — The seven public concepts

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-07-12 | Rewrote using public vocabulary |
| 1.0.0 | 2026-06-28 | Initial stable release |
