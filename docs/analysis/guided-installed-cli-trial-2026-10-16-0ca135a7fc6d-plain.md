# Installed-CLI guided-journey trial — evidence (2026-10-16)

Captured by `node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>` from `C:\Users\j\Projects\raw-board-test` on 2026-10-16T10:16:06.113Z (argument). Template: [guided-three-path-installed-trial-evidence-template.md](guided-three-path-installed-trial-evidence-template.md). Runbook: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

Machine-read rows come from the finished workspace — `REPORT.md`, `offer.json`, `.synth/first-contact/` (including the CLI's own recorded offer with its citation hashes), any other CLI-stored file — and from the scratch directory when it was reachable. Quotes attributed to `REPORT.md` are the agent's own words, copied verbatim. Rows reading `<to confirm — operator: …>` are operator-only: this script has no way to know them and will not guess. Raw byte-for-byte copies: `docs/analysis/guided-installed-cli-trial-2026-10-16-0ca135a7fc6d-plain-raw/`.

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
| Other files in TEST_PATH root (not starting inputs) | `TRANSCRIPT.md` (3562 B, sha256 `16609a2b0869dcb393813337298af655e3e7ef101779519909abb4139a54b443`, copied into the raw bundle) |
| Launch line given to the agent, verbatim | recorded by setup: `Read INSTRUCTIONS.md in the root of this workspace and follow it.` (the line this repository's script prints for this condition — the manifest was not reachable). <to confirm — operator: paste what you actually typed, and if you changed the wording, say exactly how> |
| Date and timezone, start/end | `greenfield`: 2026-10-16T09:57:22.242Z → 2026-10-16T09:57:31.542Z (artifact mtimes — this condition records no CLI timestamps); `brownfield`: 2026-10-16T09:58:03.561Z → 2026-10-16T09:58:27.767Z (artifact mtimes — this condition records no CLI timestamps); `documentation`: 2026-10-16T09:58:51.202Z → 2026-10-16T09:58:56.454Z (artifact mtimes — this condition records no CLI timestamps); filename date `2026-10-16` (argument). <to confirm — operator: your local timezone, and the start/end the operator saw — the mtimes are the machine clock reading when the files were written, not a clock the operator set> |
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

- Session id and start time: no CLI timestamp (this condition leaves no CLI state); artifact mtimes in TEST_PATH `2026-10-16T09:57:22.242Z` → `2026-10-16T09:57:31.542Z` — when the files were written on this machine's clock, not a start/end the operator set. <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
none — no shell commands were run inside greenfield/ (exit codes: n/a)
```
- Input revision at start / any file change during the cell: expected `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; observed `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; matched yes — this case starts empty, so the revision is the hash of an empty file set. Files present that are not starting inputs: `REPORT.md` (1870 B), `offer.json` (3144 B).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: rough elapsed time for this test: ~10 minutes; recorded 0 operator input event(s) and 0 agent event(s) in the CLI transcript. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Questions or options the agent raised: as written in `REPORT.md`:

```text
path greenfield/offer.json. Question: "Since board input and editing interaction are undecided, what should count as the board, its input, its editing interaction, and its validation for the first exporter slice?" Options: (A) Clarify board kind and input shape first; (B) Clarify editing interaction first; (C) Clarify validation and acceptance first. Each option lists tradeoff and what would show it works, grounded in the task text.
```
- Grounding: which files/lines were actually read and cited: as written in `REPORT.md`:

```text
(1) Task text quoted from INSTRUCTIONS.md Section 3 table: "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." — matched INSTRUCTIONS.md as read. (2) No files under greenfield/ to cite — directory read returned 0 entries, verified. Offer options ground in (1), not in invented files.
```

Re-checked here from `offer.json` (the plain condition records no citation hashes, so each quote was compared with the live file line, and task-text quotes with the staged task text): 3 citation(s) — 1 distinct, 2 of them recorded twice, 3 matched (0 file line(s), 3 task-text quote(s)).
- Unsupported assumptions: as written in `REPORT.md`:

```text
Assumed that proposing without implementing is the correct outcome when input and interaction are explicitly undecided. Assumed no hidden files in greenfield/ beyond the empty directory listing.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
Board kind, board input shape, editing interaction scope, and validation/acceptance — all left to the requester. No option selected here.
```
- Application test command and exit (brown only): as written in `REPORT.md`:

```text
n/a — greenfield test has no application tests.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- How the agent says it worked (`REPORT.md` section APPROACH, requested by the plain instruction set, verbatim): ```text
1) Read INSTRUCTIONS.md fully. 2) Listed the workspace root and confirmed greenfield/ exists and is empty. 3) Used only the quoted task text for this test and stopped at the undecided decision instead of inventing a GUI or stack. 4) Wrote greenfield/offer.json with one question and three options, then wrote this REPORT.md.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
Nothing blocked; empty starting directory means every input, interaction, and validation choice requires a person.
```

### brownfield / plain

- Session id and start time: no CLI timestamp (this condition leaves no CLI state); artifact mtimes in TEST_PATH `2026-10-16T09:58:03.561Z` → `2026-10-16T09:58:27.767Z` — when the files were written on this machine's clock, not a start/end the operator set. <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
npm test (before proposal) — exit 0; npm test (before proposal, with exit echo) — exit 0; npm test (after proposal, source untouched) — exit 0. All run with workdir brownfield/.
```
- Input revision at start / any file change during the cell: expected `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; observed `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; matched yes — 4 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (2503 B), `offer.json` (3715 B).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: rough elapsed time for this test: ~15 minutes; recorded 0 operator input event(s) and 0 agent event(s) in the CLI transcript. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Questions or options the agent raised: as written in `REPORT.md`:

```text
path brownfield/offer.json. Question: "How should the user-selected fill color be accepted while keeping render('A') as '<text>A</text>'?" Options: (A) Optional second argument with default preserving current output; (B) Optional options value with default preserving current output. Each option lists tradeoff and what would show it works, grounded in the task text and cited files. Scope is delta-only with no rewrite.
```
- Grounding: which files/lines were actually read and cited: as written in `REPORT.md`:

```text
(1) src/board.js line 1: "export const render = label => `<text>${label}</text>`;" — matched file content and line. (2) tests/board.test.js line 4: "test('existing label', () => assert.equal(render('A'), '<text>A</text>'));" — matched file content and line. (3) docs/limitation.md line 1: "Current renderer supports labels but not a user-selected fill color. Preserve its existing label output." — matched file content and line. (4) Task text: "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." — matched INSTRUCTIONS.md Section 3 table.
```

Re-checked here from `offer.json` (the plain condition records no citation hashes, so each quote was compared with the live file line, and task-text quotes with the staged task text): 9 citation(s) — 4 distinct, 5 of them recorded twice, 9 matched (7 file line(s), 2 task-text quote(s)).
- Unsupported assumptions: as written in `REPORT.md`:

```text
Assumed proposal-only is correct and source edits are not required to complete the trial slice. Assumed preserving one-argument output exactly is the acceptance for backward compatibility.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
Which fill-acceptance shape the requester wants (positional vs options value), allowed fill values/validation, and default behavior when fill is omitted or invalid — left to a person. No option selected here.
```
- Application test command and exit (brown only): as written in `REPORT.md`:

```text
command npm test (node --test tests/board.test.js). Before change: exit 0, 1 pass / 0 fail ("existing label" passed). After change (no src/test/fixture edits; only offer.json + REPORT.md added): exit 0, 1 pass / 0 fail. No existing tests or fixtures were edited.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- How the agent says it worked (`REPORT.md` section APPROACH, requested by the plain instruction set, verbatim): ```text
1) Read brownfield/src/board.js, brownfield/tests/board.test.js, brownfield/docs/limitation.md and brownfield/package.json. 2) Ran npm test before any change to record baseline. 3) Proposed only the fill-color delta in brownfield/offer.json without editing src, tests, or fixtures. 4) Ran npm test again after writing the proposal to confirm existing behavior still passes. 5) Wrote this REPORT.md.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
Nothing blocked; no failures to record.
```

### documentation / plain

- Session id and start time: no CLI timestamp (this condition leaves no CLI state); artifact mtimes in TEST_PATH `2026-10-16T09:58:51.202Z` → `2026-10-16T09:58:56.454Z` — when the files were written on this machine's clock, not a start/end the operator set. <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
none — no shell commands were run inside documentation/ (exit codes: n/a)
```
- Input revision at start / any file change during the cell: expected `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; observed `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; matched yes — 1 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (1985 B), `offer.json` (3666 B).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: rough elapsed time for this test: ~10 minutes; recorded 0 operator input event(s) and 0 agent event(s) in the CLI transcript. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Questions or options the agent raised: as written in `REPORT.md`:

```text
path documentation/offer.json. Question: "Given the first board exports one SVG from local data but editing is requested with undecided interaction, what should the next slice prioritize?" Options: (A) Harden the single SVG export from local data first; (B) Decide the editing interaction before hardening export. Each option lists tradeoff and what would show it works, grounded in the task text and both requirement lines.
```
- Grounding: which files/lines were actually read and cited: as written in `REPORT.md`:

```text
(1) docs/requirements.md line 1: "The first board exports one SVG from local data." — matched file content and line. (2) docs/requirements.md line 2: "Editing is requested, but its interaction style is undecided." — matched file content and line. (3) Task text: "Continue from the requirements in docs/. The next slice is undecided." — matched INSTRUCTIONS.md Section 3 table. The conflict between (1) and (2) is surfaced in the offer as undecided, not silently resolved.
```

Re-checked here from `offer.json` (the plain condition records no citation hashes, so each quote was compared with the live file line, and task-text quotes with the staged task text): 8 citation(s) — 3 distinct, 5 of them recorded twice, 8 matched (6 file line(s), 2 task-text quote(s)).
- Unsupported assumptions: as written in `REPORT.md`:

```text
Assumed the two lines are the full requirement set for this test; no other files under documentation/docs/ besides requirements.md per directory listing.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
Whether the next slice hardens single-SVG-from-local-data export or fixes the editing interaction first, plus validation for each — left to a person. No option selected here.
```
- Application test command and exit (brown only): as written in `REPORT.md`:

```text
n/a — documentation test has no application tests.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- How the agent says it worked (`REPORT.md` section APPROACH, requested by the plain instruction set, verbatim): ```text
1) Read documentation/docs/requirements.md and confirmed it has two lines. 2) Used only the quoted task text plus those two lines to frame the export-vs-editing tension as an unresolved decision. 3) Wrote documentation/offer.json with one question and two options showing consequences for each line, then wrote this REPORT.md.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
Nothing blocked; the undecided interaction style means no implementation could be accepted without a requester decision.
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
- Application tests weakened or skipped to make a cell pass: the agent's own `APPLICATION TESTS` statement, first line per cell — greenfield: n/a — greenfield test has no application tests. | brownfield: command npm test (node --test tests/board.test.js). Before change: exit 0, 1 pass / 0 fail ("existing label" passed). After change (no src/test/fixture edits; only offer.json + REPORT.md added): exit 0, 1 pass / 0 fail. No existing tests or fixtures were edited. | documentation: n/a — documentation test has no application tests.; the full sections are in the raw copies. <to confirm — operator: confirm no test was weakened>.
- Isolation mode: <to confirm — operator: confinement by layout and instruction, a container, or a separate machine>.
- Plain condition: this TEST_PATH — `C:\Users\j\Projects\raw-board-test`.
- Build output visible inside TEST_PATH: none — no build output, tarball or `node_modules` inside TEST_PATH.
- Total operator effort and whether it exceeded the time box: recorded CLI spans: greenfield unknown; brownfield unknown; documentation unknown. <to confirm — operator: total effort and whether it exceeded the time box>.
- Was setup run before the cells by the same agent that ran them?: <to confirm — operator: yes or no, and which cells>.
- Any auto-feed: `none — the agent was launched by hand with a line that names SYNTH, as the current CLI requires; no skill, plugin or service announces the tool`.
- Setup log: <to confirm — operator: where the setup log is kept, and confirm it never entered a plain TEST_PATH>.

## 7. What this evidence does and does not support

- **Mechanically supported by this capture:** in the plain condition the capture re-checked 20 grounding citation(s) found in the offer files (8 distinct — the rest record a path, line and quote already read), with 20 matching the live file line or the staged task text in full; the plain condition leaves no CLI state at all, so no recorded response, transcript or command list exists to check; no captured command list contains a lifecycle, approval, delivery or push command.
- **Not supported:** owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- **Not established by this capture, and yours to state:** whether any cell counts as `pass`, `fail` or `blocked`; the comparative §5 readings; and the 7 cell(s) this TEST_PATH did not hold (`greenfield/guided`, `brownfield/guided`, `documentation/guided`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`). §3 records what could be compared: greenfield matched, brownfield matched, documentation matched.
- Recommendation for ordinary PR #347 review: <to confirm — operator: keep as is / change / simplify / stop — with reasons, submitted in your own review comment>

