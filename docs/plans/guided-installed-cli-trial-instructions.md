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

Short on time? **[Appendix A](#appendix-a--copy-paste-operator-runbook)** is the copy-paste runbook, **[Appendix B](#appendix-b--handoff-prompt-for-the-external-agent)** is the prompt to hand the external agent, and **[Appendix C](#appendix-c--independence-compliance-checklist)** states what makes the run count as independent.

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

## Appendix A — copy-paste operator runbook

Everything happens in a scratch directory outside any repository. Replace the three variables, then run the blocks in order. Nothing here touches the authoring checkout.

```bash
REPO=<synth-repo-local-path>          # a checkout of the repo, on branch arena/f3c711cb-synth
PIN=1eeef7358a5378738d4ab720cb90e977cca0aa44   # the PR head under review; replace with the current head you want tested
TRIAL=/tmp/synth-guided-trial-2026-10-16       # scratch root; use a real date

# A1 — throwaway source clone, pinned (recommended: never pack from your working checkout)
rm -rf "$TRIAL/src" "$TRIAL/pack" "$TRIAL/global" "$TRIAL/fixtures" "$TRIAL/instructions" "$TRIAL/transcripts"
git clone --branch arena/f3c711cb-synth --single-branch https://github.com/synth-framework/synth.git "$TRIAL/src"
git -C "$TRIAL/src" checkout --detach "$PIN"
git -C "$TRIAL/src" log -1 --oneline

# A2 — build and pack (record the exit codes)
mkdir -p "$TRIAL"/{pack,global,fixtures,instructions,transcripts}
( cd "$TRIAL/src" && npm ci && npm run build )

# A3 — install the shipped artifact into a scratch prefix
( cd "$TRIAL/src" && npm pack --pack-destination "$TRIAL/pack" )
sha256sum "$TRIAL/pack/"*.tgz | tee "$TRIAL/transcripts/tarball.sha256"
npm install -g --prefix "$TRIAL/global" "$TRIAL/pack/"*.tgz
"$TRIAL/global/bin/synth" --version | tee "$TRIAL/transcripts/version.json"

# A4 — bring the instructions and the evidence template out of the clone into the trial root
cp "$TRIAL/src/docs/plans/guided-installed-cli-trial-instructions.md" \
   "$TRIAL/src/docs/analysis/guided-three-path-installed-trial-evidence-template.md" \
   "$TRIAL/instructions/"

# A5 — matched starting inputs for both conditions
node "$TRIAL/src/scripts/guided-installed-trial-fixtures.mjs" "$TRIAL/fixtures" | tee "$TRIAL/transcripts/fixtures.json"

# A6 — hard isolation: the external agent must not be able to read repo tests or docs
rm -rf "$TRIAL/src"
```

Notes on the hash: the `.tgz` digest is a property of **your** build, not a fixed constant — record it, do not compare it to the digest quoted in this document's smoke-check section. What must match exactly are the five fixture revisions printed by A5:

| Case | Expected revision |
| --- | --- |
| green | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` |
| brown | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` |
| docs | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` |
| knowledge (optional) | `d5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338` |
| conflict (optional) | `fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5` |

Windows (PowerShell): use `$env:TEMP\synth-guided-trial-<date>`, `Copy-Item` instead of `cp`, `Get-FileHash -Algorithm SHA256` instead of `sha256sum`, and the installed binary at `"$TRIAL\global\bin\synth.cmd"`.

## Appendix B — handoff prompt for the external agent

Paste exactly this into a **fresh session** for each cell, replacing the placeholders and the starting request for the case. Save the prompt text verbatim with the transcript.

**Plain condition:**

```text
You are taking part in a usability trial. Work only inside this directory:
  <TRIAL>/fixtures/plain/<case>
Do not read or write anything outside it. In particular, do not look for or read
any synth source checkout, test suite or documentation.

Task: <the starting request for this case>

Use only the tools you are given. If you need a decision that only a person can make,
say so explicitly and stop rather than inventing one. When you stop, report what you
did, what you assumed, what you left open, and anything you could not verify. Do not
claim that anything was approved.
```

**Guided condition:** the same block, with `plain` replaced by `guided`, plus this paragraph:

```text
A CLI called synth is installed at: <TRIAL>/global/bin/synth  (add it to PATH or call it
by full path). Run, in this directory:
  synth first-contact --dry-run
  synth first-contact start "<the starting request for this case>"
  synth first-contact status

Then write your own offer JSON: a scope, one consequential question, two or three options
each with a tradeoff, an acceptance example and a citation to either the operator request
or an exact line of a file in this workspace. Record it:
  synth first-contact clarify --source-offer offer.json
  synth first-contact status

Do not pass --selection or --human-response: there is no human respondent in this trial,
so the offer must stay awaiting-response. Do not run first-contact approve or materialize,
do not start any Mission or Expedition, and do not push anything anywhere.
```

## Appendix C — independence compliance checklist

An outside reviewer should be able to reproduce the same comparison from the recorded artifacts alone. These conditions are what make the run independent rather than a self-check.

| # | Requirement | How to satisfy it | Evidence to attach |
| --- | --- | --- | --- |
| 1 | Different agent | A different agent product/model build and a fresh session from the one that authored this branch. The authoring agent must not run any cell. | Agent name, model, version, session ids per cell |
| 2 | No access to the authoring repo | Step A6 removes the clone; the agent stays inside its case directory and reads only the copied instructions. | Transcript shows no repo reads; `rm -rf` in the run log |
| 3 | Blind to expectations | The agent is never told which condition is supposed to win. The plain prompt never mentions SYNTH. | Saved prompt text per cell |
| 4 | Matched inputs | Identical fixture bytes; all required revisions recorded before the first cell. | `fixtures.json`, hash table in the evidence |
| 5 | Matched treatment | Same agent/model/version, same tools, same starting request, same case directory layout. Only the guided extra commands differ. | Version lines + prompt text for both conditions |
| 6 | Order control | Fresh session per cell; alternate order across cases (for example green plain→guided, brown guided→plain, docs plain→guided) so practice effects do not all point one way. | Run log with actual order |
| 7 | Pre-registration | Protocol, time box, expected observations and stop conditions fixed before the first cell. | This document + the filled-in §1 of the template, committed or time-stamped first |
| 8 | Raw evidence | Verbatim transcripts, wall-clock per cell, and an intervention log. No retroactive tidying. | Transcript files; interventions with exact wording |
| 9 | Artifact pinning | The installed tarball, not a repo build, is what ran. | `tarball.sha256`, `version.json` |
| 10 | Condition integrity | No invented human words; guided cells end `awaiting-response`; no lifecycle command; no push. | Cell transcripts and §6 of the template |
| 11 | Operator non-coaching | Any help beyond "read your instructions" is logged as an intervention verbatim. | Intervention log |

What a compliant run still does **not** establish: owner value, real-user comprehension, team adoption, delivery, production readiness, or that a human confirmed any response. One agent, one model build, one cell per case remains a diagnostic — it can support "keep as is" or "simplify", not a population claim.

If any requirement above is unavoidably unmet, say which and why in the evidence. A partially independent run reported honestly is useful; an unlabelled self-check is not.
