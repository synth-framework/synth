# Installed-CLI guided-journey trial — evidence (2026-10-16)

Captured by `node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>` from `C:\Users\j\Projects\raw-board-test` on 2026-10-16T08:27:08.788Z (argument). Template: [guided-three-path-installed-trial-evidence-template.md](guided-three-path-installed-trial-evidence-template.md). Runbook: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

Machine-read rows come from the finished workspace — `REPORT.md`, `offer.json`, `.synth/first-contact/` (including the CLI's own recorded offer with its citation hashes), any other CLI-stored file — and from the scratch directory when it was reachable. Quotes attributed to `REPORT.md` are the agent's own words, copied verbatim. Rows reading `<to confirm — operator: …>` are operator-only: this script has no way to know them and will not guess. Raw byte-for-byte copies: `docs/analysis/guided-installed-cli-trial-2026-10-16-plain-raw/`.

Cells captured here: `greenfield/plain`, `brownfield/plain`, `documentation/plain`. Not captured in this file: `greenfield/guided`, `brownfield/guided`, `documentation/guided`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. The other condition needs its own TEST_PATH; capture that workspace separately with its own `--out`.

## 0. Independence compliance

Checklist: [instructions, Appendix C](../plans/guided-installed-cli-trial-instructions.md#appendix-c--independence-compliance-checklist). Mark each item and name anything unmet. The "evidence column" rows below are what this capture could prove mechanically; the "Met?" column stays with the operator.

| # | Requirement | Met? | Note or evidence |
| --- | --- | --- | --- |
| 1 | Sessions run by a different agent and fresh sessions than the authoring agent | <to confirm — operator: who ran the sessions and whether they had seen this repository> | No agent identity is recorded in TEST_PATH. The launch line setup printed is in §1. |
| 2 | Agent had no access to the authoring checkout | <to confirm — operator: how the machine was isolated> | No build output, tarball or `node_modules` inside TEST_PATH. Staging: not recorded. |
| 2b | Isolation mode: same-machine confinement by layout and instruction, or a container/separate machine | <to confirm — operator: confinement or container/separate machine> | No ENVIRONMENT.md in TEST_PATH, so the plain condition wrote nothing outside it. |
| 3 | Agent blind to which condition is expected to win; plain prompt never mentioned SYNTH | <to confirm — operator: confirm the prompt you typed and that nothing else named the tool> | staged `INSTRUCTIONS.md` present: 5825 B, sha256 `3dcce10b8ac2cadbe617174661d03687882fb850e77681cf354b2ff83f14b0f8`, names no tool (plain set). |
| 4 | Matched inputs; revisions recorded before the first cell | <to confirm — operator: confirm the setup run preceded the first cell> | §3 recomputes every captured case against the frozen record: greenfield matched; brownfield matched; documentation matched. |
| 5 | Matched agent/model/version, tools, starting request text | <to confirm — operator: the agent, model, version and tool access used in this condition> | The starting request text per case is in the raw copies and quoted in §4; the staged instruction set is sha256 `3dcce10b8ac2cadbe617174661d03687882fb850e77681cf354b2ff83f14b0f8`. |
| 6 | Session plan and order (fresh session per test where possible; one session per condition at minimum) | <to confirm — operator: the actual order and session count> | Recorded CLI timestamps: greenfield no timestamp; brownfield no timestamp; documentation no timestamp. |
| 7 | Protocol, time box, expected observations and stop conditions pre-registered | <to confirm — operator: the time box and where the protocol was fixed> | [guided-three-path-matched-comparison.md](guided-three-path-matched-comparison.md) and the runbook were in the repository before this run; the commits carrying them are in the branch history. |
| 8 | Verbatim transcripts, wall-clock per cell, intervention log | <to confirm — operator: confirm nothing was tidied or withheld> | the plain condition stores no CLI state by design, so its record is the agent report (copied byte-for-byte into the raw bundle, and quoted in the cells where a section was not labelled); CLI transcripts captured for 0 of 3 case(s); agent reports captured for 3 of 3. |
| 9 | Installed tarball pinned and identified (not a repo build) | <to confirm — operator: confirm the installed CLI is the one that ran> | not applicable to this arm — the plain condition installs nothing; the guided capture of the same trial carries the pin (see its §2). |
| 10 | No invented human words; guided cells ended `awaiting-response`; no lifecycle action; no push | <to confirm — operator: confirm from your own session> | the plain condition stores no CLI state, so nothing recorded a human response; the agent report is the only record of the session; no lifecycle, selection or push command appears in a captured command list |
| 11 | Operator coaching logged verbatim | <to confirm — operator: every intervention, verbatim — including any reminder that the tool exists> | 0 input event(s) — this condition records no CLI transcript, so a 0 here means nothing was recorded, not that nothing was said; the launch line is quoted in §1. |

Anything unmet, and why: <to confirm — operator: list every unmet item and the reason, or write "none">

## 1. Run identity

| Field | Value |
| --- | --- |
| Operator (who ran the trial) | <to confirm — operator: your name> |
| Setup executed by (agent/tool, model, version) | <to confirm — operator: who or what ran `guided-installed-trial-setup.mjs`, and its model/version> |
| Setup command and exit code | <to confirm — operator: the setup command you ran and its exit code> |
| TEST_PATH state before setup | <to confirm — operator: missing, or empty> |
| Was TEST_PATH created by setup? | <to confirm — operator: yes or no> |
| Scratch directory (outside TEST_PATH) | not applicable — the plain condition builds nothing and writes nothing outside TEST_PATH |
| CLI manifest / setup manifest | `none — the plain condition writes nothing outside TEST_PATH` |
| Instruction file staged at TEST_PATH root | `INSTRUCTIONS.md` (plain set — names no tool), sha256 `3dcce10b8ac2cadbe617174661d03687882fb850e77681cf354b2ff83f14b0f8`, no `ENVIRONMENT.md` (plain condition) |
| Launch line given to the agent, verbatim | recorded by setup: `Read INSTRUCTIONS.md in the root of this workspace and follow it.` (the line this repository's script prints for this condition — the manifest was not reachable). <to confirm — operator: paste what you actually typed, and if you changed the wording, say exactly how> |
| Date and timezone, start/end | `greenfield`: 2026-10-16T07:53:48.962Z → 2026-10-16T07:53:54.126Z (artifact mtimes — this condition records no CLI timestamps); `brownfield`: 2026-10-16T07:54:32.103Z → 2026-10-16T07:54:41.612Z (artifact mtimes — this condition records no CLI timestamps); `documentation`: 2026-10-16T07:54:55.953Z → 2026-10-16T07:55:00.948Z (artifact mtimes — this condition records no CLI timestamps); filename date `2026-10-16` (argument). <to confirm — operator: your local timezone, and the start/end the operator saw — the mtimes are the machine clock reading when the files were written, not a clock the operator set> |
| Running agent, model and version | <to confirm — operator: agent product, model and version; session ids> |
| Tool access given to the agent | <to confirm — operator: shell, editor, network, and anything else> |
| Pinned repository revision | <to confirm — operator: the commit the CLI was built from> |
| Environment | <to confirm — operator: node --version, npm --version, OS — the machine that ran setup and the sessions> |
| Time box set before starting | <to confirm — operator: the time box you set, and whether the run stayed inside it> |
| Private assets involved | `none` (required; any private asset invalidates this run) |

## 2. Install proof

| Field | Value |
| --- | --- |
| Build, pack and install | not applicable — the plain condition installs nothing and writes nothing outside TEST_PATH; its `INSTRUCTIONS.md` named no tool. The install proof of the same trial is in the guided capture. |

## 3. Matched input revisions

| Case | Expected revision | Observed revision | Matched? |
| --- | --- | --- | --- |
| greenfield | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | yes |
| brownfield | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` | yes |
| documentation | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` | yes |
| knowledge-led | `d5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338` | not captured — no `knowledge-led/` in this TEST_PATH | n/a |
| conflicting-documents | `fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5` | not captured — no `conflicting-documents/` in this TEST_PATH | n/a |

If any required case did not match, stop and report `blocked` — do not continue to the cells.

## 4. Cells

One block per case and condition. This capture holds 3 cell(s): `greenfield/plain`, `brownfield/plain`, `documentation/plain`. Required cases produce six blocks across both conditions; blocks for cells that were not run stay out of this file and are reported as `not run` here.

### greenfield / plain

- Session id and start time: no CLI timestamp (this condition leaves no CLI state); artifact mtimes in TEST_PATH `2026-10-16T07:53:48.962Z` → `2026-10-16T07:53:54.126Z` — when the files were written on this machine's clock, not a start/end the operator set. <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
(no shell commands run for this test; directory listing done via file read)
APPROACH: Inspected greenfield/ directory first and confirmed it is empty; derived proposal only from the quoted task text; wrote offer.json with one decision question and three grounded options; wrote this report. Chose this process because with no starting files the only evidence is the task text, and the required observation is questions/options about board kind, inputs, editing and validation without inventing GUI or stack.
```
- Input revision at start / any file change during the cell: expected `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; observed `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; matched yes — this case starts empty, so the revision is the hash of an empty file set. Files present that are not starting inputs: `REPORT.md` (1590 B), `offer.json` (2996 B).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~5 minutes for this test; recorded 0 operator input event(s) and 0 agent event(s) in the CLI transcript. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Questions or options the agent raised: as written in `REPORT.md`:

```text
path greenfield/offer.json; question "What board input and editing interaction should the first slice support?"; options (A) SVG-file input with single-attribute edit, (B) Explicit specimen-list input with list edit, (C) Fixed minimal board kind with constrained edit.
```
- Grounding: which files/lines were actually read and cited: as written in `REPORT.md`:

```text
No file citations (directory empty, verified by read of greenfield/). Task text quoted in offer.json as "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." — matches INSTRUCTIONS.md Section 3 task text.
```

Re-checked here from `offer.json` (the plain condition records no citation hashes, so each quote was compared with the live file line, and task-text quotes with the staged task text): 3 citation(s), 0 matched (0 file line(s), 0 task-text quote(s)), 3 did NOT — a quote marked as the task text that is not this case's staged task text; a quote marked as the task text that is not this case's staged task text; a quote marked as the task text that is not this case's staged task text.
- Unsupported assumptions: as written in `REPORT.md`:

```text
Assumed empty directory means no hidden constraints on board kind, input format, or stack; assumed "specimen-board exporter" implies SVG output but left board kind open.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
Decision in offer.json left to a person (board input and editing interaction); board kind, full input schema, validation rules, and wider editing scope unverified and undecided.
```
- Application test command and exit (brown only): as written in `REPORT.md`:

```text
N/A (brownfield only)
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
None; nothing misled.
```

### brownfield / plain

- Session id and start time: no CLI timestamp (this condition leaves no CLI state); artifact mtimes in TEST_PATH `2026-10-16T07:54:32.103Z` → `2026-10-16T07:54:41.612Z` — when the files were written on this machine's clock, not a start/end the operator set. <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
npm test (before change) -> exit 0; npm test (after, no source change) -> exit 0. Both run with workdir brownfield/.
APPROACH: Read brownfield/package.json, src/board.js, tests/board.test.js, docs/limitation.md in that order to establish existing behavior; ran npm test before any change; wrote offer.json as delta-only proposal citing all three files with exact path/line/quote; re-ran npm test to verify no drift; wrote this report. Chose proposal-only with no source edits to preserve existing behavior and tests per the documented limitation.
```
- Input revision at start / any file change during the cell: expected `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; observed `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; matched yes — 4 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (1941 B), `offer.json` (3239 B).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~10 minutes for this test; recorded 0 operator input event(s) and 0 agent event(s) in the CLI transcript. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Questions or options the agent raised: as written in `REPORT.md`:

```text
path brownfield/offer.json; question "How should the user-selected fill color be accepted while preserving the existing label output?"; options (A) Optional second fill argument with default preserving output, (B) Optional options object with fill field, (C) Separate fill-aware function reusing render.
```
- Grounding: which files/lines were actually read and cited: as written in `REPORT.md`:

```text
src/board.js line 1 "export const render = label => `<text>${label}</text>`;" — matched real file content and line; tests/board.test.js line 4 "test('existing label', () => assert.equal(render('A'), '<text>A</text>'));" — matched; docs/limitation.md line 1 "Current renderer supports labels but not a user-selected fill color. Preserve its existing label output." — matched.
```

Re-checked here from `offer.json` (the plain condition records no citation hashes, so each quote was compared with the live file line, and task-text quotes with the staged task text): 6 citation(s), 6 matched (6 file line(s), 0 task-text quote(s)).
- Unsupported assumptions: as written in `REPORT.md`:

```text
Assumed npm test exit code 0 means existing behavior intact; assumed fill color means SVG fill attribute on the text element (not verified with requester).
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
Decision in offer.json left to a person (fill-color parameter shape); fill value validation, default color, and SVG escaping not decided.
```
- Application test command and exit (brown only): as written in `REPORT.md`:

```text
before change: command "npm test", exit 0, result pass 1 fail 0 (existing label); after change: no source change made (proposal only), re-ran "npm test", exit 0, result pass 1 fail 0. Existing tests and fixtures not edited.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
None; nothing misled. No wholesale rewrite done.
```

### documentation / plain

- Session id and start time: no CLI timestamp (this condition leaves no CLI state); artifact mtimes in TEST_PATH `2026-10-16T07:54:55.953Z` → `2026-10-16T07:55:00.948Z` — when the files were written on this machine's clock, not a start/end the operator set. <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
(no shell commands run for this test; directory and file reads via file read)
APPROACH: Listed documentation/docs/ then read documentation/docs/requirements.md in full; treated its two lines as the full scope (export decided, editing style undecided) and framed the conflict as the decision question; wrote offer.json with three grounded options showing consequences; wrote this report. Chose this process because the required observation is to cite actual docs files by path and line and surface conflict as a decision, not silently resolve it.
```
- Input revision at start / any file change during the cell: expected `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; observed `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; matched yes — 1 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (1751 B), `offer.json` (2833 B).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~5 minutes for this test; recorded 0 operator input event(s) and 0 agent event(s) in the CLI transcript. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Questions or options the agent raised: as written in `REPORT.md`:

```text
path documentation/offer.json; question "Given that export is from local data but editing is requested with undecided style, what editing interaction should the next slice include?"; options (A) Export-only slice defer editing, (B) Minimal pre-export edit of one field, (C) Explicit staged edit then export.
```
- Grounding: which files/lines were actually read and cited: as written in `REPORT.md`:

```text
docs/requirements.md line 1 "The first board exports one SVG from local data." — matched real file content and line; docs/requirements.md line 2 "Editing is requested, but its interaction style is undecided." — matched.
```

Re-checked here from `offer.json` (the plain condition records no citation hashes, so each quote was compared with the live file line, and task-text quotes with the staged task text): 5 citation(s), 5 matched (5 file line(s), 0 task-text quote(s)).
- Unsupported assumptions: as written in `REPORT.md`:

```text
Assumed "local data" means caller-supplied in-memory data (not a file or remote source) but did not verify; assumed no other requirements files exist beyond docs/requirements.md as found by listing.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
Decision in offer.json left to a person (editing interaction style for next slice); validation rules, board kind, and export format details unverified.
```
- Application test command and exit (brown only): as written in `REPORT.md`:

```text
N/A (brownfield only)
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
None; nothing misled. Genuine tension between line 1 (decided export) and line 2 (undecided editing) kept as explicit decision with consequences per option.
```

## 5. Cross-cutting observations

| Question | Answer |
| --- | --- |
| Did the guided condition ask substantively different or better questions? | <to confirm — operator: a comparative judgement — only a person who watched both conditions can answer it> |
| Did the guided condition add verifiable provenance the plain condition lacked? | <to confirm — operator: a comparative judgement — only a person who watched both conditions can answer it> |
| Which condition required fewer operator steps or less reading? | <to confirm — operator: a comparative judgement — only a person who watched both conditions can answer it> |
| Which condition produced a clearer next slice? | <to confirm — operator: a comparative judgement — only a person who watched both conditions can answer it> |
| Same agent/model and tool access in both conditions? | <to confirm — operator: yes or no, with the evidence that shows it> |
| Plain and guided run order, and could ordering explain the result? | <to confirm — operator: the order actually used and your reading of it> |
| Sessions used: one per condition, or one per test? Order used? | <to confirm — operator: the session plan you actually ran> |
| Anything that failed or was skipped, with the exact error text | no CLI error log was captured in this TEST_PATH; cells not captured in this file and therefore `not run` unless they ran elsewhere: `greenfield/guided`, `brownfield/guided`, `documentation/guided`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. |

## 6. Explicit statements

- Human words fabricated in any cell: `none` — required; the plain condition stores no CLI state at all, so nothing recorded a human response, and the offer and report files are quoted rather than paraphrased.
- Responses recorded per cell: captured CLI state — greenfield: 0 response(s), 0 choice review(s); brownfield: 0 response(s), 0 choice review(s); documentation: 0 response(s), 0 choice review(s). <to confirm — operator: confirm that no response exists outside the captured state>.
- Runtime Mission/Expedition lifecycle actions: none — no lifecycle, selection, approval, delivery or push command appears in the captured command lists or error logs (no command list was captured for at least one case, so check that session yourself).
- Pushes, pull requests or merges created by this trial: no `.git` directory inside TEST_PATH; nothing was captured that could push. <to confirm — operator: confirm no session pushed from elsewhere>.
- Application tests weakened or skipped to make a cell pass: the agent's own `APPLICATION TESTS` statement, first line per cell — greenfield: N/A (brownfield only) | brownfield: before change: command "npm test", exit 0, result pass 1 fail 0 (existing label); after change: no source change made (proposal only), re-ran "npm test", exit 0, result pass 1 fail 0. Existing tests and fixtures not edited. | documentation: N/A (brownfield only); the full sections are in the raw copies. <to confirm — operator: confirm no test was weakened>.
- Isolation mode: <to confirm — operator: confinement by layout and instruction, a container, or a separate machine>.
- Plain condition: this TEST_PATH — `C:\Users\j\Projects\raw-board-test`.
- Build output visible inside TEST_PATH: none — no build output, tarball or `node_modules` inside TEST_PATH.
- Total operator effort and whether it exceeded the time box: recorded CLI spans: greenfield unknown; brownfield unknown; documentation unknown. <to confirm — operator: total effort and whether it exceeded the time box>.
- Was setup run before the cells by the same agent that ran them?: <to confirm — operator: yes or no, and which cells>.
- Any auto-feed: `none — the agent was launched by hand with a line that names SYNTH, as the current CLI requires; no skill, plugin or service announces the tool`.
- Setup log: <to confirm — operator: where the setup log is kept, and confirm it never entered a plain TEST_PATH>.

## 7. What this evidence does and does not support

- **Mechanically supported by this capture:** in the plain condition the capture re-checked 14 grounding citation(s) found in the offer files, with 11 matching the live file line or the staged task text; the plain condition leaves no CLI state at all, so no recorded response, transcript or command list exists to check; no captured command list contains a lifecycle, approval, delivery or push command.
- **Not supported:** owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- **Not established by this capture, and yours to state:** whether any cell counts as `pass`, `fail` or `blocked`; the comparative §5 readings; and the 7 cell(s) this TEST_PATH did not hold (`greenfield/guided`, `brownfield/guided`, `documentation/guided`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`). §3 records what could be compared: greenfield matched, brownfield matched, documentation matched.
- Recommendation for ordinary PR #347 review: <to confirm — operator: keep as is / change / simplify / stop — with reasons, submitted in your own review comment>

