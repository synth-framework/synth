:warning: **AI Operator Contract — Read before modifying this repository.**

You are operating inside a **SYNTH** repository.

SYNTH is a deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI executes deterministically. Your job is to help the human turn intent into approved Missions, Missions into Expeditions, and Expeditions into a replayable history of events.

---

## Your responsibilities

- Capture human intent as a **Mission**.
- Break the Mission into **Expeditions**.
- Record every action as an **Event**.
- Let **Replay** prove the state is correct.
- Validate every meaningful change with `npm run govern`.

## Hard constraints

- **Never bypass Mission Studio.** Mission approval is explicit.
- **Never bypass Genesis.** Execution state mutates only through the ExecutionGate.
- **Never modify replay history.** Events are immutable.
- **Never violate Protected Assets.** Mission Studio, Genesis, Replay, ExecutionGate, the Event Model, the Capability Model, and the Constitutional Baseline are frozen.
- **Never commit without running `npm run govern`.**

## Installation

Use the bootstrap installer, npm, or npx. Do not rely on cloning the repository unless you are contributing to SYNTH itself.

```bash
# Bootstrap installer
curl -fsSL https://synth-framework.github.io/synth/install.sh | sh

# Or npm
npm install -g @synth-framework/synth

# Or run once without installing
npx @synth-framework/synth --version
```

## Initialize a repository

```bash
synth init --name "Project Name"
```

This creates `.synth/manifest.json` and the required `data/` directory.

## Mission lifecycle

1. Create a Mission Draft:

   ```bash
   synth mission create --subject "Mission Name" --purpose "What we want to achieve"
   ```

2. Review the returned `draftId`, `confidence`, `unknowns`, `questions`, and `proposals`.

3. Ask the human for approval.

4. If approved, approve the Mission:

   ```bash
   synth mission approve --draft-id <draft-id>
   ```

5. If Mission Studio rejects approval, gather more evidence and create a new draft. Do not lower confidence thresholds.

## Expedition lifecycle

After a Mission is approved, create Expeditions:

```bash
synth expedition create --mission "Mission Name" --subject "Expedition Subject" --goal "What this expedition proves or builds"
```

## Environment capability planning

Before planning a Mission or Expedition, read the Environment Capability Report:

```bash
node scripts/generate-capability-report.js
```

Plan against discovered capabilities, never assumed ones. Do not assume Git, npm, GitHub, or any specific tool unless the report lists it as supported. If a required capability is degraded or unsupported, select an alternative approach or provider before planning (ADR-016).

## Validate work

For local iteration, run the adaptive validator first. It analyzes your change and executes only the validations that could be affected:

```bash
synth validate
```

To preview the plan without executing:

```bash
synth validate --dry-run
```

To run the complete canonical governance pipeline locally:

```bash
synth validate --full
# equivalent to:
npm run govern
```

**Before requesting a merge, always run the full governance pipeline:**

```bash
npm run govern
```

This builds, tests, verifies replay, runs adversarial audits, and generates a proof artifact in `proof/`.

## Explain replay

```bash
synth explain replay
```

Use this to verify that the current state is consistent with the event history.

## Recover from interruption

If `data/` is lost or corrupted, replay can reconstruct state from the event log. Ensure `npm run govern` still passes after recovery.

## Common commands

| Command | Purpose |
|---|---|
| `synth --help` | List commands and public vocabulary |
| `synth init --name "..."` | Initialize a SYNTH project |
| `synth bootstrap --approve` | Transform a repository into a SYNTH project |
| `synth mission create --subject ... --purpose ...` | Create a Mission Draft |
| `synth mission approve --draft-id ...` | Approve a Mission Draft |
| `synth expedition create --mission ... --subject ... --goal ...` | Create Expedition proposals |
| `synth docs generate` | Regenerate public documentation |
| `synth explain replay` | Verify replay consistency |
| `synth validate` | Analyze changes and run the minimum sound validation plan |
| `synth validate --dry-run` | Preview the validation plan without executing |
| `synth validate --full` | Run the full `npm run govern` pipeline |
| `npm run govern` | Run the full governance pipeline |

## Public vocabulary

Only these seven concepts should appear in user-facing explanations:

**Mission, Expedition, Evidence, Plan, Event, State, Replay.**

Everything else is implementation detail.

## When you are unsure

1. Run `npm run govern` to see if the current state is valid.
2. Read `docs/guides/agents/index.md` for agent-specific guidance.
3. Read `docs/operator/01-getting-started.md` for the operator journey.
4. Read `docs/reference/public-vocabulary.md` for terminology constraints.
5. Do not guess about architecture. Ask the human or consult `docs/architecture/constitution.md`.

## Links

- [Agent Integration Guides](docs/guides/agents/index.md)
- [Getting Started](docs/operator/01-getting-started.md)
- [Public Vocabulary](docs/reference/public-vocabulary.md)
- [Governance](docs/governance.md)
- [Architecture Constitution](docs/architecture/constitution.md)
