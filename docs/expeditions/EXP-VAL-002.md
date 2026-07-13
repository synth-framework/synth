# EXP-VAL-002 — Repository Bootstrap

**Status:** Completed  
**Kind:** Validation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-003 — SYNTH Validation Program  
**Depends On:** EXP-VAL-001  
**Blocks:** EXP-VAL-003, EXP-VAL-005, EXP-VAL-006

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

Allow an AI agent to transform any repository into a SYNTH repository.

---

## Goal

Support:

- Empty repository
- Existing repository
- Brownfield repository
- Polyglot repository

---

## Deliverables

1. **Agent bootstrap flow**
   - Detect repository type and language.
   - Propose an initial Mission.
   - Request approval before mutating the repository.

2. **Repository analysis**
   - Identify languages, dependencies, tests, and architecture signals.
   - Surface observations for Mission Studio.

3. **Mission creation**
   - Generate a Mission observation from repository context.
   - Allow the human to refine or reject.

4. **Mission approval request**
   - Present the approved Mission Model Snapshot for human confirmation.
   - Record approval as an event.

5. **Repository configuration**
   - Add required files and scripts without destroying existing work.
   - Respect `.gitignore` and existing conventions.

6. **Documentation generation**
   - Generate public-facing documentation from the knowledge base.

7. **Website initialization**
   - Optionally scaffold `website/` for projects that want a public site.

8. **Example generation**
   - Optionally create a minimal certified example structure.

---

## Acceptance

Given:

```text
A random GitHub repository
```

The AI should be able to produce:

```text
Mission
↓
Expeditions
↓
Replay
↓
Documentation
↓
Working project
```

without manual repository configuration.

Specifically:

- Bootstrap works for empty, existing, brownfield, and polyglot repositories.
- The human is asked for approval before irreversible changes.
- Generated artifacts pass `npm run govern`.
- Existing source code and tests remain intact.

---

## Phases

### Phase 1 — Detect

Build repository analysis prompts and heuristics.

### Phase 2 — Propose

Generate Mission and Expedition proposals from analysis.

### Phase 3 — Approve

Implement the human approval checkpoint.

### Phase 4 — Apply

Apply SYNTH configuration and generate artifacts.

### Phase 5 — Verify

Run `npm run govern` on the bootstrapped repository.

---

## Risks

| Risk | Mitigation |
|---|---|
| Bootstrap destroys existing files | Approval checkpoint and dry-run mode |
| Brownfield analysis is shallow | Use multiple adapters and confidence scoring |
| Human rejects many proposals | Iterate prompt quality |

---

## Definition of Done

- [x] Bootstrap flow documented and tested for empty repositories.
- [x] Bootstrap flow documented and tested for existing repositories.
- [x] Bootstrap flow documented and tested for brownfield repositories.
- [x] Bootstrap flow documented and tested for polyglot repositories.
- [x] Human approval is required before mutating the repository.
- [x] Bootstrapped repositories pass `npm run govern`.
- [x] Expedition is accepted.

---

## Implementation Plan

Approved plan for executing this expedition:

1. **Add bootstrap command to CLI** — Extend `src/cli/synth.ts` with `synth bootstrap [path] [--approve] [--dry-run] [--with-website] [--with-example]`. Default path is current working directory. Without `--approve`, print proposals and stop. With `--approve`, apply changes.
2. **Repository analysis module** — Create `src/cli/bootstrap-analyzer.ts`. Use AdapterRegistry to run filesystem, architecture, specification, dependency, and knowledge-extraction adapters. Collect `PlanningObservation[]` and detect repository type.
3. **Proposal generation** — Feed observations into Mission Studio via `missionStudioOperation`. Generate Mission and Expedition proposals. Output structured JSON.
4. **Approval checkpoint** — Print proposed changes and require `--approve` to continue. If not approved, exit with status 0 and JSON explaining what would happen.
5. **Apply phase** — If `.synth/manifest.json` does not exist, run init. Generate documentation. Optionally scaffold `website/` and `examples/`. Run `npm run govern`.
6. **Tests** — Create `tests/synth-bootstrap.test.js` covering empty, existing Node.js, brownfield, and polyglot directories. Verify dry-run does not mutate and `--approve` produces expected artifacts.
7. **Documentation** — Create `docs/guides/agents/bootstrap.md` and `docs/guides/agents/prompts/bootstrap-repository.md`.
8. **Build and verify** — Run `npm run build`, `npm run test:all`, `npm run docs:check-links`, and `npm run audit:repository`.

---

## Completion Notes

EXP-VAL-002 completed on 2026-07-12.

### What was delivered

- **CLI command**: `synth bootstrap [path] [--approve] [--dry-run] [--with-website] [--with-example]` added to `src/cli/synth.ts`.
- **Analyzer**: `src/cli/bootstrap-analyzer.ts` detects empty, Node.js, brownfield, and polyglot repositories using the AdapterRegistry and emits `PlanningObservation[]`.
- **Apply module**: `src/cli/bootstrap-apply.ts` generates a Mission via Mission Studio and applies SYNTH configuration only when `--approve` is present.
- **Documentation**: `docs/guides/agents/bootstrap.md` and `docs/guides/agents/prompts/bootstrap-repository.md` provide agent onboarding prompts.
- **Tests**: `tests/synth-bootstrap.test.js` covers all four repository types, dry-run non-mutation, and approved application.

### Verification results

- `npm run build` — PASS
- `npm run test:all` — PASS (all suites green)
- `npm run proof` — PASS (P1 Structural, P2 Replay, P2 Determinism, P4 Adversarial)
- `npm run docs:check-links` — PASS (943 internal links resolve)
- `npm run audit:repository` — PASS (56 passed, 0 warned, 0 failed)

### Notable fixes during execution

- Fixed `src/mission-studio/adapter-observation-collector.ts` to invoke enrichment adapters with explicit `this` binding (`enrich.call(adapter, rawObservations)`), preventing `undefined` context errors during bootstrap analysis.
- Redirected `Logger` in `src/observability/tracer.ts` to `stderr`, keeping CLI JSON output on `stdout` clean for agent parsing.

### Proof artifact

- Fresh proof generated: `proof/proof-2026-07-12T22-29-56-173Z.json`

EXP-VAL-002 now unblocks EXP-VAL-003, EXP-VAL-005, and EXP-VAL-006.
