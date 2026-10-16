# Installed-CLI guided-journey trial — evidence (2026-10-15)

Captured by `node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>` from `/home/user/trial-workspace` on 2026-10-16T07:14:57.726Z (argument). Template: [guided-three-path-installed-trial-evidence-template.md](guided-three-path-installed-trial-evidence-template.md). Runbook: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

Machine-read rows come from the finished workspace — `REPORT.md`, `offer.json`, `.synth/first-contact/` (including the CLI's own recorded offer with its citation hashes), any other CLI-stored file — and from the scratch directory when it was reachable. Quotes attributed to `REPORT.md` are the agent's own words, copied verbatim. Rows reading `<to confirm — operator: …>` are operator-only: this script has no way to know them and will not guess. Raw byte-for-byte copies: `docs/analysis/guided-installed-cli-trial-2026-10-15-raw/`.

This is a copy: the staged `ENVIRONMENT.md` records the workspace as `C:\Users\j\Projects\board-test`, and the copy captured here ran at `/home/user/trial-workspace`. Every artifact below is byte-identical to that copy's files; the digests in `docs/analysis/guided-installed-cli-trial-2026-10-15-raw/SOURCES.json` name both paths. The operator's own machine is the source of the run, not of these bytes.

Cells captured here: `greenfield/guided`, `brownfield/guided`, `documentation/guided`. Not captured in this file: `greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. The other condition needs its own TEST_PATH; capture that workspace separately with its own `--out`.

## 0. Independence compliance

Checklist: [instructions, Appendix C](../plans/guided-installed-cli-trial-instructions.md#appendix-c--independence-compliance-checklist). Mark each item and name anything unmet. The "evidence column" rows below are what this capture could prove mechanically; the "Met?" column stays with the operator.

| # | Requirement | Met? | Note or evidence |
| --- | --- | --- | --- |
| 1 | Sessions run by a different agent and fresh sessions than the authoring agent | <to confirm — operator: who ran the sessions and whether they had seen this repository> | No agent identity is recorded in TEST_PATH. The launch line setup printed is in §1. |
| 2 | Agent had no access to the authoring checkout | <to confirm — operator: how the machine was isolated> | No build output, tarball or `node_modules` inside TEST_PATH. Staging: `C:\Users\j\AppData\Local\Temp\trial-staging\917d662a31bd` (NOT reachable from this capture). |
| 2b | Isolation mode: same-machine confinement by layout and instruction, or a container/separate machine | <to confirm — operator: confinement or container/separate machine> | ENVIRONMENT.md records the workspace as `C:\Users\j\Projects\board-test` and the CLI outside it. |
| 3 | Agent blind to which condition is expected to win; plain prompt never mentioned SYNTH | <to confirm — operator: confirm the prompt you typed and that nothing else named the tool> | staged `INSTRUCTIONS.md` present: 7600 B, sha256 `07a7a56df1bb0ec7a5e3f9d5f9017cc12c7b7c42fb00c964be6cae1545d72321`, names the tool (guided set). |
| 4 | Matched inputs; revisions recorded before the first cell | <to confirm — operator: confirm the setup run preceded the first cell> | §3 recomputes every captured case against the frozen record: greenfield matched; brownfield matched; documentation matched. |
| 5 | Matched agent/model/version, tools, starting request text | <to confirm — operator: the agent, model, version and tool access used in this condition> | The starting request text per case is in the raw copies and quoted in §4; the staged instruction set is sha256 `07a7a56df1bb0ec7a5e3f9d5f9017cc12c7b7c42fb00c964be6cae1545d72321`. |
| 6 | Session plan and order (fresh session per test where possible; one session per condition at minimum) | <to confirm — operator: the actual order and session count> | Recorded CLI timestamps: greenfield 2026-10-16T05:37:24.070Z; brownfield 2026-10-16T05:39:26.916Z; documentation 2026-10-16T05:40:12.019Z. |
| 7 | Protocol, time box, expected observations and stop conditions pre-registered | <to confirm — operator: the time box and where the protocol was fixed> | [guided-three-path-matched-comparison.md](guided-three-path-matched-comparison.md) and the runbook were in the repository before this run; the commits carrying them are in the branch history. |
| 8 | Verbatim transcripts, wall-clock per cell, intervention log | <to confirm — operator: confirm nothing was tidied or withheld> | CLI transcripts captured for 3 of 3 case(s); agent reports captured for 3 of 3. |
| 9 | Installed tarball pinned and identified (not a repo build) | <to confirm — operator: confirm the installed CLI is the one that ran> | the staging directory was not reachable from this capture, so the tarball digest and version are in §2 as operator values. |
| 10 | No invented human words; guided cells ended `awaiting-response`; no lifecycle action; no push | <to confirm — operator: confirm from your own session> | Captured CLI state records 0 human response(s); no lifecycle, selection or push command appears in a captured command list; machine-recorded terminal projections: greenfield: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T05:38:53.461Z — the report's `first-contact status` line is quoted in §4; brownfield: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T05:39:44.577Z — the report's `first-contact status` line is quoted in §4; documentation: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T05:40:30.247Z — the report's `first-contact status` line is quoted in §4 |
| 11 | Operator coaching logged verbatim | <to confirm — operator: every intervention, verbatim — including any reminder that the tool exists> | 3 operator input event(s) across the captured transcripts (the kickoff line each). |

Anything unmet, and why: <to confirm — operator: list every unmet item and the reason, or write "none">

## 1. Run identity

| Field | Value |
| --- | --- |
| Operator (who ran the trial) | <to confirm — operator: your name> |
| Setup executed by (agent/tool, model, version) | <to confirm — operator: who or what ran `guided-installed-trial-setup.mjs`, and its model/version> |
| Setup command and exit code | <to confirm — operator: the setup command you ran and its exit code> |
| TEST_PATH state before setup | <to confirm — operator: missing, or empty> |
| Was TEST_PATH created by setup? | <to confirm — operator: yes or no> |
| Scratch directory (outside TEST_PATH) | `C:\Users\j\AppData\Local\Temp\trial-staging\917d662a31bd` — not reachable from this capture — tarball, installed CLI and transcripts |
| CLI manifest / setup manifest | <to confirm — operator: the staging manifest paths> |
| Instruction file staged at TEST_PATH root | `INSTRUCTIONS.md` (guided set — names the tool), sha256 `07a7a56df1bb0ec7a5e3f9d5f9017cc12c7b7c42fb00c964be6cae1545d72321`, plus `ENVIRONMENT.md` |
| Launch line given to the agent, verbatim | recorded by setup: ``This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`.`` (the line this repository's script prints for this condition — the manifest was not reachable). <to confirm — operator: paste what you actually typed, and if you changed the wording, say exactly how> |
| Date and timezone, start/end | `greenfield`: 2026-10-16T05:37:24.070Z → 2026-10-16T05:38:53.461Z; `brownfield`: 2026-10-16T05:39:26.916Z → 2026-10-16T05:39:44.577Z; `documentation`: 2026-10-16T05:40:12.019Z → 2026-10-16T05:40:30.247Z; filename date `2026-10-15` (argument). <to confirm — operator: your local timezone and the wall-clock start/end> |
| Running agent, model and version | <to confirm — operator: agent product, model and version; session ids> |
| Tool access given to the agent | <to confirm — operator: shell, editor, network, and anything else> |
| Pinned repository revision | `917d662a31bd176293c7696bec02f468c8bcbc4f` — 917d662 Keep the check counts current in the trial docs (ENVIRONMENT.md) |
| Environment | <to confirm — operator: node --version, npm --version, OS — the machine that ran setup and the sessions> |
| Time box set before starting | <to confirm — operator: the time box you set, and whether the run stayed inside it> |
| Private assets involved | `none` (required; any private asset invalidates this run) |

## 2. Install proof

| Field | Value |
| --- | --- |
| Build command and exit | `npm run build` → <to confirm — operator: the exit code from your own run> |
| Pack command and exit | `npm pack --pack-destination <staging>/pack` → <to confirm — operator: the exit code from your own run> |
| Tarball name | <to confirm — operator: the packed file name> |
| Tarball SHA-256 | <to confirm — operator: the tarball digest — re-run with `--staging <dir>` on the machine that holds it to fill this in mechanically> |
| Global install command and exit | `npm install -g --prefix <staging>/global <tarball>` → <to confirm — operator: the exit code from your own run> |
| `synth --version` output | <to confirm — operator: the JSON `synth --version` printed> |

Staging notes: staging directory not found at capture time: C:\Users\j\AppData\Local\Temp\trial-staging\917d662a31bd.

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

One block per case and condition. This capture holds 3 cell(s): `greenfield/guided`, `brownfield/guided`, `documentation/guided`. Required cases produce six blocks across both conditions; blocks for cells that were not run stay out of this file and are reported as `not run` here.

### greenfield / guided

- Session id and start time: journeyId `4e22bb17-e4ca-459d-b997-c9f928deb0bb`; first recorded CLI event `2026-10-16T05:37:24.070Z`, last `2026-10-16T05:38:53.461Z` (recorded span 1 min 29 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
each run inside greenfield/ with exit code
- `synth first-contact --dry-run` via PATH synth (v2.4.1) -> exit 1 (see PROBLEMS)
- `synth --version` (PATH) -> exit 0, version 2.4.1, schema synth-cli-v1
- `synth --help` (PATH) -> exit 0
- `synth first-contact --help` (PATH) -> exit 0
- `synth first-contact status` (PATH v2.4.1) -> exit 0, state not-started, nextStep start "<intent>"
- `synth first-contact start "<task>"` (PATH v2.4.1) -> exit 0, draft created (later removed as wrong revision)
- `synth first-contact status` (PATH v2.4.1) -> exit 0, state draft
- `synth first-contact clarify` (PATH v2.4.1) -> exit 0, 5 questions
- `"<absolute>" --version` -> exit 0, version 2.6.1 (revision under test)
- `"<absolute>" first-contact --dry-run` -> exit 0 (after cleaning legacy .synth)
- `"<absolute>" first-contact --help` -> exit 0
- `"<absolute>" first-contact status` -> exit 0
- `"<absolute>" first-contact start "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided."` -> exit 0, draft created, overall confidence 0.25, nextStep clarify
- `"<absolute>" first-contact status` -> exit 0, state draft, canApprove false, nextStep clarify
- `"<absolute>" first-contact clarify --source-offer offer.json` (first attempt, missing option id) -> exit 1
- `"<absolute>" first-contact clarify --source-offer offer.json` (second attempt, wrong source kind) -> exit 1
- `"<absolute>" first-contact clarify --source-offer offer.json` (final) -> exit 0, FirstContactSourceOfferRecorded, offer version 1
- `"<absolute>" first-contact status` -> exit 0, state draft, workingBrief awaiting-response
Where "<absolute>" = C:\Users\j\AppData\Local\Temp\trial-staging\917d662a31bd\global\synth.cmd from ENVIRONMENT.md. Used absolute path because PATH synth is 2.4.1 while manifest/staged revision is 2.6.1.
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - Final status: state draft, canApprove false, sourceOffers[1 version 1], sourceAnswers [], workingBrief status awaiting-response, sourceFreshness current, nextStep `synth first-contact clarify`. No approval, no materialize.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; observed `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; matched yes — this case starts empty, so the revision is the hash of an empty file set. Files present that are not starting inputs: `REPORT.md` (6875 B), `offer.json` (2001 B), `.synth/` (3 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~12 minutes including version investigation and schema fixes.; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T05:38:53.461Z`, draft last written `2026-10-16T05:38:53.465Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `greenfield/offer.json` (2001 B, sha256 `0bc02407b7daf11b9a6444a6431b0d63ad0f125e3679685f588ebb1dbdb4cc6a`); the CLI recorded it as `offer-5704b40e-ff3c-47d0-bc17-afdff86a44a4` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T05:38:53.461Z`; question: How should board input be supplied and edited before export, since board kind, inputs, editing and validation are undecided?

```text
file-fed-edit-export — File-fed board with edit-then-export checks [operator-intent]
blank-board-edit — Blank-board start with in-place editing [operator-intent]
small-change-validation — Small change set on current board with validation [operator-intent]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-5704b40e-ff3c-47d0-bc17-afdff86a44a4 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `file-fed-edit-export` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
  - `blank-board-edit` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
  - `small-change-validation` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
path to offer.json, and the question/options it contains
- Path: greenfield/offer.json (workspace-relative offer.json for --source-offer).
- scope: "Small editable specimen-board exporter for SVG board utility; next slice decides board input source and editing interaction only"
- question: "How should board input be supplied and edited before export, since board kind, inputs, editing and validation are undecided?"
- options (3, each label/tradeoff/acceptanceExample/source):
  1. file-fed-edit-export / "File-fed board with edit-then-export checks"
  2. blank-board-edit / "Blank-board start with in-place editing"
  3. small-change-validation / "Small change set on current board with validation"
  All sources kind operator-intent quoting the exact task text. No GUI/stack invented. Offer ends awaiting-response via CLI workingBrief (offer file itself has scope/question/options; status awaiting-response is CLI workingBrief state, not a human decision).
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
what you assumed without evidence
- Assumed staged 2.6.1 is the revision under test (from ENVIRONMENT.md + cli-manifest.json version 2.6.1) and PATH 2.4.1 is stale; used absolute path and recorded it.
- Assumed offer.json schema follows CLI error messages + source-brief.js (id regex, 2-4 options, operator-intent exact quote) where INSTRUCTIONS.md description differed; INSTRUCTIONS.md said "Follow the schema the CLI reports" so CLI won.
- Assumed cleaning the legacy .synth created by PATH 2.4.1 (Remove-Item .\.synth) was required to restore initial empty-dir state before using correct CLI; no other files existed.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
decisions you left to a person, and anything you could not verify
- Board input source and editing interaction (the offer question) left awaiting-response; no selection, no human-response, no approve, no materialize per §5.
- Could not verify what requester prefers among the three options; stopped rather than guessing.
- Did not run `first-contact --approve` even though dry-run suggested it, because §5 forbids lifecycle actions.
```
- Any SYNTH integrity message, warning or failure text: 2 recorded error line(s) in `.synth/data/cli-errors.jsonl`:

```text
2026-10-16T05:37:43.400Z Source offer was not recorded: option id must be nonempty text up to 2000 characters.
2026-10-16T05:37:53.635Z Source offer was not recorded: source path must be nonempty text up to 2000 characters.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
not applicable (greenfield only; brownfield only per §3).
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text
what SYNTH showed at each step, summarized, including final status
- PATH v2.4.1 `first-contact --dry-run` refused: {"status":"error","kind":"CLIError","error":"Usage: synth first-contact start ..."}.
- Staged v2.6.1 `first-contact --dry-run` in empty dir: pending-approval, kind FirstContactOnboardPlan, detected empty, wouldCreate .synth/manifest.json etc, nextStep `synth first-contact --approve`. Did NOT run --approve per trial §5.
- `start` created .synth/first-contact/draft.json, unknowns: audience.primaryUsers, environment.targetRuntime, environment.languagePreferences, capabilities.required.
- First --source-offer failed: "option id must be nonempty text up to 2000 characters."
- Second --source-offer failed: "source path must be nonempty text up to 2000 characters." (had used type task-text).
- Final --source-offer succeeded after fixing schema to kind operator-intent (see source-brief.js lines 98-103).
- Final status: state draft, canApprove false, sourceOffers[1 version 1], sourceAnswers [], workingBrief status awaiting-response, sourceFreshness current, nextStep `synth first-contact clarify`. No approval, no materialize.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
anything the CLI got wrong, refused, or that contradicted these instructions
- PATH `synth` (2.4.1) contradicts INSTRUCTIONS.md: `synth first-contact --dry-run` errors with Usage, and `clarify --source-offer` is undocumented in its --help. Staged 2.6.1 supports both. Recorded exact command/exit/message above.
- INSTRUCTIONS.md `first-contact --dry-run` dry-run nextStep suggests `--approve`, which §5 forbids; did not follow that nextStep, followed INSTRUCTIONS.md start step instead (which CLI help also lists as valid).
- INSTRUCTIONS.md §4 example offer shape omits required `id` per option and `kind: operator-intent` source shape; CLI is authoritative per §4 last sentence, so followed CLI.
- Version mismatch: ENVIRONMENT.md revision 917d662... corresponds to 2.6.1 per cli-manifest.json, but PATH reports 2.4.1. Used absolute path and recorded it.
```

### brownfield / guided

- Session id and start time: journeyId `cd4c9276-babc-44d6-9cbb-9d757a08bc26`; first recorded CLI event `2026-10-16T05:39:26.916Z`, last `2026-10-16T05:39:44.577Z` (recorded span 18 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
each run inside brownfield/ with exit code (absolute CLI = C:\Users\j\AppData\Local\Temp\trial-staging\917d662a31bd\global\synth.cmd, v2.6.1)
- `<absolute> first-contact --dry-run` -> exit 0, detected brownfield, listed docs/limitation.md, src/board.js, tests/board.test.js, package.json
- `<absolute> first-contact start "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working."` -> exit 0, draft created, overall confidence 0.083
- `npm test` (before change) -> exit 0, 1 pass
- `<absolute> first-contact status` -> exit 0, state draft, canApprove false, no-source-offer
- `<absolute> first-contact clarify --source-offer offer.json` -> exit 0, FirstContactSourceOfferRecorded version 1
- `<absolute> first-contact status` -> exit 0, workingBrief awaiting-response, sourceFreshness current
- `npm test` (after, no code changed) -> exit 0, 1 pass
Used absolute path because PATH synth is 2.4.1 (does not support --dry-run/--source-offer) while staged revision is 2.6.1; recorded in green test.
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - final status: state draft, sourceOffers 1, sourceAnswers [], workingBrief awaiting-response, nextStep clarify. No approve/materialize.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; observed `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; matched yes — 4 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (4650 B), `offer.json` (1799 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~8 minutes.; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T05:39:44.577Z`, draft last written `2026-10-16T05:39:44.581Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `brownfield/offer.json` (1799 B, sha256 `4b7e0b6be41e8c6e97e12f9a6e11631f12f1c1a1aba00fd98f76dc578c3c9d65`); the CLI recorded it as `offer-8ca54d65-c55d-4d05-a48e-97b120139074` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T05:39:44.577Z`; question: How should the user-selected fill color be accepted while keeping the current label output and tests working?

```text
optional-fill-arg — Optional fill argument with default preserving output [src/board.js:1]
keep-label-test — Keep label test green, add fill as extra case [tests/board.test.js:4]
fill-only-delta — Fill-only addition honoring the limitation note [docs/limitation.md:1]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-8ca54d65-c55d-4d05-a48e-97b120139074 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `optional-fill-arg` → `src/board.js:1`: verified — the hash the CLI recorded recomputes to the same value (`550765693891f48b26e0476610b80d9776e94a43413630d9b27e9e02de3435ee`) and the quoted line matches the live source
  - `keep-label-test` → `tests/board.test.js:4`: verified — the hash the CLI recorded recomputes to the same value (`d97df21784804d026e92b27e129a622e3209e176a2ac82502f1bb2637f9a3a97`) and the quoted line matches the live source
  - `fill-only-delta` → `docs/limitation.md:1`: verified — the hash the CLI recorded recomputes to the same value (`f4ee00a6c83e8e1294a9863b83e167afd3f4e3a7e4c943c2aadbb23669d8a246`) and the quoted line matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
path to offer.json, and the question/options it contains
- Path: brownfield/offer.json
- scope: "Extend the existing SVG board renderer with user-selected fill color only; preserve label output and existing tests"
- question: "How should the user-selected fill color be accepted while keeping the current label output and tests working?"
- options:
  1. optional-fill-arg / "Optional fill argument with default preserving output"
  2. keep-label-test / "Keep label test green, add fill as extra case"
  3. fill-only-delta / "Fill-only addition honoring the limitation note"
  Each has label/tradeoff/acceptanceExample/source; only delta proposed, no rewrite.
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
what you assumed without evidence
- Assumed no code change was correct because offer must end awaiting-response and §5 forbids approve/materialize; stopped at proposal rather than implementing fill.
- Assumed optional-arg vs extra-case vs fill-only framing counts as delta-only, not wholesale rewrite.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
decisions you left to a person, and anything you could not verify
- Fill-color API shape (the offer question) left awaiting-response; no selection/human-response per §5.
- Fill validation/default color undecided; did not implement.
- Could not verify requester preference; stopped rather than guessing.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text
anything the CLI got wrong, refused, or that contradicted these instructions
- dry-run nextStep suggested discover/bootstrap which INSTRUCTIONS.md does not use; followed INSTRUCTIONS.md start instead (CLI help lists start as valid, so no hard contradiction, but noted).
- No --source-offer schema in --help; learned required id/source-path/line/quote shape from error messages and staged source-brief.js, per §4 "Follow the schema the CLI reports".
- PATH version mismatch same as green test (2.4.1 vs 2.6.1); used absolute path.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
command, exit code and result (brownfield only, before and after any change)
- Before: `npm test` -> exit 0, pass 1 (existing label), fail 0.
- After: `npm test` -> exit 0, pass 1, fail 0. No code changed (offer only); did not edit tests or fixtures.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text
what SYNTH showed at each step, summarized, including final status
- dry-run: pending-approval FirstContactOnboardPlan, detected brownfield, wouldCreate .synth/manifest.json etc, wouldRun synth bootstrap --approve (did NOT run per §5), sourceHandoff excerpts matched live files, nextStep `synth discover . --export` (did not follow; followed INSTRUCTIONS.md start step which CLI help also lists).
- start/status: draft, unknowns audience/environment/capabilities, canApprove false, nextStep clarify.
- clarify --source-offer: ok, offer id version 1, 3 options with sha256-pinned sources.
- final status: state draft, sourceOffers 1, sourceAnswers [], workingBrief awaiting-response, nextStep clarify. No approve/materialize.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
anything the CLI got wrong, refused, or that contradicted these instructions
- dry-run nextStep suggested discover/bootstrap which INSTRUCTIONS.md does not use; followed INSTRUCTIONS.md start instead (CLI help lists start as valid, so no hard contradiction, but noted).
- No --source-offer schema in --help; learned required id/source-path/line/quote shape from error messages and staged source-brief.js, per §4 "Follow the schema the CLI reports".
- PATH version mismatch same as green test (2.4.1 vs 2.6.1); used absolute path.
```

### documentation / guided

- Session id and start time: journeyId `19bf4fc1-541c-4307-b027-385689446fef`; first recorded CLI event `2026-10-16T05:40:12.019Z`, last `2026-10-16T05:40:30.247Z` (recorded span 18 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
each run inside documentation/ with exit code (absolute CLI = C:\Users\j\AppData\Local\Temp\trial-staging\917d662a31bd\global\synth.cmd, v2.6.1)
- `<absolute> first-contact --dry-run` -> exit 0, detected brownfield (docs only), excerpts docs/requirements.md:1-2
- `<absolute> first-contact start "Continue from the requirements in docs/. The next slice is undecided."` -> exit 0, draft created, confidence 0.083
- `<absolute> first-contact status` -> exit 0, state draft, no-source-offer
- `<absolute> first-contact clarify --source-offer offer.json` -> exit 0, FirstContactSourceOfferRecorded version 1
- `<absolute> first-contact status` -> exit 0, workingBrief awaiting-response
Used absolute path for same version reason as prior tests (PATH 2.4.1 lacks --dry-run/--source-offer).
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - final status: state draft, 1 sourceOffer, 0 sourceAnswers, workingBrief awaiting-response, sourceFreshness current, nextStep clarify. No approval/materialize.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; observed `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; matched yes — 1 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (3787 B), `offer.json` (1838 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~6 minutes.; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T05:40:30.247Z`, draft last written `2026-10-16T05:40:30.252Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `documentation/offer.json` (1838 B, sha256 `0ba521ee0838c25030208121cb9ef0d68bb71d27ccfdaa55ec4b78492f0fb3ff`); the CLI recorded it as `offer-5b25ba50-5ef5-47f9-b383-ab793c570838` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T05:40:30.247Z`; question: What editing interaction style should the next slice implement, given the first board exports one SVG from local data and editing is requested but undecided?

```text
keep-single-export — Keep single-SVG local export, defer editing [docs/requirements.md:1]
small-edit-on-export — Small edit interaction on top of local export [docs/requirements.md:2]
decide-interaction-first — Decide interaction style before extending export [docs/requirements.md:2]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-5b25ba50-5ef5-47f9-b383-ab793c570838 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `keep-single-export` → `docs/requirements.md:1`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
  - `small-edit-on-export` → `docs/requirements.md:2`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
  - `decide-interaction-first` → `docs/requirements.md:2`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
path to offer.json, and the question/options it contains
- Path: documentation/offer.json
- scope: "Continue from docs/requirements.md; next slice decides editing interaction only, preserving single-SVG local export"
- question: "What editing interaction style should the next slice implement, given the first board exports one SVG from local data and editing is requested but undecided?"
- options:
  1. keep-single-export / "Keep single-SVG local export, defer editing"
  2. small-edit-on-export / "Small edit interaction on top of local export"
  3. decide-interaction-first / "Decide interaction style before extending export"
  The undecided interaction is surfaced as the decision with consequences (defer vs implement vs decide-first); nothing silently resolved.
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
what you assumed without evidence
- Assumed the tension between line 1 (single-SVG local export) and line 2 (editing requested, style undecided) is the genuine conflict/decision to surface, rather than inventing additional requirements.
- Assumed duplicate citation of line 2 for two options is acceptable since CLI validates per-option line match, not uniqueness.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
decisions you left to a person, and anything you could not verify
- Editing interaction style for next slice left awaiting-response; no selection/human-response, no approve/materialize.
- Could not verify preferred interaction; stopped rather than guessing.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text
anything the CLI got wrong, refused, or that contradicted these instructions
- dry-run classified docs-only dir as "brownfield" and suggested bootstrap/docs-generate nextSteps not in INSTRUCTIONS.md; followed INSTRUCTIONS.md start (valid per CLI help).
- Same PATH vs staged version mismatch as prior tests; used absolute path.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
not applicable (documentation test; brownfield only per §3).
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text
what SYNTH showed at each step, summarized, including final status
- dry-run: pending-approval, detected brownfield, wouldCreate manifest/event-log, wouldRun bootstrap --approve (not run per §5), sourceHandoff files [docs/requirements.md] with both lines quoted, nextStep docs generate (not followed; followed INSTRUCTIONS.md start).
- start/status: draft, unknowns audience/environment/capabilities, canApprove false.
- final status: state draft, 1 sourceOffer, 0 sourceAnswers, workingBrief awaiting-response, sourceFreshness current, nextStep clarify. No approval/materialize.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
anything the CLI got wrong, refused, or that contradicted these instructions
- dry-run classified docs-only dir as "brownfield" and suggested bootstrap/docs-generate nextSteps not in INSTRUCTIONS.md; followed INSTRUCTIONS.md start (valid per CLI help).
- Same PATH vs staged version mismatch as prior tests; used absolute path.
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
| Anything that failed or was skipped, with the exact error text | recorded CLI errors: greenfield: Source offer was not recorded: option id must be nonempty text up to 2000 characters. | greenfield: Source offer was not recorded: source path must be nonempty text up to 2000 characters.; cells not captured in this file and therefore `not run` unless they ran elsewhere: `greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. |

## 6. Explicit statements

- Human words fabricated in any cell: `none` — required; the captured CLI state holds no recorded human response (sourceAnswers and choiceReviews are empty in every captured draft) and no captured command names a selection, approval or human response.
- Responses recorded per cell: captured CLI state — greenfield: 0 response(s), 0 choice review(s); brownfield: 0 response(s), 0 choice review(s); documentation: 0 response(s), 0 choice review(s). <to confirm — operator: confirm that no response exists outside the captured state>.
- Runtime Mission/Expedition lifecycle actions: none — no lifecycle, selection, approval, delivery or push command appears in the captured command lists or error logs.
- Pushes, pull requests or merges created by this trial: no `.git` directory inside TEST_PATH; nothing was captured that could push. <to confirm — operator: confirm no session pushed from elsewhere>.
- Application tests weakened or skipped to make a cell pass: the agent's own `APPLICATION TESTS` statement, first line per cell — greenfield: not applicable (greenfield only; brownfield only per §3). | brownfield: Before: `npm test` -> exit 0, pass 1 (existing label), fail 0. | documentation: not applicable (documentation test; brownfield only per §3).; the full sections are in the raw copies. <to confirm — operator: confirm no test was weakened>.
- Isolation mode: <to confirm — operator: confinement by layout and instruction, a container, or a separate machine>.
- Plain condition: <to confirm — operator: its own TEST_PATH, or "not run">.
- Build output visible inside TEST_PATH: none — no build output, tarball or `node_modules` inside TEST_PATH.
- Total operator effort and whether it exceeded the time box: recorded CLI spans: greenfield 1 min 29 s; brownfield 18 s; documentation 18 s. <to confirm — operator: total effort and whether it exceeded the time box>.
- Was setup run before the cells by the same agent that ran them?: <to confirm — operator: yes or no, and which cells>.
- Any auto-feed: `none — the agent was launched by hand with a line that names SYNTH, as the current CLI requires; no skill, plugin or service announces the tool`.
- Setup log: <to confirm — operator: where the setup log is kept, and confirm it never entered a plain TEST_PATH>.

## 7. What this evidence does and does not support

- **Mechanically supported by this capture:** the installed CLI recorded an offer in 3 of 3 captured guided cell(s), and in 3 of them every recorded citation recomputes to the live source; the captured CLI state records 0 human response(s); no captured command list contains a lifecycle, approval, delivery or push command.
- **Not supported:** owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- **Not established by this capture, and yours to state:** whether any cell counts as `pass`, `fail` or `blocked`; the comparative §5 readings; and the 7 cell(s) this TEST_PATH did not hold (`greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`). §3 records what could be compared: greenfield matched, brownfield matched, documentation matched.
- Recommendation for ordinary PR #347 review: <to confirm — operator: keep as is / change / simplify / stop — with reasons, submitted in your own review comment>

