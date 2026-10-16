# Evidence template — installed-CLI guided-journey trial

Copy this file into the trial root, fill it in during the run, and attach the completed copy to PR #347 as a new file. Replace every `<...>` placeholder and delete unused optional rows. Instructions: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).

**This template is filled in by an operator and a running agent. The summary is agent/operator-authored prose, not a human decision record.**

## 0. Independence compliance

Checklist: [instructions, Appendix C](../plans/guided-installed-cli-trial-instructions.md#appendix-c--independence-compliance-checklist). Mark each item and name anything unmet.

| # | Requirement | Met? | Note or evidence |
| --- | --- | --- | --- |
| 1 | Sessions run by a different agent and fresh sessions than the authoring agent (a staging-only agent may be any agent; a plain session must never be run by an agent that has seen this repository) | `<yes/no>` | `<...>` |
| 2 | Agent had no access to the authoring checkout (setup deleted its clone; each test directory holds only its own inputs) | `<yes/no>` | `<...>` |
| 2b | Isolation mode: same-machine confinement by layout and instruction, or a container/separate machine | `<confinement/container>` | `<...>` |
| 3 | Agent blind to which condition is expected to win; plain prompt never mentioned SYNTH | `<yes/no>` | `<...>` |
| 4 | Matched inputs; revisions recorded before the first cell | `<yes/no>` | `<...>` |
| 5 | Matched agent/model/version, tools, starting request text | `<yes/no>` | `<...>` |
| 6 | Session plan and order (fresh session per test where possible; one session per condition at minimum) | `<yes/no>` | `<...>` |
| 7 | Protocol, time box, expected observations and stop conditions pre-registered | `<yes/no>` | `<...>` |
| 8 | Verbatim transcripts, wall-clock per cell, intervention log | `<yes/no>` | `<...>` |
| 9 | Installed tarball pinned and identified (not a repo build) | `<yes/no>` | `<...>` |
| 10 | No invented human words; guided cells ended `awaiting-response`; no lifecycle action; no push | `<yes/no>` | `<...>` |
| 11 | Operator coaching logged verbatim | `<yes/no>` | `<...>` |

Anything unmet, and why: `<...>`

## 1. Run identity

| Field | Value |
| --- | --- |
| Operator (who ran the trial) | `<name>` |
| Setup executed by (agent/tool, model, version) | `<...>` |
| Setup command and exit code | `node <synth-checkout>/scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>` → `<exit>` (or the manual sequence in Appendix A) |
| TEST_PATH state before setup | `<missing / empty>` |
| Was TEST_PATH created by setup? | `<yes/no>` |
| CLI staging directory (outside TEST_PATH) | `<tmp>/trial-staging/<revision>`, reused per revision |
| CLI manifest / setup manifest | `<staging>/cli-manifest.json`, `<staging>/transcripts/setup-manifest.json` (guided); `none — the plain condition writes nothing outside TEST_PATH` |
| Instruction file staged at TEST_PATH root | `INSTRUCTIONS.md` (guided or plain), plus `ENVIRONMENT.md` in a guided run |
| Launch line given to the agent, verbatim | `<Read INSTRUCTIONS.md in the root of this workspace and follow it.>` |
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

### `<test>` / plain (own TEST_PATH)

- Session id and start time: `<...>`
- Commands and exit codes: `<...>`
- Input revision at start / any file change during the cell: `<...>`
- Questions or options the agent raised: `<...>`
- Grounding: which files/lines were actually read and cited: `<...>`
- Unsupported assumptions: `<...>`
- Unresolved choices it left open: `<...>`
- Application test command and exit (brown only): `<...>`
- Operator effort (minutes) and agent turns / interventions: `<...>`
- Terminal state: `pass` / `fail` / `blocked` / `not run` — reason: `<...>`

### `<test>` / guided

- Session id and start time: `<...>`
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
| Sessions used: one per condition, or one per test? Order used? | `<...>` |
| Anything that failed or was skipped, with the exact error text | `<...>` |

## 6. Explicit statements

- Human words fabricated in any cell: `none` (required).
- Responses recorded per cell: `<none; all awaiting-response>`.
- Runtime Mission/Expedition lifecycle actions: `none` (required).
- Pushes, pull requests or merges created by this trial: `none` (required).
- Application tests weakened or skipped to make a cell pass: `none` (required).
- Isolation mode: `<confinement by layout and instruction / container / separate machine>`.
- Plain condition: `<own TEST_PATH at ...> / <not run>`.
- Build output visible inside TEST_PATH: `none — staging lives outside it`.

- Total operator effort and whether it exceeded the time box: `<...>`.
- Was setup run before the cells by the same agent that ran them? `<yes/no + which cells>`.
- Any auto-feed: `none — the agent was launched by hand and pointed at the root instruction file, as the current CLI requires`.

## 7. What this evidence does and does not support

- Supports: `<...>` (for example, "the installed CLI completed the guided loop in an external workspace in N of M cells").
- Does **not** support: owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.
- Recommendation for ordinary PR #347 review: `<keep as is / change / simplify / stop>` — with reasons, submitted by the operator in their own review comment.
