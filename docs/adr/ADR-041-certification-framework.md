# ADR-041 — Certification Framework Contract

**Status:** Accepted  
**Date:** 2026-07-19  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, Certification Authors

---

## Context

SYNTH has accumulated several ad hoc certification tests (`tests/brownfield-certification.test.js`, `tests/first-contact-certification.test.js`, `tests/environment-versioning-certification.test.js`, etc.). Each is hand-authored, uses a different style, and covers a specific workflow. There is no shared failure taxonomy, no declarative scenario format, and no single command an operator can run to validate resilience.

As SYNTH enters Era III — Validation & Hardening, the product needs a governed, extensible certification layer that any agent can execute and extend.

---

## Decision

Introduce a Certification Framework with the following contracts:

1. A canonical **Failure Taxonomy** (`docs/reference/failure-taxonomy.md`).
2. A declarative **Certification DSL** (`docs/reference/certification-dsl.md`) for scenario definitions.
3. A **`synth certify` runner** that loads scenarios, prepares isolated workspaces, executes them deterministically, and produces structured reports.
4. An initial **scenario library** covering operator failures, lifecycle failures, and environment failures.
5. A **Certification Matrix** (`docs/certification-matrix.md`) that shows coverage by capability and taxonomy category.
6. A **Public-Surface-Only Rule**: recovery must use only documented CLI commands and artifacts.

---

## Consequences

### Positive

- Certifications become first-class, governable artifacts rather than one-off test scripts.
- Agents can author new failure scenarios using a stable DSL.
- Coverage gaps become visible through the certification matrix.
- Recovery paths are forced onto the public CLI surface.
- Certification reports can be attached to governance proofs.

### Negative

- Adds a new runtime path (`synth certify`) that must be maintained and versioned.
- Scenario authors must learn the DSL and respect the public-surface rule.
- The framework itself must be certified to avoid circular trust issues.

### Neutral

- Unit tests and integration tests remain separate concerns. Certifications validate operator-facing behavior, not implementation internals.

---

## Alternatives Considered

### 1. Hand-written certification tests only

Rejected. Ad hoc tests are hard for agents to generate, hard to maintain, and do not produce a coverage matrix.

### 2. Reuse an existing test framework (e.g., Jest, Mocha)

Rejected. The project intentionally uses minimal test infrastructure. Certifications must be executable through the SYNTH CLI as a public product surface, not only through a test runner.

### 3. Make scenarios JavaScript modules

Rejected. A declarative YAML format separates intent from execution, making scenarios readable by non-developers and generatable by agents.

---

## Compliance

All certification scenarios MUST:

- Declare a unique `id`.
- Classify themselves against the Failure Taxonomy.
- Include `setup`, `steps`, `recovery`, and `verify` phases.
- Use only documented public CLI commands.
- Recover using only documented public CLI commands.

The `synth certify` runner MUST:

- Execute scenarios in isolated temporary workspaces.
- Produce deterministic reports.
- Generate the certification matrix on every run.
- Refuse to pass scenarios that violate the public-surface rule.

---

## Related Documents

- `docs/reference/failure-taxonomy.md`
- `docs/reference/certification-dsl.md`
- `docs/expeditions/EXP-CERT-001.md`
- `docs/expeditions/EXP-PROGRAM-004.md`
- ADR-034 — Replay Recovery

---

## Notes

This ADR does not replace ADR-034. ADR-034 governs the recovery primitive for runtime drift. ADR-041 governs how failure and recovery scenarios are authored, executed, and reported.
