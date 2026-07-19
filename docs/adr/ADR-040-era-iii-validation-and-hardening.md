# ADR-040 — Era III: Validation & Hardening

**Status:** Accepted  
**Date:** 2026-07-19  
**Deciders:** Synth Architecture  
**Authority:** Synth Architectural Constitution  

---

## Context

The architectural surface of SYNTH v2 is now feature-complete. The core model—Genesis, Discovery, Mission, Expedition, Evidence, Governance, Replay, Repository Governance, AI Interoperability, and Operator Optimization—is chartered and interlocked. The remaining risk is not missing subsystems; it is whether the existing architecture survives real-world use.

ADR-004 established three eras: Foundation, Adoption, and Evolution. That model served the project well, but it did not explicitly separate the validation phase from the evolution phase. This ADR introduces that separation.

## Decision

SYNTH enters **Era III — Validation & Hardening**.

The focus shifts from architectural expansion to observed validation. The canonical question changes from:

> "What should we build next?"

to:

> "Does the architecture survive real-world use?"

This ADR amends the era table in ADR-004 as follows:

| Era | Focus | Status |
| --- | --- | --- |
| **Era I — Foundation** | Prove the architecture. Build Mission Studio, Genesis, Replay, ExecutionGate, and the constitutional model. | Complete. |
| **Era II — Adoption** | Prove distribution, onboarding, and public narrative. No architecture changes. | Complete. |
| **Era III — Validation & Hardening** | Execute real greenfield and brownfield projects, onboard first-time users, exercise different AI operators, stress replay and governance, validate the homepage, and refine terminology through usage. | **Current.** |
| **Era IV — Evolution** | Expand the platform after validation demonstrates that the frozen architecture is sufficient. | Not started. |

## Era III Freeze Charter

### Allowed without additional architecture review

- Bug fixes
- UX refinements
- Performance improvements
- Documentation clarifications
- Acceptance criteria updates
- Convergence reviews
- Certification scenario additions
- Homepage and website polish
- Skill and rules refinement
- CI classification and orchestration tuning

### Requires evidence from testing

- New Programs
- New core concepts
- Public vocabulary changes
- Lifecycle changes
- Governance model changes
- New ADRs that modify Protected Assets

### Frozen

- Public vocabulary: Genesis, Discovery, Mission, Expedition, Evidence, Replay, Governance.
- Protected Assets listed in ADR-004.
- Event model semantics.
- Replay semantics.
- Deterministic execution contract.

## Governance Rule

No new Program may be chartered during Era III unless the need is justified by observed friction from real-world use, captured as an Experiment, and validated through a Convergence Review.

The entry path for new ideas becomes:

```text
Observation
    ↓
Experiment
    ↓
Validated Need
    ↓
Program
```

Not:

```text
Idea
    ↓
Program
```

## Validation Matrix

Era III validation is organized around representative scenarios:

| Domain | Scenarios |
| --- | --- |
| **Greenfield** | CLI app, desktop app, SaaS, mobile app, library, API |
| **Brownfield** | Node project, Python project, monorepo, legacy repository |
| **Operators** | ChatGPT, Claude, Gemini, Cursor, CLI-only |
| **Governance** | Docs-only PR, runtime change, architecture change, release promotion |
| **Homepage** | New visitor, existing developer, AI-first workflow |

The objective is not to pass tests. It is to discover where the architectural model breaks down.

## Expected Discoveries

Validation is expected to surface friction rather than missing subsystems:

- Discovery asks questions in the wrong order.
- Mission names are confusing.
- Expedition granularity is off.
- Homepage interactions feel unnatural.
- Replay is missing context.
- Governance explanations are too technical.
- AI skill projections need refinement.
- CI classification misses an edge case.

These observations become evidence that drives refinements, not new architecture.

## Consequences

### Positive

- Focus shifts from building to proving.
- Terminology stabilizes, improving product coherence.
- New work is justified by observed need rather than anticipation.
- The program portfolio stops growing faster than the product matures.

### Negative

- Some anticipated features must wait until Era IV.
- Contributors may experience slower acceptance of new programs.
- Validation requires sustained operational effort.

## Proof Impact

- **P1 Structural:** Reinforced — the freeze limits architectural drift.
- **P2 Behavioral:** Strengthened through expanded certification scenarios.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Unchanged.

## Kernel Impact

No kernel components are modified by this decision. This ADR governs the project phase, not runtime semantics.

## Constitutional Baseline Impact

Update `docs/architecture/constitutional-baseline.md` to:

1. Reference ADR-040 as the current Era ADR.
2. Add a "Current Era" section declaring Era III — Validation & Hardening.
3. Increment the Constitution minor version to reflect the era transition.

## Related

- `docs/adr/ADR-004-synth-eras-and-protected-assets.md`
- `docs/adr/ADR-039-architectural-convergence-review.md`
- `docs/architecture/constitutional-baseline.md`
- `docs/expeditions/EXP-PROGRAM-031.md`
- `docs/expeditions/EXP-PROGRAM-032.md`

