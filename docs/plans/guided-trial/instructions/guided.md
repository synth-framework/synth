# Trial instruction set — guided condition

**Read this document completely before doing anything in your workspace.** It is your instruction set for one cell of a usability trial, staged in your workspace as `INSTRUCTIONS.md`. It is not a product prompt and not a script: everything you run you run because these instructions or the CLI's own output told you to.

Your workspace is the current directory. Your operator's opening message (or a separate handoff note) names it and names your assigned test; when in doubt, ask the operator before starting. Work only inside your workspace.

## 1. How to start: use the SYNTH initialization process

The tool under test is **SYNTH**, installed by the operator of this trial. Start with its initialization process — do not substitute another script, helper, or hand-rolled procedure:

```bash
synth first-contact --dry-run
```

Read that output before doing anything else. Then initialize the journey with the task for your assigned test (the task text is quoted in §2):

```bash
synth first-contact start "<your test's task text>"
synth first-contact status
```

Then produce your own offer as JSON in this workspace, and record it:

```bash
synth first-contact clarify --source-offer offer.json
synth first-contact status
```

If the CLI's own output names a next step, follow the CLI — it is authoritative over this document. If the CLI refuses, errors or contradicts this document, record the exact command, exit code and message, then stop.

If `synth` is not found on `PATH`, use the absolute path in your operator's opening message and record that you had to.

## 2. The tests: start conditions, task, and required observation

Each test starts from a different synthetic workspace. You are assigned exactly one; your operator's opening message names it. The tests are listed here in full so you can see the whole set.

| Test | Case id | Task text |
| --- | --- | --- |
| Greenfield | `green` | "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided." |
| Brownfield | `brown` | "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working." |
| Documentation-led | `docs` | "Continue from the requirements in docs/. The next slice is undecided." |
| Knowledge-rooted (optional) | `knowledge` | "Continue from the requirements in knowledge/. The next slice is undecided." |
| Conflicting documents (optional) | `conflict` | "Continue from the scope documents under docs/ and knowledge/. The next slice is undecided." |

**Required observation per test** — what a reviewer will check in your output:

- **Greenfield** — relevant questions or options about board kind, inputs, editing and validation; no invented GUI or stack; no automatic approval.
- **Brownfield** — the existing behavior, the existing test and the documented limitation are cited; only the delta is proposed; no wholesale rewrite of working code.
- **Documentation-led** — the actual files under `docs/` are read and cited by path and line; a genuine conflict becomes a decision with consequences; nothing is silently resolved.
- **Knowledge-rooted (optional)** — the same as documentation-led, from `knowledge/` instead of `docs/`.
- **Conflicting documents (optional)** — both scope documents are cited and the contradiction is surfaced as an unresolved decision, not silently resolved.

## 3. What to produce

One offer, written as `offer.json` in this workspace, with:

- a `scope` — the slice you are proposing, in a few words;
- one `question` — the consequential decision you cannot make for the requester;
- two or three `options`, each with a `label`, a `tradeoff` and an `acceptanceExample`;
- a `source` citation per option: either the task text (`operator-intent`) or an exact `path`, `line` and `quote` from a file in this workspace. Quote the file exactly; a reviewer will check the line.

Follow the schema the CLI reports for `--source-offer` if it differs from this description.

## 4. Rules that protect the trial's honesty

- **No invented people.** There is no human respondent in this trial. Do **not** pass `--selection` or `--human-response`, and never write words as if a person said them. The offer must end `awaiting-response`.
- **No lifecycle actions.** Do not run `first-contact approve`, do not run `first-contact materialize`, and do not start or approve a Mission or Expedition.
- **No publishing.** Do not push anywhere, open a pull request, or create a commit on any branch outside this workspace's own local history.
- **No weakening results.** Do not edit existing tests or fixtures to make something pass. If the brownfield test suite fails, record the failure.
- **Stop rather than guessing.** If a decision requires a person, say which decision and stop. That is a correct, expected outcome.

## 5. How to report when you stop

Give your report in this shape, and keep it truthful over complete:

```text
TEST: <case id>
COMMANDS: each command you ran with its exit code
CLI OUTPUT: what SYNTH showed at each step, summarized, including the final status
OFFER: path to offer.json, and the question/options it contains
CITATIONS: each citation and whether it matched the real file content and line
APPLICATION TESTS: command, exit code and result (brownfield only, before and after any change)
ASSUMPTIONS: what you assumed without evidence
STILL OPEN: decisions you left to a person, and anything you could not verify
PROBLEMS: anything the CLI got wrong, refused, or that contradicted these instructions
EFFORT: rough elapsed time for this cell
```

Write this report to `REPORT.md` in your workspace before you stop, and show it in your reply as well.

Do not claim that anything was approved, verified or delivered. Your report is agent-authored output in a diagnostic; it is not a human decision and not proof of value.
