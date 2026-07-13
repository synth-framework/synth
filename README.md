:warning: **AI operators:** start with [`AGENTS.md`](./AGENTS.md).

# Synth v2

> **Humans explore. SYNTH remembers. AI executes deterministically.**
>
> From an idea to replayable software through **Missions**, **Expeditions**, and **Proof**.

Synth turns human intent into approved Missions, Missions into bounded Expeditions, and every action into an immutable Event. State is never edited directly — it is derived from Events, and Replay proves that the derived State is correct.

## Install

Install globally with npm:

```bash
npm install -g @synth-framework/synth
```

Or run once with npx:

```bash
npx @synth-framework/synth --version
```

For contributors, you can also clone the repository and run `npm install`.

## Quick Start

Initialize a project, create a Mission Draft, and validate:

```bash
synth init --name "My Project"
synth mission create --subject "Adopt SYNTH" --purpose "Make our engineering work replayable"
# review the draft, then approve:
synth mission approve --draft-id <draft-id>
npm run govern
```

For the full operator journey, see [`docs/operator/01-getting-started.md`](docs/operator/01-getting-started.md).

## Why Synth

Engineering teams lose reasoning. Decisions fade, context scatters, and systems drift from their original intent. Synth keeps the reasoning alive by recording every action as an immutable event and making the current state a pure function of that history.

## The Seven Public Concepts

Everything in Synth is explained with seven concepts:

| Concept | Meaning |
|---|---|
| **Mission** | The strategic goal |
| **Expedition** | A bounded investigation or build |
| **Evidence** | What you know and how confidently you know it |
| **Plan** | The approved path forward |
| **Event** | An immutable record that something happened |
| **State** | The current picture, derived from events |
| **Replay** | Rebuilding state from events to prove correctness |

Everything else is implementation detail.

## Documentation

- [Getting Started](docs/getting-started/README.md)
- [Mission Studio Guide](docs/operator/mission-studio-guide.md)
- [Examples Guide](docs/operator/examples-guide.md)
- [Public Architecture](docs/reference/public-architecture.md)
- [Public Vocabulary](docs/reference/public-vocabulary.md)
- [FAQ](docs/operator/12-faq.md)
- [Operator Journey](docs/operator/13-operator-journey.md)

## Governance

Every change must pass:

```bash
npm run govern
```

For the governance model, see [docs/governance.md](docs/governance.md).

## Status

Synth v2 is frozen. The architecture, public vocabulary, and proof classes are stable. The project is now in Era II — Adoption, focused on documentation, examples, and community assets. See [ADR-004 — Synth Eras and Protected Assets](docs/adr/ADR-004-synth-eras-and-protected-assets.md).
