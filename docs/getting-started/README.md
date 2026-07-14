---
Title: Quick Start
Domain: getting-started
Audience: operators
Prerequisites: none
Knowledge Establishes: How to install Synth and complete the first Mission lifecycle
Depends On: none
Builds Toward: operator/01-getting-started.md, operator/02-your-first-expedition.md
Version: 2.0.0
Status: stable
---

# Quick Start

This guide takes you from zero to a passing governance run in under five minutes.

You will install the Synth CLI, initialize a project, create a Mission Draft, approve it, validate your work, and produce a proof.

---

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

---

## Create your first Mission

A **Mission** is the strategic goal you are working toward. Synth captures it as a Draft first, so you can review confidence, unknowns, and proposals before approval.

Initialize a project:

```bash
synth init --name "My Project"
```

Create a Mission Draft:

```bash
synth mission create --subject "Adopt SYNTH" --purpose "Make our engineering work replayable"
```

Review the returned `draftId`, `confidence`, `unknowns`, `questions`, and `proposals`. If Mission Studio needs more evidence, add it and create a new Draft. Do not lower the confidence threshold.

Approve the Draft:

```bash
synth mission approve --draft-id <draft-id>
```

Approval produces an approved Mission and emits an Event. The current State is now derived from that Event.

---

## Validate and govern

For local iteration, run only the validations affected by your change:

```bash
synth validate
```

Before requesting a merge, run the full governance pipeline:

```bash
npm run govern
```

This command:

1. Builds the TypeScript source.
2. Runs the full test suite.
3. Verifies Replay consistency.
4. Runs adversarial architecture audits.
5. Generates a proof artifact in `proof/`.

A successful run ends with `✅ PROOF ACCEPTED` and a new file in `proof/`.

---

## Verify Replay

Synth can rebuild the current State from its Events and prove the two match:

```bash
synth explain replay
```

If Replay is consistent, every Event that led to the current State is accounted for.

---

## What just happened

You moved through the Synth lifecycle:

```text
Idea → Mission Draft → Approval → Mission → Validation → Governance → Proof → Replay
```

Each step produced evidence. The Event log is the source of truth. Replay verifies that the current State matches that history.

---

## Next Steps

- [Getting Started with Synth](../operator/01-getting-started.md) — Learn the seven public concepts in depth
- [Your First Expedition](../operator/02-your-first-expedition.md) — Plan and execute your first piece of work
- [Mission Studio Guide](../operator/mission-studio-guide.md) — Chart and approve Missions
- [Examples Guide](../operator/examples-guide.md) — Run certified example projects
- [Operator Journey](../operator/13-operator-journey.md) — See the complete end-to-end flow

---

## Common Issues

- **Synth is not found** — Make sure `npm install -g @synth-framework/synth` completed successfully and your shell path includes npm's global `bin` directory.
- **Mission approval rejected** — Mission Studio needs more evidence. Review the `unknowns` and `questions` in the Draft and create a new one.
- **`npm run govern` fails** — Fix the reported issue and run it again. The proof is only generated when all checks pass.
