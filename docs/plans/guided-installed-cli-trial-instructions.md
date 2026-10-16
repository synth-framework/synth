# Proposed trial — run the three guided case scenarios against the installed CLI

**Status: reviewable trial instructions, NOT a canonical Expedition, approval or start.** This document prepares an operator-run diagnostic for [draft PR #347](https://github.com/synth-framework/synth/pull/347). Nothing here authorizes a runtime Mission/Expedition lifecycle action, a real SVG pilot, a merge or CLI-003 settlement. The owner runs the trial; a running agent only produces agent-authored output, which is never a human decision.

Owner direction recorded in this session's conversation (2026-10-15, owner local): keep the current branch-local implementation in place until this trial produces evidence about whether a change is warranted. That is an owner instruction from the conversation, not a PR-review decision and not a formal keep decision on a named choice record. It also does not settle the earlier [simplify/adapt recommendation](../analysis/guided-three-path-matched-comparison.md).

The runbook knows **two paths and nothing else** — the SYNTH checkout and the testing workspace. Everything else (revision, harness location, test directories, staged instruction file, CLI path, handoff notes) is inferred by the setup script. [Appendix D](#appendix-d--the-two-input-runbook) is the whole runbook.

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

- Node.js ≥ 20 (`node --version`; the package declares `engines.node >= 20`), npm and git available to the setup process.
- A clean SYNTH checkout — the revision under test is its committed `HEAD`, so uncommitted work is refused unless `--allow-dirty` records that decision deliberately.
- An **empty** testing workspace outside that checkout, on a path that does not spell the tool's name if you want the plain mirrors (the harness says why in its manifest when it skips them).
- A time box the operator sets before starting. Suggested: ≤ 45 minutes per case cell, ≤ 4 hours total. Record the actuals.

## Step 1 — setup, run by any agent or a person

Setup is mechanical and carries no judgment. Point it at the two paths:

```bash
node <synth-checkout>/scripts/guided-installed-trial-setup.mjs \
  --repo <synth-checkout> \
  --workspace <empty-testing-workspace>
```

It infers everything else and, in order: clones the checkout's committed `HEAD` into a throwaway source tree inside the harness (so the checkout itself is never modified); runs `npm ci` and `npm run build` there; packs the tarball and records its SHA-256; installs it into a scratch npm prefix inside the harness and records `synth --version`; copies the trial instructions, the evidence template and both authored instruction sets out of the pin; generates the matched fixtures with the pinned generator and verifies every published revision; stages one isolated test directory per case with the condition-appropriate `INSTRUCTIONS.md`; writes one paste-ready handoff note per cell; **deletes the source clone**; and writes `transcripts/setup.log` plus `transcripts/setup-manifest.json`.

**Inferred layout** — nothing here is passed on the command line:

| Inferred | Value |
| --- | --- |
| harness | `<workspace>/.trial/` (pack, install prefix, transcripts, notes, instructions) |
| test directories | `greenfield/`, `brownfield/`, `documentation/` — one isolated environment per test, each copied from matched fixtures and containing only its own inputs plus `INSTRUCTIONS.md` |
| optional test directories | `knowledge-led/`, `conflicting-documents/` with `--cases green,brown,docs,knowledge,conflict` |
| plain mirrors | `<workspace>/.control/<test>/` — created only when no part of the path spells the tool's name; otherwise skipped and the reason is recorded |
| installed CLI | `<workspace>/.trial/global/bin/synth` |
| handoff notes | `<workspace>/.trial/kickoff/guided-<test>.md`, `plain-<test>.md`, and `README.md` |
| revision | the checkout's committed `HEAD` (`--pin <ref>` overrides) |

The only product command setup runs is `synth --version`. It never runs a lifecycle command, never starts a cell, and never commits, pushes, or modifies the checkout it was given. Setup finishes by printing, and stopping at:

```
SETUP COMPLETE — the runbook stops here.

No trial cell has been run and none may start until the operator issues the handoff.
```

The fuller manual equivalent, if you would rather see each command, is [Appendix A](#appendix-a--manual-setup-equivalent-optional).

## Step 2 — the handoff, issued by the operator

Setup deliberately stops after staging. Starting a cell requires an explicit human-issued handoff, because the agent cannot discover the trial by itself and no auto-feed initialization command exists yet ([gap and proposal](#known-gap-no-auto-feed-initialization-command)).

Per cell, the operator:

1. opens **one fresh agent session**;
2. pastes exactly one handoff note from `.trial/kickoff/` — `guided-<test>.md` or `plain-<test>.md`;
3. logs, verbatim, any help given beyond that paste.

The note is short on purpose: it names the test, the workspace, the staged `INSTRUCTIONS.md`, and in a guided cell also where the CLI is installed. The process lives in the instruction file, so the trial exercises SYNTH's own initialization process rather than a script-supplied command list. In a guided cell the agent's first act is the initialization process, exactly as its instruction file states:

```bash
synth first-contact --dry-run     # read the output before anything else
synth first-contact start "<the task quoted for this test>"
synth first-contact status
```

then it writes its own `offer.json` and records it with `first-contact clarify --source-offer offer.json`. In a plain cell there is no prescribed first command. [Appendix B](#appendix-b--the-handoff-notes-and-the-instruction-sets) shows both notes and both instruction sets.

## Step 3 — the case scenarios and their directories

| Directory | Case id | Starting inputs (staged) | Starting request given to the agent | Required observation |
| --- | --- | --- | --- | --- |
| `greenfield/` | green | none — the idea only | "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." | Relevant questions/options about board kind, inputs, editing and validation; no invented GUI/stack and no automatic approval. |
| `brownfield/` | brown | small synthetic SVG-board renderer, its test, and `docs/limitation.md` | "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." | Existing behavior, tests and the documented limitation are cited; only the delta is proposed; no generic rewrite. |
| `documentation/` | docs | `docs/requirements.md` | "Continue from the requirements in `docs/`. The next slice is undecided." | The actual files are read and cited by path and line; nothing is silently resolved. |
| `knowledge-led/` (optional) | knowledge | `knowledge/requirements.md` | "Continue from the requirements in `knowledge/`. The next slice is undecided." | Same as `documentation`, from the non-conventional root. |
| `conflicting-documents/` (optional) | conflict | `docs/scope.md` versus `knowledge/scope.md` | "Continue from the scope documents under `docs/` and `knowledge/`. The next slice is undecided." | Both cited; the contradiction is surfaced as an unresolved decision. |

Inputs are laid out by the case id you see in comments; the **directory** name is the human-readable one. Task text is single-sourced in `scripts/lib/guided-trial-fixtures.mjs` and quoted in both instruction sets, so the conditions receive identical wording; `npm run test:guided-installed-trial-setup` fails if they ever diverge. Each instruction set lists all five tests with their start conditions and required observations, so the agent sees the whole set and its own assignment.

## Step 4 — evidence capture

Copy `.trial/instructions/guided-three-path-installed-trial-evidence-template.md` (staged by setup) into the testing workspace and fill it in as the run proceeds. Per cell record:

- exact commands and their exit codes;
- the source-input revision and whether any **source** file changed during the cell. `INSTRUCTIONS.md` is staged into every test directory after the revision check, and guided cells also create `.synth/` state, so the recorded revision covers the matched **inputs** only — say which of these appeared, and do not present them as fixture drift;
- the relevant output: questions asked, options proposed, citations used, and whether they matched the actual files and lines;
- operator effort in minutes and the number of agent turns or interventions;
- unsupported assumptions, unresolved choices, and anything the condition got wrong;
- a terminal state of `pass`, `fail`, `blocked` or `not run` — with the reason. Never relabel a blocked or skipped cell as a pass.

Keep SYNTH integrity checks separate from application tests. In `brownfield`, run the application test both before and after the agent's change (`npm test`, record exit code and revision); the unmodified baseline is expected to pass.

Attach the completed evidence as a new file (suggested `docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>.md`) plus raw transcripts, then link it from PR #347 in a comment written by the operator. Exclude private assets, credentials and machine-local secrets.

## Known gap: no auto-feed initialization command

Today the loop needs a human hand-off: someone must paste the note, because the agent has no way to learn that the trial exists and `synth` cannot yet hand instructions back to a running agent. Proposed slice, **not implemented here and not authorized by this document**:

- Have the existing `first-contact --dry-run` / `status` projection emit an agent-facing next-steps block (machine-readable plus a short human sentence), instead of adding a new verb — the E4 diagnostic argued against growing default ceremony, and the projection already carries a `nextStep` field and a provenance `note`.
- An agent that is already pointed at `synth` could then self-serve the next commands after each step, reducing the operator to one kickoff per cell.
- Judge the proposal against this trial's evidence before building it: if the guided condition does not earn its steps, adding an auto-feed command would compound the cost the diagnostic already flagged.

## Honest limits of this evidence

- One agent, one model build, unblinded, typically one cell per case; plain and guided are serial, so ordering effects are uncontrolled. Alternate the note order across tests.
- Operator effort in minutes is a crude proxy; owner value, real-user comprehension and team adoption are not measured.
- The offer cells end in `awaiting-response`, so nothing here exercises confirmation, delegation or rejection of a response by a real person.
- A passing guided cell shows the installed CLI can run the loop and produce traceable, unauthenticated proposals — not that the guidance improved the outcome. A failing or blocked cell is evidence for simplification, not a moral failure of the trial.
- Setup itself, however carefully run, is never trial evidence.
- **Isolation is by layout and instruction, not by container.** Each test directory holds only its own inputs, and the source clone is deleted, but a same-machine agent can still reach its parent directory, the harness, and any other checkout. Use a container or a separate machine when hard isolation is required; instructions alone are not a security boundary. The harness also keeps both instruction sets and the plain mirrors, which a determined agent could read.

## Setup validation performed on this branch (not trial evidence)

Recorded by the agent that wrote the script, for the same reasons as any smoke check: it validates the recipe only.

Query used (only the two inputs; the neutral workspace also exercised the plain mirrors):

```bash
node scripts/guided-installed-trial-setup.mjs --repo <checkout> --workspace <empty dir>
```

- Every step exited 0 in order — `clone`, `checkout`, `resolve-revision`, `npm-ci`, `build`, `pack`, `install`, `synth-version`, `fixtures`, `delete-source-clone` — in about 17 s, with the revision resolved from the checkout's committed `HEAD` (`6ae82fc`, branch `arena/f3c711cb-synth`, clean).
- It recorded `synth-framework-synth-2.6.1.tgz`, SHA-256 `9c6464396081b2a59a38426747e4e81d5d8948c8e5aee54217b0955c06636a70`, and `synth --version` reporting `2.6.1` with schema `synth-cli-v1`. All fixture and staged-workspace revisions matched the published values, and the manifest recorded `productCommandsRun: ["synth --version"]`, `trialCellsRun: 0`, `lifecycleCommandsRun: []`, `plainSetMentionsTool: false`.
- The inferred layout came out as documented: `.trial/` (harness, install prefix, transcripts, notes, instruction copies), `greenfield/`, `brownfield/`, `documentation/` each holding only their own inputs plus `INSTRUCTIONS.md`, and `.control/{greenfield,brownfield,documentation}/` for the plain condition. Handoff notes were `guided-<test>.md` and `plain-<test>.md`; the plain notes contained **zero** occurrences of the tool's name or the guided commands.
- Running the same command into a workspace whose path spells the tool's name skipped the plain mirrors, said so in the banner, the index note and the manifest, and still staged the three guided workspaces and their notes.
- Inside the staged brownfield workspace the fixture's own suite passed (`npm test`, exit 0, pass 1 / fail 0); the guided initialization exited 0 each step — `--dry-run` discovered `docs/limitation.md`, `package.json`, `src/board.js` and `tests/board.test.js`; the agent-shaped offer recorded with `--source-offer` reported `awaiting-response`, version 1, freshness `current`, zero answers. A first offer with an incomplete quoted line was **rejected** with `Citation docs/limitation.md:1 does not match the live source line`, which is the citation check doing its job, not a setup fault.
- `npm run test:guided-installed-trial-setup` (22 checks) covers the two-input guards, the dirty-checkout refusal and its remedy, the inferred layout including the control-path rule, the note names, both handoff notes, both instruction sets and the revision constants, and refuses every unsafe case before any network access.

Every trial cell remains `not run`. Same agent, one session, unblinded, no independent observation.

## Appendix A — manual setup equivalent (optional)

```bash
REPO=<synth-checkout>            # clean checkout; its committed HEAD is the revision under test
WS=<empty-testing-workspace>     # outside the checkout; no path component spelling the tool's name
H="$WS/.trial"

mkdir -p "$H"/{pack,global,transcripts,kickoff,instructions}
git clone --quiet --no-hardlinks "$REPO" "$H/src"
git -C "$H/src" checkout --quiet --detach "$(git -C "$REPO" rev-parse HEAD)"
( cd "$H/src" && npm ci && npm run build && npm pack --pack-destination "$H/pack" )
sha256sum "$H/pack/"*.tgz | tee "$H/transcripts/tarball.sha256"
npm install -g --prefix "$H/global" "$H/pack/"*.tgz
"$H/global/bin/synth" --version | tee "$H/transcripts/version.json"
cp "$H/src/docs/plans/guided-installed-cli-trial-instructions.md" \
   "$H/src/docs/analysis/guided-three-path-installed-trial-evidence-template.md" \
   "$H/src/docs/plans/guided-trial/README.md" \
   "$H/src/docs/plans/guided-trial/instructions/"*.md "$H/instructions/"
node "$H/src/scripts/guided-installed-trial-fixtures.mjs" "$H/fixtures" | tee "$H/transcripts/fixtures.json"
rm -rf "$H/src"                  # isolation: the trial agent must not read the checkout
```

Then stage by hand, per case: copy `$H/fixtures/guided/<case>` into `$WS/<test>/`, write `$H/instructions/guided.md` there as `INSTRUCTIONS.md`, and for the plain condition copy `$H/fixtures/plain/<case>` into `$WS/.control/<test>/` with `plain.md` as its `INSTRUCTIONS.md` — or skip the plain mirrors when a path component spells the tool's name. Write one handoff note per cell in the shape of Appendix B, then delete `$H/fixtures`.

The script does all of this, verifies each copied workspace's revision, checks that the plain set never mentions the tool, and writes a manifest; prefer it.

Windows (PowerShell): use `$env:TEMP\...`, `Copy-Item`, `Get-FileHash -Algorithm SHA256`, and the installed binary at `"$H\global\bin\synth.cmd"`.

## Appendix B — the handoff notes and the instruction sets

The handoff note is what the operator pastes; it is short by design and contains no process. Both notes name the test, the workspace and the staged instruction file. The plain note never contains the word "synth"; the guided note adds where the CLI is installed. The *process* is owned by the instruction file: [`instructions/guided.md`](guided-trial/instructions/guided.md) (read it for the exact guided wording — it begins with the SYNTH initialization process) and [`instructions/plain.md`](guided-trial/instructions/plain.md), which prescribes no first command.

**Plain condition** — `.trial/kickoff/plain-<test>.md`:

```text
# Handoff — <test> (plain condition)

You are taking part in a usability trial. Your workspace is:

    <workspace>/.control/<test>

Start by reading the instruction file staged in that workspace and follow it:

    <workspace>/.control/<test>/INSTRUCTIONS.md

Your assigned test is `<test>`. The instruction set lists all the tests and their
starting conditions, and states what your report must contain.

Work only inside your workspace. Do not read or write anything outside it, and do not look for
other checkouts, test suites or documentation.
```

**Guided condition** — `.trial/kickoff/guided-<test>.md`:

```text
# Handoff — <test> (guided condition)

You are taking part in a usability trial. Your workspace is:

    <workspace>/<test>

Start by reading the instruction file staged in that workspace and follow it:

    <workspace>/<test>/INSTRUCTIONS.md

Your assigned test is `<test>`. The instruction set tells you to begin with the SYNTH
initialization process. The CLI is installed at:

    <workspace>/.trial/global/bin/synth

and the operator may also have it on PATH as `synth`. If neither works, record that and stop.

Work only inside your workspace. Do not read or write anything outside it, and do not look for
other checkouts, test suites or documentation.
```

Why the initialization process lives in the instruction set rather than in setup-generated text: the trial is testing SYNTH's own guided entry, so the agent should start from SYNTH's initialization process and follow what the CLI reports, with the setup script limited to staging files and writing paths. The instruction sets are reviewed documents, versioned with the branch, and covered by `npm run test:guided-installed-trial-setup`.

## Appendix C — independence compliance checklist

An outside reviewer should be able to reproduce the same comparison from the recorded artifacts alone. These conditions are what make the run independent rather than a self-check.

| # | Requirement | How to satisfy it | Evidence to attach |
| --- | --- | --- | --- |
| 1 | Different agent for the cells | A different agent product/model build and a fresh session from the one that authored this branch. The authoring agent must not run any cell. A setup-only agent may be any agent, but if it also runs a **plain** cell it must not have seen this repository — prefer separate sessions for setup and cells. | Agent name, model, version, session ids per cell; setup executor identity |
| 2 | No access to the authoring checkout | Setup deletes its clone and each test directory holds only its own inputs; the agent stays inside its directory. On one machine this is confinement by instruction — use a container or separate machine for hard isolation. | `setup-manifest.json`, `delete-source-clone` step, transcripts; container/machine note if used |
| 3 | Blind to expectations | The agent is never told which condition is supposed to win. The plain note and plain set never mention SYNTH. | Staged `INSTRUCTIONS.md` copies and notes, saved verbatim |
| 4 | Matched inputs | Identical fixture bytes; all revisions recorded before the first cell. | `transcripts/fixtures.json`, revision table in the evidence |
| 5 | Matched treatment | Same agent/model/version, same tools, same task text, same directory layout. Only the guided extra commands differ. | Version lines + staged instruction files for both conditions |
| 6 | Order control | Fresh session per cell; alternate note order across tests so practice effects do not all point one way. | Run log with actual order |
| 7 | Pre-registration | Protocol, time box, expected observations and stop conditions fixed before the first cell. | This document + the filled-in §1 of the template, committed or time-stamped first |
| 8 | Raw evidence | Verbatim transcripts, wall-clock per cell, and an intervention log. No retroactive tidying. | Transcript files; interventions with exact wording |
| 9 | Artifact pinning | The installed tarball, not a repo build, is what ran; the revision is the checkout's committed HEAD. | `transcripts/tarball.sha256`, `version.json`, `setup-manifest.json` |
| 10 | Condition integrity | No invented human words; guided cells end `awaiting-response`; no lifecycle command; no push. | Cell transcripts and §6 of the template |
| 11 | Operator non-coaching | Any help beyond pasting the note is logged as an intervention verbatim. | Intervention log |

What a compliant run still does **not** establish: owner value, real-user comprehension, team adoption, delivery, production readiness, or that a human confirmed any response. One agent, one model build, one cell per case remains a diagnostic — it can support "keep as is" or "simplify", not a population claim.

If any requirement above is unavoidably unmet, say which and why in the evidence. A partially independent run reported honestly is useful; an unlabelled self-check is not.

## Appendix D — the two-input runbook

```bash
node <synth-checkout>/scripts/guided-installed-trial-setup.mjs \
  --repo <synth-checkout> \
  --workspace <empty-testing-workspace>
```

Then, per cell: open one fresh agent session and paste one note from `<workspace>/.trial/kickoff/`. That is the whole procedure; everything the note and the staged instruction file need was inferred from those two paths.

Advanced overrides, all with inferred defaults: `--cases` (add `knowledge,conflict`), `--pin <ref>`, `--allow-dirty`, `--control-root <dir>`. The script refuses a dirty checkout, a workspace inside the checkout, a non-empty workspace, a repo that is not a git work tree, and a `--pin` that does not resolve — each before it touches the network.
