# Guided-journey trial — instruction set

This directory holds the instruction files a running agent reads. The full protocol, the setup commands, the compliance checklist and the limits live in [the trial instructions](../guided-installed-cli-trial-instructions.md). Nothing here starts a trial, and nothing here is trial evidence.

## The files

| File | Read by | Purpose |
| --- | --- | --- |
| `instructions/guided.md` | The agent in a **guided** run | Starts with the SYNTH initialization process, then the tests, offer requirements, honesty rules and report shape |
| `instructions/plain.md` | The agent in a **plain** run | Same tests, observations, rules and report shape, with no prescribed starting process |
| `README.md` (this file) | The operator | What the tests are, how TEST_PATH is laid out, and how the set is kept consistent |

One of them is copied into the **root of TEST_PATH as `INSTRUCTIONS.md`**, and the agent is told to read it. The files are staged, not generated; the only generated text is `ENVIRONMENT.md` (guided runs only), which records paths and build identity and carries no process.

## TEST_PATH

```
<TEST_PATH>/
  INSTRUCTIONS.md          copied from this repository: the file the agent follows
  ENVIRONMENT.md           guided only: generated paths — CLI location, revision, staging directory
  greenfield/              one isolated environment per test …
  brownfield/              … holding only that test's own starting inputs
  documentation/
  [knowledge-led/]         optional, with --cases knowledge,conflict
  [conflicting-documents/]
```

Build, pack and install live in a CLI staging directory **outside** TEST_PATH (`<tmp>/trial-staging/<revision>`), so no build output, harness or transcript is visible to the agent. Staging is keyed by revision and reused, so the second run of the same revision costs nothing.

## The tests

Each instruction file lists all five tests with their task text and required observation, so the agent sees the whole set and works through the ones present, one directory at a time.

| Test | Case id | Directory | Starting inputs | Required observation |
| --- | --- | --- | --- | --- |
| Greenfield | `green` | `greenfield/` | none — the idea only | Relevant questions about board kind, inputs, editing, validation; no invented GUI/stack; no automatic approval |
| Brownfield | `brown` | `brownfield/` | Small working synthetic SVG-board renderer with a test and a documented limitation | Existing behavior, test and limitation cited; only the delta proposed; no wholesale rewrite |
| Documentation-led | `docs` | `documentation/` | Source-only `docs/requirements.md` | Files read and cited by path and line; nothing silently resolved |
| Knowledge-rooted (optional) | `knowledge` | `knowledge-led/` | Source-only `knowledge/requirements.md` | Same as documentation-led, from the non-conventional root |
| Conflicting documents (optional) | `conflict` | `conflicting-documents/` | `docs/scope.md` versus `knowledge/scope.md` | Both cited; contradiction surfaced as an unresolved decision |

Task text and fixture bytes are single-sourced in `scripts/lib/guided-trial-fixtures.mjs`; `npm run test:guided-installed-trial-setup` fails if the task text quoted in these instruction files ever diverges from that file, or if fixtures drift from the published revisions.

## Running one

1. From the checkout: `node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>`
   It creates TEST_PATH when missing (and refuses one that already holds something), stages the CLI outside it, and copies the instruction file and one directory per test.
2. Start one fresh agent session **in TEST_PATH** and give it the printed line — `Read INSTRUCTIONS.md in the root of this workspace and follow it.`
3. Log verbatim any help you give beyond that line.

For the plain comparison use a separate TEST_PATH whose path does not spell the tool's name and add `--condition plain`; a session must never see both conditions. Optional: `--stage-only` warms the CLI cache without creating TEST_PATH.

## Keeping the two instruction files consistent

The two files must differ **only** in the condition they describe: the guided one names the tool and its initialization process, and the plain one must not. Both carry the same test table, the same required observations, the same honesty rules and the same report shape. When editing either file, check the other, then run:

```bash
npm run test:guided-installed-trial-setup
```

That test also enforces the hard rule that the plain file never contains the tool's name or its commands, and that the plain run stages no generated environment note.
