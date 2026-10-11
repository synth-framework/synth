# Round 9/90 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 9 -k 90`
Before: 7 clones. After: 0.

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `governance-resolver:30` ↔ `state-fixtures:45` (13l, hash-link writeEventLog) | Known (pre-existing home) | Deleted local + `loadComputeEventHash` + `loadResolver` → state-fixtures imports (identical); dropped unused const/import |
| 2 | `genesis-hardening` self `355`↔`333` (10l, CRM startSession) | NEW intra-file | In-file `startCrmSession(ctx)`; both sites migrated |
| 3 | `expedition-evidence` self `187`↔`169` (9l, git init blocks) | Known F4 | `workspace.js:runGit` import + in-file `initGitIdentity(dir)` (add/commit stay at sites — writeFile must precede add); rev-parse/status → runGit (trim-safe: only `.includes` asserts) |
| 4 | `auto-commit:32` ↔ `lifecycle:206` (12l) | Covered in round 10 follow-up | auto-commit resolved via `mission-lifecycle start:false`; lifecycle:206 region verified clean on rescan |
| 5 | `execution-branch-gate:110` ↔ `governance-intent:47` (11l) | Known (pre-start variant) | `governance-intent.js:createExecutingExpedition` gains `start:true` default; branch-gate passes `{name template, start:false}`; also migrated its `makeCtx` wrap → `withoutLifecycleContinuation` |
| 6 | `discovery-capability-contract:72` ↔ `discovery-replay:59` (16l, fs engine) | NEW discovery | `discovery-fixtures.js:makeFilesystemEngine(files, options)` (default two-file; options passthrough for projectionCapabilities); 5 contract + 4 replay sites migrated, incl. 3-file variant |
| 7 | `decision-events:15` ↔ `evidence-path:13` (19l, cert header) | Leftover header-base | Both → `cert-test-base.js` harness (assert/cleanup/finish; decision keeps custom init-makeWorkspace; evidence keeps richer createDraft/runCli/parseResponse). Also migrated decision's `createDraft`+`evidenceAdd` → trust-workflow (identical) |

## Verification

PASS: resolver, genesis 18/18, explain-actionable 6/6, capability-contract + replay 14/14, decision solo, evidence-path solo, project-mission, auto-commit wrapper (check), lifecycle-replay+refine re-pass 2/2 (opener migration), installer trio 3/3.
Pre-existing (pristine-identical): branch-gate ENOENT (legacy path read at untouched line ~421); lifecycle-enforcement 3 dist-drift FAILs; identity pair blocked by `synth log` src bug.

## Incidents

- `discovery-fixtures` imported `createFilesystemDiscoveryAdapterWithProvider` from wrong module (environment vs discovery) — caught by test run, fixed.
- `finish` missing from 3 harness destructures (ReferenceError at endings) — caught by test runs, fixed.
- Parallel-batch failures (decision `synth init`, auto-commit setup) proven contention flakes — solo re-runs green.
