# Proposed trial — run the guided tests against the installed CLI

**Status: reviewable trial instructions, NOT a canonical Expedition, approval or start.** This document prepares an operator-run diagnostic for [draft PR #347](https://github.com/synth-framework/synth/pull/347). Nothing here authorizes a runtime Mission/Expedition lifecycle action, a real SVG pilot, a merge or CLI-003 settlement. The operator runs the trial; a running agent only produces agent-authored output, which is never a human decision.

Owner direction recorded in this session's conversation (2026-10-15, owner local): keep the current branch-local implementation in place until this trial shows whether a change is warranted; **one command with TEST_PATH as the only argument**, because the repository is the checkout the script lives in and packing/installing does not need TEST_PATH; TEST_PATH is created by that command and holds **one directory per test** plus the instruction file in its **root**; the agent is launched there and told to follow that file; and **building, packing and installing stay outside TEST_PATH** so they cannot interfere with the run. Those are owner instructions from the conversation, not PR-review decisions on named choice records, and they do not settle the earlier [simplify/adapt recommendation](../analysis/guided-three-path-matched-comparison.md).

## Purpose and question

The executed E4 diagnostic compared plain-agent and SYNTH-guided conditions inside this checkout, serially, using the same agent that wrote the workflow. It could not show that guidance improved substantive questions; it showed extra mechanical provenance and extra steps.

This trial narrows that question to the **shipped artifact, in a separate workspace**:

> With matched synthetic starting inputs and a running agent that has not seen this repository, does the globally installed `synth` CLI produce more grounded, more truthful or easier-to-review offers than the same agent with a concise written spec and ordinary tools — at tolerable operator effort?

Keep the answer capable of being "no". An unfavorable result is legitimate evidence in favor of simplifying the default.

## What is deliberately out of scope

- Private atlas SVGs, owner brand, the owner's real repository, and any hosted or shared service.
- Canonical runtime Mission/Expedition lifecycle: do not run `first-contact approve`, `first-contact materialize`, or any Mission/Expedition start/approval flow.
- Publishing: no pushes to `synth-framework/synth`, no pull requests, no merges, no `--no-push`-less canonical branches.
- Inventing human words. There is no authenticated respondent in this trial; every offer must end `awaiting-response`.
- Claims of owner value, delivery, production readiness or agent-quality improvement from this single diagnostic.

## Prerequisites

- Node.js ≥ 20 (`node --version`; the package declares `engines.node >= 20`), npm and git available to the setup process.
- A clean checkout of the branch under review. The revision tested is that checkout's committed `HEAD`, so uncommitted work is refused unless `--allow-dirty` records that decision deliberately.
- A TEST_PATH that is missing or empty, outside the checkout. For the plain comparison, a *separate* TEST_PATH whose path does not spell the tool's name.
- A time box the operator sets before starting. Suggested: ≤ 45 minutes per test, ≤ 4 hours total. Record the actuals.

## Step 1 — one command

From the checkout:

```bash
node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
```

It infers everything else and, in order:

1. **TEST_PATH** — creates it when missing; refuses and changes nothing when it exists with content in it.
2. **Revision** — the checkout's committed `HEAD` (this is the revision under test).
3. **CLI staging, outside TEST_PATH** — clones that revision into `<tmp>/trial-staging/<revision>`, runs `npm ci` and `npm run build` there, packs the tarball and records its SHA-256, installs it into a scratch npm prefix there and records `synth --version`, and copies the trial instructions, the evidence template and both instruction files out of the pin. If a CLI for the same revision is already staged, it is **reused** and no npm or git command runs at all. Its only product command is `synth --version`.
4. **TEST_PATH contents** — the condition-appropriate instruction file as `INSTRUCTIONS.md`, the generated `ENVIRONMENT.md` (guided only), and one isolated directory per test, each copied from matched fixtures and verified against its published revision.
5. Prints the launch line, and stops.

```
<TEST_PATH>/
  INSTRUCTIONS.md          copied from the repository — the file the agent follows
  ENVIRONMENT.md           guided only: CLI location, revision, staging directory
  greenfield/              the idea only; no inputs
  brownfield/              package.json, src/board.js, tests/board.test.js, docs/limitation.md
  documentation/           docs/requirements.md
  [knowledge-led/]         optional, with --cases knowledge,conflict
  [conflicting-documents/]
```

Nothing else lands in TEST_PATH: no clone, `node_modules`, tarball, harness or transcript. Building, packing and installing all live in the staging directory, so they cannot interfere with the run — and after the first run they are done, so the trial itself is just the agent's work.

It never runs a lifecycle command, never starts a test, never commits or pushes, and never modifies the checkout.

**Plain comparison (optional).** The plain condition never runs the tool, so nothing is built for it. Point the same command at a *separate* TEST_PATH whose path does not spell the tool's name, with `--condition plain`: the instruction file and fixtures come straight from the checkout, and the run writes **nothing** outside TEST_PATH. Never let one session see both conditions.

**Pre-warming (optional).** `node scripts/guided-installed-trial-setup.mjs --stage-only` stages the CLI for this revision and stops without creating TEST_PATH. Useful if you want the build finished before the trial window; otherwise the first normal run does exactly the same thing.

## Step 2 — launch the agent in TEST_PATH

Start **one fresh agent session in TEST_PATH** and give it one line:

```text
Read INSTRUCTIONS.md in the root of this workspace and follow it.
```

That is the whole hand-off, and it is deliberately manual — see [the known gap](#known-gap-no-auto-feed-initialization-command). The agent reads the staged instruction file, works through the tests present one directory at a time, and in the guided condition starts each test with SYNTH's own initialization process:

```bash
synth first-contact --dry-run     # read the output before anything else
synth first-contact start "<the task quoted for that test>"
synth first-contact status
```

then writes its own `offer.json` in that test's directory, records it with `first-contact clarify --source-offer offer.json`, and writes `REPORT.md`. In the plain condition the instruction file prescribes no first command.

Log verbatim any help you give beyond that one line.

## Step 3 — the tests

| Directory | Case id | Starting inputs | Starting request | Required observation |
| --- | --- | --- | --- | --- |
| `greenfield/` | green | none — the idea only | "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." | Relevant questions/options about board kind, inputs, editing and validation; no invented GUI/stack and no automatic approval. |
| `brownfield/` | brown | small synthetic SVG-board renderer, its test, and `docs/limitation.md` | "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." | Existing behavior, tests and the documented limitation are cited; only the delta is proposed; no generic rewrite. |
| `documentation/` | docs | `docs/requirements.md` | "Continue from the requirements in `docs/`. The next slice is undecided." | The actual files are read and cited by path and line; nothing is silently resolved. |
| `knowledge-led/` (optional) | knowledge | `knowledge/requirements.md` | "Continue from the requirements in `knowledge/`. The next slice is undecided." | Same as `documentation`, from the non-conventional root. |
| `conflicting-documents/` (optional) | conflict | `docs/scope.md` versus `knowledge/scope.md` | "Continue from the scope documents under `docs/` and `knowledge/`. The next slice is undecided." | Both cited; the contradiction is surfaced as an unresolved decision. |

Task text is single-sourced in `scripts/lib/guided-trial-fixtures.mjs` and quoted in both instruction files, so both conditions receive identical wording; `npm run test:guided-installed-trial-setup` fails if they ever diverge.

## Step 4 — evidence capture

The evidence template is staged **outside TEST_PATH** at `<staging>/instructions/guided-three-path-installed-trial-evidence-template.md`, so the agent never reads it. Fill it in as the run proceeds. Per test record:

- exact commands and their exit codes;
- the starting-input revision and whether any **input** file changed. `INSTRUCTIONS.md` and `ENVIRONMENT.md` are written to the root, not into the test directories, and the CLI keeps its per-test state in `.synth/` inside the test directory it runs in, so the recorded revision covers the matched **inputs** only — say which of these appeared, and do not present them as fixture drift;
- the relevant output: questions asked, options proposed, citations used, and whether they matched the actual files and lines;
- operator effort in minutes and the number of agent turns or interventions;
- unsupported assumptions, unresolved choices, and anything a condition got wrong;
- a terminal state of `pass`, `fail`, `blocked` or `not run` — with the reason. Never relabel a blocked or skipped test as a pass.

Keep SYNTH integrity checks separate from application tests. In `brownfield/`, run the project's own test command before and after the agent's change (`npm test`, record exit codes); the unmodified baseline is expected to pass.

A **guided** run records machine-readable setup evidence at `<staging>/transcripts/` (`tarball.sha256`, `version.json`, `setup.log`, `setup-manifest.json`, plus `cli-manifest.json` at the staging root). A **plain** run deliberately writes nothing outside TEST_PATH, so copy the setup banner into your evidence instead — it prints the revision and every staged revision hash.

Attach the completed evidence as a new file (suggested `docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>.md`) plus raw transcripts, then link it from PR #347 in a comment written by the operator. Exclude private assets, credentials and machine-local secrets.

## Known gap: no auto-feed initialization command

Today the loop needs a human hand-off: someone must launch the agent and point it at the instruction file, because the agent has no way to learn that the trial exists and `synth` cannot yet hand instructions back to a running agent. Proposed slice, **not implemented here and not authorized by this document**:

- Have the existing `first-contact --dry-run` / `status` projection emit an agent-facing next-steps block (machine-readable plus a short human sentence), instead of adding a new verb — the E4 diagnostic argued against growing default ceremony, and the projection already carries a `nextStep` field and a provenance `note`.
- An agent already pointed at `synth` could then self-serve the next commands after each step, reducing the operator to one launch.
- Judge the proposal against this trial's evidence before building it: if the guided condition does not earn its steps, adding an auto-feed command would compound the cost the diagnostic already flagged.

## Honest limits of this evidence

- One agent, one model build, unblinded. **One session may run all the tests**, which leaves order effects uncontrolled: if you want a cleaner comparison, run one test per session and alternate guided/plain order across tests.
- Operator effort in minutes is a crude proxy; owner value, real-user comprehension and team adoption are not measured.
- The offers end in `awaiting-response`, so nothing here exercises confirmation, delegation or rejection of a response by a real person.
- A passing guided test shows the installed CLI can run the loop and produce traceable, unauthenticated proposals — not that the guidance improved the outcome. A failing or blocked run is evidence for simplification, not a moral failure of the trial.
- Setup itself, however carefully run, is never trial evidence.
- **Isolation is by layout and instruction, not by container.** Each test directory holds only its own inputs, the build lives in a staging directory outside TEST_PATH, and the setup clone is deleted — but a same-machine agent can still reach its parent directory and any other checkout. Use a container or a separate machine when hard isolation is required. In a guided run the staging directory keeps both instruction files, which a determined agent could read; in a plain run nothing is written outside TEST_PATH at all.

## Setup validation performed on this branch (not trial evidence)

Recorded by the agent that wrote the script, for the same reasons as any smoke check: it validates the recipe, not the outcome. Command used — the only argument is TEST_PATH:

```bash
node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
```

- Guided: TEST_PATH was created (it did not exist), the CLI was staged outside it, and the result was exactly `INSTRUCTIONS.md`, `ENVIRONMENT.md`, `greenfield/` (no files), `brownfield/` (`package.json`, `src/board.js`, `tests/board.test.js`, `docs/limitation.md`) and `documentation/` (`docs/requirements.md`). Every staged revision matched its published value, and no clone, tarball, `node_modules` or transcript appeared inside TEST_PATH.
- A second run against the same revision **reused** the staged CLI and ran no npm or git command at all; `--refresh-cli` forced a rebuild.
- Plain: a separate neutral TEST_PATH received only `INSTRUCTIONS.md` and the three test directories, with **zero** occurrences of the tool's name or the guided commands in that file, no `ENVIRONMENT.md`, and nothing written outside TEST_PATH.
- Inside a staged `brownfield/` the fixture's own suite passed (`npm test`, exit 0, pass 1 / fail 0) and guided initialization exited 0 each step: `--dry-run` discovered the four input files with no warnings, and an agent-shaped `offer.json` recorded with `--source-offer` left the brief `awaiting-response` with freshness `current` and zero answers. A first attempt quoting an incomplete source line was **rejected** — `Citation docs/limitation.md:1 does not match the live source line` — which is the citation check working.
- Refusals verified before any build time is spent: a non-empty TEST_PATH, a TEST_PATH inside the checkout, a staging directory inside TEST_PATH, a checkout with uncommitted changes, a repo that is not a git work tree, and a `--pin` that does not resolve.
- `npm run test:guided-installed-trial-setup` (27 checks) covers the guards, the staging/reuse decision, the inferred layout, the created/empty/refused TEST_PATH states, the generated environment note, the launch line, both instruction files and the revision constants.

Every trial test remains `not run`. Same agent, one session, unblinded, no independent observation.

## Appendix A — manual setup equivalent (optional)

```bash
REPO=<synth-checkout>        # clean checkout; its committed HEAD is the revision under test
WS=<TEST_PATH>               # missing or empty, outside the checkout
CLI=<tmp>/trial-staging/$(git -C "$REPO" rev-parse --short=12 HEAD)

mkdir -p "$CLI"/{pack,global,transcripts,instructions,tools/lib}
git clone --quiet --no-hardlinks "$REPO" "$CLI/src"
git -C "$CLI/src" checkout --quiet --detach "$(git -C "$REPO" rev-parse HEAD)"
( cd "$CLI/src" && npm ci && npm run build && npm pack --pack-destination "$CLI/pack" )
sha256sum "$CLI/pack/"*.tgz | tee "$CLI/transcripts/tarball.sha256"
npm install -g --prefix "$CLI/global" "$CLI/pack/"*.tgz
"$CLI/global/bin/synth" --version | tee "$CLI/transcripts/version.json"
cp "$CLI/src/docs/plans/guided-installed-cli-trial-instructions.md" \
   "$CLI/src/docs/analysis/guided-three-path-installed-trial-evidence-template.md" \
   "$CLI/src/docs/plans/guided-trial/README.md" \
   "$CLI/src/docs/plans/guided-trial/instructions/"*.md "$CLI/instructions/"
cp "$CLI/src/scripts/guided-installed-trial-fixtures.mjs" "$CLI/tools/"
cp "$CLI/src/scripts/lib/guided-trial-fixtures.mjs" "$CLI/tools/lib/"
rm -rf "$CLI/src"                 # isolation: keep the checkout out of the trial

mkdir -p "$WS" "$(mktemp -d)/fixtures"
node "$CLI/tools/guided-installed-trial-fixtures.mjs" "$TMPFIX" | tee "$CLI/transcripts/fixtures.json"
```

Then copy `$TMPFIX/guided/<case>` into `$WS/<test>/`, where `<case>` → `<test>` is `green`→`greenfield`, `brown`→`brownfield`, `docs`→`documentation`, `knowledge`→`knowledge-led`, `conflict`→`conflicting-documents`; write `$CLI/instructions/guided.md` to `$WS/INSTRUCTIONS.md`; write the `ENVIRONMENT.md` of [Appendix B](#appendix-b--the-instruction-file-and-the-environment-note); and remove the temporary fixtures. For the plain condition, stage from `fixtures/plain/`, write `plain.md` as the root `INSTRUCTIONS.md`, and write no environment note.

The script does all of this, verifies every staged revision, refuses unsafe layouts and writes the manifest; prefer it.

Windows (PowerShell): use `$env:TEMP\...`, `Copy-Item`, `Get-FileHash -Algorithm SHA256`, and the installed binary at `"$CLI\global\bin\synth.cmd"`.

## Appendix B — the instruction file and the environment note

The instruction file is what the agent follows; it is versioned with the branch, contains no machine paths, and is staged as `<TEST_PATH>/INSTRUCTIONS.md`. Its two variants are [`instructions/guided.md`](guided-trial/instructions/guided.md) and [`instructions/plain.md`](guided-trial/instructions/plain.md) — read them there rather than here, since they are the files that actually run.

The generated environment note exists only in a guided run, and carries paths and build identity, never process:

```text
# Environment (generated by trial setup — do not edit)

This file only records paths and build identity. The process is in `INSTRUCTIONS.md`.

Testing workspace : <TEST_PATH>
Test directories  : greenfield/  brownfield/  documentation/
SYNTH CLI         : <staging>/global/bin/synth
                    (or `synth` when the operator put it on PATH)
Revision under test: <commit>  <subject>
CLI staging       : <staging>
Setup manifest    : <staging>/cli-manifest.json
```

Why the process lives in the instruction file and the paths live in a generated note: the trial tests SYNTH's own guided entry, so the agent starts from SYNTH's initialization process and follows what the CLI reports, while the setup script only stages files and writes paths. The instruction files are covered by `npm run test:guided-installed-trial-setup`; the note is covered by the same suite's layout and rendering checks.

## Appendix C — independence compliance checklist

An outside reviewer should be able to reproduce the same comparison from the recorded artifacts alone. These conditions are what make the run independent rather than a self-check.

| # | Requirement | How to satisfy it | Evidence to attach |
| --- | --- | --- | --- |
| 1 | Different agent | A different agent product/model build and a fresh session from the one that authored this branch. The authoring agent must not run a trial session. A setup-only agent may be any agent; if it also runs a **plain** session it must not have seen this repository — prefer separate sessions. | Agent name, model, version, session ids; staging identity |
| 2 | No access to the authoring checkout | Setup deletes its clone, the build lives outside TEST_PATH, and each test directory holds only its own inputs; the agent stays inside its directory. On one machine this is confinement by instruction — use a container or separate machine for hard isolation. | `cli-manifest.json`, `setup-manifest.json`, `delete-source-clone` step; container/machine note if used |
| 3 | Blind to expectations | The agent is never told which condition is supposed to win. The plain instruction file and a plain TEST_PATH never mention SYNTH. | Staged `INSTRUCTIONS.md` copies, saved verbatim |
| 4 | Matched inputs | Identical fixture bytes; all revisions recorded before the first test. | `transcripts/fixtures.json` (guided) or the setup banner (plain), plus the revision table in the evidence |
| 5 | Matched treatment | Same agent/model/version, same tools, same task text, same directory layout. Only the guided extra commands differ. | Version lines + staged instruction files for both conditions |
| 6 | Order control | Fresh session per test where possible; one session per condition at minimum, and record the order actually used. | Run log with actual order |
| 7 | Pre-registration | Protocol, time box, expected observations and stop conditions fixed before the first session. | This document + the filled-in §1 of the template, committed or time-stamped first |
| 8 | Raw evidence | Verbatim transcripts, wall-clock per test, and an intervention log. No retroactive tidying. | Transcript files; interventions with exact wording |
| 9 | Artifact pinning | The installed tarball, not a repository build, is what ran; the revision is the checkout's committed HEAD. | `<staging>/transcripts/tarball.sha256`, `version.json`, `cli-manifest.json` |
| 10 | Condition integrity | No invented human words; guided offers end `awaiting-response`; no lifecycle command; no push. | Session transcripts and §6 of the template |
| 11 | Operator non-coaching | Any help beyond the one launch line is logged as an intervention verbatim. | Intervention log |

What a compliant run still does **not** establish: owner value, real-user comprehension, team adoption, delivery, production readiness, or that a human confirmed any response. One agent, one model build, one run per condition remains a diagnostic — it can support "keep as is" or "simplify", not a population claim.

If any requirement above is unavoidably unmet, say which and why in the evidence. A partially independent run reported honestly is useful; an unlabelled self-check is not.

## Appendix D — the short version

```bash
# from the checkout
node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
```

Then start the agent in `<TEST_PATH>` and give it: `Read INSTRUCTIONS.md in the root of this workspace and follow it.`

That is the whole runbook. Expected starting-input revisions, printed by setup:

| Directory | Revision (SHA-256 of sorted source path/content pairs) |
| --- | --- |
| `greenfield/` | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` |
| `brownfield/` | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` |
| `documentation/` | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` |
| `knowledge-led/` (optional) | `d5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338` |
| `conflicting-documents/` (optional) | `fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5` |

The tarball digest is a property of **your** build, so it will differ from any figure quoted in this document: record yours instead of comparing. Advanced overrides, all inferred by default: `--condition plain`, `--cases`, `--pin`, `--repo`, `--cli-root`, `--refresh-cli`, `--allow-dirty`, `--stage-only`.
