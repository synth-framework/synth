:warning: **AI operators:** start with [`AGENTS.md`](./AGENTS.md).

# Synth v2

> **Humans explore. SYNTH remembers. AI executes deterministically.**
>
> From an idea to replayable software through **Missions**, **Expeditions**, and **Proof**.

[![npm version](https://img.shields.io/npm/v/@synth-framework/synth)](https://www.npmjs.com/package/@synth-framework/synth)
[![Proof Gate](https://github.com/synth-framework/synth/actions/workflows/proof.yml/badge.svg)](https://github.com/synth-framework/synth/actions/workflows/proof.yml)
[![Documentation](https://img.shields.io/badge/docs-website-blue)](https://synth-framework.github.io/synth/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Synth turns human intent into approved Missions, breaks Missions into bounded Expeditions, and records every action as an immutable Event. State is never edited directly — it is derived from Events, and Replay proves that the derived State is correct.

The result is deterministic, auditable engineering work that humans guide and AI executes.

---

## Install

Install the Synth CLI with the bootstrap installer:

```bash
curl -fsSL https://synth-framework.github.io/synth/install.sh | sh
```

Or install from npm:

```bash
npm install -g @synth-framework/synth
```

Or run it once without installing:

```bash
npx @synth-framework/synth --version
```

Verify the installation:

```bash
synth doctor
```

For contributors, see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the repository-based setup.

---

## 60-second demo

Initialize a project, create a Mission Draft, and validate your work:

```bash
synth init --name "My Project"
synth mission create --subject "Adopt SYNTH" --purpose "Make our engineering work replayable"
# review the draft, then approve:
synth mission approve --draft-id <draft-id>
synth validate
npm run govern
synth explain replay
```

- `synth mission create` produces a Draft with confidence, unknowns, and proposals.
- `synth mission approve` turns the Draft into an approved Mission.
- `synth validate` runs only the checks affected by your change.
- `npm run govern` produces the canonical proof that everything is healthy.
- `synth explain replay` verifies that the current state is consistent with its event history.
- `synth explain all` inspects the aggregate graph, snapshot lineage, and replay diagnostics in one read-only command (add `--log <path>` for any example or project, `--json` for machine output; subcommands: `lineage`, `proposals`, `snapshots`, `graph`, `diagnostics`, `status`).

---

## Quick-start demo

> **Media placeholder.** A 90-second walkthrough of the install → Mission Draft → approval → `synth validate` → `npm run govern` flow will be inserted here.

---

## AI operators

If you are an AI coding assistant, read [`AGENTS.md`](./AGENTS.md) before making any changes. It defines the operator contract for working inside a Synth repository, including how to handle Missions, Expeditions, validation, and governance.

---

## Why Synth

Engineering teams lose reasoning. Decisions fade, context scatters, and systems drift from their original intent. Synth keeps the reasoning alive by recording every action as an immutable Event and making the current State a pure function of that history.

For teams working with AI agents, Synth provides a shared boundary:

- Humans express intent.
- AI gathers evidence and proposes work.
- Synth records decisions and proves the resulting state.

---

## The seven public concepts

Everything in Synth is explained with seven concepts. Everything else is implementation detail.

| Concept | Meaning |
|---|---|
| **Mission** | The strategic goal you are working toward |
| **Expedition** | A bounded investigation or build that moves the Mission forward |
| **Evidence** | What you know and how confidently you know it |
| **Plan** | The approved path forward, ready to execute |
| **Event** | An immutable record that something happened |
| **State** | The current picture, derived from Events |
| **Replay** | Rebuilding State from Events to prove correctness |

---

## Documentation

- [Quick Start](docs/getting-started/README.md) — Install and run your first Mission in five minutes
- [Getting Started](docs/operator/01-getting-started.md) — Learn the public concepts through the CLI
- [Your First Expedition](docs/operator/02-your-first-expedition.md) — Plan and execute your first piece of work
- [Mission Studio Guide](docs/operator/mission-studio-guide.md) — Chart and approve Missions
- [Examples Guide](docs/operator/examples-guide.md) — Run certified example projects
- [Operator Journey](docs/operator/13-operator-journey.md) — See the complete end-to-end flow
- [Public Architecture](docs/reference/public-architecture.md) — How Synth works under the hood
- [Public Vocabulary](docs/reference/public-vocabulary.md) — The seven public concepts in depth
- [FAQ](docs/operator/12-faq.md) — Common questions

---

## Example gallery

Certified example projects live in [`examples/`](examples/README.md). Each one is a standalone Synth repository with its own Mission, documentation, and proof artifacts.

| Example | What it demonstrates |
|---|---|
| [`todo/`](examples/todo/) | Minimal task-tracking application |
| [`blog/`](examples/blog/) | Content-driven web application |
| [`crm/`](examples/crm/) | Customer relationship management backend |
| [`legacy-node/`](examples/legacy-node/) | Legacy Node.js application with migration path |
| [`polyglot/`](examples/polyglot/) | Multi-language repository |
| [`monolith/`](examples/monolith/) | Large monolithic application |

Every example supports `npm run govern` from within its own directory.

---

## Governance

Every change must pass the canonical governance pipeline:

```bash
npm run govern
```

This builds the project, runs the full test suite, verifies Replay consistency, runs adversarial architecture audits, and generates a proof artifact in `proof/`.

For the governance model, see [`docs/governance.md`](docs/governance.md).

---

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow, [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community standards, and [`SECURITY.md`](SECURITY.md) for reporting vulnerabilities.

AI contributors should start with [`AGENTS.md`](AGENTS.md) before making any changes.

---

## Status

Synth v2 is frozen. The architecture, public vocabulary, and proof classes are stable. The project is now in Era II — Adoption, focused on documentation, examples, and community assets. See [ADR-004 — Synth Eras and Protected Assets](docs/adr/ADR-004-synth-eras-and-protected-assets.md).
