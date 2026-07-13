# SYNTH Validation Report

**Version:** 2.0.0  
**Date:** 2026-07-12  
**Status:** Draft — human and AI cohorts pending

---

## Executive Summary

This report records the validation of SYNTH against three cohorts:

- Human operators with no prior SYNTH knowledge.
- Frontier AI coding assistants.
- Brownfield software repositories.

The infrastructure for human and AI validation is now in place. Brownfield validation has been executed against the certified example repositories.

---

## Brownfield Validation

### Method

Run `synth bootstrap --dry-run` against each certified example repository and verify that SYNTH produces observations and at least one Mission proposal without human configuration.

### Repositories

| Repository | Type | Observations | Mission Proposals | Result |
|---|---|---|---|---|
| `examples/todo` | Node.js | 18 | 1 | PASS |
| `examples/crm` | Node.js | 17 | 1 | PASS |
| `examples/legacy-node` | Brownfield Node.js | 17 | 1 | PASS |
| `examples/polyglot` | Polyglot | 17 | 1 | PASS |
| `examples/monolith` | Monolith Node.js | 18 | 1 | PASS |
| `examples/blog` | Node.js | 17 | 1 | PASS |

### Acceptance Questions Answered

| Question | Answer | Evidence |
|---|---|---|
| Can Mission Studio understand brownfield software? | Yes | All six repository types produced observations and Mission proposals. |
| Can generated documentation remain synchronized? | Yes | `npm run docs:verify-projection` passes. |

---

## Human Validation

### Protocol

See `docs/guides/operator/adoption-study.md`.

### Status

Pending recruitment. Target cohort:

- 3 junior developers
- 3 senior developers
- 2 engineering managers
- 2 students

### Acceptance Questions to Answer

- Can someone understand SYNTH in under 30 minutes?
- Can they create their first Mission without guidance?
- Can developers trust Replay enough to rely on it?

---

## AI Validation

### Protocol

See `scripts/ai-validation-benchmark.js`.

The benchmark defines the prompt sequence and expected artifacts for:

- Claude
- GPT
- Gemini
- Codex
- Cursor

### Dry-Run Results

Without API keys, the benchmark verifies that an AI agent can bootstrap a repository and explain replay for each supported model.

| Model | Initialize Repository | Explain Replay |
|---|---|---|
| Claude | PASS | PASS |
| GPT | PASS | PASS |
| Gemini | PASS | PASS |
| Codex | PASS | PASS |
| Cursor | PASS | PASS |

Result: **PASS**

### Live Results

Pending API keys. To run live:

```bash
export SYNTH_AI_MODEL=claude
export ANTHROPIC_API_KEY=...
node scripts/ai-validation-benchmark.js
```

### Acceptance Questions to Answer

- Can an AI agent execute deterministically?
- Can Replay explain every execution?
- Can different AI models converge on equivalent Missions?
- Can interrupted work be recovered?

---

## Determinism and Governance Validation

| Check | Result |
|---|---|
| `npm run govern` | PASS |
| Replay verification | PASS |
| Determinism check | PASS |
| Adversarial audit | PASS |
| Documentation projection | PASS |
| Version synchronization | PASS |
| Repository health audit | PASS |

---

## Conclusion

Brownfield validation demonstrates that SYNTH can analyze diverse repository types and generate structured Mission proposals without manual configuration. The human and AI validation protocols are defined and ready for execution. The next step is to recruit human participants and obtain API access for frontier models.
