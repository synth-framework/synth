# Round 7/70 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 7 -k 70`
Before: 27 clones. After: **0 clones / 0 duplicated lines** (280 files, 44,711 lines).

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `mocks.js` self (9l, factory heads) | NEW (own helper) | `mockAdapterBase(name, kind, category)`; both factories spread it (11/11 green) |
| 2 | `repository-governance` self (21l, init+branch prefixes) | Known F5-adjacent | In-file `seedRepositoryInitialized` + `seedBranchCreated` (7 sites); suite green |
| 3 | `replay-verifier` self (13l, verify tails) | Known | In-file `verifyEvents(events)` (3 sites) |
| 4 | `protected-asset:15` ↔ `validation-planner:13` (10l, paths+loadJson) | NEW | `test-fixtures.js:loadJson`; both migrated |
| 5 | `project-mission` self (16l, contract subsets) | Known | Delegated both blocks to fixture `createAlignmentContract` (objectiveCoverage passthrough added round 11); project-mission suite green |
| 6 | `init-lifecycle:21` ↔ `init-replay:37` (7l, init heads) | Known F4-adjacent | `cli-harness.js:initProject(prefix, args)`; lifecycle migrated (replay differs: knowledge pre-steps — justified variant, pair dissolved) |
| 7 | `init-adapter-contract` self (10l, adapter pair) | NEW | In-file `createEvidenceAdapter({...})` factory-of-factories |
| 8-9 | `graph-dependency` self ×2 (13l, node/edge literals) | NEW | In-file `abcNodes()/chainEdges()/cycleEdges()` (fresh copies); file has pre-existing broken dist import — syntax-checked only |
| 10 | `governance-optimization` self (7l, plan arrays) | NEW | In-file `twoCheckPlan(dependenciesB)` |
| 11 | `eval-enforcement:113` ↔ `proposal-evaluation:82` (7l, shape asserts) | Known | `test-fixtures.js:assertEvaluationShape(evaluation, {checkRules, checkReasoning, checkEvidence})`; thin per-file wrappers (deterministic extra kept) |
| 12 | `govern-profiler` self (7l, scheduler arrange) | NEW | In-file `planCheck(root, {changedFiles, full})`; suite green |
| 13 | `evidence` self (7l, attach asserts) | Known | In-file `attachGitDiff(dir)`; fixed follow-on `result.stdout` use |
| 14 | `branch-gate:51` ↔ `branch-policy:32` (7l, gitInit) | Known F4 | `workspace.js:gitInitWithCommit` (exact execFileSync semantics); gate keeps 3-line compat alias (9 call sites stable), policy deletes local |
| 15 | `env pair` (10l, ctx+orchestrator) | Known (round-15 helper) | `in-memory-context.js:discoverEvidence(files, dirs, env)`; both produce fns shrunk to 1 call; dropped unused dist imports |
| 16 | `git↔operational` (7l, canHandle) | NEW (+contract 3rd) | `discovery-fixtures.js:assertFilesystemOnlyCanHandle`; 3 files migrated |
| 17 | `document↔filesystem` (8l, observe flow) | Known | `adapter-fixtures.js:observeStagedFile`; document lifecycle test → `assertAdapterLifecycle`; remaining locals deleted |
| 18-24 | adapter lifecycle ×7 + `makeObservation` overrides ×7 | Known F7 | `assertAdapterLifecycle` (8 files incl. wizard/document) + `makePlanningObservation` (7 files); 100/100 + 111-file batches green |
| 25-27 | setupProject ×4 + quiet-output + lifecycle | Known F4 | `mission-lifecycle.js:setupBasicProject(prefix)` (plain bootstrap, no --name); 6 files migrated |

## Verification (post-edit)

PASS: adapters 100/100, 111-file mission-studio batch, 28-file execution/identity batch, discovery 14/14, resolver/record/operator-briefing, reference+aliases 9/9, repository, profiler, optimization, protected/planner (check), init pair 2/2, evidence (check; runtime = pre-existing legacy-seed failure, pristine-identical).
Pre-existing (all pristine-identical or broken-import): identity-resolver, gate-decision, review-gates, graph-dependency, init-adapter-contract (dist imports); force/auto-commit/dry-run/evidence/first-contact-3rd/`synth log` (partitioned-layout fallout, src/ out of scope); lifecycle-enforcement ×3, gate-012, review-gate ×2 (dist drift).

## Incidents

- 8+ destructive oldString slips this round family — every one caught by immediate re-read/`--check`/dynamic-import before tests. See round-13 note for the adopted rule.
- `withTempDir` single-arg callers exist across the suite (cli-harness requires prefix) — several files carry single-arg locals; fc-cert pattern noted for a future floor (below 7/70 individually).
- `__pristine-*` copies must stay out of tests/ during scans.
