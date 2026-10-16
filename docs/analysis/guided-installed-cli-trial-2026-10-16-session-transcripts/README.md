# Session transcripts — second installed-CLI trial run (2026-10-16)

Two session records the operator supplied by hand for the second run of the
installed-CLI trial, filed here so the review of PR #347 can read them beside the
captured evidence instead of taking anyone's summary of them.

| File | Condition | What it is | Bytes | sha256 |
| --- | --- | --- | --- | --- |
| [`guided/board-test-transcript.md`](guided/board-test-transcript.md) | guided | the trial session's own account of the run, written by the agent after the operator asked for it as evidence | 8421 | `02874d9d5ebd886d983080f6bbdf4b4e4aa95fab837d949a50e258e8188be6c4` |
| [`plain/TRANSCRIPT.md`](plain/TRANSCRIPT.md) | plain | the agent's reconstruction of its session, written into the plain workspace root after the trial ended | 4990 | `2328c13296f4bc4960fefcc8d2fc17224c7ba9c92a4003ddb71927b5ceff69a5` |

What these files are not:

- **Not machine copies.** Both were supplied through the conversation, not read out
  of a TEST_PATH by `scripts/guided-installed-trial-evidence.mjs`; the digests above
  are of the bytes as filed here.
- **Not verbatim platform logs.** Each says so itself: the plain record is an
  agent-authored reconstruction, and the guided record is a summary written after
  the run, outside the workspace, at the operator's request.
- **Not evidence of value, and not a human decision.** They are one input to the
  write-up; the operator's own rows, pass/fail judgement and recommendation stay
  theirs, and the captured evidence filed by the script remains the authority for
  every machine-read row.

Two facts in the guided record are worth naming here, because they decide what the
second run can and cannot settle:

1. It records the staged
   `ENVIRONMENT.md` as naming `trial-staging/b53f6dcb859f` at revision
   `b53f6dcb859f9f054040454f419a5c20ebef12ff`. That revision predates the
   instruction-set corrections committed at `ab39400`, so the three `PROBLEMS`
   entries the record lists — the dry-run `nextStep` pointing at
   `synth first-contact --approve`, at `synth discover . --export`, and at
   `synth docs generate --knowledge-base ./docs`, each against §5's ban on
   lifecycle actions — are the same three gaps those corrections address, seen a
   second time rather than new findings.
2. The path conflict the first run hit (`synth` 2.4.1 on `PATH` rejecting
   `--dry-run` before the staged 2.6.1 answered) does not appear: this run reads
   `PATH OK`. Nothing else about the offer the CLI recorded changed shape.

The plain record's own numbers — a report with no shell commands in two of three
cells, three grounding citations in one and two in another — are the input to the
discrepancy settled in `docs/plans/guided-installed-cli-trial-instructions.md`
(capture behaviour) and in the PR discussion; they are not by themselves evidence
that any citation matched or failed.
