# ADR-042 — AI Agent Governance Validation Boundary

**Status:** Accepted  
**Date:** 2026-07-19  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** AI Agents, Operators, CI Systems

---

## Context

SYNTH's governance pipeline (`npm run govern`) and the full test suite (`npm run test:all`) are comprehensive validation surfaces. They can take fifteen to twenty minutes to complete, produce large amounts of output, and are designed to be the final certification step before a change is promoted.

Running these pipelines inside an AI agent session creates several problems:

1. **Context pressure.** The output overwhelms the agent's context window and leaves little room for actual implementation work.
2. **Feedback latency.** Long-running pipelines block the agent from making progress on tasks that do not require full certification.
3. **Responsibility boundary.** Final validation is an operator responsibility. The agent produces the change; the operator certifies it before merge.
4. **Wasted compute.** Repeated full runs during iterative development are unnecessary when targeted tests cover the changed surface.

At the same time, there are legitimate cases where an agent must run governance code: when the agent is modifying the govern profiler, the check registry, the dependency graph, the scheduler, or the tests that validate those components.

---

## Decision

AI agents operating in this repository SHALL NOT run `npm run govern`, `npm run test:all`, or any similarly comprehensive validation pipeline unless the change directly affects the governance or full-suite infrastructure itself.

### Allowed agent validation

Agents may run:

- `npm run build`
- Targeted test scripts (e.g., `npm run test:certification-framework`, `npm run test:public-vocabulary-audit`)
- `npm run typecheck`
- `npm run docs:check-links`
- `npm run docs:validate-projections`
- Any other script whose runtime is short and whose output is directly relevant to the change

### Operator validation

The following remain operator-owned and are executed by the operator before merge:

- `npm run govern`
- `npm run test:all`
- `npm run proof`

### Exception

An agent MAY run `npm run govern` or `npm run test:all` when the change modifies:

- `scripts/governance/`
- `scripts/govern-profiler.js`
- `scripts/verify-replay.js`
- Governance-related tests under `tests/governance-*` or equivalent
- The package.json `test:all` script itself

In those cases, the agent is changing the validation infrastructure and must verify that the infrastructure still works.

---

## Consequences

### Positive

- Agent sessions stay focused on implementation rather than waiting for long pipelines.
- Operator remains the final certifying authority for repository governance.
- Reduced redundant compute during iterative development.
- Clearer separation of responsibilities between agent-produced changes and operator-approved merges.

### Negative

- An agent might miss a failure that only the full pipeline would catch. This is mitigated by the operator running the full pipeline before merge.
- Agent and operator must communicate about which targeted tests were run.

---

## Compliance

Agent sessions should document the targeted tests they executed. The operator review checklist should include:

- [ ] Agent did not run `npm run govern` or `npm run test:all` unless the change touched governance infrastructure.
- [ ] Agent ran targeted tests relevant to the change.
- [ ] Operator ran `npm run govern` before merge.

---

## Related Documents

- `docs/governance.md`
- `docs/adr/ADR-040-era-iii-validation-and-hardening.md`
- `AGENTS.md`
