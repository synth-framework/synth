# Synth v2 Constitutional Baseline

**Baseline Date:** 2026-06-29  
**Constitution Version:** 1.0  
**Language Version:** 1.0 (see `docs/reference/term-inventory.md`)  
**Proof Schema Version:** synth-proof-v1  
**ATL:** ATL-7 (after EXP-GOV-001)  
**Kernel Version:** 1.0
**Freeze Certification Date:** 2026-07-12
**Freeze ADR:** [ADR-001 — Synth v2 Freeze Certification](../adr/ADR-001-v2-freeze-certification.md)
**Product Boundary ADR:** [ADR-002 — Product Boundary](../adr/ADR-002-product-boundary.md)
**v2.1 Charter ADR:** [ADR-003 — Synth v2.1 Validation Program Charter](../adr/ADR-003-v2-1-validation-program-charter.md)
**Eras and Protected Assets ADR:** [ADR-004 — Synth Eras and Protected Assets](../adr/ADR-004-synth-eras-and-protected-assets.md)
**Architecture Era Closure ADR:** [ADR-005 — Architecture Era Closure](../adr/ADR-005-architecture-era-closure.md)
**Environment Independence ADR:** [ADR-006 — Environment Discovery Framework](../adr/ADR-006-environment-discovery-framework.md)
**Latest Verified Proof:** `proof/proof-2026-07-13T03-29-32-198Z.json`

---

## Declaration

From this baseline forward, the Synth v2 architecture is stable. Future expeditions extend capabilities while preserving the invariants, authorities, and proof obligations defined here.

Synth is organized into three architectural strata:

```
Layer 0 — Constitution
    Principles, ADRs, ATLs, Governance, Proof

Layer 1 — Kernel
    ExecutionGate, Runtime, EventStore, Replay,
    Capability Registry, Adapter Registry

Layer 2 — Adapters
    Repository, GitHub, Docker, Kubernetes, Filesystem, LLM, Cloud, ...
```

The Constitution governs both the Kernel and the Adapters. The Kernel remains the stable execution engine. Adapters become the primary mechanism for extending capabilities.

The question is no longer:

> "Is the architecture correct?"

It is:

> "Can every change demonstrate that it preserves the architecture?"

---

## Frozen Kernel Components

| Component | Policy |
|-----------|--------|
| Environment Layer | Governed by ADR-006. The Core depends on the Environment Layer; the Environment Layer depends on capability providers. |
| `ExecutionGate` API | Frozen. Mutations must pass through `execute()` or `executeGenesis()`. |
| Event schema (`SynthEvent`) | Frozen. `id`, `type`, `timestamp`, `transactionId`, `capability`, `actor`, `payload`, `eventHash`, `previousHash` are required. |
| Replay semantics | Frozen. `rebuildState(events)` is the canonical fold. |
| State hash algorithm | Frozen. `computeStateHash` from `src/runtime/replay.js` is canonical. |
| Proof schema | Versioned. Current: `synth-proof-v1`. |
| Mutation authorities | Frozen. Only `ExecutionGate` may append to `EventStore`. |
| Capability registry freeze | Frozen. `seal()` prevents runtime registration. |
| Policy engine freeze | Frozen. `freeze()` prevents runtime rule changes. |
| Adapter lifecycle | Frozen. All adapters implement `discover → configure → validate → enable → healthy → operational → disable`. |
| Adapter Architecture (EXP-ADP-000) | Frozen. The constitutional adapter specification is implementation-agnostic and governs every adapter. |
| Repository Adapter interface | Frozen. Git is the reference implementation; future adapters implement the same interface. |

---

## Required Proof Classes

Every release must satisfy:

- **P1 Structural** — exactly one mutation authority, no bypasses, frozen registries.
- **P2 Behavioral** — replay correctness, deterministic execution.
- **P3 Historical** — replay compatibility, schema evolution tolerance.
- **P4 Adversarial** — direct append blocked, tampering detected.
- **P5 Reproducibility** — identical sources produce identical builds and proofs.

---

## Required Audit Gates

```bash
npm run govern
```

Must pass before merge. The command runs:

1. Build
2. Tests
3. Structural audit
4. Replay verification
5. Determinism check
6. Adversarial audit
7. Proof generation

---

## Replay Compatibility Policy

The canonical replay engine must continue to understand all events written after this baseline. Legacy aliases (e.g., `TICKET_CREATED`) remain supported. Deprecated events may be archived but must remain replayable.

---

## Governance Policy

See `docs/governance.md`.

Key rules:

- Automation enforces governance; documentation defines it.
- CI adapters invoke `npm run govern` only.
- Architectural changes require an ADR.
- ATL must not regress.
- Proof objects must be generated for every release.

---

## Change Process

To modify any frozen component:

1. Write an ADR explaining why the change is necessary.
2. Demonstrate that the change preserves all proof classes.
3. Update the proof schema version if the proof format changes.
4. Update this baseline document if the kernel version changes.
5. Obtain maintainer approval.

---

## Signatories

This baseline is established by the Synth v2 architecture and governance system.

```
Baseline established: 2026-06-29
Freeze certified: 2026-07-12
Freeze ADR: ADR-001
Product Boundary ADR: ADR-002
v2.1 Charter ADR: ADR-003
Eras and Protected Assets ADR: ADR-004
Architecture Era Closure ADR: ADR-005
Environment Independence ADR: ADR-006
Proof schema: synth-proof-v1
ATL target: ATL-7
```
