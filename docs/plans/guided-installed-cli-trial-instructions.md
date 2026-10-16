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
- The checkout of the branch under review, with its dependencies installed (setup runs `npm install`/`npm ci` for you only when `node_modules` is missing). The revision tested is that checkout's committed `HEAD`; uncommitted changes are allowed but recorded, and the tarball digest is what actually pins the build.
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
3. **Build, pack and install — from this checkout, into a scratch directory outside TEST_PATH.** Three ordinary commands, in the checkout itself, with no clone and no second copy of the source tree:

   ```bash
   npm run build
   npm pack --pack-destination <tmp>/trial-staging/<revision>/pack
   npm install -g --prefix <tmp>/trial-staging/<revision>/global <tarball>
   ```

   The tarball's SHA-256 is recorded and the installed binary answers `synth --version`, the only product command setup runs. `npm install -g` goes into the scratch prefix, not onto the machine's global path, so the plain condition cannot stumble over a `synth` command on `PATH`; if you prefer a machine-wide install, the banner prints the exact `npm install -g <tarball>` line for you.
4. **TEST_PATH contents** — the condition-appropriate instruction file as `INSTRUCTIONS.md`, the generated `ENVIRONMENT.md` (guided only), and one isolated directory per test, each copied from matched fixtures and verified against its published revision.
5. Prints the launch line for that condition — the guided line names SYNTH so the agent learns the tool exists — and stops.

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

Nothing else lands in TEST_PATH: no `node_modules`, tarball, harness or transcript. The build output that npm writes in the checkout (`dist/`) stays in the checkout, the tarball and the installed CLI stay in the scratch directory, and TEST_PATH receives only the instruction file, the environment note and one directory per test — so building, packing and installing cannot interfere with the run.

It never runs a lifecycle command, never starts a test, never commits or pushes, and never changes a tracked file in the checkout.

**Windows.** The same command works unchanged in PowerShell — quote the TEST_PATH if it contains spaces, e.g. `--workspace "C:\Users\j\Projects\board-test"`. npm's global prefix keeps its executables directly in the prefix directory there, so setup looks for `synth.cmd` as well as `bin/synth` and records whichever it installs. npm itself is a `.cmd` shim, which Node refuses to start directly since its 2024 command-injection fix, so on Windows those shims are launched through the command shell with their arguments quoted; a step that produces no exit code now reports the spawn error instead of `exit null`.

**Plain comparison (optional).** The plain condition never runs the tool, so nothing is built for it — no `npm run build`, no `npm pack`, no install, and the checkout is untouched. Point the same command at a *separate* TEST_PATH whose path does not spell the tool's name, with `--condition plain`: the instruction file and fixtures come straight from the checkout, and the run writes **nothing** outside TEST_PATH. Never let one session see both conditions.

## Step 2 — launch the agent in TEST_PATH

Start **one fresh agent session in TEST_PATH** and give it the printed launch line verbatim.

**Guided condition — the line must name SYNTH:**

```text
This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`.
```

**Plain condition — the line names no tool:**

```text
Read INSTRUCTIONS.md in the root of this workspace and follow it.
```

Nothing on the machine announces SYNTH: there is no skill, plugin, hook, MCP server or background service that would let the agent infer that a CLI called `synth` exists, is installed, or is relevant to this work — and no file outside the trial workspace refers to it. An agent that is told only "follow the instructions" is free to invent an ordinary process and skip the tool entirely, which would quietly turn the guided condition into a second plain run. So the guided hand-off states the tool, its install name and the first command in the operator's own words, and `INSTRUCTIONS.md` states it again as its opening paragraph. This is also why the setup banner refuses to look neutral: it prints the line for the condition it just staged and says what must not be added.

**The setup log is the operator's, not the agent's input.** The banner prints the tested revision, and a branch name or commit subject can itself spell the tool's name — this working branch is `arena/f3c711cb-synth`, for example. That is harmless on the operator's screen, but it means the setup output must never go into a plain TEST_PATH, into a plain evidence bundle the agent reads, or onto a screen the agent shares. Keep it with the operator's notes, and prefer a revision whose branch and subject are neutral for a plain run.

The hand-off stays manual, and it is deliberately small — see [the known gap](#known-gap-no-auto-feed-initialization-command). The agent reads the staged instruction file, works through the tests present one directory at a time, and in the guided condition starts each test with SYNTH's own initialization process:

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

Run the capture script against the finished TEST_PATH. It is the primary path: it reads the workspace and files the evidence in the repository.

```bash
# from the checkout, after the sessions have stopped
node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>
```

It writes two things:

- `docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>[-plain].md` — the completed evidence, in the template's section order;
- `docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>[-plain]-raw/` — byte-identical copies of everything it read (`REPORT.md` keeps its bytes under a `.txt` suffix, so the repository link checker cannot mistake an agent's prose for repository links), a `SOURCES.json` inventory with every digest, `fixtures.json` with the recomputed revisions, and `SUMMARY.json` with everything the document was built from.

What it fills mechanically, per case: the recorded revisions recomputed against the frozen record (the same rule the setup executor refuses to drift from); every citation re-checked with the CLI's own rule — full-file SHA-256 plus the exact quoted line, and the exact original intent for `operator-intent` citations — against both the agent's `offer.json` and the CLI's recorded copy in `draft.json`; the offer id, `offeredAt` and attribution; the CLI error log; the recorded timestamps and spans; the staged instruction digests; and, when the scratch directory is reachable, the install proof from `<staging>/transcripts/`. The agent's `REPORT.md` sections are quoted verbatim and attributed to it.

What stays with you, because no file records it: your name, the agent and model, its tool access, local wall-clock, the time box, the `Met?` column of §0, every comparative reading in §5, each cell's terminal state, and the §7 recommendation. Those rows render as `<to confirm — operator: …>` and the script lists them when it finishes. Fill them in your own words; never let a machine guess a pass.

Two limits worth knowing: the scratch directory lives outside TEST_PATH, so pass `--staging <dir>` — or run the capture on the machine that holds it — to fill §2 without retyping digests; and a case whose starting inputs are not in the workspace is reported as `not computable`, never guessed. Refuse to overwrite existing evidence unless you mean it: the script insists on `--force`.

Per test, record — or check against the agent's report — the parts the script can only quote:

- exact commands and their exit codes;
- the starting-input revision and whether any **input** file changed. `INSTRUCTIONS.md` and `ENVIRONMENT.md` are written to the root, not into the test directories, and the CLI keeps its per-test state in `.synth/` inside the test directory it runs in, so the recorded revision covers the matched **inputs** only — say which of these appeared, and do not present the agent's own files as fixture drift;
- the relevant output: questions asked, options proposed, citations used, and whether they matched the actual files and lines;
- operator effort in minutes and the number of agent turns or interventions;
- unsupported assumptions, unresolved choices, and anything a condition got wrong;
- a terminal state of `pass`, `fail`, `blocked` or `not run` — with the reason. Never relabel a blocked or skipped test as a pass.

Keep SYNTH integrity checks separate from application tests. In `brownfield/`, run the project's own test command before and after the agent's change (`npm test`, record exit codes); the unmodified baseline is expected to pass.

The template the script renders is [guided-three-path-installed-trial-evidence-template.md](../analysis/guided-three-path-installed-trial-evidence-template.md); fill it by hand only when the script cannot run.

Commit the completed file and the raw directory on the trial branch, then link them from PR #347 in a comment written by the operator. Exclude private assets, credentials and machine-local secrets.

## Known gap: no auto-feed initialization command

Today the loop needs a human hand-off that *says the tool's name*. That is not a stylistic choice: nothing installed on the machine announces SYNTH — no skill, plugin, hook or service — so the operator's sentence and the staged `INSTRUCTIONS.md` are the entire mechanism by which an agent learns the tool exists. A future guided entry would have to replace that sentence with something equally explicit, not something implicit, and `synth` cannot yet hand instructions back to a running agent. Proposed slice, **not implemented here and not authorized by this document**:

- Have the existing `first-contact --dry-run` / `status` projection emit an agent-facing next-steps block (machine-readable plus a short human sentence), instead of adding a new verb — the E4 diagnostic argued against growing default ceremony, and the projection already carries a `nextStep` field and a provenance `note`.
- An agent already pointed at `synth` could then self-serve the next commands after each step, reducing the operator to one launch.
- Judge the proposal against this trial's evidence before building it: if the guided condition does not earn its steps, adding an auto-feed command would compound the cost the diagnostic already flagged.

## Honest limits of this evidence

- One agent, one model build, unblinded. **One session may run all the tests**, which leaves order effects uncontrolled: if you want a cleaner comparison, run one test per session and alternate guided/plain order across tests.
- Operator effort in minutes is a crude proxy; owner value, real-user comprehension and team adoption are not measured.
- The offers end in `awaiting-response`, so nothing here exercises confirmation, delegation or rejection of a response by a real person.
- A passing guided test shows the installed CLI can run the loop and produce traceable, unauthenticated proposals — not that the guidance improved the outcome. A failing or blocked run is evidence for simplification, not a moral failure of the trial.
- Setup itself, however carefully run, is never trial evidence.
- **Isolation is by layout and instruction, not by container.** Each test directory holds only its own inputs and nothing built by setup is inside TEST_PATH, but the checkout the CLI was built from is still on the machine, and a same-machine agent can reach its parent directory and any other checkout. Use a container or a separate machine when hard isolation is required. In a plain run nothing is written outside TEST_PATH at all.

## Setup validation performed on this branch (not trial evidence)

Recorded by the agent that wrote the script, for the same reasons as any smoke check: it validates the recipe, not the outcome. Command used — the only argument is TEST_PATH:

```bash
node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
```

- Guided: TEST_PATH was created (it did not exist), the CLI was built from the checkout with no clone, and the result was exactly `INSTRUCTIONS.md`, `ENVIRONMENT.md`, `greenfield/` (no files), `brownfield/` (`package.json`, `src/board.js`, `tests/board.test.js`, `docs/limitation.md`) and `documentation/` (`docs/requirements.md`). Every staged revision matched its published value, and no tarball, `node_modules` or transcript appeared inside TEST_PATH.
- Plain: a separate neutral TEST_PATH received only `INSTRUCTIONS.md` and the three test directories, with **zero** occurrences of the tool's name or the guided commands in that file, no `ENVIRONMENT.md`, and nothing written outside TEST_PATH.
- Inside a staged `brownfield/` the fixture's own suite passed (`npm test`, exit 0, pass 1 / fail 0) and guided initialization exited 0 each step: `--dry-run` discovered the four input files with no warnings, and an agent-shaped `offer.json` recorded with `--source-offer` left the brief `awaiting-response` with freshness `current` and zero answers. A first attempt quoting an incomplete source line was **rejected** — `Citation docs/limitation.md:1 does not match the live source line` — which is the citation check working.
- Refusals verified before any build time is spent: a non-empty TEST_PATH, a TEST_PATH inside the checkout, a scratch directory inside TEST_PATH (or containing it), a repo that is not a git work tree, and a `--pin` that does not resolve. Uncommitted changes are no longer a refusal: they are recorded in the manifest, and the tarball digest is what pins the build.
- The launch line is condition-specific and test-enforced: the guided line names the tool, its install name and its first command, and says so in `INSTRUCTIONS.md` as well; the plain line names nothing, and the plain instruction file and TEST_PATH contain zero occurrences of the tool's name. Nothing on the machine would tell an agent otherwise, so both are checked as strings, not trusted to the operator's phrasing.
- `node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>` performs the capture of Step 4. Its suite, `npm run test:guided-installed-trial-evidence` (11 tests, 77 assertions), runs it end to end against synthetic workspaces and asserts byte-identical raw copies, recomputed revisions against the frozen record, one correct and one deliberately wrong citation hash, the launch line taken from the setup manifest rather than retyped, operator-only rows left as placeholders, a plain workspace landing in a `-plain` file, idempotency, and — through the same link rule the repository uses — that every relative link the rendered document contains resolves.
- `npm run test:guided-installed-trial-setup` (31 checks) covers the guards, the inferred layout, the created/empty/refused TEST_PATH states, the Windows spawn plan, the failure detail for a step with no exit code, the generated environment note, the condition-specific launch line, both instruction files and the revision constants. The suite runs the real npm build, pack and install against a throwaway checkout holding a tiny packable package, so the guided path is exercised rather than simulated.

Every trial test remains `not run`. Same agent, one session, unblinded, no independent observation.

## Appendix A — manual setup equivalent (optional)

The script *is* the three commands plus the copy step; this is the same thing by hand:

```bash
REPO=<synth-checkout>        # its committed HEAD is the revision under test
WS=<TEST_PATH>               # missing or empty, outside the checkout
CLI=<tmp>/trial-staging/$(git -C "$REPO" rev-parse --short=12 HEAD)

mkdir -p "$CLI/pack" "$CLI/global" "$CLI/transcripts" "$WS"

( cd "$REPO" && npm run build && npm pack --pack-destination "$CLI/pack" )
sha256sum "$CLI/pack/"*.tgz | tee "$CLI/transcripts/tarball.sha256"
npm install -g --prefix "$CLI/global" "$CLI/pack/"*.tgz
"$CLI/global/bin/synth" --version | tee "$CLI/transcripts/version.json"

FIX=$(mktemp -d)
node "$REPO/scripts/guided-installed-trial-fixtures.mjs" "$FIX" | tee "$CLI/transcripts/fixtures.json"
```

Then copy `$FIX/guided/<case>` into `$WS/<test>/`, where `<case>` → `<test>` is `green`→`greenfield`, `brown`→`brownfield`, `docs`→`documentation`, `knowledge`→`knowledge-led`, `conflict`→`conflicting-documents`; write `$REPO/docs/plans/guided-trial/instructions/guided.md` to `$WS/INSTRUCTIONS.md`; write the `ENVIRONMENT.md` of [Appendix B](#appendix-b--the-instruction-file-and-the-environment-note); and remove the temporary fixtures. For the plain condition, stage from `fixtures/plain/`, write `plain.md` as the root `INSTRUCTIONS.md`, and write no environment note — and build nothing.

The script does all of this, verifies every staged revision, refuses unsafe layouts and writes the manifest; prefer it.

Windows (PowerShell): use `$env:TEMP\...`, `Copy-Item`, `Get-FileHash -Algorithm SHA256`, and note that npm puts the executable directly in the prefix there — `"$CLI\global\synth.cmd"`, not under `bin\`. Setup finds whichever one npm creates.

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
| 2 | No access to the authoring checkout | Nothing built by setup is inside TEST_PATH, each test directory holds only its own inputs, and the agent stays inside its directory. The checkout the CLI was built from is still on the machine, so on one machine this is confinement by instruction — use a container or separate machine for hard isolation. | `cli-manifest.json`, `setup-manifest.json`; container/machine note if used |
| 3 | Blind to expectations | The agent is never told which condition is supposed to win. The plain instruction file and a plain TEST_PATH never mention SYNTH. | Staged `INSTRUCTIONS.md` copies, saved verbatim |
| 4 | Matched inputs | Identical fixture bytes; all revisions recorded before the first test. | `fixtures.json` in the capture's raw directory (guided) or the setup banner (plain), plus the revision table in the evidence |
| 5 | Matched treatment | Same agent/model/version, same tools, same task text, same directory layout. Only the guided extra commands differ. | Version lines + staged instruction files for both conditions |
| 6 | Order control | Fresh session per test where possible; one session per condition at minimum, and record the order actually used. | Run log with actual order |
| 7 | Pre-registration | Protocol, time box, expected observations and stop conditions fixed before the first session. | This document + the filled-in §1 of the template, committed or time-stamped first |
| 8 | Raw evidence | Verbatim transcripts, wall-clock per test, and an intervention log. No retroactive tidying. | Transcript files; interventions with exact wording |
| 9 | Artifact pinning | The installed tarball, built from the checkout's committed HEAD, is what ran; uncommitted changes are recorded, and the tarball digest is what pins the build. | `<staging>/transcripts/tarball.sha256`, `version.json`, `cli-manifest.json` |
| 10 | Condition integrity | No invented human words; guided offers end `awaiting-response`; no lifecycle command; no push; the guided session is launched with a line that names the tool, the plain one with a line that does not, and no setup log or evidence bundle enters a plain TEST_PATH. | Session transcripts, the verbatim launch lines and §6 of the template |
| 11 | Operator non-coaching | Any help beyond the one launch line is logged as an intervention verbatim — including any reminder that the tool exists. | Intervention log |

What a compliant run still does **not** establish: owner value, real-user comprehension, team adoption, delivery, production readiness, or that a human confirmed any response. One agent, one model build, one run per condition remains a diagnostic — it can support "keep as is" or "simplify", not a population claim.

If any requirement above is unavoidably unmet, say which and why in the evidence. A partially independent run reported honestly is useful; an unlabelled self-check is not.

## Appendix D — the short version

```bash
# from the checkout
node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
```

Then start the agent in `<TEST_PATH>` and give it the line the banner prints:

```text
# guided — name the tool, or the agent never learns it exists
This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`.

# plain — never name it
Read INSTRUCTIONS.md in the root of this workspace and follow it.
```

When the sessions have stopped, file the evidence from the same TEST_PATH:

```bash
node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>
```

That is the whole runbook. Expected starting-input revisions, printed by setup:

| Directory | Revision (SHA-256 of sorted source path/content pairs) |
| --- | --- |
| `greenfield/` | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` |
| `brownfield/` | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` |
| `documentation/` | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` |
| `knowledge-led/` (optional) | `d5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338` |
| `conflicting-documents/` (optional) | `fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5` |

The tarball digest is a property of **your** build, so it will differ from any figure quoted in this document: record yours instead of comparing. Advanced overrides, all inferred by default: `--condition plain`, `--cases`, `--pin`, `--repo`, `--cli-root`.
