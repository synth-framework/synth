# Synth v2

Synth is a deterministic execution system for engineering work. It turns ideas into approved missions, missions into expeditions, and expeditions into a replayable history of events. State is never edited directly — it is derived from events, and replay proves that the derived state is correct.

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

## Install

```bash
git clone <repository-url>
cd synth-v2
npm install
```

## Quick Start

Run the canonical governance pipeline:

```bash
npm run govern
```

This builds the project, runs the full test suite, verifies replay determinism, runs adversarial audits, and generates a proof artifact in `proof/`.

To explore the operator journey:

```bash
npm run test:operator-journey
```

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
