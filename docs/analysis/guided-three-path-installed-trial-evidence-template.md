# Evidence template — installed-CLI guided-journey trial

Copy this file into the trial root, fill it in during the run, and attach the completed copy to PR #347 as a new file. Replace every `<...>` placeholder and delete unused optional rows. Instructions: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

**This template is filled in by an operator and a running agent. The summary is agent/operator-authored prose, not a human decision record.**

## 1. Run identity

| Field | Value |
| --- | --- |
| Operator (who ran the trial) | `<name>` |
| Date and timezone, start/end | `<...>` |
| Running agent, model and version | `<...>` |
| Tool access given to the agent | `<shell, editor, network, ...>` |
| Pinned repository revision | `<commit sha>` |
| Environment | `node --version`: `<...>`; `npm --version`: `<...>`; OS: `<...>` |
| Time box set before starting | `<...>` |
| Private assets involved | `none` (required; any private asset invalidates this run) |

## 2. Install proof

| Field | Value |
| --- | --- |
| Build command and exit | `npm run build` → `<exit>` |
| Pack command and exit | `npm pack --pack-destination <dir>` → `<exit>` |
| Tarball name | `<synth-framework-synth-<version>.tgz>` |
| Tarball SHA-256 | `<sha256>` |
| Global install command and exit | `npm install -g --prefix <dir> <tgz>` → `<exit>` |
| `synth --version` output | `<json>` |

## 3. Matched input revisions

| Case | Expected revision | Observed revision | Matched? |
| --- | --- | --- | --- |
| green | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | `<...>` | `<yes/no>` |
| brown | `348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe` | `<...>` | `<yes/no>` |
| docs | `37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179` | `<...>` | `<yes/no>` |
| knowledge (optional) | `d5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338` | `<...>` | `<yes/no>` |
| conflict (optional) | `fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5` | `<...>` | `<yes/no>` |

If any required case did not match, stop and report `blocked` — do not continue to the cells.

## 4. Cells

Fill one block per case and condition. Required cases produce six blocks; optional cases add more.

### `<case>` / plain

- Commands and exit codes: `<...>`
- Input revision at start / any file change during the cell: `<...>`
- Questions or options the agent raised: `<...>`
- Grounding: which files/lines were actually read and cited: `<...>`
- Unsupported assumptions: `<...>`
- Unresolved choices it left open: `<...>`
- Application test command and exit (brown only): `<...>`
- Operator effort (minutes) and agent turns / interventions: `<...>`
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: `<...>`

### `<case>` / guided

- Commands and exit codes: `<...>`
- Input revision at start / any file change during the cell: `<...>`
- `first-contact status` terminal projection (`awaiting-response` required here): `<...>`
- Agent-authored offer path and its citation targets: `<...>`
- Whether each citation matched the real file content and line: `<...>`
- Questions or options the agent raised: `<...>`
- Unsupported assumptions: `<...>`
- Unresolved choices it left open: `<...>`
- Any SYNTH integrity message, warning or failure text: `<...>`
- Application test command and exit (brown only, before and after any change): `<...>`
- Operator effort (minutes) and agent turns / interventions: `<...>`
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: `<...>`

## 5. Cross-cutting observations

| Question | Answer |
| --- | --- |
| Did the guided condition ask substantively different or better questions? | `<...>` |
| Did the guided condition add verifiable provenance the plain condition lacked? | `<...>` |
| Which condition required fewer operator steps or less reading? | `<...>` |
| Which condition produced a clearer next slice? | `<...>` |
| Same agent/model and tool access in both conditions? | `<yes/no + evidence>` |
| Plain and guided run order, and could ordering explain the result? | `<...>` |
| Anything that failed or was skipped, with the exact error text | `<...>` |

## 6. Explicit statements

- Human words fabricated in any cell: `none` (required).
- Responses recorded per cell: `<none; all awaiting-response>`.
- Runtime Mission/Expedition lifecycle actions: `none` (required).
- Pushes, pull requests or merges created by this trial: `none` (required).
- Application tests weakened or skipped to make a cell pass: `none` (required).
- Total operator effort and whether it exceeded the time box: `<...>`.

## 7. What this evidence does and does not support

- Supports: `<...>` (for example, "the installed CLI completed the guided loop in an external workspace in N of M cells").
- Does **not** support: owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- Recommendation for ordinary PR #347 review: `<keep as is / change / simplify / stop>` — with reasons, submitted by the operator in their own review comment.
