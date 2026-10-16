# Installed-CLI guided-journey trial — evidence (2026-10-16)

Captured by `node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>` from `C:\Users\j\Projects\board-test` on 2026-10-16T08:05:57.204Z (newest recorded trial event (2026-10-16T07:56:42.308Z)). Template: [guided-three-path-installed-trial-evidence-template.md](guided-three-path-installed-trial-evidence-template.md). Runbook: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

Machine-read rows come from the finished workspace — `REPORT.md`, `offer.json`, `.synth/first-contact/` (including the CLI's own recorded offer with its citation hashes), any other CLI-stored file — and from the scratch directory when it was reachable. Quotes attributed to `REPORT.md` are the agent's own words, copied verbatim. Rows reading `<to confirm — operator: …>` are operator-only: this script has no way to know them and will not guess. Raw byte-for-byte copies: `docs/analysis/guided-installed-cli-trial-2026-10-16-raw/`.

This is a copy: the staged `ENVIRONMENT.md` records the workspace as `C:\Users\j\Projects\board-test`, and the copy captured here ran at `C:\Users\j\Projects\board-test`. Every artifact below is byte-identical to that copy's files; the digests in `docs/analysis/guided-installed-cli-trial-2026-10-16-raw/SOURCES.json` name both paths. The operator's own machine is the source of the run, not of these bytes.

Cells captured here: `greenfield/guided`, `brownfield/guided`, `documentation/guided`. Not captured in this file: `greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. The other condition needs its own TEST_PATH; capture that workspace separately with its own `--out`.

## 0. Independence compliance

Checklist: [instructions, Appendix C](../plans/guided-installed-cli-trial-instructions.md#appendix-c--independence-compliance-checklist). Mark each item and name anything unmet. The "evidence column" rows below are what this capture could prove mechanically; the "Met?" column stays with the operator.

| # | Requirement | Met? | Note or evidence |
| --- | --- | --- | --- |
| 1 | Sessions run by a different agent and fresh sessions than the authoring agent | <to confirm — operator: who ran the sessions and whether they had seen this repository> | No agent identity is recorded in TEST_PATH. The launch line setup printed is in §1. |
| 2 | Agent had no access to the authoring checkout | <to confirm — operator: how the machine was isolated> | No build output, tarball or `node_modules` inside TEST_PATH. Staging: `C:\Users\j\AppData\Local\Temp\trial-staging\b53f6dcb859f` (found). |
| 2b | Isolation mode: same-machine confinement by layout and instruction, or a container/separate machine | <to confirm — operator: confinement or container/separate machine> | ENVIRONMENT.md records the workspace as `C:\Users\j\Projects\board-test` and the CLI outside it. |
| 3 | Agent blind to which condition is expected to win; plain prompt never mentioned SYNTH | <to confirm — operator: confirm the prompt you typed and that nothing else named the tool> | staged `INSTRUCTIONS.md` present: 7600 B, sha256 `07a7a56df1bb0ec7a5e3f9d5f9017cc12c7b7c42fb00c964be6cae1545d72321`, names the tool (guided set). |
| 4 | Matched inputs; revisions recorded before the first cell | <to confirm — operator: confirm the setup run preceded the first cell> | §3 recomputes every captured case against the frozen record: greenfield matched; brownfield matched; documentation matched. |
| 5 | Matched agent/model/version, tools, starting request text | <to confirm — operator: the agent, model, version and tool access used in this condition> | The starting request text per case is in the raw copies and quoted in §4; the staged instruction set is sha256 `07a7a56df1bb0ec7a5e3f9d5f9017cc12c7b7c42fb00c964be6cae1545d72321`. |
| 6 | Session plan and order (fresh session per test where possible; one session per condition at minimum) | <to confirm — operator: the actual order and session count> | Recorded CLI timestamps: greenfield 2026-10-16T07:53:00.414Z; brownfield 2026-10-16T07:55:16.972Z; documentation 2026-10-16T07:56:19.505Z. |
| 7 | Protocol, time box, expected observations and stop conditions pre-registered | <to confirm — operator: the time box and where the protocol was fixed> | [guided-three-path-matched-comparison.md](guided-three-path-matched-comparison.md) and the runbook were in the repository before this run; the commits carrying them are in the branch history. |
| 8 | Verbatim transcripts, wall-clock per cell, intervention log | <to confirm — operator: confirm nothing was tidied or withheld> | CLI transcripts captured for 3 of 3 case(s); agent reports captured for 3 of 3. |
| 9 | Installed tarball pinned and identified (not a repo build) | <to confirm — operator: confirm the installed CLI is the one that ran> | tarball sha256 `e3cc81e3be1aba3edf1c8bd85e0451a177cae8045962ae2cc4e015e1d7f4fe50`, `synth --version` → {"status":"ok","version":"2.6.1","name":"synth","schema":"synth-cli-v1"} |
| 10 | No invented human words; guided cells ended `awaiting-response`; no lifecycle action; no push | <to confirm — operator: confirm from your own session> | Captured CLI state records 0 human response(s); no lifecycle, selection or push command appears in a captured command list; machine-recorded terminal projections: greenfield: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T07:54:47.961Z — the report's `first-contact status` line is quoted in §4; brownfield: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T07:55:46.769Z — the report's `first-contact status` line is quoted in §4; documentation: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T07:56:42.308Z — the report's `first-contact status` line is quoted in §4 |
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
| Scratch directory (outside TEST_PATH) | `C:\Users\j\AppData\Local\Temp\trial-staging\b53f6dcb859f` — tarball, installed CLI and transcripts |
| CLI manifest / setup manifest | `cli-manifest.json`, `transcripts/setup-manifest.json` |
| Instruction file staged at TEST_PATH root | `INSTRUCTIONS.md` (guided set — names the tool), sha256 `07a7a56df1bb0ec7a5e3f9d5f9017cc12c7b7c42fb00c964be6cae1545d72321`, plus `ENVIRONMENT.md` |
| Launch line given to the agent, verbatim | recorded by setup: ``This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`.`` (from `setup-manifest.json`). <to confirm — operator: paste what you actually typed, and if you changed the wording, say exactly how> |
| Date and timezone, start/end | `greenfield`: 2026-10-16T07:53:00.414Z → 2026-10-16T07:54:47.961Z (CLI-recorded); `brownfield`: 2026-10-16T07:55:16.972Z → 2026-10-16T07:55:46.769Z (CLI-recorded); `documentation`: 2026-10-16T07:56:19.505Z → 2026-10-16T07:56:42.308Z (CLI-recorded); filename date `2026-10-16` (newest recorded trial event (2026-10-16T07:56:42.308Z)). <to confirm — operator: your local timezone, and the start/end the operator saw — the mtimes are the machine clock reading when the files were written, not a clock the operator set> |
| Running agent, model and version | <to confirm — operator: agent product, model and version; session ids> |
| Tool access given to the agent | <to confirm — operator: shell, editor, network, and anything else> |
| Pinned repository revision | `b53f6dcb859f9f054040454f419a5c20ebef12ff` — b53f6dc Read plainly-written reports, and stop asking the plain arm for an install proof (ENVIRONMENT.md) |
| Environment | <to confirm — operator: node --version, npm --version, OS — the machine that ran setup and the sessions> |
| Time box set before starting | <to confirm — operator: the time box you set, and whether the run stayed inside it> |
| Private assets involved | `none` (required; any private asset invalidates this run) |

## 2. Install proof

| Field | Value |
| --- | --- |
| Build command and exit | `npm run build` → exit 0 — setup writes this transcript only after every step succeeded (a nonzero exit aborts before it) |
| Pack command and exit | `npm pack --pack-destination <staging>/pack` → exit 0 — setup writes this transcript only after every step succeeded (a nonzero exit aborts before it) |
| Tarball name | synth-framework-synth-2.6.1.tgz |
| Tarball SHA-256 | `e3cc81e3be1aba3edf1c8bd85e0451a177cae8045962ae2cc4e015e1d7f4fe50` |
| Global install command and exit | `npm install -g --prefix <staging>/global synth-framework-synth-2.6.1.tgz` → exit 0 — setup writes this transcript only after every step succeeded (a nonzero exit aborts before it) |
| `synth --version` output | ```json
{
  "status": "ok",
  "version": "2.6.1",
  "name": "synth",
  "schema": "synth-cli-v1"
}
``` |

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

- Session id and start time: journeyId `c0072e06-e311-4c47-ab3c-8f6c7308a8a2`; first recorded CLI event `2026-10-16T07:53:00.414Z`, last `2026-10-16T07:54:47.961Z` (recorded span 1 min 48 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
each run inside greenfield/ with exit code 0 unless noted
- synth --version => exit 0 (version 2.6.1, synth-cli-v1, PATH OK)
- synth first-contact --dry-run => exit 0
- synth first-contact start "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." => exit 0
- synth first-contact status => exit 0
- synth first-contact clarify => exit 0 (read-only inspection to understand questions)
- synth first-contact clarify --help => exit 0 (read-only inspection to understand --source-offer usage)
- synth first-contact clarify --source-offer missing.json => exit non-zero / error envelope (expected probe for missing file; ENOENT, not recorded)
- synth first-contact clarify --source-offer offer.json => exit 0 (recorded as offer-5cd1f081-a77a-4a0e-83c9-83039475f9c8)
- synth first-contact status => exit 0 (final)
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - status (pre-offer): state draft, canApprove false, workingBrief no-source-offer, nextStep clarify.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; observed `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; matched yes — this case starts empty, so the revision is the hash of an empty file set. Files present that are not starting inputs: `REPORT.md` (5425 B), `offer.json` (1857 B), `.synth/` (3 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: rough elapsed time for this test ~10 minutes including schema discovery; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T07:54:47.961Z`, draft last written `2026-10-16T07:54:47.966Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `greenfield/offer.json` (1857 B, sha256 `856467e7b61441a2c5fd043f57be8e8aaee65af36cfb5d09aa5ab591635f0046`); the CLI recorded it as `offer-5cd1f081-a77a-4a0e-83c9-83039475f9c8` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T07:54:47.961Z`; question: Which board kind, input source, and editing-plus-validation behavior should the first exporter slice support?

```text
fixed-file-input — Fixed board kind from file input with strict validation [operator-intent]
flexible-board-input — Flexible board kinds from file input with documented defaults [operator-intent]
manual-edit-checks — Manually specified board with inline editing checks before export [operator-intent]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-5cd1f081-a77a-4a0e-83c9-83039475f9c8 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `fixed-file-input` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
  - `flexible-board-input` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
  - `manual-edit-checks` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
path offer.json (greenfield/offer.json)
- scope: Small editable specimen-board exporter for SVG board utility
- question: Which board kind, input source, and editing-plus-validation behavior should the first exporter slice support?
- options (3):
  1. fixed-file-input / Fixed board kind from file input with strict validation / tradeoff predictable output but narrower support / acceptanceExample exporter refuses missing cell with named validation error
  2. flexible-board-input / Flexible board kinds from file input with documented defaults / tradeoff broader coverage but harder guarantees / acceptanceExample accepts two variants and documents defaults
  3. manual-edit-checks / Manually specified board with inline editing checks before export / tradeoff simplest input but editing interaction still to decide / acceptanceExample edit breaking shape rejected with rule name before export
- All options cite operator-intent with exact task text. No GUI framework or stack invented. No selection/human-response passed; ends awaiting-response.
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
what assumed without evidence
- Assumed exact task-text string is the operator intent to cite; no other source exists in this empty directory.
- Assumed --source-offer JSON shape (scope/question/options with id/label/tradeoff/acceptanceExample/source) from INSTRUCTIONS plus CLI error probing and local CLI dist reading for validation rules; CLI did not publish a separate schema in its help output.
- Did not assume users, runtime, language, or stack; left them open.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
decisions left to a person
- Board kind, input source, and editing-plus-validation choice among the 3 options; undecided per task text.
- Primary users, stakeholders, runtime, language, required capabilities (CLI q-1..q-5) remain unanswered.
- Could not verify human reading of offer; workingBrief is awaiting-response by design, not agreement.
```
- Any SYNTH integrity message, warning or failure text: 1 recorded error line(s) in `.synth/data/cli-errors.jsonl`:

```text
2026-10-16T07:53:34.188Z Source offer was not recorded: ENOENT: no such file or directory, lstat 'C:\Users\j\Projects\board-test\greenfield\missing.json'
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
N/A (greenfield only; brownfield rule does not apply)
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text
summarized
- --dry-run: kind FirstContactOnboardPlan, detected empty, wouldCreate .synth/manifest.json etc, wouldRun synth init / mission create / mission approve, nextStep named "synth first-contact --approve". No files written.
- start: kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent reproduced exactly, confidence overall 0.25, unknowns for audience/runtime/language/capabilities, nextStep "synth first-contact clarify".
- status (pre-offer): state draft, canApprove false, workingBrief no-source-offer, nextStep clarify.
- clarify: 5 ambiguities/questions (primaryUsers, stakeholders, targetRuntime, languagePreferences, required capabilities), sourceHandoff not-ingested, nextStep clarify --field.
- clarify --source-offer offer.json: kind FirstContactSourceOfferRecorded, version 1, 3 options, attribution agent-authored-offer, note citations do not prove interpretation.
- status (final): state draft, canApprove false, sourceOffers 1 entry, sourceAnswers [], workingBrief status awaiting-response, version 1, sourceFreshness current, nextStep "synth first-contact clarify". No approval, no materialization, no mission.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
CLI wrong / refused / contradicted instructions
- --dry-run nextStep said "synth first-contact --approve", which contradicts INSTRUCTIONS section 5 (No lifecycle actions: do not run first-contact approve/materialize, do not start/approve Mission/Expedition) and the required greenfield observation (no automatic approval). I did NOT run --approve; followed INSTRUCTIONS section 2 start/status/clarify --source-offer/status instead. Recording this contradiction and stopping auto-onboarding here.
- Probe with missing.json correctly errored ENOENT and did not record; no other refusals.
- No other contradiction: start/status/clarify/clarify --source-offer/status all behaved as INSTRUCTIONS described.
```

### brownfield / guided

- Session id and start time: journeyId `761ef882-1215-40ac-90db-43ed220cd121`; first recorded CLI event `2026-10-16T07:55:16.972Z`, last `2026-10-16T07:55:46.769Z` (recorded span 30 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
each run inside brownfield/ with exit code
- synth first-contact --dry-run => exit 0
- synth first-contact start "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." => exit 0
- synth first-contact status => exit 0
- npm test (before change) => exit 0
- synth first-contact clarify --source-offer offer.json => exit 0 (recorded offer-2ffeb707-1e3c-4e08-b85c-2f941fa52c68, version 1)
- synth first-contact status (final) => exit 0
- npm test (after offer, no src/test edits) => exit 0
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - status pre-offer: state draft, canApprove false, workingBrief no-source-offer, nextStep clarify.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; observed `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; matched yes — 4 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (5162 B), `offer.json` (1829 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: rough elapsed time for this test ~10 minutes; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T07:55:46.769Z`, draft last written `2026-10-16T07:55:46.773Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `brownfield/offer.json` (1829 B, sha256 `e8eb86c6b78a4143199fec7fa3156ceb14f659eda339c2579dc9282248962df9`); the CLI recorded it as `offer-2ffeb707-1e3c-4e08-b85c-2f941fa52c68` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T07:55:46.769Z`; question: How should the user-selected fill color be accepted while keeping the existing label output and tests working?

```text
optional-fill-arg — Optional second fill argument, default preserves current label output [src/board.js:1]
fill-with-test-guard — Additive fill support guarded by existing label test [tests/board.test.js:4]
preserve-label-add-fill — Preserve label output and add only fill-color handling [docs/limitation.md:1]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-2ffeb707-1e3c-4e08-b85c-2f941fa52c68 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `optional-fill-arg` → `src/board.js:1`: verified — the hash the CLI recorded recomputes to the same value (`550765693891f48b26e0476610b80d9776e94a43413630d9b27e9e02de3435ee`) and the quoted line matches the live source
  - `fill-with-test-guard` → `tests/board.test.js:4`: verified — the hash the CLI recorded recomputes to the same value (`d97df21784804d026e92b27e129a622e3209e176a2ac82502f1bb2637f9a3a97`) and the quoted line matches the live source
  - `preserve-label-add-fill` → `docs/limitation.md:1`: verified — the hash the CLI recorded recomputes to the same value (`f4ee00a6c83e8e1294a9863b83e167afd3f4e3a7e4c943c2aadbb23669d8a246`) and the quoted line matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
path offer.json (brownfield/offer.json)
- scope: Extend SVG board renderer with user-selected fill color, preserving label output
- question: How should the user-selected fill color be accepted while keeping the existing label output and tests working?
- options:
  1. optional-fill-arg / Optional second fill argument, default preserves current label output / tradeoff smallest delta, callers without fill unchanged / acceptanceExample render('A') stays '<text>A</text>', render('A','red') adds fill / source src/board.js:1
  2. fill-with-test-guard / Additive fill support guarded by existing label test / tradeoff keeps current test as gate, new coverage only for delta / acceptanceExample existing test still passes, new fill case checked separately / source tests/board.test.js:4
  3. preserve-label-add-fill / Preserve label output and add only fill-color handling / tradeoff addresses limitation with no rewrite / acceptanceExample same label plus fill, no-fill matches prior / source docs/limitation.md:1
- Only the delta (fill param) is proposed; no rewrite of render logic proposed. Ends awaiting-response.
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
what assumed without evidence
- Assumed fill should be additive/optional to preserve label output, per limitation doc; did not assume color format, SVG element shape, or default color.
- Assumed existing test must remain the compatibility gate; did not run or propose broader renderer changes.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
decisions left to a person
- Which fill-acceptance shape (optional arg vs options object vs validated string) to adopt; left awaiting-response.
- Default fill value, validation rules, and SVG output shape for fill remain undecided.
- WorkingBrief is provisional-unverified? No: currently awaiting-response with no answer; not agreement, not approved.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text
CLI wrong / refused / contradicted instructions
- --dry-run nextStep suggested "synth discover . --export" (and wouldRun bootstrap --approve), while INSTRUCTIONS section 2 requires start/status/clarify --source-offer/status and section 5 forbids approve/materialize/mission actions. I followed INSTRUCTIONS section 2 and did not run bootstrap --approve or discover; no files outside .synth/first-contact + offer.json were created by me. Recording this divergence; no hard error, but CLI onboarding plan conflicts with trial's no-lifecycle rule if followed literally.
- No other refusals; all first-contact commands succeeded.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
brownfield only
- Before: npm test => exit 0, 1 pass (existing label), 0 fail. Command: node --test tests/board.test.js via package.json script.
- After: npm test => exit 0, 1 pass, 0 fail (same). No edits to src/board.js, tests/board.test.js, or fixtures; only added offer.json (+ this report). No weakening.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text
summarized
- --dry-run: kind FirstContactOnboardPlan, detected brownfield, wouldCreate .synth/manifest.json etc + docs/reference/capability-validation-map.json, wouldRun synth bootstrap --approve, nextStep "synth discover . --export". sourceHandoff listed 4 files with excerpts: docs/limitation.md:1, src/board.js:1, tests/board.test.js:1-4, package.json:1. Notice: quoted prefixes are live partial evidence, not parsed requirements.
- start: kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent reproduced exactly, confidence overall 0.083, unknowns audience/runtime/language/capabilities, nextStep clarify.
- status pre-offer: state draft, canApprove false, workingBrief no-source-offer, nextStep clarify.
- clarify --source-offer: kind FirstContactSourceOfferRecorded, 3 options, attribution agent-authored-offer, note citations do not prove interpretation.
- status final: state draft, canApprove false, sourceOffers 1, sourceAnswers [], workingBrief status awaiting-response, version 1, sourceFreshness current, nextStep clarify. No approval/materialize/mission, no selection/human-response.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
CLI wrong / refused / contradicted instructions
- --dry-run nextStep suggested "synth discover . --export" (and wouldRun bootstrap --approve), while INSTRUCTIONS section 2 requires start/status/clarify --source-offer/status and section 5 forbids approve/materialize/mission actions. I followed INSTRUCTIONS section 2 and did not run bootstrap --approve or discover; no files outside .synth/first-contact + offer.json were created by me. Recording this divergence; no hard error, but CLI onboarding plan conflicts with trial's no-lifecycle rule if followed literally.
- No other refusals; all first-contact commands succeeded.
```

### documentation / guided

- Session id and start time: journeyId `0c87dd26-069d-43ff-9de3-4d90eb332f5f`; first recorded CLI event `2026-10-16T07:56:19.505Z`, last `2026-10-16T07:56:42.308Z` (recorded span 23 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text
each run inside documentation/ with exit code
- synth first-contact --dry-run => exit 0
- synth first-contact start "Continue from the requirements in docs/. The next slice is undecided." => exit 0
- synth first-contact status => exit 0
- synth first-contact clarify --source-offer offer.json => exit 0 (recorded offer-a24af281-490b-4863-b1c3-d221c7ca1efe, version 1)
- synth first-contact status (final) => exit 0
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - status pre-offer: state draft, canApprove false, workingBrief no-source-offer, nextStep clarify.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; observed `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; matched yes — 1 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (4570 B), `offer.json` (1778 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: rough elapsed time for this test ~8 minutes; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T07:56:42.308Z`, draft last written `2026-10-16T07:56:42.313Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `documentation/offer.json` (1778 B, sha256 `1448a1aa7700e57c9d16295478a815518e602645c647810768deb425d8774c0a`); the CLI recorded it as `offer-a24af281-490b-4863-b1c3-d221c7ca1efe` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T07:56:42.308Z`; question: What should the next undecided slice implement for editing interaction while preserving single-SVG export from local data?

```text
single-export-gate — Single-SVG export from local data as the slice gate [docs/requirements.md:1]
export-only-defer-edit — Export-only next slice, editing interaction explicitly deferred [docs/requirements.md:2]
validated-local-edit — Minimal local-data edit with validation before single export [docs/requirements.md:2]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-a24af281-490b-4863-b1c3-d221c7ca1efe version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `single-export-gate` → `docs/requirements.md:1`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
  - `export-only-defer-edit` → `docs/requirements.md:2`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
  - `validated-local-edit` → `docs/requirements.md:2`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
path offer.json (documentation/offer.json)
- scope: Next slice from docs/ requirements: single-SVG export with requested but undecided editing
- question: What should the next undecided slice implement for editing interaction while preserving single-SVG export from local data?
- options:
  1. single-export-gate / Single-SVG export from local data as the slice gate / tradeoff keeps export guarantee but leaves editing undecided / acceptanceExample fixed local data emits exactly one SVG / source docs/requirements.md:1
  2. export-only-defer-edit / Export-only next slice, editing interaction explicitly deferred / tradeoff delivers export now but delays editing value / acceptanceExample edit request without agreed style ships export-only with open decision recorded / source docs/requirements.md:2
  3. validated-local-edit / Minimal local-data edit with validation before single export / tradeoff concrete path with consequences but commits to one interaction pre-decision / acceptanceExample invalid correction rejected with rule name before export / source docs/requirements.md:2
- Undecided editing left as explicit decision with consequences per option; nothing silently resolved.
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
what assumed without evidence
- Assumed no hidden requirements beyond the 2 read lines; did not invent stack, GUI, or editing style.
- Assumed next slice must preserve single-SVG-from-local-data while editing remains the consequential choice.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
decisions left to a person
- Which editing path (export-only defer vs minimal validated edit vs export gate) for the next slice; left awaiting-response.
- No genuine file-vs-file conflict was found in docs/ (single 2-line file, lines compatible); therefore no conflict decision was forced. If a reviewer expects a conflict, there was none to surface without invention.
- WorkingBrief is awaiting-response, not agreement; not approved/verified/delivered.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text
CLI wrong / refused / contradicted instructions
- --dry-run nextStep suggested "synth docs generate --knowledge-base ./docs" (and wouldRun bootstrap --approve), while INSTRUCTIONS section 2 requires start/status/clarify --source-offer/status and section 5 forbids approve/materialize/mission actions. I followed INSTRUCTIONS section 2 and did not run bootstrap --approve or docs generate; recording divergence. No hard error.
- No other refusals.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
N/A (documentation-led only; brownfield npm-test rule does not apply; no package.json/test in this directory)
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text
summarized
- --dry-run: kind FirstContactOnboardPlan, detected brownfield (existing docs), wouldCreate .synth/manifest.json etc, wouldRun synth bootstrap --approve, nextStep "synth docs generate --knowledge-base ./docs". sourceHandoff files ["docs/requirements.md"] with excerpts lines 1-2. Notice: quoted prefixes are live partial evidence, not parsed requirements.
- start: kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent reproduced exactly, confidence overall 0.083, unknowns audience/runtime/language/capabilities, nextStep clarify.
- status pre-offer: state draft, canApprove false, workingBrief no-source-offer, nextStep clarify.
- clarify --source-offer: kind FirstContactSourceOfferRecorded, 3 options, attribution agent-authored-offer.
- status final: state draft, canApprove false, sourceOffers 1, sourceAnswers [], workingBrief status awaiting-response, version 1, sourceFreshness current, nextStep clarify. No approval/materialize/mission, no selection/human-response.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text
CLI wrong / refused / contradicted instructions
- --dry-run nextStep suggested "synth docs generate --knowledge-base ./docs" (and wouldRun bootstrap --approve), while INSTRUCTIONS section 2 requires start/status/clarify --source-offer/status and section 5 forbids approve/materialize/mission actions. I followed INSTRUCTIONS section 2 and did not run bootstrap --approve or docs generate; recording divergence. No hard error.
- No other refusals.
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
| Anything that failed or was skipped, with the exact error text | recorded CLI errors: greenfield: Source offer was not recorded: ENOENT: no such file or directory, lstat 'C:\Users\j\Projects\board-test\greenfield\missing.json'; cells not captured in this file and therefore `not run` unless they ran elsewhere: `greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. |

## 6. Explicit statements

- Human words fabricated in any cell: `none` — required; the captured CLI state holds no recorded human response (sourceAnswers and choiceReviews are empty in every captured draft) and no captured command names a selection, approval or human response.
- Responses recorded per cell: captured CLI state — greenfield: 0 response(s), 0 choice review(s); brownfield: 0 response(s), 0 choice review(s); documentation: 0 response(s), 0 choice review(s). <to confirm — operator: confirm that no response exists outside the captured state>.
- Runtime Mission/Expedition lifecycle actions: none — no lifecycle, selection, approval, delivery or push command appears in the captured command lists or error logs.
- Pushes, pull requests or merges created by this trial: no `.git` directory inside TEST_PATH; nothing was captured that could push. <to confirm — operator: confirm no session pushed from elsewhere>.
- Application tests weakened or skipped to make a cell pass: the agent's own `APPLICATION TESTS` statement, first line per cell — greenfield: N/A (greenfield only; brownfield rule does not apply) | brownfield: Before: npm test => exit 0, 1 pass (existing label), 0 fail. Command: node --test tests/board.test.js via package.json script. | documentation: N/A (documentation-led only; brownfield npm-test rule does not apply; no package.json/test in this directory); the full sections are in the raw copies. <to confirm — operator: confirm no test was weakened>.
- Isolation mode: <to confirm — operator: confinement by layout and instruction, a container, or a separate machine>.
- Plain condition: <to confirm — operator: its own TEST_PATH, or "not run">.
- Build output visible inside TEST_PATH: none — no build output, tarball or `node_modules` inside TEST_PATH.
- Total operator effort and whether it exceeded the time box: recorded CLI spans: greenfield 1 min 48 s; brownfield 30 s; documentation 23 s. <to confirm — operator: total effort and whether it exceeded the time box>.
- Was setup run before the cells by the same agent that ran them?: <to confirm — operator: yes or no, and which cells>.
- Any auto-feed: `none — the agent was launched by hand with a line that names SYNTH, as the current CLI requires; no skill, plugin or service announces the tool`.
- Setup log: kept at `C:\Users\j\AppData\Local\Temp\trial-staging\b53f6dcb859f\transcripts\setup.log` (sha256 `001bac9d5fe6003e9539d741e6820b2b7fa60dfe3c1a12622022548cd35e496d`), copied to `docs/analysis/guided-installed-cli-trial-2026-10-16-raw/staging/transcripts/setup.log`. <to confirm — operator: confirm it never entered a plain TEST_PATH>.

## 7. What this evidence does and does not support

- **Mechanically supported by this capture:** the installed CLI recorded an offer in 3 of 3 captured guided cell(s), and in 3 of them every recorded citation recomputes to the live source; the captured CLI state records 0 human response(s); no captured command list contains a lifecycle, approval, delivery or push command.
- **Not supported:** owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- **Not established by this capture, and yours to state:** whether any cell counts as `pass`, `fail` or `blocked`; the comparative §5 readings; and the 7 cell(s) this TEST_PATH did not hold (`greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`). §3 records what could be compared: greenfield matched, brownfield matched, documentation matched.
- Recommendation for ordinary PR #347 review: <to confirm — operator: keep as is / change / simplify / stop — with reasons, submitted in your own review comment>

