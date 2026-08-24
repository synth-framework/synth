# Evidence: `mission create` friction and the future `mission new` command

Captured 2026-08-24 as supporting evidence for the expedition that will land the
`mission new` / `expedition new` commands (replacing the over-complicated
`mission create` draft-proposal flow).

## Determination

Is this an issue? — Yes, a real design friction (not a hard ban)

1. We can create missions. The draft proposal was created fine.
2. The natural order is inverted. You cannot plan expeditions under a new mission
   until you `mission approve` it — and approval requires an alignment contract.
   So "create mission -> plan expeditions -> approve" is backwards; you must
   approve first.
3. There's an internal inconsistency. The capability precondition is deliberately
   status-agnostic (would allow draft attachment), but `mission create` never
   materializes drafts, so that allowance is unreachable via the CLI. Either the
   precondition is dead, or `mission create` should emit a canonical
   `MISSION_CREATED` (draft) and let `approve` do `draft -> active`.
4. Approval-first is feasible right now. The event log already contains an
   `ALIGNMENT_CONTRACT_APPROVED` (`alignment-contract-msuvn8o1-qrlimc`) +
   `DIVERGENCE_GATE_RESOLVED`. So
   `synth mission approve --draft-id 59b6483e92794ebb` (inference path,
   synth.ts:3384) will reuse it and make the mission canonical — no fresh genesis
   flow needed. After that, `expedition move --to-mission 59b6483e` (which failed
   earlier only because the target wasn't canonical) will work.
5. Caveat: approving makes `59b6483e` a second active mission alongside
   `4ab7e9d2`; single-active-mission assumptions in context inference may need
   scrutiny.

## Decision on the structural fix (A)

- (B) Unblock now: OK.
- (A) Structural fix (fits the new mission's scope): add an expedition under
  `59b6483e` to make `mission create` canonicalize a draft mission, aligning the
  CLI with the status-agnostic precondition.
- **Do we need this?** No — the future `mission new` command will subsume it.
  `mission new` replaces the draft-proposal flow entirely, so a separate
  "canonicalize draft" fix is unnecessary. This evidence supports the
  `mission new` expedition instead.
