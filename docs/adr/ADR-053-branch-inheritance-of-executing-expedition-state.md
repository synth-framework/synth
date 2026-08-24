# ADR-053 — Branch Derivation Must Carry the Executing Expedition's `.synth/data`

**Status:** Accepted
**Date:** 2026-08-24
**Author:** Synth Agent
**Deciders:** Mission `4ab7e9d2cc7b1b66` / Expedition `6e26566b65b8ebcb`

---

## Context

Follow-up branches created mid-execution — most commonly a "fix for expedition X" branch — are routinely based on `origin/main` or some unrelated base. Because `.synth/data` (the event log and its derived `canonical-state.json`) is the source of truth for which mission/expedition is executing, basing a branch elsewhere drops that data. The executing expedition then cannot be resolved on the new branch (`synth expedition show` → "not found"), evidence cannot be attached, and replay no longer reflects the work in progress.

Concrete incident (PR #330): expedition `6e26566b65b8ebcb` ("Test runner opacity and performance") survived only as a derived `canonical-state.json` snapshot in a working tree / stash — its creation event was never durably present in `event-log.jsonl` on any branch. The fix branch `fix/6e26566b-proof-opacity` was created off `origin/main`, so it inherited none of it, and the expedition became unresolvable exactly when we needed to attach failure evidence to it. A second, deeper gap also exists: the durable event source is per-branch and ephemeral, which is what produced `EventLogDivergence` during earlier cross-branch reconciliation.

The temptation is to patch this with code that pokes at git branch internals or hand-edits derived state. Both are more fragile than the failure they address (and hand-editing derived files is explicitly forbidden by ADR-051). The cheap, low-risk interim enforcement is a governance rule, with a real code handler as the eventual target.

## Decision

1. **Base follow-up branches on the executing expedition's branch.** Any branch created to deliver a fix or change scoped to an executing expedition MUST be branched from that expedition's branch — not `origin/main`. It therefore inherits the committed `.synth/data` for that expedition/mission. A "fix for expedition X" branch that does not contain X's `.synth/data` is invalid and must not be created until reconciled.

2. **Cross-mission unblock rule.** When work on a *different* mission is required to unblock the currently executing mission, the new work branch MUST be based on the executing branch. Model the relationship as a `blocked-by` dependency edge rather than a pause state (SYNTH has no pause); the executing expedition stays `executing`, and the unblocking work is a dependent branch.

3. **Interim guardrail is contract-level, not code.** Before creating a branch mid-execution, verify the target base's `.synth/data` contains the executing expedition/mission id; if absent, do not create the branch. This is enforced by agent/human discipline per this ADR. It deliberately introduces **no code** and **no hand-edits to derived files** (see ADR-051).

4. **Target state — durable, centralized event source.** The real fix is a mission/expedition creation handler that lands mission/expedition events directly into the durable, centralized event source (effectively `main`), so every branch already contains them and branch-base strategy stops being the failure point. Until that handler lands, Decisions 1–3 are the enforced interim rule.

## Consequences

- Follow-up and fix branches inherit the executing expedition's `.synth/data`, so `synth expedition show` / `synth expedition evidence` resolve and evidence capture works.
- Removes the class of "expedition missing on branch" failures for correctly-based branches.
- Does **not** by itself guarantee durability: if an expedition's creation event was never in `event-log.jsonl`, branching cannot recover it. Decision 4 is the actual root-cause fix; this ADR only prevents the *avoidable* variant (wrong base branch).
- Avoids fragile code patches to git internals; enforcement is via contract/agent discipline.
- Replay interaction: branching or cherry-picking event logs across branches can still cause `EventLogDivergence` (see ADR-034). Branch-base discipline must be paired with merge-back discipline (fix → `main` → rebase expedition).

## Proof Impact

- **P1 Replay Integrity:** carrying the correct event log avoids divergence caused by missing events on a mis-based branch.
- **P2 Governance Traceability:** the executing expedition remains resolvable, so evidence can be attached and audited.
- **P3 Capability Boundary:** reinforces that only the ExecutionGate mutates state; this ADR adds no new mutation path.

## Kernel Impact

None. This is a process/contract rule. No kernel component changes, and no derived file is edited. It is compatible with — and reinforces — ADR-051's derived-state protection.

## Constitutional Baseline Impact

No constitutional rules are changed. The decision enforces the existing invariant that only the ExecutionGate may mutate state and that derived files are projections of the immutable event log.

## Related

- `docs/adr/ADR-051-derived-state-protection-and-expedition-scope.md` — forbids hand-editing `canonical-state.json` / `event-log.jsonl`; this ADR is governance-only.
- `docs/adr/ADR-043-ai-agent-validation-scope-boundary.md`
- `docs/adr/ADR-034-replay-recovery.md` — divergence from cross-branch event-log merges.
- Incident: expedition `6e26566b65b8ebcb` unresolvable on `fix/6e26566b-proof-opacity`; see PR #330.
