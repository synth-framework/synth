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

## Step 1 — setup, run by any agent or a person

Setup is mechanical and carries no judgment. Hand it to whatever agent is convenient (or run it yourself) with one command from a checkout of this branch:

```bash
node scripts/guided-installed-trial-setup.mjs \
  --root /tmp/synth-guided-trial-2026-10-16 \
  --pin <revision-under-test> \
  [--plain-root /tmp/board-task-2026-10-16]
```

The setup executor then, in order: clones the pinned revision into a throwaway source tree; runs `npm ci` and `npm run build` there; packs and records the tarball SHA-256; installs it into a scratch npm prefix and records `synth --version`; copies these instructions and the evidence template out of the pin; generates the matched fixtures **with the pinned generator** and verifies every published revision; copies them into ready-to-run per-case workspaces; writes the paste-ready kickoff files; **deletes the source clone**; and writes `transcripts/setup.log` plus `transcripts/setup-manifest.json`.

The only product command setup runs is `synth --version`. It never runs a lifecycle command, never starts a cell, and never commits, pushes or touches the checkout it was invoked from. `--plain-root` defaults to `<tmp>/board-task-<date>` and is refused if its path contains "synth", so the plain condition shares no path with the installed tool.

Setup finishes by printing, and stopping at:

```
SETUP COMPLETE — the runbook stops here.

No trial cell has been run and none may start until the operator issues the kickoff.
```

Use the optional manual equivalent in [Appendix A](#appendix-a--manual-setup-equivalent-optional) if you prefer to see each command, or on a platform where the script's assumptions do not hold.

## Step 2 — the kickoff, issued by the operator

Setup deliberately stops after staging. Starting a cell requires an explicit human-issued kickoff, because the agent cannot discover the trial by itself and no auto-feed initialization command exists yet ([gap and proposal](#known-gap-no-auto-feed-initialization-command)).

Per cell, the operator:

1. opens **one fresh agent session**;
2. pastes exactly one generated kickoff file — `kickoff/guided-<case>.md` inside the trial root, or `kickoff-<case>.md` inside the plain root;
3. logs, verbatim, any help given beyond that paste.

The kickoff files are written by setup and carry the case task, the workspace confinement rule and the exact commands. In the guided condition the agent's first act is to run the initialization commands:

```bash
<bin> first-contact --dry-run
<bin> first-contact start "<case task>"
<bin> first-contact status
```

and then record its own offer. Appendix B shows both texts verbatim.

## Step 3 — the three case scenarios

| Case | Starting request given to the agent | Required observation |
| --- | --- | --- |
| green | "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." | Relevant questions/options about board kind, inputs, editing and validation; no invented GUI/stack and no automatic approval. |
| brown | "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." | Existing behavior, tests and the documented limitation are cited; only the delta is proposed; no generic rewrite. |
| docs | "Continue from the requirements in `docs/`. The next slice is undecided." | The actual files are read; a genuine conflict is presented as a decision with consequences; nothing is silently resolved. |
| knowledge (optional) | "Continue from the requirements in `knowledge/`. The next slice is undecided." | Same as `docs`, from the non-conventional root. |
| conflict (optional) | "Continue from the scope documents under `docs/` and `knowledge/`. The next slice is undecided." | Both documents are cited and the contradiction is surfaced as an unresolved decision, not silently resolved. |

Task text lives with the fixtures in `scripts/lib/guided-trial-fixtures.mjs`, so both conditions receive identical wording.

## Step 4 — evidence capture

Copy `instructions/guided-three-path-installed-trial-evidence-template.md` (staged by setup) into the trial root and fill it in as the run proceeds. Per cell record:

- exact commands and their exit codes;
- the input revision hash, and whether any file changed during the cell (guided cells create `.synth/` state in the workspace; the recorded revision is source-only, taken before the cell);
- the relevant output: questions asked, options proposed, citations used, and whether they matched the actual files and lines;
- operator effort in minutes and the number of agent turns or interventions;
- unsupported assumptions, unresolved choices, and anything the condition got wrong;
- a terminal state of `pass`, `fail`, `blocked` or `not run` — with the reason. Never relabel a blocked or skipped cell as a pass.

Keep SYNTH integrity checks separate from application tests. In `brown`, run the application test both before and after the agent's change (`npm test`, record exit code and revision); the unmodified baseline is expected to pass.

Attach the completed evidence as a new file (suggested `docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>.md`) plus raw transcripts, then link it from PR #347 in a comment written by the operator. Exclude private assets, credentials and machine-local secrets.

## Known gap: no auto-feed initialization command

Today the loop needs a human hand-off: someone must paste the kickoff, because the agent has no way to learn that the trial exists and `synth` cannot yet hand instructions back to a running agent. Proposed slice, **not implemented here and not authorized by this document**:

- Have the existing `first-contact --dry-run` / `status` projection emit an agent-facing next-steps block (machine-readable plus a short human sentence), instead of adding a new verb — the E4 diagnostic argued against growing default ceremony, and the projection already carries a `nextStep` field and a provenance `note`.
- An agent that is already pointed at `synth` could then self-serve the next commands after each step, reducing the operator to one kickoff per cell.
- Judge the proposal against this trial's evidence before building it: if the guided condition does not earn its steps, adding an auto-feed command would compound the cost the diagnostic already flagged.

## Honest limits of this evidence

- One agent, one model build, unblinded, typically one cell per case; plain and guided are serial, so ordering effects are uncontrolled. Alternate the order across cases.
- Operator effort in minutes is a crude proxy; owner value, real-user comprehension and team adoption are not measured.
- The offer cells end in `awaiting-response`, so nothing here exercises confirmation, delegation or rejection of a response by a real person.
- A passing guided cell shows the installed CLI can run the loop and produce traceable, unauthenticated proposals — not that the guidance improved the outcome. A failing or blocked cell is evidence for simplification, not a moral failure of the trial.
- Setup itself, however carefully run, is never trial evidence.

## Setup validation performed on this branch (not trial evidence)

Recorded by the agent that wrote the script, for the same reasons as the smoke check it replaces: it validates the recipe only.

- The setup executor ran end to end into a scratch root, pinned to `a568e35`: `clone` → `checkout` → `resolve-revision` → `npm-ci` → `build` → `pack` → `install` → `synth-version` → `fixtures` → `delete-source-clone` each exited 0, in about 17 seconds.
- It produced the per-case workspaces (`cells/<case>`, `<plain-root>/<case>`), the paste-ready kickoffs for both conditions, the packed tarball, the scratch-prefix install, `transcripts/setup.log`, and a `setup-manifest.json` recording `productCommandsRun: ["synth --version"]`, `trialCellsRun: 0` and `lifecycleCommandsRun: []`. All five fixture and workspace revisions matched the published values; the source clone was gone afterwards.
- The plain kickoff files contained **zero** occurrences of the tool name, and the plain root shared no path component with the trial root.
- `npm run test:guided-installed-trial-setup` covers the guards, the kickoff text and the revision constants, and refuses every unsafe layout before any network access.

Every trial cell remains `not run`. This section is a recipe check by the authoring agent: one session, unblinded, with no independent observation.

## Appendix A — manual setup equivalent (optional)

```bash
REPO=<synth-repo-local-path>                   # a checkout of the repo, on branch arena/f3c711cb-synth
PIN=<revision-under-test>                      # e.g. the PR head
TRIAL=/tmp/synth-guided-trial-2026-10-16       # scratch root
PLAIN=/tmp/board-task-2026-10-16               # plain-condition root; must not contain "synth"

git clone --branch arena/f3c711cb-synth --single-branch https://github.com/synth-framework/synth.git "$TRIAL/src"
git -C "$TRIAL/src" checkout --detach "$PIN"
mkdir -p "$TRIAL"/{pack,global,fixtures,instructions,kickoff,cells,transcripts} "$PLAIN"
( cd "$TRIAL/src" && npm ci && npm run build && npm pack --pack-destination "$TRIAL/pack" )
sha256sum "$TRIAL/pack/"*.tgz | tee "$TRIAL/transcripts/tarball.sha256"
npm install -g --prefix "$TRIAL/global" "$TRIAL/pack/"*.tgz
"$TRIAL/global/bin/synth" --version | tee "$TRIAL/transcripts/version.json"
cp "$TRIAL/src/docs/plans/guided-installed-cli-trial-instructions.md" \
   "$TRIAL/src/docs/analysis/guided-three-path-installed-trial-evidence-template.md" "$TRIAL/instructions/"
node "$TRIAL/src/scripts/guided-installed-trial-fixtures.mjs" "$TRIAL/fixtures" | tee "$TRIAL/transcripts/fixtures.json"
rm -rf "$TRIAL/src"     # isolation: the trial agent must not read repo tests or docs
```

Then stage workspaces and kickoffs by hand from `fixtures/plain/<case>` → `$PLAIN/<case>` and `fixtures/guided/<case>` → `$TRIAL/cells/<case>`, and paste the Appendix B texts. The script does all of this and verifies each copy's revision; prefer it.

Windows (PowerShell): use `$env:TEMP\...`, `Copy-Item`, `Get-FileHash -Algorithm SHA256`, and the installed binary at `"$TRIAL\global\bin\synth.cmd"`.

## Appendix B — the generated kickoff texts (verbatim)

Both conditions receive the same confinement rule, the same task and the same honesty requirement. The plain text never contains the word "synth"; the guided text adds the initialization commands.

**Plain condition** — `kickoff-<case>.md` in the plain root:

```text
# Kickoff — <case> (plain condition)

You are taking part in a usability trial. Work only inside this directory:

    <PLAIN>/<case>

Do not read or write anything outside it.

Task:

    <case task>

Do not look for other checkouts, test suites or documentation. Use only the tools you are given.
If a decision is needed that only a person can make, say so explicitly and stop instead of
inventing one.

When you stop, report:
  - what you did and the exact commands you ran;
  - what you assumed without evidence;
  - what you left open or could not verify;
  - anything you would need a person to decide.
Do not claim that anything was approved.
```

**Guided condition** — `kickoff/guided-<case>.md` inside the trial root:

```text
# Kickoff — <case> (guided condition)

You are taking part in a usability trial. Work only inside this directory:

    <TRIAL>/cells/<case>

Do not read or write anything outside it.

Task:

    <case task>

Run the initialization commands below from that directory, in order, and read their output
before writing anything:

    <bin> first-contact --dry-run
    <bin> first-contact start "<case task>"
    <bin> first-contact status

Then write your own offer as JSON: a scope, one consequential question, two or three options
that each carry a tradeoff, an acceptance example, and a citation to either the task text or an
exact line of a file in this workspace. Record it, then re-check status:

    <bin> first-contact clarify --source-offer offer.json
    <bin> first-contact status

Rules:
  - Do not pass --selection or --human-response. There is no human respondent in this trial, so
    the offer must stay awaiting-response. Do not invent a person's words.
  - Do not run first-contact approve or first-contact materialize, do not start a Mission or
    Expedition, and do not push anywhere.
  - If a decision is needed that only a person can make, say so and stop instead of choosing.
  - If the CLI refuses or errors, record the exact command, exit code and message, then stop.

When you stop, report: the commands and their exit codes, what the CLI showed, which files and
lines you cited, what you assumed without evidence, what you left open, and anything the CLI
got wrong.
```

## Appendix C — independence compliance checklist

An outside reviewer should be able to reproduce the same comparison from the recorded artifacts alone. These conditions are what make the run independent rather than a self-check.

| # | Requirement | How to satisfy it | Evidence to attach |
| --- | --- | --- | --- |
| 1 | Different agent for the cells | A different agent product/model build and a fresh session from the one that authored this branch. The authoring agent must not run any cell. A setup-only agent may be any agent, but if it also runs a **plain** cell it must not have seen this repository — prefer separate sessions for setup and cells. | Agent name, model, version, session ids per cell; setup executor identity |
| 2 | No access to the authoring repo | Setup deletes the clone; the agent stays inside its case directory and reads only its kickoff. | `setup-manifest.json`, `delete-source-clone` step, transcripts |
| 3 | Blind to expectations | The agent is never told which condition is supposed to win. The plain kickoff never mentions SYNTH. | Generated kickoff files, saved verbatim |
| 4 | Matched inputs | Identical fixture bytes; all required revisions recorded before the first cell. | `fixtures.json`, revision table in the evidence |
| 5 | Matched treatment | Same agent/model/version, same tools, same task text, same case layout. Only the guided extra commands differ. | Version lines + kickoff files for both conditions |
| 6 | Order control | Fresh session per cell; alternate order across cases so practice effects do not all point one way. | Run log with actual order |
| 7 | Pre-registration | Protocol, time box, expected observations and stop conditions fixed before the first cell. | This document + the filled-in §1 of the template, committed or time-stamped first |
| 8 | Raw evidence | Verbatim transcripts, wall-clock per cell, and an intervention log. No retroactive tidying. | Transcript files; interventions with exact wording |
| 9 | Artifact pinning | The installed tarball, not a repo build, is what ran. | `tarball.sha256`, `version.json`, `setup-manifest.json` |
| 10 | Condition integrity | No invented human words; guided cells end `awaiting-response`; no lifecycle command; no push. | Cell transcripts and §6 of the template |
| 11 | Operator non-coaching | Any help beyond pasting the kickoff is logged as an intervention verbatim. | Intervention log |

What a compliant run still does **not** establish: owner value, real-user comprehension, team adoption, delivery, production readiness, or that a human confirmed any response. One agent, one model build, one cell per case remains a diagnostic — it can support "keep as is" or "simplify", not a population claim.

If any requirement above is unavoidably unmet, say which and why in the evidence. A partially independent run reported honestly is useful; an unlabelled self-check is not.
