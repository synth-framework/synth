# Trial instruction set — guided condition

**You are using SYNTH.** The operator who launched you installed a CLI called **SYNTH** on this machine and put this file here so you would use it. Nothing else tells you that: there is no skill, plugin, hook or service that announces it, and no file outside this workspace refers to it. You will not discover it by exploring; you know about it because this file says so.

**Read this document completely before doing anything.** It is the instruction set for the workspace you are in, staged in its root as `INSTRUCTIONS.md`. The generated `ENVIRONMENT.md` next to it records paths only — where the CLI is installed and which revision is under test.

## 1. What this workspace is

The workspace holds **one directory per test**, and each directory is an isolated environment containing only that test's own starting inputs:

| Directory | Kind of start |
| --- | --- |
| `greenfield/` | an idea, no files |
| `brownfield/` | a small existing project with a test and a documented limitation |
| `documentation/` | requirement documents only |
| `knowledge-led/` (if present) | the same, under a different conventional root |
| `conflicting-documents/` (if present) | two requirement documents that contradict each other |

Work on the tests **one at a time**, each entirely inside its own directory. Do not create, move or delete anything outside the directory of the test you are working on, and do not run the CLI in the workspace root: each test directory keeps its own `.synth/` state.

## 2. How to run one test: use the SYNTH initialization process

Inside the test's own directory, start with SYNTH's initialization process — do not substitute another script, helper, or hand-rolled procedure:

```bash
cd <test directory>
synth first-contact --dry-run
```

Read that output before doing anything else. Then initialize the journey with that test's task text, quoted in §3:

```bash
synth first-contact start "<that test's task text>"
synth first-contact status
```

Then write your own offer as JSON in that directory — `offer.json` — and record it:

```bash
synth first-contact clarify --source-offer offer.json
synth first-contact status
```

If the CLI's own output names a next step, follow the CLI — it is authoritative over this document — **except** when that step is one §5 forbids (approval, materialize, Mission or Expedition work, publishing): do not run it, continue with the steps above, and record both the suggestion and why you did not follow it. If the CLI refuses, errors or contradicts this document, record the exact command, exit code and message, finish the report for that test, and stop.

If `synth` is not found on `PATH`, use the absolute path in `ENVIRONMENT.md` and record that you had to. If a `synth` on `PATH` answers but is not the revision `ENVIRONMENT.md` records, use the recorded absolute path for **every** command and record the mismatch — a stale tool on `PATH` is not the one under test. If you are ever unsure whether the tool is installed, check with `synth --version` before concluding it is missing — do not fall back to a hand-rolled process. When a test is finished — the offer recorded and its report written — move to the next directory and repeat from the top of this section.

## 3. The tests: task text and required observation

Use each test's task text exactly as quoted; a reviewer will compare it with what you submit.

| Test | Case id | Directory | Task text |
| --- | --- | --- | --- |
| Greenfield | `green` | `greenfield/` | "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." |
| Brownfield | `brown` | `brownfield/` | "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." |
| Documentation-led | `docs` | `documentation/` | "Continue from the requirements in docs/. The next slice is undecided." |
| Knowledge-rooted (optional) | `knowledge` | `knowledge-led/` | "Continue from the requirements in knowledge/. The next slice is undecided." |
| Conflicting documents (optional) | `conflict` | `conflicting-documents/` | "Continue from the scope documents under docs/ and knowledge/. The next slice is undecided." |

**Required observation per test** — what a reviewer will check in your output:

- **Greenfield** — relevant questions or options about board kind, inputs, editing and validation; no invented GUI or stack; no automatic approval.
- **Brownfield** — the existing behavior, the existing test and the documented limitation are cited; only the delta is proposed; no wholesale rewrite of working code.
- **Documentation-led** — the actual files under `docs/` are read and cited by path and line; a genuine conflict becomes a decision with consequences; nothing is silently resolved.
- **Knowledge-rooted (optional)** — the same as documentation-led, from `knowledge/` instead of `docs/`.
- **Conflicting documents (optional)** — both scope documents are cited and the contradiction is surfaced as an unresolved decision, not silently resolved.

In the brownfield test, run the project's own test command (`npm test`) **before** you change anything and **after** any change, and record both exit codes and results in your report. Do not edit the existing tests or fixture files to make something pass.

## 4. What to produce per test

In the test's own directory:

- `offer.json` — your offer: a `scope`, one `question` naming the consequential decision you cannot make for the requester, and two or three `options` each carrying an `id` (letters, digits and `-` only; `defer` is reserved), a `label`, a `tradeoff`, an `acceptanceExample` and one `source`. A `source` is either the task text — `{"kind": "operator-intent", "quote": "<the task text, exactly>"}` — or a line from a file in that directory — `{"path": "src/board.js", "line": 1, "quote": "<that line, exactly>"}`. Quote exactly; a reviewer will check the line. The CLI validates the file when you pass `--source-offer`: if its error disagrees with this description, the CLI is right — fix the file and record what it refused.
- `REPORT.md` — the report described in §5.

## 5. Rules that protect the trial's honesty

- **No invented people.** There is no human respondent in this trial. Do **not** pass `--selection` or `--human-response`, and never write words as if a person said them. Every offer must end `awaiting-response`.
- **No lifecycle actions.** Do not run `first-contact approve`, do not run `first-contact materialize`, and do not start or approve a Mission or Expedition.
- **No publishing.** Do not push anywhere, open a pull request, or create a commit on any branch outside the workspace's own local history.
- **No weakening results.** Do not edit existing tests or fixtures to make something pass; record failures instead.
- **Stop rather than guessing.** If a decision requires a person, say which decision and stop. That is a correct, expected outcome.
- **Stay in the test's own directory.** Anything you write outside the directory of the test you are working on breaks the isolation the trial depends on.

## 6. How to report when you stop

Write one `REPORT.md` per test directory, in this shape, and keep it truthful over complete:

```text
TEST: <case id and directory>
COMMANDS: each command you ran with its exit code
CLI OUTPUT: what SYNTH showed at each step, summarized, including the final status
OFFER: path to offer.json, and the question/options it contains
CITATIONS: each citation and whether it matched the real file content and line
APPLICATION TESTS: command, exit code and result (brownfield only, before and after any change)
ASSUMPTIONS: what you assumed without evidence
STILL OPEN: decisions you left to a person, and anything you could not verify
PROBLEMS: anything the CLI got wrong, refused, or that contradicted these instructions
EFFORT: rough elapsed time for this test
```

Do not claim that anything was approved, verified or delivered. Your report is agent-authored output in a diagnostic; it is not a human decision and not proof of value.
