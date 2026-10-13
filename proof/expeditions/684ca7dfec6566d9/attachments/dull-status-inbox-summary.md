# Dull status inbox for deliver/seal — implementation summary

Expedition `684ca7dfec6566d9` (mission `4ab7e9d2cc7b1b66`, Framework Maturation v2).

## Problem (observed, not hypothetical)

Sealing expedition `f0f81e358899d8f2` in a fresh Arena session took three separate
queries and two manual workarounds:

1. `synth status` warned `delivery-pending` but its remediation was
   `deliver --id <id>`, which fails `NoExecutionBranch`: canonical replay projects
   `executionBranch` from `EXPEDITION_BRANCH_BOUND` only, so an expedition whose
   branch was auto-created (`EXPEDITION_BRANCH_CREATED`, ECOSYSTEM-001) has no
   recorded branch. The name was in the event stream all along.
2. `git.ledgerBranch` named a previous session's branch, absent from this clone,
   so every ceremony would fail `LEDGER_UNAVAILABLE`.
3. The clone was shallow, so `verifySeal` reported "merge does not contain the
   delivered tip" for a tip that *is* the merge commit's parent — a true ancestry
   reported as a false refusal, with no hint that the clone was the cause.

## Changes

| File | Change |
| --- | --- |
| `src/ledger/delivery.ts` | `resolveDeliveryBranch` (recorded binding → newest `EXPEDITION_BRANCH_CREATED` → remote ref naming the id8), `lastBranchCreatedBranch`, `resolveIntegrationCandidate`, `buildRefIndex`/`resolveFromRefIndex`/`remoteBranchesFromIndex` (one git call for the whole briefing), `isShallowRepository`, and a shallow-clone `hint` on every `verifySeal` refusal |
| `src/cli/status-briefing.ts` | `delivery-pending` warnings carry copy-pasteable `commands[]`: the resolved `--branch`, the `git fetch` line when the branch is not in this clone, and a `--merge-commit` filled in when the base branch already contains the tip |
| `src/cli/synth.ts` | `deliver` resolves the branch through the same fallback (reported as `branchSource` + `note`) instead of failing; its `nextStep` names the real merge commit when one contains the tip; `resolveCheckpointBranch` honours the ADR-056 declared binding |
| `src/ledger/branch.ts` | A configured/recorded ledger branch missing from this clone falls back to `main` (then the checkout) with a warning instead of refusing every ceremony |

## Discovery outside the drafted scope

`synth checkpoint` reported `status: blocked` for an expedition that had a
*declared* execution branch: `resolveCheckpointBranch` built its context by hand
and never consulted the recorded binding, unlike `enrichExecutionBranchContext`
(ADR-056's single source of truth). Fixed in `src/cli/synth.ts` (already in
scope); the pre-flight checkpoint now passes on a declared `arena/*` branch.

Tests were necessarily touched (`tests/ledger-delivery.test.js`,
`tests/ledger-ceremony.test.js`), which is outside the drafted four-file scope.
One existing assertion encoded the old behaviour (a configured ledger branch that
does not exist is returned verbatim); it now creates the branch so it still tests
what it was written to test — precedence of config over record — and a new test
covers the fallback.

## Verification

- `npx tsc --noEmit`: clean.
- `npm run test:ledger-delivery`: 8/8 pass (was 4), including a real depth-1 clone
  proving the refusal carries the hint, that the same proof succeeds in a full
  clone, and that `git fetch --deepen=1` makes the shallow clone prove it too.
- `npm run test:ledger-ceremony`: 7/7 pass, including the new missing-branch fallback.
- `synth validate` (adaptive; profile `pull-request`, no protected assets
  touched): `test:synth-cli`, `test:release`, `test:operator-journey`, `test` —
  all exit 0.
- Live in this repository: `synth checkpoint` → `ok`; `synth status` prints, for
  all 29 pending expeditions, the exact branch recovered from the event stream
  plus the fetch it needs; `synth expedition deliver --id d8a555db237507e5
  --no-push --dry-run` resolves bare via `branchSource: remoteScan`.
- `synth explain replay`: consistent, chain valid.
