# SYNTH AI Benchmark Report

**Audit ID:** SYNTH-AI-BENCHMARK-001  
**Program:** EXP-PROGRAM-003 — SYNTH Validation Program  
**Expedition:** EXP-VAL-006 — AI Benchmark  
**Status:** Dry-run Complete / Live Pending  
**Date:** 2026-07-13  
**Auditor:** Kimi Code CLI  

---

## Executive Summary

This report documents the first dry-run execution of the SYNTH AI Benchmark. The benchmark harness is implemented and verified. In dry-run mode it uses the deterministic SYNTH CLI as the reference executor for every configured model, producing a perfect convergence baseline without consuming API tokens.

| Metric | Dry-run Result |
|---|---|
| Mission Similarity | 1.0 (100%) |
| Replay Fidelity | 1.0 (100%) |
| Governance Pass Rate | 1.0 (100%) |
| Models Benchmarked | 5 |
| Repositories Benchmarked | 3 |

**Verdict:** The harness is operational. The dry-run proves that the benchmark pipeline, fixtures, metrics, and report generation work correctly. Live execution against frontier models is required to produce meaningful convergence data.

---

## Scope

- Validate the benchmark harness (`scripts/ai-benchmark.js`).
- Validate the repository suite (`tests/ai-benchmark-fixtures/repository-suite.json`).
- Validate the prompt suite (`tests/ai-benchmark-fixtures/prompt-suite.json`).
- Verify that the benchmark produces a structured report.
- Verify integration with `npm run test:all`.

Out of scope for this report: live model API calls, brownfield public repositories, multi-model convergence analysis.

---

## Methodology

The dry-run executes the following flow for each model/repository pair:

1. Copy the synthetic repository into a temporary work directory.
2. Run `synth bootstrap --approve`.
3. Run `synth mission create --subject "SYNTH Migration" --purpose "Adopt SYNTH governance for deterministic execution."`.
4. Run `synth mission approve --draft-id <draft-id>` using the `draftId` returned by the previous step.
5. Run `synth explain replay`.
6. Capture structured JSON output for each command.
7. Compute metrics across models for the same repository.

Because every model is emulated by the same deterministic SYNTH CLI in dry-run mode, all outputs are identical, producing perfect similarity and fidelity scores.

The Mission lifecycle was corrected in EXP-VAL-007: creation produces a Mission Draft, and approval is an explicit, separate operation.

---

## Repository Suite

| ID | Name | Type | Description |
|---|---|---|---|
| `empty` | Empty Repository | empty | Empty repository baseline. |
| `node` | Node.js Repository | node | Synthetic Node.js repository with a fast governance script. |
| `polyglot` | Polyglot Repository | polyglot | Synthetic repository with TypeScript and Python files. |

---

## Prompt Suite

| ID | Name | Command |
|---|---|---|
| `bootstrap` | Bootstrap repository | `synth bootstrap --approve` |
| `mission-create` | Create Mission Draft | `synth mission create --subject ... --purpose ...` |
| `mission-approve` | Approve Mission Draft | `synth mission approve --draft-id <draft-id>` |
| `replay` | Explain Replay | `synth explain replay` |

---

## Models

The benchmark is configured for the following frontier models:

- `claude`
- `gpt`
- `gemini`
- `codex`
- `cursor`

Live mode supports these models via the `SYNTH_AI_MODEL` environment variable. Additional models (`qwen`, `deepseek`, `llama`) can be added to the `MODELS` array in `scripts/ai-benchmark.js`.

---

## Metrics

### Mission Similarity

Average pairwise Jaccard index over mission subjects extracted from each model's mission creation output.

```text
J(A, B) = |A ∩ B| / |A ∪ B|
```

### Replay Fidelity

Fraction of models that produce the dominant replay hash for the same repository. A value of 1.0 means all models produced identical replay hashes.

### Governance Pass Rate

Fraction of model runs where `synth bootstrap --approve` exits successfully.

---

## Results

Generated report: `data-test/ai-benchmark-report.json`

```json
{
  "generatedAt": "2026-07-13T00:58:24.120Z",
  "mode": "dry-run",
  "models": ["claude", "gpt", "gemini", "codex", "cursor"],
  "repositories": ["empty", "node", "polyglot"],
  "metrics": {
    "repositoryMetrics": [
      { "repository": "empty",    "missionSimilarity": 1, "replayFidelity": 1, "governPassRate": 1 },
      { "repository": "node",     "missionSimilarity": 1, "replayFidelity": 1, "governPassRate": 1 },
      { "repository": "polyglot", "missionSimilarity": 1, "replayFidelity": 1, "governPassRate": 1 }
    ],
    "overall": {
      "missionSimilarity": 1,
      "replayFidelity": 1,
      "governPassRate": 1
    }
  }
}
```

All prompts exited with code 0. All replay verifications reported consistent state. All bootstrap operations reported success.

---

## Known Limitations

1. **Dry-run does not exercise model divergence.** Because the same deterministic CLI executes every prompt, the dry-run produces perfect scores by design. It validates the harness, not model behavior.

2. **Live model dispatch is not implemented.** `scripts/ai-benchmark.js` includes a placeholder live mode that exits with "Live model dispatch is not yet implemented."

3. **Repository suite is synthetic.** The benchmarks use hand-crafted minimal repositories. Public brownfield repositories are not included in this dry-run.

The previous CLI semantic issue where `synth mission create` attempted automatic approval and returned `status: "error"` on rejection was resolved by EXP-VAL-007. The benchmark now exercises the agentic Mission lifecycle: draft creation followed by explicit approval.

---

## Live Execution Instructions

To run the benchmark against a real frontier model:

```bash
# Example: Claude
SYNTH_AI_LIVE=true \
SYNTH_AI_MODEL=claude \
ANTHROPIC_API_KEY=sk-... \
node scripts/ai-benchmark.js

# Example: OpenAI
SYNTH_AI_LIVE=true \
SYNTH_AI_MODEL=gpt \
OPENAI_API_KEY=sk-... \
node scripts/ai-benchmark.js
```

Supported environment variables:

| Model | Variable |
|---|---|
| `claude` | `ANTHROPIC_API_KEY` |
| `gpt` | `OPENAI_API_KEY` |
| `gemini` | `GOOGLE_API_KEY` |
| `codex` | `CODEX_API_KEY` |
| `cursor` | `CURSOR_API_KEY` |

The live runner should:

1. Read the prompt suite.
2. Dispatch each prompt to the configured model.
3. Parse the model's suggested SYNTH commands.
4. Execute those commands in a sandboxed work directory.
5. Capture missions, expeditions, events, proofs, and replay hashes.
6. Compute the same metrics and append to `data-test/ai-benchmark-report.json` or a dated variant.

---

## Recommendations Before Live Benchmarking

1. **Implement live model dispatch.** Add provider-specific clients that translate prompt templates into API calls and parse responses into SYNTH commands.

2. **Expand the repository suite.** Add real public brownfield repositories of varying size and language.

3. **Add expedition similarity metric.** The harness currently measures mission similarity and replay fidelity. Add Jaccard comparison over expedition proposals.

4. **Add governance violation counting.** Explicitly count runs where `npm run govern` fails or replay consistency is false.

---

## Conclusion

The SYNTH AI Benchmark harness is implemented, tested, and integrated into the governance pipeline. The dry-run demonstrates that the benchmark infrastructure is sound and produces deterministic, reproducible reports. The agentic Mission lifecycle correction (EXP-VAL-007) removed the previous CLI semantic issue, so the benchmark now measures draft creation and explicit approval rather than relying on implicit approval. Live execution remains future work.

| Assessment | Meaning |
|---|---|
| **PASS** | Harness operational; dry-run successful; ready for live integration. |
| **PENDING** | Live model dispatch and brownfield repositories not yet exercised. |

**Selected Assessment: PASS WITH PENDING WORK**

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-VAL-006.md` | Expedition definition and acceptance criteria. |
| `scripts/ai-benchmark.js` | Benchmark harness. |
| `tests/ai-benchmark.test.js` | Harness verification tests. |
| `tests/ai-benchmark-fixtures/repository-suite.json` | Repository suite. |
| `tests/ai-benchmark-fixtures/prompt-suite.json` | Prompt suite. |
| `data-test/ai-benchmark-report.json` | Generated dry-run report. |

---

*Report generated according to `docs/synth-audit-blueprint.md`.*
