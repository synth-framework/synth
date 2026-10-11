# Round 12/120 — 2026-10-10 — 0 clones (strict zero)

Command: `npx --yes jscpd@4 tests -l 12 -k 120`
Before: 6 clones. After: 0.

## Triage → fix

| # | Clone | Verdict | Fix |
|---|---|---|---|
| 1 | `replay-mission-expeditions:23` ↔ `replay-verifier-status:79` (30l, mission+expedition event literals) | Known F5 (exact shapes matter for replay) | `kernel-event-fixtures.js:missionWithExecutingExpeditionEvents()` with byte-identical payloads (status active/executing, dependsOn); both files spread it + append their distinct third event. Local `makeEvent` defs kept (other tests use them) |
| 2 | `homepage-public-vocabulary:74` ↔ `public-vocabulary-audit:104` (16l, audit loop) | NEW vocab | New `tests/helpers/vocabulary-audit.js:auditFiles({files, findViolations, failMessage})`; per-file `findViolations` stay local (different matching: regex+code-strip vs case-insensitive) |
| 3 | `governance-lifecycle-replay:123` ↔ `refine-009:109` (18l, approveAlignmentContract) | Known (pre-existing home!) | Deleted both locals → `alignment-fixture.js:approveAlignmentContract` (throw-vs-assert equivalent on failure). Both files' `alignDivergenceGate` variants left (Evaluate-capability, different) |
| 4 | `gate-decision-completeness` self `142`↔`99` (30l, scenario arrange) | NEW intra-file | In-file `setupConditionalGate(expId, conditions)`; 4 call sites (4th copy found during edit). File does NOT load on HEAD either (pre-existing bad import `deriveAlignmentContractFromIntentModel` from dist) — verified `node --check` OK + call-site review instead of test run |
| 5 | `environment-discovery:15` ↔ `in-memory-context.js` (12l/223t, missed copy) | Known (round-15 helper) | Deleted local → import |
| 6 | `discovery-findings:32` ↔ `discovery-fixtures.js` (18l, string-arg makeGraph) | Known (round-14 helper) | Extended `makeEvidenceGraph` with string-shorthand + `sourcePath` option (defaults preserve rules/model behavior); findings keeps 1-line adapter with `{ sourcePath: "/project" }`, zero call-site churn |

## Verification (post-edit `node --test`)

PASS: replay-mission, verifier-status, homepage-vocab, public-vocab-audit, environment-discovery, findings, project-model, project-model-rules (59/60 in batch), lifecycle-replay, refine-009 (2/2). gate-decision-completeness: pre-existing import failure on pristine HEAD (same SyntaxError) — syntax-checked + manually reviewed.
