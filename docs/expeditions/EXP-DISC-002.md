# EXP-DISC-002 — Extraction Reporting

**Status:** Completed (pending acceptance)  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-012 — Runtime Self-Description  
**Depends On:** EXP-PROGRAM-011  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N4)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Make `synth docs generate` report what it actually did. Today it returns `status: ok` with a list of filenames even when zero concepts were extracted. This expedition adds extraction counts and a loud zero-extraction warning so operators can tell whether documentation generation succeeded or was vacuous.

---

## Motivation

The TaskPRO field experiment (N4) hit this exact defect:

> `docs generate` reported `status: ok` with filenames while extracting zero concepts; the `.md`-only filter skipped the entire `*.md.txt` knowledge base with no warning.

Silence on empty extraction is a trust defect. An operator (human or AI) sees success and assumes the knowledge base was processed. Counts and warnings make the result actionable.

---

## Scope

```text
synth docs generate
        ↓
{
  status: "ok" | "warning",
  summary: {
    filesScanned,
    filesMatched,
    conceptsExtracted,
    projectionsGenerated,
    zeroExtractionWarning
  },
  projections: [...]
}
```

In scope:

- Count files scanned, files matched, concepts extracted, and projections generated.
- Return `status: "warning"` with a prescriptive message when files were matched but zero concepts were extracted.
- Keep the existing projection list unchanged.
- Regression tests for normal extraction and zero-extraction warning.

Out of scope:

- Changing the extraction algorithm or supported formats.
- Changing projection content.
- New public concepts.

---

## Deliverables

1. **Extraction summary** — `documentFromKnowledgeBase` returns `{ projections, summary }`.
2. **CLI/API response** — `synth docs generate` includes `summary` and warning status when appropriate.
3. **Zero-extraction warning** — loud, prescriptive message explaining why and what to check.
4. **Regression guards** — permanent tests in `test:all`:
   - Normal docs dir returns counts and `status: ok`.
   - Docs dir with empty Markdown returns `status: warning` and `zeroExtractionWarning: true`.

---

## Acceptance

```text
synth docs generate
        ↓
summary.filesScanned > 0
summary.filesMatched > 0
summary.conceptsExtracted > 0
status: ok
```

```text
synth docs generate  # empty markdown sources
        ↓
summary.filesMatched > 0
summary.conceptsExtracted === 0
status: warning
warning: "Zero concepts extracted..."
```

- All existing documentation tests continue to pass.
- `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Instrument extraction

Count scanned/matched files in `extractDirectoryKnowledge`.

### Phase 2 — Build summary

Compute concepts extracted and zero-extraction flag in `documentFromKnowledgeBase`.

### Phase 3 — Surface in API/CLI

Return summary and warning status from `documentationOperation`.

### Phase 4 — Fixtures

Write tests for ok and warning cases.

### Phase 5 — Verify

Run fixture suite, neighbor documentation tests, and full governance.

---

## Risks

| Risk | Mitigation |
|---|---|
| API response shape change breaks consumers | Keep `projections` array unchanged; only add `summary` and `warning` fields. |
| Warning false-positives on small docs | Warning only when filesMatched > 0 and conceptsExtracted === 0. |
| Performance from counting | Counting is done during the existing walk; no extra I/O. |

---

## Definition of Done

- [x] `synth docs generate` returns extraction summary.
- [x] Zero-concept extraction surfaces a warning status and message.
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add counts to `extractDirectoryKnowledge`.
2. Compute summary in `documentFromKnowledgeBase`.
3. Update API response.
4. Write regression tests.
5. Wire tests into `test:all` and verify.

---

## Completion Notes

- `extractDirectoryKnowledge` now returns `filesScanned` and `filesMatched` counts alongside extracted sources.
- `documentFromKnowledgeBase` computes an `ExtractionSummary` with `conceptsExtracted`, `projectionsGenerated`, and `zeroExtractionWarning`.
- `synth docs generate` returns `status: "warning"` and a prescriptive message when files matched but zero concepts were extracted.
- Regression guards added in `tests/extraction-reporting.test.js` and wired into `test:all`.
- Documentation integrity checks (`npm run test:documentation-integrity`) pass after fixing stale relative links in `examples/first-contact/docs-generated/`.
- Full governance (`npm run govern`) acceptance is pending operator-run CI verification.
