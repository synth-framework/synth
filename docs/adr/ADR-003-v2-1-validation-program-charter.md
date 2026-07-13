# ADR-003 — Synth v2.1 Validation Program Charter

**Status:** Accepted  
**Date:** 2026-07-12  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

Synth v2 has been frozen (ADR-001) and its public boundary established (ADR-002). The architecture, documentation, operator journey, and public vocabulary are stable. The natural next question is how v2 should mature into v2.1 and eventually v3.

The risk is that v2.1 becomes an implementation roadmap: a list of new capabilities added before anyone has proven that the existing ones solve real software development problems. That would reintroduce architectural sprawl under the guise of incremental improvement.

Instead, v2.1 must be treated as a validation program whose purpose is to prove the value of the frozen architecture before any evolutionary work on v3 is authorized.

## Decision

Declare Synth v2.1 a **Validation Program**, not an implementation roadmap.

The v2.1 charter is:

> **Validation before Evolution**

The mission is:

1. **Do not add new architectural capabilities.** The kernel, event schema, replay semantics, public vocabulary, and proof classes remain frozen.
2. **Prove that existing capabilities solve real software development.** Every v2.1 expedition must be a validation expedition that tests the frozen system against real projects, real operators, and real workflows.
3. **Only after passing validation may Synth evolve into v3.** v3 development is not authorized until the v2.1 Validation Program certifies that the frozen architecture is sufficient.

### What v2.1 allows

- Validation expeditions (e.g., operator journeys, real-project trials, documentation audits, replay stress tests, adapter conformance trials).
- Bug fixes that preserve frozen components.
- Documentation and operator-experience improvements that stay within the public vocabulary.
- Adapter implementations that conform to the existing adapter architecture.
- New evidence, snapshots, missions, and plans generated through the frozen system.

### What v2.1 forbids

- New kernel components.
- New event types that change replay semantics.
- New public concepts beyond the seven established in ADR-002.
- Architectural refactors that alter frozen interfaces.
- Any work framed as "v3 preparation" except evidence gathering.

### Post-Freeze Rule

v2.1 operates under the post-freeze rule defined in ADR-004:

| Allowed | Forbidden |
|---|---|
| Documentation | New architectural concepts |
| Repository organization | New execution model |
| Examples | Changes to constitutional semantics |
| Website | New foundational abstractions |
| Tutorials | Changes that invalidate replay proofs |
| Public terminology | Changes that modify the deterministic execution contract |
| Developer experience | |
| Testing | |
| Benchmarking | |
| Bug fixes | |
| Missing capabilities required by approved Expeditions | |

### Success criterion

v2.1 is complete when validation evidence demonstrates that a representative set of real software development problems can be fully solved using only the frozen v2 capabilities. At that point, an ADR may be written to authorize v3 evolution.

## Consequences

- **Easier:** v2.1 remains small, focused, and low-risk.
- **Easier:** Operator feedback and real-world evidence become the primary inputs to v3 planning.
- **Easier:** Marketing and adoption can point to a stable v2 and a well-defined validation phase.
- **Harder:** Proposals for new capabilities must be deferred to v3 unless they fit within the frozen architecture as an adapter or operator-facing artifact.
- **Harder:** Maintainers must say no to evolutionary work until validation is complete.

## Proof Impact

- **P1 Structural:** Reinforced — the freeze boundary is extended through v2.1.
- **P2 Behavioral:** Unchanged; validation must include behavioral replay evidence.
- **P3 Historical:** Unchanged; validation must not introduce new historical obligations.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Unchanged.

## Kernel Impact

No kernel components are modified by this decision. This ADR establishes a governance policy that preserves the existing kernel freeze.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md` as the v2.1 charter.

## Related

- `docs/architecture/constitutional-baseline.md`
- `docs/operator/synth-v2-freeze-report.md`
- `docs/adr/ADR-001-v2-freeze-certification.md`
- `docs/adr/ADR-002-product-boundary.md`
- `docs/adr/ADR-004-synth-eras-and-protected-assets.md`
- `docs/reference/public-vocabulary.md`
