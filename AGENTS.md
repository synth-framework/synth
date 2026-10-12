<!-- SYNTH:contract:start -->
:warning: **AI Operator Contract — Read before modifying this repository.**

You are operating inside a **SYNTH** repository.

SYNTH is a deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI executes deterministically. Your job is to help the human turn intent into approved Missions, Missions into Expeditions, and Expeditions into a replayable history of events.

---

## Pre-flight checkpoint

Run this checkpoint at the start of every agent session and before every implementation action:

1. `synth status` — confirm `status` is `ok`.
2. `synth explain replay` — confirm `consistent` is `true`.
3. `synth checkpoint` — confirm an expedition is at `executing` status.
4. Confirm the intended file changes are within the scope of that executing expedition.
5. Only then write code or state.

If any step fails, stop and ask the operator for the next step.

## Your responsibilities

- Capture human intent as a **Mission**.
- Break the Mission into **Expeditions**.
- Record every action as an **Event**.
- Let **Replay** prove the state is correct.
- Validate source-code changes with targeted tests; ensure the operator runs the full governance pipeline before merge (ADR-043).

## Code modification rule

Source code changes follow a simple rule based on whether expeditions exist:

- **No expeditions exist:** Free to write code, but only after the operator explicitly grants permission. This is discovery/prototyping mode — no governance lifecycle applies yet.
- **Expeditions exist:** The agent must read them before writing code. All file changes must be scoped to expedition deliverables. Update expedition documentation before implementation. Expedition status transitions go through the gate lifecycle (`draft → approved → committed → executing → completed`). Do not bypass expeditions by writing code outside their scope.

When in doubt, ask the operator: "Should I create an expedition for this, or is this pre-governance discovery work?"

## Hard constraints

- **Never bypass Mission Studio.** Mission approval is explicit.
- **Never bypass Genesis.** Execution state mutates only through the ExecutionGate.
- **Never modify replay history.** Events are immutable.
- **Never violate Protected Assets.** Mission Studio, Genesis, Replay, ExecutionGate, the Event Model, the Capability Model, and the Constitutional Baseline are frozen.
- **Never write to `data/` or runtime state without an executing expedition and operator approval.** Writes to `.synth/data/`, `data/`, `event-stream/`, or `canonical-state.json` require an expedition at `executing` status and explicit `--approve` (or `SYNTH_APPROVAL_MODE=human-approved`).
- **Never call SDK domain functions directly for state mutations.** All state mutations go through `synth <subcommand>` CLI commands; the SDK `events` and `state` modules are read-only.
- **Never commit without the operator running `npm run govern`.** AI agents do not run the full governance pipeline locally (ADR-043).

## Durable replay source (tracked)

`.synth/data/event-stream/` is the authoritative, committed replay source of
truth. `.synth/data/canonical-state.json` is the replay-derived state snapshot
and `.synth/data/decisions.jsonl` is the hash-chained decision record; both are
committed. `.synth/data/event-log.jsonl` is a legacy monolith superseded by
`event-stream/` and is never read. Never hand-edit any of these files: state is
reconstructed from the event history.

Every SYNTH artifact is classified once in `src/state/artifact-policy.ts`
(durable, input, derived, cache, legacy); `scripts/check-artifact-policy.js`
checks in CI that the git index and `.gitignore` agree with that table.

## Planning inputs (tracked)

`.synth/data/drafts/` — draft files and their `.integrity.json` records — are
load-bearing planning inputs: `synth mission approve --draft-id <id>` and
`synth expedition commit --proposal-id <id>` read them. They MUST be tracked in
version control; a planning input that exists on one machine and not another
makes the decision unreproducible.

## Derived artifacts (regenerated; still committed)

`AGENTS.md` and `.synth/AGENT_CONTRACT.md` are derived from source fragments and
the constitutional baseline, but they are **committed to the repository**. They
are required on a clean clone and are not produced by the build step, so they
must remain tracked; CI and `synth project AGENTS.md` regenerate them.

## Derived artifacts (do not commit)

The following files are derived from source state, are regenerated on demand by
normal `synth` operations, and must not be committed to version control:

- `.synth/ai/`
- `.synth/context.json`
- `.synth/discovery/`
- `.synth/cache/`
- `.synth/anchor/`
- `.synth/worktrees/`
- `.synth/data/cli-errors.jsonl` (debug log; the event history is the audit trail)
- `.synth/data/dependency-records-cache.json` (legacy mtime cache)
- `.synth/data/event-log.jsonl` (legacy monolith)
- `docs/generated/*.md`

Derived files are regenerated by the CLI or CI. Edit their source events, source
fragments, or knowledge-base files instead.

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

This creates `.synth/manifest.json` and the required `.synth/data/` directory for governed projects. Ungoverned directories continue to use repo-root `data/`.

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

**Before requesting a merge, ensure the operator runs the full governance pipeline:**

```bash
npm run govern
```

This builds, tests, verifies replay, runs adversarial audits, and generates a proof artifact in `proof/`. AI agents do not run this locally; they run only the targeted validations needed to confirm their source-code changes (ADR-043).

## Explain replay

```bash
synth explain replay
```

Use this to verify that the current state is consistent with the event history.

## Recover from interruption

If `.synth/data/` (or `data/` for ungoverned directories) is lost or corrupted, replay can reconstruct state from the event log. Ensure `npm run govern` still passes after recovery.

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
| `synth explain all [--log <path>]` | Inspect aggregate graph, snapshot lineage, and replay diagnostics (read-only) |
| `synth validate` | Analyze changes and run the minimum sound validation plan |
| `synth validate --dry-run` | Preview the validation plan without executing |
| `synth validate --full` | Run the full `npm run govern` pipeline |
| `npm run govern` | Run the full governance pipeline |

## Public vocabulary

Only these seven concepts should appear in user-facing explanations:

**Mission, Expedition, Evidence, Plan, Event, State, Replay.**

Everything else is implementation detail.

## When you are unsure

1. Run `synth validate` for a lightweight check, or ask the operator to run `npm run govern`. AI agents do not run the full pipeline locally (ADR-043).
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

---

## Repository status

- **Phase:** uninitialized
- **Active Mission:** `4ab7e9d2cc7b1b66` — Framework Maturation v2
- **Executing Expedition:** `cfbb801aa232795a` — Artifact policy and no-write-on-read regression guard
- **Governance version:** Synth v2.1

### Project context
- **Repository type:** brownfield-polyglot
- **Workflow phase:** architecture-discovery
- **Implementation state:** complete
- **Classification confidence:** high
- **Detected intent:** transform existing system under governance
- **Source history:** AVAILABLE

### Detected stack
- **Languages:** JavaScript/TypeScript, Python
- **Frameworks:** none detected
- **Package manager:** not detected
- **Tests:** detected
- **File count:** 2162

### Detected adapters
- **repository** (integration) — Git source history detected
- **nextjs-runtime** (runtime) — JavaScript/TypeScript language detected
- **api-route** (runtime) — JavaScript/TypeScript language detected
- **python-cli** (runtime) — Python language detected
- **tdd** (methodology) — Test suite detected
- **repository** (integration) — Brownfield/polyglot repository detected

---

## Active work

- **Expedition `cfbb801aa232795a` — Artifact policy and no-write-on-read regression guard**
  - Goal: Introduce src/state/artifact-policy.ts as the single classification of durable, input, derived, cache and legacy artifacts; make .gitignore, the auto-commit file list and the completion gate derive from it; add scripts/check-artifact-policy.js as a CI guard; add tests/no-write-on-read.test.js and tests/derived-state-commit.test.js so the invariants reads-never-write and derived-state-never-blocks-work are enforced by tests. Removes the stale tracked event-log.jsonl from the commit list and patterns.

---

## Contract Provenance

- **Project:** Synth Framework
- **Governance version:** 2.1
- **Generated:** 2026-10-12T10:22:26.332Z
- **Command:** `synth project AGENTS.md`

This SYNTH contract section is derived. Do not edit it directly. Update source fragments or the framework baseline instead.
<!-- SYNTH:contract:end -->
