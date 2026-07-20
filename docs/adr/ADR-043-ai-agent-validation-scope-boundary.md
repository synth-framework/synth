# ADR-043 — AI Agent Validation Scope Boundary

**Status:** Accepted  
**Date:** 2026-07-20  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, Governance

---

## Context

SYNTH's governance pipeline (`npm run govern`) and the full test suite are expensive, stateful, and operator-facing. They mutate local runtime state under `.synth/data/`, produce large outputs, and are intended to be the final certification step before a change is pushed or merged.

AI agents assisting with implementation have repeatedly triggered these pipelines locally to "check status." This has caused:

- Local runtime state pollution (e.g. test events appended to `.synth/data/event-log.jsonl`).
- Confusing test failures that are artifacts of the agent's own execution, not the code under change.
- Wasted context-window and token budget on multi-thousand-line govern outputs.
- Blurred accountability: the operator, not the agent, is responsible for final acceptance.

As SYNTH enters Era III — Validation & Hardening, the boundary between agent-assisted implementation and operator-owned validation must be explicit.

---

## Decision

AI agents operating on a SYNTH repository MUST NOT run the full governance pipeline or the full test suite locally, except in the narrowly scoped cases below.

### Allowed (targeted validation)

An AI agent MAY run a **targeted** test or validation command only when it is directly validating source-code changes the agent is actively making. Examples:

- `npm run test:replay-graph-integrity` after editing `scripts/verify-replay.js` or replay-related code.
- `npm run test:certification-framework` after editing certification source code.
- `npm run docs:check-links` after editing documentation.
- `synth validate` (adaptive validator) when the operator explicitly asks for a quick local check.

### Disallowed (broad validation)

An AI agent MUST NOT run:

- `npm run govern` (the full canonical governance pipeline).
- `npm run test` or `npm run test:all` (the full test suite).
- Any long-running, high-output command whose primary purpose is final acceptance rather than focused regression checking.

### Operator ownership

Final validation remains the operator's responsibility. The agent's job is to make the change correct and reviewable, not to certify it. The operator runs `npm run govern` (or its CI equivalent) before pushing, merging, or releasing.

---

## Consequences

### Positive

- Prevents local state pollution caused by agent-driven full-suite runs.
- Preserves operator accountability for final acceptance.
- Reduces wasted context-window and token budget on verbose, low-signal outputs.
- Keeps agent actions focused on implementation and targeted verification.

### Negative

- Agents may miss failures that only appear in the full pipeline. This is acceptable because the operator still runs the full pipeline before merge.
- Requires discipline from both agents and operators to respect the boundary.

### Neutral

- CI continues to run the full governance pipeline unchanged.
- The adaptive validator (`synth validate`) remains available for lightweight, operator-initiated checks.

---

## Alternatives Considered

### 1. Allow agents to run `npm run govern` freely

Rejected. It produces local side effects, wastes tokens, and conflates implementation with acceptance.

### 2. Run govern in a sandboxed / temporary clone

Rejected. It adds complexity, still wastes resources, and does not solve the accountability boundary problem.

### 3. Require operator approval for every test command

Rejected. Targeted tests are a normal part of implementation and should not require per-command approval. The boundary is drawn at broad validation pipelines instead.

---

## Related

- ADR-041 — Certification Framework Contract
- ADR-042 — AI Agent Governance Validation Boundary
- `docs/governance.md`
- `docs/guides/agents/index.md`
