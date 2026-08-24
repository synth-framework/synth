# Finding: derived-state auto-commit (EXP-AUTO-COMMIT-001) fails on gitignored paths

Date: 2026-08-24
Severity: governance tooling defect
Location: `src/cli/synth.ts` ~line 351+ (`autoCommitDerivedState`), invoked after lifecycle transitions (e.g. `expedition complete`).

## Symptom

After completing expedition `68b59f0e6029b7ac`, the post-transition derived-state
auto-commit reported:

```
Failed to stage derived state: Command failed: git add -- .synth/data/canonical-state.json
.synth/data/cli-errors.jsonl ... .synth/data/drafts ...
The following paths are ignored by one of your .gitignore files:
.synth/data/drafts
hint: Use -f if you really want to add them.
```

The commit aborted, leaving `canonical-state.json` + `event-log.jsonl` staged but
uncommitted. Replay consistency broke until manually committed.

## Root cause

`autoCommitDerivedState` builds an explicit path list that includes
`.synth/data/drafts/` (gitignored per Phase 0 `.gitignore` entry
`.synth/data/drafts/`). Passing an ignored path explicitly to `git add` makes the
whole `git add` exit non-zero, aborting the commit. The function never filters
gitignored paths out of its staged list.

## Correct behavior

Before `git add`, exclude gitignored / derivable-excluded paths (e.g. run
`git check-ignore` on each candidate, or use `git add -A` which silently skips
ignored files). The auto-commit should only attempt to stage paths git would
actually accept.

## Impact

Any lifecycle transition that triggers the derived auto-commit (complete, start,
evidence-attach, etc.) can leave the durable replay source
(`event-log.jsonl`, `canonical-state.json`) uncommitted, silently breaking
replay consistency until an operator notices.
