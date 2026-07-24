# EXP-COMPLEXITY-AUDIT-001 — The Kernel Boundary

> What must live inside the kernel, and what is allowed to live outside it.

**Status:** Approved  
**Expedition:** `EXP-COMPLEXITY-AUDIT-001`  
**Date:** 2026-07-21  

---

## The finding

SYNTH is not a 50,000-line architecture. It is approximately a **10,000-line kernel surrounded by 40,000 lines of applications and implementation**.

The kernel is the **minimal system responsible for preserving canonical truth**. Everything outside the kernel is an application, adapter, or projection built on that truth.

This boundary is the most important architectural result of the complexity audit.

---

## Canonical truth

Canonical truth has exactly three guarantees:

1. **History** — What happened?
2. **Authority** — Who was allowed to make it happen?
3. **Determinism** — Can the same history always reconstruct the same state?

Every kernel subsystem exists to protect at least one of these guarantees. No kernel subsystem exists for presentation, analysis, or external integration.

---

## Kernel classification algorithm

```text
For every subsystem S:

1. Remove S.

2. Can SYNTH still establish canonical truth?
      • What happened?
      • Who authorized it?
      • Can replay reconstruct it?

   YES
        → S is outside the kernel.

   NO
        → Continue.

3. Is there another subsystem already responsible for the guarantee S provides?

   YES
        → S is accidental complexity.

   NO
        → S belongs in the kernel.
```

No architectural discussion. No opinions. Just classification.

---

## What lives inside the kernel

A subsystem is in the kernel only if removing it breaks canonical truth and no other subsystem provides the same guarantee.

| Subsystem | Guarantee protected | Why it is kernel |
|---|---|---|
| Event Store | History | Without it, there is no immutable record of what happened. |
| CanonicalState + Replay | Determinism | Without it, the same events cannot reconstruct the same state. |
| ExecutionGate | Authority | Without it, there is no single enforcement point for who may mutate state. |
| Runtime Engine / Executor | History + Authority | Without it, authorized intents cannot become events. |
| Capability Registry | Authority | Without it, the executable vocabulary is undefined and unsealed. |
| Domain Logic | Determinism | Without it, the same intent would not produce the same events. |
| Policy Engine | Authority | Without it, forbidden operations could execute. |
| Bootstrap | History + Determinism | Without it, SYNTH cannot resume from persisted truth. |
| Types / Contracts | All three | Without shared contracts, subsystems cannot agree on truth. |

**Kernel total:** ~10,000–12,000 lines, ~19% of source.

---

## What lives outside the kernel

Anything that consumes events, produces observations, presents state, or analyzes history without changing canonical truth.

| Category | Examples | Kernel test result |
|---|---|---|
| **Applications** | Mission Studio, First Contact, Review UI, Explain CLI | Removing them does not prevent SYNTH from answering what happened, who authorized it, or reconstructing state. |
| **Gate engines** | Review Gate Engine, Divergence Gate Engine | They emit events and enforce workflow, but canonical truth survives without them. |
| **Cognition / analysis** | Planning engine, Workspace analysis, Discovery, Knowledge extraction | They derive insight from truth; they do not preserve truth. |
| **Adapters** | Filesystem adapter, GitHub adapter, Repository adapter | They translate between SYNTH and external systems. They produce observations, not truth. |
| **Environment integration** | Environment capability providers | They detect external tools. Implementation detail. |
| **Verifiers / proof tools** | Replay Verifier, Graph Integrity Validator | They prove properties of truth. Truth exists without the proofs. |
| **Presentation** | CLI commands, documentation projection, website sync | They render truth for humans. |
| **Product-specific workflows** | Homepage generation, first-contact onboarding | They are use cases, not architecture. |

---

## Reclassified subsystems

Some subsystems previously treated as kernel-adjacent are applications under this test:

| Subsystem | Previous assumption | Kernel test result | Reason |
|---|---|---|---|
| Review Gate Engine | Governance layer, possibly kernel | **Application** | Removing it does not prevent recording or replaying mission/expedition events. |
| Divergence Gate Engine | Governance layer, possibly kernel | **Application** | Removing it does not prevent alignment contracts from existing as evidence. |
| Execution Intent / Graph | Execution coordination | **Application** | Expedition lifecycle events already record progress. |
| Genesis / Alignment | Pre-mission governance | **Application** | Intent models and contracts are evidence; mission creation is kernel. |
| Planning Cognition Engine | Mission synthesis | **Application** | It proposes missions; the kernel creates them. |
| Replay Verifier | Core proof | **Application** | It verifies determinism; determinism exists without verification. |
| Graph Integrity Validator | Core proof | **Application** | It verifies graph invariants; the graph exists without verification. |

---

## The boundary rule

> A subsystem belongs in the kernel if and only if its removal would prevent SYNTH from answering: "What happened, who authorized it, and can replay reconstruct it?"

If a subsystem only affects *how* someone interacts with SYNTH, it belongs outside the kernel.

If a subsystem affects *whether* SYNTH can establish canonical truth, it belongs inside the kernel.

---

## Implications

### For architecture debates

The right question is no longer:

> "Should X become part of SYNTH?"

The right question is:

> "Is X part of the kernel, or an application built on the kernel?"

Examples:

- **Homepage intelligence** → Application.
- **First Contact** → Application.
- **Knowledge extraction** → Application.
- **Review gate engine** → Application.
- **Event Store** → Kernel.
- **ExecutionGate** → Kernel.

### For expedition approval

- **Kernel changes** require an ADR and the highest scrutiny.
- **Application changes** are normal expeditions.
- **Moving an application out of the kernel source tree** is reorganization, not architecture change.

### For governance enforcement

- Mutation authority enforcement belongs in the kernel.
- Evidence normalization, reporting, verification, and presentation belong outside the kernel.

---

## Why this matters now

SYNTH has been treating implementation and applications as if they were architecture. This inflated the perceived complexity of the system and made every new feature feel like a constitutional decision.

Recognizing the kernel boundary means:

- Simplification can proceed without threatening canonical truth.
- New features can be classified as kernel or application before debate begins.
- Governance enforcement can focus on protecting the kernel, not managing every application.

---

## Stability

This document describes **architectural responsibility**, not directories, file names, or current code organization. It should be updated only if the classification of a subsystem changes, not because implementation files move.

---

## One-line summary

> **The kernel is what must be true. Everything else is what can be built on it.**
