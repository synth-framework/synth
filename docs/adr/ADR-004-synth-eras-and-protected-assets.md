# ADR-004 — Synth Eras and Protected Assets

**Status:** Accepted  
**Date:** 2026-07-12  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

Synth v2 has been frozen (ADR-001), its public boundary established (ADR-002), and v2.1 chartered as a Validation Program (ADR-003). The codebase now enters a long adoption phase where the primary risk is no longer architectural correctness but architectural drift: well-intentioned release work (documentation, examples, website, community assets) could accidentally modify the frozen model.

The project needs a simple, durable rule that tells every contributor what can change after the freeze and what cannot.

## Decision

### Post-Freeze Rule

After the architectural freeze, Synth work is divided into two categories.

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

Any work in the Forbidden column requires an Architecture Expedition and a new ADR.

### Three Eras

Synth's lifecycle is divided into three eras. Versions exist within eras; eras are not versions.

| Era | Focus | Status |
|---|---|---|
| **Era I — Foundation** | Prove the architecture. Build Mission Studio, Genesis, Replay, ExecutionGate, and the constitutional model. | Complete. Ends with v2 freeze. |
| **Era II — Adoption** | Prove the product. Repository organization, documentation, examples, website, community, validation. No architecture changes. | Current. Defined by EXP-PROGRAM-002. |
| **Era III — Evolution** | Expand the platform. Begins only when the v2.1 Validation Program certifies that the frozen architecture is sufficient and the architecture lock is lifted. | Not started. v3 work waits here. |

Every future decision is evaluated by a single question: **Which era does this belong to?** If the answer is Evolution but the project is still in Adoption, the work waits behind the lock.

### Protected Assets

The following artifacts SHALL NOT be modified without an approved Architecture Expedition:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Everything else may evolve within the Post-Freeze Rule.

## Consequences

- **Easier:** Contributors know exactly what is safe to change.
- **Easier:** Release work can proceed quickly without architectural review.
- **Easier:** Maintainers can reject scope creep with a documented rule.
- **Harder:** Any desired change to a Protected Asset must go through full expedition and ADR process.
- **Harder:** The Architecture Lock must be deliberately lifted before Era III work begins.

## Proof Impact

- **P1 Structural:** Reinforced — the mutation authority and frozen registries remain untouched.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Unchanged.

## Kernel Impact

No kernel components are modified by this decision. This ADR establishes governance boundaries around the existing kernel.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md` as a governance policy.

## Related

- `docs/architecture/constitutional-baseline.md`
- `docs/adr/ADR-001-v2-freeze-certification.md`
- `docs/adr/ADR-002-product-boundary.md`
- `docs/adr/ADR-003-v2-1-validation-program-charter.md`
- `docs/expeditions/EXP-PROGRAM-002.md`
- `docs/operator/synth-v2-freeze-report.md`
