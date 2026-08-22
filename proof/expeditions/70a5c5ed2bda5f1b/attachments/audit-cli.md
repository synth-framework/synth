# CLI Verb-Surface Audit (expedition 70a5c5ed2bda5f1b)

## Command census (top-level: 33)
version, doctor, checkpoint, init, bootstrap, discover, govern, validate,
verify, approval, status, report, mission, program, project, intent, alignment,
expedition, docs, explain, repair, release, certify, capabilities,
first-contact, genesis, ai, repo, snapshot, adapter, log, task, migrate

## Redundancy clusters
1. Lifecycle sprawl: `expedition` has 17 subcommands incl. 5 termination verbs
   (complete/finish/cancel/archive/delete); `mission` mirrors
   (create/approve/evidence/complete/delete). bc9c51e0 (approved) targets
   termination unification.
2. Verification overlap: validate / validate --full / verify / govern / repair —
   unclear separation; validate --full ≈ govern.
3. Inspection overlap: explain (12 subs) + report + status + checkpoint + per-entity
   show/list/report.
4. Setup overlap: init / bootstrap / genesis / discover / migrate / first-contact / project.
5. approval (top-level) vs mission/expedition approve.

## Proposed minimal set (reduce knowledge quorum)
- One lifecycle: create -> approve -> start -> finish (--disposition keep|archive|cancel|delete)
  for BOTH mission & expedition.
- One verification: `check` (--dry-run | --full) absorbs validate/verify/govern;
  `check --repair` absorbs repair.
- One status: `status` (no-arg default) absorbs checkpoint/explain status/report.
- One setup: `init` absorbs bootstrap/genesis/discover/migrate.
- Generation kept separate: docs, certify, release.

## Decoupling (synth.js)
Every invocation loads 13-step bootstrap + all adapters + Mission Studio +
Planning Cognition. Opportunity: thin entrypoint that lazy-loads command groups;
per-command dependency injection. ceaa59bf optimized bootstrap perf but not decoupling.

## Follow-up expeditions minted from findings
- Decouple synth.js: lazy-load command groups + thin CLI entrypoint.
- Consolidate verbs into a minimal, memorable command set (coordinate w/ bc9c51e0
  for termination).
