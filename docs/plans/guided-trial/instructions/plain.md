# Trial instruction set — plain condition

**Read this document completely before doing anything in your workspace.** It is your instruction set for one cell of a usability trial, staged in your workspace as `INSTRUCTIONS.md`.

Your workspace is the current directory. Your operator's opening message (or a separate handoff note) names it and names your assigned test; when in doubt, ask the operator before starting. Work only inside your workspace, and do not look for other checkouts, test suites or documentation.

## 1. How to start

Use your ordinary tools and judgment on the task below. There is no required first command and no prescribed process: decide yourself what the work needs.

Your assigned test is named in your operator's opening message. The tests and their starting conditions are listed here in full so you can see the whole set.

## 2. The tests: start conditions, task, and required observation

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

Write your proposal for the next slice into this workspace as `offer.json`, in whatever shape you consider clear. A reviewer must be able to see:

- the scope you propose, in a few words;
- the consequential decision you cannot make for the requester, phrased as one question;
- two or three options, each with its tradeoff and what would show it works;
- for each option, what it is grounded in: the task text, or an exact path, line and quote from a file in this workspace. Quote the file exactly; a reviewer will check the line.

## 4. Rules that protect the trial's honesty

- **No invented people.** There is no human respondent in this trial. Never write words as if a person said them or approved something.
- **No lifecycle actions.** Do not create or approve any plan, mission or governance record; this cell is a proposal, nothing more.
- **No publishing.** Do not push anywhere, open a pull request, or create a commit on any branch outside this workspace's own local history.
- **No weakening results.** Do not edit existing tests or fixtures to make something pass. If the brownfield test suite fails, record the failure.
- **Stop rather than guessing.** If a decision requires a person, say which decision and stop. That is a correct, expected outcome.

## 5. How to report when you stop

Give your report in this shape, and keep it truthful over complete:

```text
TEST: <case id>
COMMANDS: each command you ran with its exit code
APPROACH: what you did, in order, and why you chose that process
OFFER: path to offer.json, and the question/options it contains
CITATIONS: each citation and whether it matched the real file content and line
APPLICATION TESTS: command, exit code and result (brownfield only, before and after any change)
ASSUMPTIONS: what you assumed without evidence
STILL OPEN: decisions you left to a person, and anything you could not verify
PROBLEMS: anything you could not do, or anything that misled you
EFFORT: rough elapsed time for this cell
```

Write this report to `REPORT.md` in your workspace before you stop, and show it in your reply as well.

Do not claim that anything was approved, verified or delivered. Your report is agent-authored output in a diagnostic; it is not a human decision and not proof of value.
