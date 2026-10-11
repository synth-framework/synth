# Round 14/140 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 14 -k 140`
Before: 3 clones. After: 0 (one residual registration pair needed a second pass).

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `mission-studio-adapter-collector:137` ↔ self `:71` (31l, mock factory registration) | F8 mocks | New `tests/helpers/mocks.js`: `createMockAdapter`, `createEnrichingAdapter`, `registerCrmObserverPair(registry)` (canned CRM observer+enricher). Migrated 3rd identical `createMockAdapter` in `api-adapter-integration:10` preemptively. Residual identical registration literals (2nd pass) → `registerCrmObserverPair` call sites |
| 2 | `governance-lifecycle-replay:186` ↔ `refine-009:170` (14l/227t, in-memory createExecutingExpedition with goal) | Known F3 variant | Extended `governance-intent.js:createExecutingExpedition` with optional `goal` (backward compatible — existing callers' payload unchanged); 7-line goal wrappers per file |
| 3 | `discovery-project-model-rules:38` ↔ `discovery-project-model:33` (22l, `makeGraph`) | NEW discovery | New `tests/helpers/discovery-fixtures.js:makeEvidenceGraph` (rules superset form with `source ??` default; verified no caller passes `source`, so behavior identical); aliased imports (`makeEvidenceGraph as makeGraph`) — zero call-site churn. `discovery-findings:9` (string-arg variant) and `graph-dependency-primitive:18` (unrelated) left for their floors |

## Verification (post-edit `node --test`)

PASS (40/40): collector, api-adapter-integration, project-model-rules, project-model, refine-009. PASS: lifecycle-replay (80s).

## Incident

One bad edit dropped the `export function createEnrichingAdapter` signature line in `mocks.js`; caught by re-read, restored, re-verified via dynamic import (`exports: createEnrichingAdapter,createMockAdapter`) + collector suite 5/5 green.
