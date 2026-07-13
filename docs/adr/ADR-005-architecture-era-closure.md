# ADR-005 — Architecture Era Closure

**Status:** Accepted  
**Date:** 2026-07-13  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

SYNTH v2 has completed its Foundation Era (ADR-001), established its public product boundary (ADR-002), chartered a Validation Program (ADR-003), and defined the Eras and Protected Assets that guard it from architectural drift (ADR-004). EXP-PROGRAM-003 has now concluded with all seven validation expeditions accepted and a passing proof.

The remaining risks are no longer architectural. They are empirical: can independent humans and AI agents install, understand, and use SYNTH? Every remaining high-leverage activity — onboarding, documentation, distribution, examples, benchmarks, and human studies — belongs to the Adoption Era and requires no new architecture.

The project therefore needs an explicit declaration that the Architecture Era is closed and that future architectural work is suspended until adoption evidence demonstrates that the architecture is insufficient.

## Decision

### Architecture Era Closure

The Foundation Era of SYNTH is officially closed. The architecture is no longer the limiting factor for SYNTH adoption.

Future architectural work is **suspended** until all of the following are true:

1. EXP-PROGRAM-003 — SYNTH Validation Program is accepted. ✅
2. Independent operators have successfully completed the operator journey without core-team assistance.
3. AI benchmark evidence shows deterministic convergence across supported models for representative repositories.
4. A documented, reproducible case exists where the frozen architecture prevented a real user from succeeding.

No new kernel component, execution model, event schema change, capability model change, or constitutional change may proceed until those conditions are met.

### Strengthened Knowledge Graph Lock

The Knowledge Graph is prohibited until SYNTH demonstrates repeatable adoption by independent operators.

> **Architecture may not advance faster than understanding.**

This lock supersedes any earlier, weaker phrasing. The lock may only be lifted by an Architecture Expedition approved after the conditions above are satisfied.

### Implication for EXP-PROGRAM-004

The next program, EXP-PROGRAM-004 — First Contact Program, is an Adoption-era program. It may not modify any Protected Asset. Its sole purpose is to transform SYNTH from a well-architected repository into an AI-native product that can be installed, understood, and used in under five minutes.

## Consequences

- **Easier:** Contributors and agents can focus entirely on product experience, distribution, and documentation without revisiting architectural questions.
- **Easier:** The project can reject speculative architecture with a single reference to this ADR.
- **Harder:** Any future architectural proposal must first prove that adoption has been blocked by the current architecture, not by missing product experience.
- **Harder:** The Knowledge Graph and other Era-III ambitions remain locked until real-world evidence justifies them.

## Proof Impact

- **P1 Structural:** Unchanged. The architecture remains frozen.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Unchanged.

This ADR is a governance decision; it does not modify any proof class.

## Kernel Impact

No kernel components are modified by this decision. This ADR closes the period during which kernel changes were expected and opens the period during which they are prohibited.

## Constitutional Baseline Impact

`docs/architecture/constitutional-baseline.md` is updated to reference this ADR as the Architecture Era Closure decision. No version numbers change.

## Related

- `docs/adr/ADR-001-v2-freeze-certification.md`
- `docs/adr/ADR-002-product-boundary.md`
- `docs/adr/ADR-003-v2-1-validation-program-charter.md`
- `docs/adr/ADR-004-synth-eras-and-protected-assets.md`
- `docs/expeditions/EXP-PROGRAM-003.md`
- `docs/expeditions/EXP-PROGRAM-004.md`
- `docs/architecture/constitutional-baseline.md`
