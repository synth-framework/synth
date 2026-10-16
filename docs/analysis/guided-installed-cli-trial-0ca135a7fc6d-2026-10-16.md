# Installed-CLI guided-journey trial — evidence (2026-10-16)

Captured by `node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>` from `C:\Users\j\Projects\board-test` on 2026-10-16T10:13:10.878Z (argument). Template: [guided-three-path-installed-trial-evidence-template.md](guided-three-path-installed-trial-evidence-template.md). Runbook: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

Machine-read rows come from the finished workspace — `REPORT.md`, `offer.json`, `.synth/first-contact/` (including the CLI's own recorded offer with its citation hashes), any other CLI-stored file — and from the scratch directory when it was reachable. Quotes attributed to `REPORT.md` are the agent's own words, copied verbatim. Rows reading `<to confirm — operator: …>` are operator-only: this script has no way to know them and will not guess. Raw byte-for-byte copies: `docs/analysis/guided-installed-cli-trial-0ca135a7fc6d-2026-10-16-raw/`.

This is a copy: the staged `ENVIRONMENT.md` records the workspace as `C:\Users\j\Projects\board-test`, and the copy captured here ran at `C:\Users\j\Projects\board-test`. Every artifact below is byte-identical to that copy's files; the digests in `docs/analysis/guided-installed-cli-trial-0ca135a7fc6d-2026-10-16-raw/SOURCES.json` name both paths. The operator's own machine is the source of the run, not of these bytes.

Cells captured here: `greenfield/guided`, `brownfield/guided`, `documentation/guided`. Not captured in this file: `greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. The other condition needs its own TEST_PATH; capture that workspace separately with its own `--out`.

## 0. Independence compliance

Checklist: [instructions, Appendix C](../plans/guided-installed-cli-trial-instructions.md#appendix-c--independence-compliance-checklist). Mark each item and name anything unmet. The "evidence column" rows below are what this capture could prove mechanically; the "Met?" column stays with the operator.

| # | Requirement | Met? | Note or evidence |
| --- | --- | --- | --- |
| 1 | Sessions run by a different agent and fresh sessions than the authoring agent | <to confirm — operator: who ran the sessions and whether they had seen this repository> | No agent identity is recorded in TEST_PATH. The launch line setup printed is in §1. |
| 2 | Agent had no access to the authoring checkout | <to confirm — operator: how the machine was isolated> | No build output, tarball or `node_modules` inside TEST_PATH. Staging: `C:\Users\j\AppData\Local\Temp\trial-staging\0ca135a7fc6d` (found). |
| 2b | Isolation mode: same-machine confinement by layout and instruction, or a container/separate machine | <to confirm — operator: confinement or container/separate machine> | ENVIRONMENT.md records the workspace as `C:\Users\j\Projects\board-test` and the CLI outside it. |
| 3 | Agent blind to which condition is expected to win; plain prompt never mentioned SYNTH | <to confirm — operator: confirm the prompt you typed and that nothing else named the tool> | staged `INSTRUCTIONS.md` present: 8282 B, sha256 `0d0433628d4da7ac4cdfb6c0b0629add708b51d842d07c71ca58236833f27bd5`, names the tool (guided set). |
| 4 | Matched inputs; revisions recorded before the first cell | <to confirm — operator: confirm the setup run preceded the first cell> | §3 recomputes every captured case against the frozen record: greenfield matched; brownfield matched; documentation matched. |
| 5 | Matched agent/model/version, tools, starting request text | <to confirm — operator: the agent, model, version and tool access used in this condition> | The starting request text per case is in the raw copies and quoted in §4; the staged instruction set is sha256 `0d0433628d4da7ac4cdfb6c0b0629add708b51d842d07c71ca58236833f27bd5`. |
| 6 | Session plan and order (fresh session per test where possible; one session per condition at minimum) | <to confirm — operator: the actual order and session count> | Recorded CLI timestamps: greenfield 2026-10-16T09:56:48.481Z; brownfield 2026-10-16T09:57:59.020Z; documentation 2026-10-16T09:59:12.226Z. |
| 7 | Protocol, time box, expected observations and stop conditions pre-registered | <to confirm — operator: the time box and where the protocol was fixed> | [guided-three-path-matched-comparison.md](guided-three-path-matched-comparison.md) and the runbook were in the repository before this run; the commits carrying them are in the branch history. |
| 8 | Verbatim transcripts, wall-clock per cell, intervention log | <to confirm — operator: confirm nothing was tidied or withheld> | CLI transcripts captured for 3 of 3 case(s); agent reports captured for 3 of 3. |
| 9 | Installed tarball pinned and identified (not a repo build) | <to confirm — operator: confirm the installed CLI is the one that ran> | tarball sha256 `5cd1899d363fbb1a9ac0c51a83cd3a376b05f4ccdc480bc6889e94c429cbb86b`, `synth --version` → {"status":"ok","version":"2.6.1","name":"synth","schema":"synth-cli-v1"} |
| 10 | No invented human words; guided cells ended `awaiting-response`; no lifecycle action; no push | <to confirm — operator: confirm from your own session> | Captured CLI state records 0 human response(s); no lifecycle, selection or push command appears in a captured command list; machine-recorded terminal projections: greenfield: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T09:57:17.758Z — the report's `first-contact status` line is quoted in §4; brownfield: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T09:58:23.596Z — the report's `first-contact status` line is quoted in §4; documentation: no working brief stored (recording `draft`); last recorded CLI event: agent `proposal` at 2026-10-16T09:59:29.440Z — the report's `first-contact status` line is quoted in §4 |
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
| Scratch directory (outside TEST_PATH) | `C:\Users\j\AppData\Local\Temp\trial-staging\0ca135a7fc6d` — tarball, installed CLI and transcripts |
| CLI manifest / setup manifest | `cli-manifest.json`, `transcripts/setup-manifest.json` |
| Instruction file staged at TEST_PATH root | `INSTRUCTIONS.md` (guided set — names the tool), sha256 `0d0433628d4da7ac4cdfb6c0b0629add708b51d842d07c71ca58236833f27bd5`, plus `ENVIRONMENT.md` |
| Other files in TEST_PATH root (not starting inputs) | `TRANSCRIPT.md` (6508 B, sha256 `a182d154ef1061d247ba839e6c4cc1dfbaba0d5ba2d8368b251c05a9cb1e40e9`, copied into the raw bundle) |
| Launch line given to the agent, verbatim | recorded by setup: ``This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`.`` (from `setup-manifest.json`). <to confirm — operator: paste what you actually typed, and if you changed the wording, say exactly how> |
| Date and timezone, start/end | `greenfield`: 2026-10-16T09:56:48.481Z → 2026-10-16T09:57:17.758Z (CLI-recorded); `brownfield`: 2026-10-16T09:57:59.020Z → 2026-10-16T09:58:23.596Z (CLI-recorded); `documentation`: 2026-10-16T09:59:12.226Z → 2026-10-16T09:59:29.440Z (CLI-recorded); filename date `2026-10-16` (argument). <to confirm — operator: your local timezone, and the start/end the operator saw — the mtimes are the machine clock reading when the files were written, not a clock the operator set> |
| Running agent, model and version | <to confirm — operator: agent product, model and version; session ids> |
| Tool access given to the agent | <to confirm — operator: shell, editor, network, and anything else> |
| Pinned repository revision | `0ca135a7fc6d018df3d7de30ac59ef56dd45d2d5` — 0ca135a Say how to file a run that comes after another one (ENVIRONMENT.md) |
| Environment | <to confirm — operator: node --version, npm --version, OS — the machine that ran setup and the sessions> |
| Time box set before starting | <to confirm — operator: the time box you set, and whether the run stayed inside it> |
| Private assets involved | `none` (required; any private asset invalidates this run) |

## 2. Install proof

| Field | Value |
| --- | --- |
| Build command and exit | `npm run build` → exit 0 — setup writes this transcript only after every step succeeded (a nonzero exit aborts before it) |
| Pack command and exit | `npm pack --pack-destination <staging>/pack` → exit 0 — setup writes this transcript only after every step succeeded (a nonzero exit aborts before it) |
| Tarball name | synth-framework-synth-2.6.1.tgz |
| Tarball SHA-256 | `5cd1899d363fbb1a9ac0c51a83cd3a376b05f4ccdc480bc6889e94c429cbb86b` |
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

- Session id and start time: journeyId `e04f2304-9a98-4168-bd86-4b87ece9ece9`; first recorded CLI event `2026-10-16T09:56:48.481Z`, last `2026-10-16T09:57:17.758Z` (recorded span 29 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text

- `synth --version` in greenfield/ — exit 0 — returned version 2.6.1, schema synth-cli-v1
- `C:\Users\j\AppData\Local\Temp\trial-staging\0ca135a7fc6d\global\synth.cmd --version` in greenfield/ — exit 0 — returned version 2.6.1; matched PATH tool version, so continued using `synth` on PATH and recorded both checks
- `synth first-contact --dry-run` in greenfield/ — exit 0
- `synth first-contact clarify --help` in greenfield/ — exit 0 (read-only help to confirm offer recording syntax)
- `synth first-contact start "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided."` in greenfield/ — exit 0
- `synth first-contact status` in greenfield/ — exit 0 (after start)
- `synth first-contact clarify` (no args) in greenfield/ — exit 0 (read-only inspection of ambiguities/questions before authoring offer)
- `synth first-contact clarify --source-offer offer.json` in greenfield/ — exit 0
- `synth first-contact status` in greenfield/ — exit 0 (after offer)
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - status (after start): kind FirstContactStatus, state draft, canApprove false, sourceOffers [], workingBrief no-source-offer; nextStep clarify.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; observed `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; matched yes — this case starts empty, so the revision is the hash of an empty file set. Files present that are not starting inputs: `REPORT.md` (6126 B), `offer.json` (1833 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~5 minutes for this test.; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T09:57:17.758Z`, draft last written `2026-10-16T09:57:17.762Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `greenfield/offer.json` (1833 B, sha256 `161b228e729909b5e53b62daf6496b36418bee05c3cdf2966d0f0f3c8b66f090`); the CLI recorded it as `offer-d25d4778-0915-4cb3-b964-b6051b221008` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T09:57:17.758Z`; question: Which board input and editing interaction should the specimen-board exporter support first?

```text
board-file — File-defined board with explicit edits [operator-intent]
inline-board — Inline board data with single-edit operations [operator-intent]
validated-export — Export gated by board validation [operator-intent]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-d25d4778-0915-4cb3-b964-b6051b221008 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `board-file` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
  - `inline-board` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
  - `validated-export` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`bb2f3014b997d9b9eb9fa069db3e3fec37da4318700a9e40794b5b7980aa0183`) and the quoted intent matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
greenfield/offer.json
- scope: "Small editable specimen-board exporter for the SVG board utility, limited to board input, editing interaction, and export validation"
- question: "Which board input and editing interaction should the specimen-board exporter support first?"
- options:
  - board-file / "File-defined board with explicit edits" / tradeoff keeps input inspectable but requires agreeing file shape / acceptanceExample file input -> SVG export + invalid-cell report
  - inline-board / "Inline board data with single-edit operations" / tradeoff smallest slice but leaves file/bulk edits undecided / acceptanceExample inline data + one edit -> apply + export or reject with reason
  - validated-export / "Export gated by board validation" / tradeoff prevents bad exports but requires deciding blocking rules / acceptanceExample validation failure blocks export and names failing rule
- All three sources kind operator-intent quoting the task text exactly. No GUI/stack invented. Ends awaiting-response (no --selection/--human-response used).
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
None about users/runtime/language/stack; deliberately left undecided. Assumed offer.json shape (scope/question/options with id/label/tradeoff/acceptanceExample/source) from INSTRUCTIONS.md §4 was correct — CLI accepted it on first try, confirming the assumption.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
The question above — which board input and editing interaction to support first (file-defined vs inline vs validation-gated, including board kind, edit operations, and blocking validation rules). Also open per CLI draft: primary users, stakeholders, target runtime, language preferences, required capabilities (confidence 0). Nothing approved, verified, or delivered.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text

- CLI --dry-run suggested `synth first-contact --approve` (and wouldRun `synth init`, `synth mission create`, `synth mission approve`, plus `synth adapter init` in repositoryAdapter.nextStep). Did not run any of them: INSTRUCTIONS.md §2/§5 forbids first-contact approve, materialize, and Mission/Expedition work, and requires the start/status/clarify --source-offer/status path instead. Recorded here per §2.
- CLI bare `clarify` suggested `synth first-contact clarify --field <field> --answer <answer>`. Did not use it to invent answers; used --source-offer per INSTRUCTIONS.md instead. No refusal/error/contradiction beyond the expected next-step divergence.
- PATH vs ENVIRONMENT.md revision check: both `synth --version` and the absolute-path CLI returned 2.6.1; ENVIRONMENT.md records revision 0ca135a7fc6d... with no version string to compare against, so could not verify revision equality from --version alone; proceeded on PATH and recorded both commands. `synth --version` confirmed installed, so no fallback to hand-rolled process.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
N/A (greenfield only; brownfield rule does not apply).
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text

- --dry-run: kind FirstContactOnboardPlan, detected empty, projectName greenfield; stages detect/init/mission; wouldCreate .synth/manifest.json, .synth/data/event-log.jsonl, .synth/data/canonical-state.json; wouldRun synth init, synth mission create, synth mission approve; nextStep `synth first-contact --approve`; repositoryAdapter detected none; sourceHandoff not-ingested. Did not follow --approve/init/mission/adapter steps — see PROBLEMS.
- start: kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent reproduced exactly, confidence overall 0.25, unknowns audience.primaryUsers, environment.targetRuntime, environment.languagePreferences, capabilities.required; nextStep `synth first-contact clarify`.
- status (after start): kind FirstContactStatus, state draft, canApprove false, sourceOffers [], workingBrief no-source-offer; nextStep clarify.
- clarify (no args): kind FirstContactClarification, ambiguities MISSING_REQUIRED for audience.primaryUsers/stakeholders, environment.targetRuntime/languagePreferences, capabilities.required; questions q-1..q-5; nextStep `synth first-contact clarify --field <field> --answer <answer>`. Did not answer fields directly; used --source-offer per INSTRUCTIONS.md instead.
- clarify --source-offer: kind FirstContactSourceOfferRecorded, offer id offer-d25d4778-0915-4cb3-b964-b6051b221008, version 1, attribution agent-authored-offer; note citations do not prove interpretation or human display.
- status (final): kind FirstContactStatus, state draft, canApprove false, sourceOffers contains the recorded offer, workingBrief status awaiting-response, version 1, sourceFreshness current; note agent-authored options are not authenticated human agreement; nextStep `synth first-contact clarify`.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text

- CLI --dry-run suggested `synth first-contact --approve` (and wouldRun `synth init`, `synth mission create`, `synth mission approve`, plus `synth adapter init` in repositoryAdapter.nextStep). Did not run any of them: INSTRUCTIONS.md §2/§5 forbids first-contact approve, materialize, and Mission/Expedition work, and requires the start/status/clarify --source-offer/status path instead. Recorded here per §2.
- CLI bare `clarify` suggested `synth first-contact clarify --field <field> --answer <answer>`. Did not use it to invent answers; used --source-offer per INSTRUCTIONS.md instead. No refusal/error/contradiction beyond the expected next-step divergence.
- PATH vs ENVIRONMENT.md revision check: both `synth --version` and the absolute-path CLI returned 2.6.1; ENVIRONMENT.md records revision 0ca135a7fc6d... with no version string to compare against, so could not verify revision equality from --version alone; proceeded on PATH and recorded both commands. `synth --version` confirmed installed, so no fallback to hand-rolled process.
```

### brownfield / guided

- Session id and start time: journeyId `49e5e6ec-d6a3-493d-b793-cba6964c6e47`; first recorded CLI event `2026-10-16T09:57:59.020Z`, last `2026-10-16T09:58:23.596Z` (recorded span 25 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text

- `synth first-contact --dry-run` in brownfield/ — exit 0
- `npm test` in brownfield/ (before any change) — exit 0
- `synth first-contact start "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working."` in brownfield/ — exit 0
- `synth first-contact status` in brownfield/ (after start) — exit 0
- `synth first-contact clarify --source-offer offer.json` in brownfield/ — exit 0
- `synth first-contact status` in brownfield/ (after offer) — exit 0
- `npm test` in brownfield/ (after offer; no source edits made) — exit 0
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - status (after start): kind FirstContactStatus, state draft, canApprove false, sourceOffers [], workingBrief no-source-offer; nextStep clarify.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; observed `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe`; matched yes — 4 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (4878 B), `offer.json` (1874 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~5 minutes for this test.; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T09:58:23.596Z`, draft last written `2026-10-16T09:58:23.602Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `brownfield/offer.json` (1874 B, sha256 `d2c428ef6af5838932b3d57c8dac93d33d9fa02da6fdf339b9b44c36727414e1`); the CLI recorded it as `offer-89d39751-1141-4980-a73b-87dd1efed86a` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T09:58:23.596Z`; question: How should the user-selected fill color be accepted while keeping the existing label output unchanged?

```text
optional-fill-arg — Optional second fill argument, default preserves output [src/board.js:1]
fill-preserves-test — Additive fill that keeps the existing test green [tests/board.test.js:4]
fill-delta-only — Fill-color delta only, label behavior untouched [docs/limitation.md:1]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-89d39751-1141-4980-a73b-87dd1efed86a version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `optional-fill-arg` → `src/board.js:1`: verified — the hash the CLI recorded recomputes to the same value (`550765693891f48b26e0476610b80d9776e94a43413630d9b27e9e02de3435ee`) and the quoted line matches the live source
  - `fill-preserves-test` → `tests/board.test.js:4`: verified — the hash the CLI recorded recomputes to the same value (`d97df21784804d026e92b27e129a622e3209e176a2ac82502f1bb2637f9a3a97`) and the quoted line matches the live source
  - `fill-delta-only` → `docs/limitation.md:1`: verified — the hash the CLI recorded recomputes to the same value (`f4ee00a6c83e8e1294a9863b83e167afd3f4e3a7e4c943c2aadbb23669d8a246`) and the quoted line matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
brownfield/offer.json
- scope: "Extend the existing SVG board renderer with a user-selected fill color; existing label output and tests keep working, delta only, no rewrite"
- question: "How should the user-selected fill color be accepted while keeping the existing label output unchanged?"
- options:
  - optional-fill-arg / "Optional second fill argument, default preserves output" / source src/board.js:1 / acceptanceExample render('A') still '<text>A</text>', render('A','red') preserves label plus fill
  - fill-preserves-test / "Additive fill that keeps the existing test green" / source tests/board.test.js:4 / acceptanceExample existing test unchanged, fill only additive
  - fill-delta-only / "Fill-color delta only, label behavior untouched" / source docs/limitation.md:1 / acceptanceExample limitation gap closed, labels as before plus fill
- No wholesale rewrite proposed; delta only. Ends awaiting-response (no --selection/--human-response used).
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
None about fill API shape beyond the question; left fill passing/defaults/validation to a person. Assumed relative paths (src/board.js etc.) from brownfield/ are the correct citation form — CLI accepted them, confirming the assumption.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
How fill color should be accepted (positional arg vs other delta form, defaults, validation) while preserving render('A') output and the existing test. Nothing approved, verified, or delivered; no code changed.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text

- CLI --dry-run suggested `synth bootstrap --approve`, `synth discover . --export`, `synth docs generate --knowledge-base ./docs`, and `synth adapter init`. Did not run any: INSTRUCTIONS.md §2/§5 requires the start/status/clarify --source-offer/status path and forbids approve/materialize/Mission/Expedition/publishing; bootstrap/approve and Mission-equivalent onboarding steps fall under the forbidden lifecycle actions. Recorded here per §2.
- No CLI refusal/error/contradiction beyond the expected next-step divergence; offer accepted first try.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text

- Before: `npm test` (node --test tests/board.test.js) — exit 0 — 1 pass (existing label), 0 fail.
- After: `npm test` — exit 0 — 1 pass, 0 fail. No source, test, or fixture edits made; did not edit existing tests or fixtures.
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text

- --dry-run: kind FirstContactOnboardPlan, detected brownfield, projectName brownfield; stages detect/analyze/apply; wouldCreate .synth/manifest.json, .synth/data/event-log.jsonl, .synth/data/canonical-state.json, docs/reference/capability-validation-map.json; wouldRun `synth bootstrap --approve`; nextStep `synth discover . --export`; repositoryAdapter detected none; sourceHandoff not-ingested with files docs/limitation.md, package.json, src/board.js, tests/board.test.js and live excerpts matching real lines. Did not follow bootstrap/discover/docs-generate/adapter steps — see PROBLEMS.
- start: kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent reproduced exactly, confidence overall 0.083; nextStep `synth first-contact clarify`.
- status (after start): kind FirstContactStatus, state draft, canApprove false, sourceOffers [], workingBrief no-source-offer; nextStep clarify.
- clarify --source-offer: kind FirstContactSourceOfferRecorded, offer id offer-89d39751-1141-4980-a73b-87dd1efed86a, version 1, attribution agent-authored-offer.
- status (final): kind FirstContactStatus, state draft, canApprove false, sourceOffers contains the recorded offer, workingBrief status awaiting-response, version 1, sourceFreshness current; nextStep `synth first-contact clarify`.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text

- CLI --dry-run suggested `synth bootstrap --approve`, `synth discover . --export`, `synth docs generate --knowledge-base ./docs`, and `synth adapter init`. Did not run any: INSTRUCTIONS.md §2/§5 requires the start/status/clarify --source-offer/status path and forbids approve/materialize/Mission/Expedition/publishing; bootstrap/approve and Mission-equivalent onboarding steps fall under the forbidden lifecycle actions. Recorded here per §2.
- No CLI refusal/error/contradiction beyond the expected next-step divergence; offer accepted first try.
```

### documentation / guided

- Session id and start time: journeyId `df19fbde-a070-41c8-935e-57299987e5d9`; first recorded CLI event `2026-10-16T09:59:12.226Z`, last `2026-10-16T09:59:29.440Z` (recorded span 17 s). <to confirm — operator: agent session id and local wall-clock start/end>
- Commands and exit codes: <to confirm — operator: confirm these are complete> — as written in `REPORT.md`:

```text

- `synth first-contact --dry-run` in documentation/ — exit 0
- `synth first-contact start "Continue from the requirements in docs/. The next slice is undecided."` in documentation/ — exit 0
- `synth first-contact status` in documentation/ (after start) — exit 0
- `synth first-contact clarify --source-offer offer.json` in documentation/ — exit 0
- `synth first-contact status` in documentation/ (after offer) — exit 0
```
- `first-contact status` terminal projection (`awaiting-response` required here): not machine-recorded in this capture; the report's CLI OUTPUT section says: - status (after start): kind FirstContactStatus, state draft, canApprove false, sourceOffers [], workingBrief no-source-offer; nextStep clarify.. <to confirm — operator: the status projection you saw, verbatim>
- Input revision at start / any file change during the cell: expected `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; observed `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179`; matched yes — 1 input file(s): all byte-identical to the frozen fixtures. Files present that are not starting inputs: `REPORT.md` (4626 B), `offer.json` (1710 B), `.synth/` (2 file(s)).
- Operator effort (minutes) and agent turns / interventions: the report's own estimate: ~4 minutes for this test.; recorded 1 operator input event(s) and 1 agent event(s) in the CLI transcript, offer recorded at `2026-10-16T09:59:29.440Z`, draft last written `2026-10-16T09:59:29.444Z`. <to confirm — operator: elapsed minutes on the clock, turns, and every intervention verbatim>
- Agent-authored offer path and its citation targets: `documentation/offer.json` (1710 B, sha256 `a8c1c87df05ee0999582c5619847511fa1abdde8924379dea96ae188a5a3e013`); the CLI recorded it as `offer-54b0cf7f-7c4a-4ee2-ab58-3f489da8c299` version 1, attribution `agent-authored-offer`, offeredAt `2026-10-16T09:59:29.440Z`; question: What should the next slice after the single-SVG export cover while editing interaction stays undecided?

```text
single-export — Single SVG export from local data first [docs/requirements.md:1]
decide-editing — Decide editing interaction before building it [docs/requirements.md:2]
defer-slice — Hold the next slice for an explicit person decision [operator-intent]
```
  File and record agree on option ids, question and scope: yes (the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy; the offer file carries no id; the CLI recorded offer-54b0cf7f-7c4a-4ee2-ab58-3f489da8c299 version 1).
- Whether each citation matched the real file content and line: all recomputed here with the CLI rule, against the CLI-recorded offer (draft.sourceOffers) (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):
  - `single-export` → `docs/requirements.md:1`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
  - `decide-editing` → `docs/requirements.md:2`: verified — the hash the CLI recorded recomputes to the same value (`b51353a3e8b89f9d680ab78110bce3ce599ca21bcb548a7fbc35a00c9a851469`) and the quoted line matches the live source
  - `defer-slice` → operator-intent (the journey's original request): verified — the hash the CLI recorded recomputes to the same value (`e3c190b4c5b828f80624e2ebab1d1f266e1a647af9c179c2421a0bd4b4e8856f`) and the quoted intent matches the live source
- Questions or options the agent raised: the recorded question and options are the offer above; as written in `REPORT.md`:

```text
documentation/offer.json
- scope: "Continue from docs/requirements.md: single SVG export from local data, with requested but undecided editing interaction"
- question: "What should the next slice after the single-SVG export cover while editing interaction stays undecided?"
- options:
  - single-export / "Single SVG export from local data first" / source docs/requirements.md:1 / acceptanceExample local data -> exactly one SVG plus unexportable-data report
  - decide-editing / "Decide editing interaction before building it" / source docs/requirements.md:2 / acceptanceExample editing scoped only after interaction style decided
  - defer-slice / "Hold the next slice for an explicit person decision" / source operator-intent task text / acceptanceExample person picks one slice, other stays open
- Undecided editing interaction surfaced as the decision with consequences (tradeoffs state what ships vs what waits); nothing silently resolved. Ends awaiting-response (no --selection/--human-response used).
```
- Unsupported assumptions: as written in `REPORT.md`:

```text
None about which slice is preferred or which editing interaction to use; left both to a person. Assumed docs/requirements.md (2 lines) is the complete requirement set for this test — directory listing showed only docs/requirements.md.
```
- Unresolved choices it left open: as written in `REPORT.md`:

```text
The next-slice decision — export baseline first vs deciding editing interaction first vs holding for explicit person choice. Also open per CLI draft: primary users, target runtime, language, required capabilities. Nothing approved, verified, or delivered.
```
- Any SYNTH integrity message, warning or failure text: no CLI error log was captured; the report's PROBLEMS section:

```text

- CLI --dry-run suggested `synth bootstrap --approve`, `synth docs generate --knowledge-base ./docs`, and `synth adapter init`. Did not run any: INSTRUCTIONS.md §2/§5 requires the start/status/clarify --source-offer/status path and forbids approve/materialize/Mission/Expedition/publishing; bootstrap/approve falls under forbidden lifecycle actions and docs-generate was not in the prescribed steps. Recorded here per §2.
- No CLI refusal/error/contradiction beyond the expected next-step divergence; offer accepted first try.
```
- Application test command and exit (brown only, before and after any change): as written in `REPORT.md`:

```text
N/A (documentation-led only; brownfield npm-test rule does not apply; no application code present).
```
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: <to confirm — operator: the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: no machine-recorded terminal projection)>
- CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim): ```text

- --dry-run: kind FirstContactOnboardPlan, detected brownfield (docs-only directory), projectName documentation; stages detect/analyze/apply; wouldCreate .synth/manifest.json, .synth/data/event-log.jsonl, .synth/data/canonical-state.json, docs/reference/capability-validation-map.json; wouldRun `synth bootstrap --approve`; nextStep `synth docs generate --knowledge-base ./docs`; repositoryAdapter detected none; sourceHandoff not-ingested with files docs/requirements.md and live excerpts of both lines. Did not follow bootstrap/docs-generate/adapter steps — see PROBLEMS.
- start: kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent reproduced exactly, confidence overall 0.083; nextStep `synth first-contact clarify`.
- status (after start): kind FirstContactStatus, state draft, canApprove false, sourceOffers [], workingBrief no-source-offer; nextStep clarify.
- clarify --source-offer: kind FirstContactSourceOfferRecorded, offer id offer-54b0cf7f-7c4a-4ee2-ab58-3f489da8c299, version 1, attribution agent-authored-offer.
- status (final): kind FirstContactStatus, state draft, canApprove false, sourceOffers contains the recorded offer, workingBrief status awaiting-response, version 1, sourceFreshness current; nextStep `synth first-contact clarify`.
```
- What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim): ```text

- CLI --dry-run suggested `synth bootstrap --approve`, `synth docs generate --knowledge-base ./docs`, and `synth adapter init`. Did not run any: INSTRUCTIONS.md §2/§5 requires the start/status/clarify --source-offer/status path and forbids approve/materialize/Mission/Expedition/publishing; bootstrap/approve falls under forbidden lifecycle actions and docs-generate was not in the prescribed steps. Recorded here per §2.
- No CLI refusal/error/contradiction beyond the expected next-step divergence; offer accepted first try.
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
| Anything that failed or was skipped, with the exact error text | no CLI error log was captured in this TEST_PATH; cells not captured in this file and therefore `not run` unless they ran elsewhere: `greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`. |

## 6. Explicit statements

- Human words fabricated in any cell: `none` — required; the captured CLI state holds no recorded human response (sourceAnswers and choiceReviews are empty in every captured draft) and no captured command names a selection, approval or human response.
- Responses recorded per cell: captured CLI state — greenfield: 0 response(s), 0 choice review(s); brownfield: 0 response(s), 0 choice review(s); documentation: 0 response(s), 0 choice review(s). <to confirm — operator: confirm that no response exists outside the captured state>.
- Runtime Mission/Expedition lifecycle actions: none — no lifecycle, selection, approval, delivery or push command appears in the captured command lists or error logs.
- Pushes, pull requests or merges created by this trial: no `.git` directory inside TEST_PATH; nothing was captured that could push. <to confirm — operator: confirm no session pushed from elsewhere>.
- Application tests weakened or skipped to make a cell pass: the agent's own `APPLICATION TESTS` statement, first line per cell — greenfield: N/A (greenfield only; brownfield rule does not apply). | brownfield: Before: `npm test` (node --test tests/board.test.js) — exit 0 — 1 pass (existing label), 0 fail. | documentation: N/A (documentation-led only; brownfield npm-test rule does not apply; no application code present).; the full sections are in the raw copies. <to confirm — operator: confirm no test was weakened>.
- Isolation mode: <to confirm — operator: confinement by layout and instruction, a container, or a separate machine>.
- Plain condition: <to confirm — operator: its own TEST_PATH, or "not run">.
- Build output visible inside TEST_PATH: none — no build output, tarball or `node_modules` inside TEST_PATH.
- Total operator effort and whether it exceeded the time box: recorded CLI spans: greenfield 29 s; brownfield 25 s; documentation 17 s. <to confirm — operator: total effort and whether it exceeded the time box>.
- Was setup run before the cells by the same agent that ran them?: <to confirm — operator: yes or no, and which cells>.
- Any auto-feed: `none — the agent was launched by hand with a line that names SYNTH, as the current CLI requires; no skill, plugin or service announces the tool`.
- Setup log: kept at `C:\Users\j\AppData\Local\Temp\trial-staging\0ca135a7fc6d\transcripts\setup.log` (sha256 `a019c150789d39127720eb42486058aad8615d600a3957fff2efbb79f394682a`), copied to `docs/analysis/guided-installed-cli-trial-0ca135a7fc6d-2026-10-16-raw/staging/transcripts/setup.log`. <to confirm — operator: confirm it never entered a plain TEST_PATH>.

## 7. What this evidence does and does not support

- **Mechanically supported by this capture:** the installed CLI recorded an offer in 3 of 3 captured guided cell(s), and in 3 of them every recorded citation recomputes to the live source; the captured CLI state records 0 human response(s); no captured command list contains a lifecycle, approval, delivery or push command.
- **Not supported:** owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- **Not established by this capture, and yours to state:** whether any cell counts as `pass`, `fail` or `blocked`; the comparative §5 readings; and the 7 cell(s) this TEST_PATH did not hold (`greenfield/plain`, `brownfield/plain`, `documentation/plain`, `knowledge-led/guided`, `knowledge-led/plain`, `conflicting-documents/guided`, `conflicting-documents/plain`). §3 records what could be compared: greenfield matched, brownfield matched, documentation matched.
- Recommendation for ordinary PR #347 review: <to confirm — operator: keep as is / change / simplify / stop — with reasons, submitted in your own review comment>

