# Guided-journey trial — instruction set

This directory holds the instruction files a running agent reads inside its workspace, plus the operator's index. The full protocol, the two-input setup command, the compliance checklist and the limits live in [the trial instructions](../guided-installed-cli-trial-instructions.md). Nothing here starts a cell, and nothing here is trial evidence.

## The files

| File | Read by | Purpose |
| --- | --- | --- |
| `instructions/guided.md` | The agent in a **guided** cell | Starts with the SYNTH initialization process, then the tests, offer requirements, honesty rules and report shape |
| `instructions/plain.md` | The agent in a **plain** cell | Same tests, observations, rules and report shape, with no prescribed starting process |
| `README.md` (this file) | The operator | What the tests are, how a cell is handed off, and how the set is kept consistent |

Setup stages the condition-appropriate file into each test directory as `INSTRUCTIONS.md` and writes one short handoff note per cell in `<workspace>/.trial/kickoff/`. The instruction files are staged, not generated: the only script-written text is the note's test name, workspace path, staged file name and CLI location.

## The layout the harness creates

```
<testing-workspace>/
  .trial/                    harness: pack, installed CLI, transcripts, handoff notes, instruction copies
  greenfield/                one isolated environment per test, holding only its own inputs + INSTRUCTIONS.md
  brownfield/
  documentation/
  [knowledge-led/]           optional cases, with --cases knowledge,conflict
  [conflicting-documents/]
  .control/                  plain-condition mirrors; created only when no path component spells the tool's name
    greenfield/ brownfield/ documentation/
```

## The tests

All five tests are listed in full inside each instruction file, so the agent sees the whole set and its own assignment. Three are required; two are optional extras for a longer time box.

| Test | Case id | Directory | Starting inputs | Required observation |
| --- | --- | --- | --- | --- |
| Greenfield | `green` | `greenfield/` | none — the idea only | Relevant questions about board kind, inputs, editing, validation; no invented GUI/stack; no automatic approval |
| Brownfield | `brown` | `brownfield/` | Small working synthetic SVG-board renderer with a test and a documented limitation | Existing behavior, test and limitation cited; only the delta proposed; no wholesale rewrite |
| Documentation-led | `docs` | `documentation/` | Source-only `docs/requirements.md` | Files read and cited by path and line; nothing silently resolved |
| Knowledge-rooted (optional) | `knowledge` | `knowledge-led/` | Source-only `knowledge/requirements.md` | Same as documentation-led, from the non-conventional root |
| Conflicting documents (optional) | `conflict` | `conflicting-documents/` | `docs/scope.md` versus `knowledge/scope.md` | Both cited; contradiction surfaced as an unresolved decision |

Task text and fixture bytes are single-sourced in `scripts/lib/guided-trial-fixtures.mjs`; `npm run test:guided-installed-trial-setup` fails if the task text quoted in these instruction files ever diverges from that file, or if fixtures drift from the published revisions.

## Handing off one cell

1. Open one fresh agent session per cell. Never reuse a session between a guided and a plain cell.
2. Paste the cell's handoff note from `<workspace>/.trial/kickoff/`.
3. The agent reads `INSTRUCTIONS.md` in its own directory and follows it. In a guided cell its first act is the SYNTH initialization process; in a plain cell there is no prescribed first command.
4. Log verbatim any help you give beyond pasting the note.

## Keeping the two instruction files consistent

The two files must differ **only** in the condition they describe: the guided one names the tool and its initialization process, and the plain one must not. Both carry the same test table, the same required observations, the same honesty rules and the same report shape. When editing either file, check the other, then run:

```bash
npm run test:guided-installed-trial-setup
```

That test also enforces the hard rule that the plain file never contains the tool's name or its commands.
