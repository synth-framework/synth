---
Title: Quick Start
Domain: getting-started
Audience: operators
Prerequisites: none
Knowledge Establishes: How to install Synth and run the governance pipeline for the first time
Depends On: none
Builds Toward: operator/01-getting-started.md, operator/02-your-first-expedition.md
Version: 2.0.0
Status: stable
---

# Quick Start

Synth is a deterministic execution system for engineering work. It turns ideas into approved missions, missions into expeditions, and expeditions into a replayable history of events.

This guide takes you from zero to a passing governance run in under five minutes.

## Install

Install the Synth CLI globally from npm:

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

If you are contributing to Synth itself, clone the repository and run `npm install` instead. See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Run the Governance Pipeline

```bash
npm run govern
```

This command:

1. Builds the TypeScript source.
2. Runs the full test suite.
3. Verifies replay consistency.
4. Runs adversarial architecture audits.
5. Generates a proof artifact in `proof/`.

A successful run ends with `✅ PROOF ACCEPTED` and a new file in `proof/`.

## What Just Happened

`npm run govern` is the canonical way to prove that a Synth system is healthy. The proof artifact it produces is a snapshot of structural, replay, determinism, and adversarial checks. Keep it as evidence that the system passed governance.

## Next Steps

- [Getting Started with Synth](../operator/01-getting-started.md) — Learn the public concepts in depth.
- [Your First Expedition](../operator/02-your-first-expedition.md) — Plan and execute your first piece of work.
- [Mission Studio Guide](../operator/mission-studio-guide.md) — Chart and approve missions.
- [Examples Guide](../operator/examples-guide.md) — Run certified example projects.
- [Operator Journey](../operator/13-operator-journey.md) — See the complete end-to-end flow.

## Common Issues

- **Missing `node_modules/`** — Run `npm install` first.
- **Port or permission errors** — Synth does not open network ports. Check that the working directory is writable.
- **Proof already exists** — New proofs are timestamped; old ones are not overwritten.
