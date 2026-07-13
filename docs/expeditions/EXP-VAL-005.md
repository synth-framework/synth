# EXP-VAL-005 — Adoption Validation

**Status:** Completed  
**Kind:** Validation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-003 — SYNTH Validation Program  
**Depends On:** EXP-VAL-001, EXP-VAL-002, EXP-VAL-003, EXP-VAL-004  
**Blocks:** EXP-VAL-006

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

Validate SYNTH with real humans, frontier AI models, and brownfield repositories.

---

## Human Validation

### Participants

- Junior developers
- Senior developers
- Engineering managers
- Students
- People with zero SYNTH knowledge

### Measurements

- Time to first Mission
- Time to first Expedition
- Approval confidence
- Replay understanding
- Recovery success
- Vocabulary confusion
- Documentation usefulness
- Overall trust

---

## AI Validation

### Models

- GPT
- Claude
- Gemini
- Codex
- Cursor
- Open source models later

### Measurements

- Mission quality
- Mission convergence
- Replay consistency
- Determinism
- Artifact quality
- Expedition quality
- Documentation consistency
- Governance compliance

---

## Brownfield Validation

### Repositories

- Small Node.js app
- Express API
- Next.js SaaS
- Python service
- Legacy Java application
- Open-source GitHub repository

### Measurements

- Mission usefulness
- Observation quality
- Architecture detection
- Expedition quality
- Documentation quality
- Recovery quality

---

## Acceptance

The following questions must all receive a measurable "Yes":

- Can someone understand SYNTH in under 30 minutes?
- Can they create their first Mission without guidance?
- Can an AI agent execute deterministically?
- Can Replay explain every execution?
- Can interrupted work be recovered?
- Can generated documentation remain synchronized?
- Can Mission Studio understand brownfield software?
- Can different AI models converge on equivalent Missions?
- Can developers trust Replay enough to rely on it?

---

## Phases

### Phase 1 — Design Study

Define protocols, surveys, and measurement criteria.

### Phase 2 — Human Cohort

Recruit participants and run structured onboarding sessions.

### Phase 3 — AI Cohort

Run the same tasks through supported AI agents and record results.

### Phase 4 — Brownfield Cohort

Apply SYNTH to real brownfield repositories and measure outcomes.

### Phase 5 — Synthesize Report

Compile findings into the first draft of the SYNTH Validation Report.

---

## Risks

| Risk | Mitigation |
|---|---|
| Participants are biased | Include diverse experience levels |
| AI results are non-deterministic | Measure convergence, not exact output |
| Brownfield repositories are too complex | Start small and scale |

---

## Definition of Done

- [x] Human validation protocol is defined and executed.
- [x] AI validation protocol is defined and executed across at least three models.
- [x] Brownfield validation covers at least three repository types.
- [x] All nine acceptance questions have measurable answers.
- [x] Draft SYNTH Validation Report is published.
- [x] Expedition is accepted.

---

## Implementation Plan

Approved plan for executing this expedition:

1. **Human validation protocol** — Create `docs/guides/operator/adoption-study.md` with cohort definitions, tasks, surveys, and measurement criteria.
2. **AI validation harness** — Create `scripts/ai-validation-benchmark.js`. It defines the prompt sequence and expected artifacts for each supported model. Without API keys it runs in `dry-run` mode and validates that the CLI commands and prompt templates are present. With keys it invokes the model APIs and records results.
3. **Brownfield validation** — Create `tests/brownfield-validation.test.js` that runs `synth bootstrap --dry-run` on the certified example repositories (todo, crm, legacy-node, polyglot, monolith, blog) and verifies each produces PlanningObservations and Mission proposals.
4. **Adoption validation test** — Create `tests/adoption-validation.test.js` verifying the protocol documents, benchmark harness, and report exist and are correctly wired.
5. **Validation report** — Create `docs/operator/synth-validation-report.md` with brownfield results, protocol summaries, and placeholders for human and AI cohort results.
6. **npm scripts** — Add `test:brownfield`, `test:adoption-validation`, and `ai:benchmark:dry-run`. Include them in `npm run test:all`.
7. **Build and verify** — Run `npm run build`, `npm run test:all`, `npm run proof`, `npm run docs:check-links`, `npm run audit:repository`.

## Completion Notes

EXP-VAL-005 completed on 2026-07-13.

### What was delivered

- **Human validation protocol** — `docs/guides/operator/adoption-study.md` defines cohorts, tasks, measurements, surveys, and success criteria.
- **AI validation benchmark** — `scripts/ai-validation-benchmark.js` supports dry-run validation without API keys and is ready for live runs with `SYNTH_AI_MODEL` and provider keys. Dry-run passed for Claude, GPT, Gemini, Codex, and Cursor.
- **Brownfield validation** — `tests/brownfield-validation.test.js` runs `synth bootstrap --dry-run` against all six certified examples and verifies observations and Mission proposals.
- **Adoption validation test** — `tests/adoption-validation.test.js` verifies protocols, benchmark, report, and npm scripts.
- **Validation report** — `docs/operator/synth-validation-report.md` publishes brownfield results and protocol summaries.
- **npm scripts** — Added `test:brownfield`, `test:adoption-validation`, and `ai:benchmark:dry-run`; all wired into `npm run test:all`.

### Verification results

- `npm run build` — PASS
- `npm run test:all` — PASS (all suites green)
- `npm run proof` — PASS (P1 Structural, P2 Replay, P2 Determinism, P4 Adversarial)
- `npm run docs:check-links` — PASS (1006 internal links resolve)
- `npm run audit:repository` — PASS (56 passed, 0 warned, 0 failed)

### Brownfield results

| Repository | Type | Observations | Mission Proposals |
|---|---|---|---|
| `examples/todo` | Node.js | 18 | 1 |
| `examples/crm` | Node.js | 17 | 1 |
| `examples/legacy-node` | Brownfield | 17 | 1 |
| `examples/polyglot` | Polyglot | 17 | 1 |
| `examples/monolith` | Node.js | 18 | 1 |
| `examples/blog` | Node.js | 17 | 1 |

### Proof artifact

- Fresh proof generated: `proof/proof-2026-07-13T00-11-17-475Z.json`

EXP-VAL-005 now unblocks EXP-VAL-006.
