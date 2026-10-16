# Proposed trial — run the three guided case scenarios against the installed CLI

**Status: reviewable trial instructions, NOT a canonical Expedition, approval or start.** This document prepares an operator-run diagnostic for [draft PR #347](https://github.com/synth-framework/synth/pull/347). Nothing here authorizes a runtime Mission/Expedition lifecycle action, a real SVG pilot, a merge or CLI-003 settlement. The owner runs the trial; a running agent only produces agent-authored output, which is never a human decision.

Owner direction recorded in this session's conversation (2026-10-15, owner local): keep the current branch-local implementation in place until this trial produces evidence about whether a change is warranted. That is an owner instruction from the conversation, not a PR-review decision and not a formal keep decision on a named choice record. It also does not settle the earlier [simplify/adapt recommendation](../analysis/guided-three-path-matched-comparison.md).

## Purpose and question

The executed E4 diagnostic compared plain-agent and SYNTH-guided conditions inside this checkout, serially, using the same agent that wrote the workflow. It could not show that guidance improved substantive questions; it showed extra mechanical provenance and extra steps.

This trial narrows that question to the **shipped artifact in a separate workspace**:

> With matched synthetic starting inputs and a running agent that has not seen this repository, does the globally installed `synth` CLI produce more grounded, more truthful or easier-to-review contextual offers than the same agent with a concise written spec and ordinary tools — at tolerable operator effort?

Keep the answer capable of being "no". An unfavorable result is legitimate evidence in favor of simplifying the default.

## What is deliberately out of scope

- Private atlas SVGs, owner brand, the owner's real repository, and any hosted or shared service.
- Canonical runtime Mission/Expedition lifecycle: do not run `first-contact approve`, `first-contact materialize`, or any Mission/Expedition start/approval flow.
- Publishing: no pushes to `synth-framework/synth`, no pull requests, no merges, no `--no-push`-less canonical branches.
- Inventing human words. There is no authenticated respondent in this trial; every offer cell must end in `awaiting-response`.
- Claims of owner value, delivery, production readiness or agent-quality improvement from this single diagnostic.

## Prerequisites

- Node.js ≥ 20 (`node --version`; the `synth` package declares `engines.node >= 20`), npm, git, and network access to clone the repository once.
- A scratch filesystem location outside this checkout, for example `/tmp/synth-guided-trial-<date>` (replace with a real directory); several hundred MB of free space.
- A time box the operator sets before starting. Suggested: ≤ 45 minutes per case cell, ≤ 4 hours total. Record the actuals.

## Step 1 — install the shipped artifact

Record every command and exit code. Use a pinned revision so the artifact is reproducible.

```bash
git clone https://github.com/synth-framework/synth.git /tmp/synth-guided-trial-src
cd /tmp/synth-guided-trial-src
git checkout <pinned-revision>          # e.g. 0daad36, the PR head under review
npm ci
npm run build
mkdir -p /tmp/synth-guided-trial-pack
npm pack --pack-destination /tmp/synth-guided-trial-pack
sha256sum /tmp/synth-guided-trial-pack/*.tgz        # record the tarball digest
npm install -g --prefix /tmp/synth-guided-trial-global /tmp/synth-guided-trial-pack/*.tgz
/tmp/synth-guided-trial-global/bin/synth --version   # record the JSON output
```

The tarball carries `dist/`, `distribution/`, and package metadata. It does **not** carry the repository test suite, so the running agent cannot consult repo-side tests as a hint. Add `/tmp/synth-guided-trial-global/bin` to `PATH` for the running agent, or give the agent the absolute binary path.

## Step 2 — prepare matched workspaces

Run the generator from the trial source checkout. It writes `plain/<case>` and `guided/<case>` with identical bytes and prints per-case revision hashes.

```bash
node /tmp/synth-guided-trial-src/scripts/guided-installed-trial-fixtures.mjs /tmp/synth-guided-trial-fixtures
```

- Required cases: `green` (empty idea), `brown` (small working SVG-board renderer with tests and a documented limitation), `docs` (source-only `docs/` requirements).
- Optional extras: `knowledge` (same content under `knowledge/`) and `conflict` (local-only versus cloud-sync scope documents). Include them if the time box allows; report them as optional.
- Record the printed hashes before any agent runs. Required expected values, matching the executed E4 diagnostic exactly:

| Case | Expected source-only revision (SHA-256) |
| --- | --- |
| green | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` |
| brown | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` |
| docs | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` |
| knowledge (optional) | `d5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338` |
| conflict (optional) | `fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5` |

If a hash differs, stop: the inputs are not matched, so the comparison is invalid. Optionally `git init` each case workspace so the agent can make ordinary local commits; the recorded hashes describe the source-only starting state before `git init` and before any agent edit.

## Step 3 — the three case scenarios

Use the same starting request in both conditions, per case:

| Case | Starting request given to the agent |
| --- | --- |
| green | "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." |
| brown | "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." |
| docs | "Continue from the requirements in `docs/` (or `knowledge/` for the optional variant). The next slice is undecided." |

Required observation per case (from [the test charter](guided-journey-test-charter.md)):

- **green** — relevant questions/options about board kind, inputs, editing and validation; no invented GUI/stack and no automatic approval.
- **brown** — existing behavior, tests and the documented limitation are cited; only the delta is proposed; no generic rewrite.
- **docs** — the actual files are read; a genuine conflict is presented as a decision with consequences; nothing is silently resolved.

## Step 4 — two conditions, identical inputs

Give the running agent one condition at a time, each in its own workspace, with matched inputs and the same agent/model and tool access.

**Plain condition** (`plain/<case>`): the starting request above, the fixture files, and ordinary tools only. Do not mention SYNTH.

**Guided condition** (`guided/<case>`): the same starting request and tools, plus these instructions verbatim:

```bash
synth first-contact --dry-run
synth first-contact start "<the starting request>"
synth first-contact status
```

The agent should read the dry-run output, write its own offer JSON (options with a tradeoff, an acceptance example, and a citation to the operator request or an exact line of the fixture files), record it, and stop:

```bash
synth first-contact clarify --source-offer <agent-authored-offer.json>
synth first-contact status
```

Rules for the guided condition:

- The offer JSON is the agent's proposal. `attribution` stays agent-authored; no cell may claim human agreement.
- There is no real respondent, so the cell must end `awaiting-response`. Do **not** pass `--selection` or `--human-response` with invented words. If the operator wants to exercise a later transition, they must use their own words as the operator and label them as operator-supplied, unverified, in the evidence.
- Do not use `first-contact approve`, `materialize`, or any Mission/Expedition lifecycle command.

## Step 5 — capture evidence

Copy `docs/analysis/guided-three-path-installed-trial-evidence-template.md` from the pinned checkout into the trial root and fill it in as the run proceeds. Per cell record:

- exact commands and their exit codes;
- the input revision hash, and whether any file changed during the cell;
- the relevant output: questions asked, options proposed, citations used, and whether they matched the actual files;
- operator effort in minutes and the number of agent turns or interventions;
- unsupported assumptions, unresolved choices, and anything the condition got wrong;
- a terminal state of `pass`, `fail`, `blocked` or `not run` — with the reason. Never relabel a blocked or skipped cell as a pass.

Keep SYNTH integrity checks separate from application tests. In `brown`, run the application test both before and after the agent's change (`npm test`, record the exit code and the fixture revision); the unmodified baseline is expected to pass.

Attach the completed evidence as a new file (suggested `docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>.md`) plus raw transcripts, then link it from PR #347 in a comment written by the operator. Exclude private assets, credentials and any machine-local secrets.

## Honest limits of this evidence

- One agent, one model build, unblinded, typically one cell per case; plain and guided are serial, so ordering effects are uncontrolled.
- Operator effort in minutes is a crude proxy; owner value, real-user comprehension and team adoption are not measured.
- The offer cells end in `awaiting-response`, so nothing here exercises confirmation, delegation or rejection of a response by a real person.
- A passing guided cell shows the installed CLI can run the loop and produce traceable, unauthenticated proposals — not that the guidance improved the outcome. A failing or blocked cell is evidence for simplification, not a moral failure of the trial.

## Setup validation performed on this branch (not trial evidence)

The recipe above was smoke-checked by the agent that wrote it, using the same branch and the same commands, to confirm the instructions are runnable:

- `npm run build` → exit 0; `npm pack --pack-destination /tmp/synth-trial-pack` → exit 0, producing `synth-framework-synth-2.6.1.tgz`, SHA-256 `919902ad2e510182878b5d6d8869c2762c1bd5671963568ab28d336f95d402d9`.
- `npm install -g --prefix /tmp/synth-trial-global <tgz>` → exit 0; `synth --version` → exit 0 with `{"status":"ok","version":"2.6.1","name":"synth","schema":"synth-cli-v1"}`.
- In a copied `guided/docs` workspace outside the checkout, the installed binary ran `first-contact --dry-run`, `first-contact start`, `first-contact clarify --source-offer` and `first-contact status` → exit 0 each; the status reported `awaiting-response`, `sourceFreshness` `current`, and no answer was recorded.
- The unmodified `plain/brown` fixture passed `npm test` → exit 0, pass 1 / fail 0.
- The generator reproduced all five E4 revision hashes exactly.

This validates the setup, not the trial: it is the same agent, the same session, and it contains no independent observation. Treat it as `not run` for every trial cell above.
