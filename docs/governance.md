# Synth Governance Specification

**Version:** 2.0.0  
**Status:** Active  
**Authority:** Architectural Constitution  
**Governance Architecture:** ADR-045, ADR-047, ADR-048

---

## Principle

> The documentation defines governance; automation enforces it.

No hosting provider, CI platform, or local tool is the source of truth for Synth governance. This document is. GitHub Actions, GitLab CI, Jenkins, or a developer's laptop are all adapters that execute the canonical pipeline defined here.

---

## Governance Architecture — Three-Layer Model

SYNTH governance spans three layers, each with distinct responsibilities:

```text
Genesis Alignment Layer
    Intent → Understanding → Alignment Contract
    Gates: Refinement, Divergence

Synthesis Layer
    Mission → Expedition → Implementation
    Gates: (none internal — gates are in the surrounding layers)

Governance Layer
    Review Gate → Acceptance Gate → Convergence Certification
    Gates: Review, Acceptance, Convergence
```

| Layer | Question | Failure Class Solved |
|---|---|---|
| Genesis Alignment | Did we understand what was wanted? | Understanding failure |
| Synthesis | Did we plan and execute the right work? | Planning/Execution failure |
| Governance | Did we build what we agreed to build? | Verification failure |

This three-layer model is the canonical architecture defined by ADR-045 (Governance Lifecycle State Machine), ADR-047 (Intent Refinement and Alignment Governance), and ADR-048 (Genesis Lifecycle and Alignment Contracts).

---

## Five Gate Types

The governance lifecycle enforces five gate types, each a replayable decision point with a satisfier:

### 1. Refinement Gate

**Occurs:** Before Mission approval, within the Genesis Layer.

**Purpose:** Did we understand what is actually being requested?

**Artifacts reviewed:** Raw intent, Intent Model, evidence, references, constraints, assumptions, unknowns.

**Possible decisions:** `refined_intent` approved, `clarification_requested`.

### 2. Divergence Gate

**Occurs:** Before Mission creation, within the Genesis Layer.

**Purpose:** Does the Alignment Contract accurately capture the intended outcome?

**Artifacts reviewed:** Raw intent, Intent Model, Refined Intent, Alignment Contract, reference evidence, constraints.

**Possible decisions:** `aligned`, `revision_required`, `rejected`, `superseded`.

### 3. Review Gate

**Occurs:** After implementation, within the Governance Layer.

**Purpose:** Did we build what we agreed to build?

**Artifacts reviewed:** Refined Intent, implementation evidence, divergence report, test evidence.

**Possible decisions:** `approve`, `approve_with_conditions`, `revision_required`, `reject`, `supersede_expedition`, `split_expedition`, `merge_expedition`, `escalate_to_mission`, `escalate_to_program`.

### 4. Acceptance Gate

**Occurs:** After the Review Gate approves, within the Governance Layer.

**Purpose:** Is this production-worthy?

**Artifacts reviewed:** Review decision, certification evidence, UX validation, stakeholder input, rollout readiness.

**Possible decisions:** `accepted`, `rejected`.

### 5. Convergence Certification

**Occurs:** After Acceptance, within the Governance Layer.

**Purpose:** Does the final outcome converge with the original intent as captured in the Alignment Contract?

**Artifacts reviewed:** Original intent references, Alignment Contract, implementation evidence, final result.

**Decision:** `certified`, `diverged`, `insufficient_evidence`.

---

## Satisfier Model

A gate satisfier is the authority that may resolve a gate to a terminal decision.

| Satisfier | When Used | Example |
|---|---|---|
| **Automatic** | Required artifacts present and validation rules pass. | Documentation cleanup, generated projections, mechanical refactoring. |
| **AI** | A non-implementing agent evaluates the artifact against the contract. | Test quality, naming consistency, generated assets, documentation clarity. |
| **Human** | A human operator evaluates subjective, experiential, or high-stakes outcomes. | Design review, architecture review, product approval, acceptance. |
| **Quorum** | Multiple satisfiers must agree. | Security review requiring both AI scan and human sign-off. |

Important invariants:

- The implementing agent may not satisfy its own gate (enforced via `excludeActors` in gate policy).
- A gate may declare a fallback satisfier if the primary is unavailable.
- A gate's satisfier is part of the gate's policy and is immutable after the gate is created.
- Quorum rules (`"all"`, `"any"`, or numeric N) are enforced at gate resolution.

---

## Proof Lifecycle

A Synth proof is a machine-verifiable artifact that attests the implementation satisfies the Architectural Constitution at a specific commit and build.

```
Source
   │
   ▼
Build ──▶ dist/
   │
   ▼
Tests ──▶ 202 assertions
   │
   ▼
Audit ──▶ P1 Structural
   │
   ▼
Replay ──▶ P2 Behavioral (state reconstruction + hash-chain)
   │
   ▼
Determinism ──▶ P5 Reproducibility
   │
   ▼
Graph ──▶ P6 Graph Integrity (reference execution)
   │
   ▼
Adversarial ──▶ P4 Adversarial
   │
   ▼
Proof ──▶ proof/proof-*.json
   │
   ▼
Governance attestation ──▶ commit hash, CI signature, timestamp
   │
   ▼
Merge allowed
```

---

## Canonical Verification Command

Exactly one command runs the full governance pipeline:

```bash
npm run govern
```

This executes, in order:

1. `npm run build` — TypeScript compilation.
2. `npm run test:all` — full test suite, SKR compatibility, audit, replay, determinism, adversarial.
3. `npm run proof` — generate proof object.

If any step fails, the pipeline fails and no proof is accepted.

CI adapters must invoke this command. They must not duplicate pipeline logic.

```bash
# Example CI adapter
npm ci
npm run govern
```

---

## Required Merge Evidence

A pull request may be merged only when it provides:

1. A green `npm run govern` run.
2. A generated proof object committed to `proof/` OR a CI attestation referencing the produced proof.
3. For architectural changes: an ADR under `docs/adr/`.
4. No new mutation bypass paths (`scripts/audit-bypass-map.js`).
5. No regression in ATL.

---

## ADR Process

Any change that affects the following requires an Architecture Decision Record:

- Event schema
- Replay semantics
- Proof schema
- Mutation authorities
- Layer boundaries or import rules
- Constitution interpretation
- New proof classes or audit gates
- Gate engine logic or satisfier model

ADR template: `docs/adr/ADR-TEMPLATE.md`

---

## Constitutional Layer Boundaries

Governance owns **semantics** (what is permitted, what is true, what must be proven). Implementation owns **mechanics** (how code runs, which tools are used, how adapters observe the world). Expedition is the authorized engineering unit that produces evidence, and Bootstrap is the one-time transformation that creates the initial governance record.

For the authoritative boundary definitions, examples from the first governed bootstrap, and the decision matrix used to classify concerns, see [Constitutional Layer Boundaries](architecture/constitutional-layer-boundaries.md).

Any change that moves a concern across one of these boundaries requires an ADR.

---

## Projection Model

The [Projection Model](architecture/projection-model.md) defines how SYNTH outputs are derived from the event log. It classifies every artifact as source of truth, canonical state, recomputed projection, cached projection, source input artifact, or bootstrap artifact. Governance enforces the three projection invariants:

- A projection may never be edited as a source artifact.
- A cached projection is valid only if its `sourceStateHash` matches current state.
- No canonical fact may exist in more than one mutable location.

---

## Mutation Authority Invariant

INVARIANT: The `ExecutionGate` is the single mutation authority. No component outside the gate may initiate a state mutation. All events must flow through the gate's `execute()` method, which enforces validation, policy evaluation, capability resolution, and pre-commit governance checks (including intake gate, review gate, and acceptance gate conditions) before persisting.

This invariant is verified by P1 Structural audit (`scripts/audit-bypass-map.js`) and is constitutionally protected.

---

## Audit Pipeline

| Proof Class | Script | Gate |
|---|---|---|
| P1 Structural | `npm run test:audit` | No EventStore bypasses; no policy/capability mutations after seal; single mutation authority enforced. |
| P2 Behavioral | `npm run test:replay` | Operational state == replayed state; hash-chain valid. |
| P2 Behavioral | `npm run test:determinism` | Identical commands produce identical fingerprints + state hashes. |
| P3 Historical | `npm run test:skr` | Legacy aliases replay correctly. |
| P4 Adversarial | `npm run test:adversarial` | All attacks blocked or detected. |
| P6 Graph Integrity | embedded in `npm run proof` | Fresh reference execution produces a fully valid aggregate graph (`scripts/verify-graph-integrity.js`). |
| P5 Reproducibility | embedded in `npm run proof` | Build hash + replay hash reproducible. |

---

## Platform-Adaptive CI

CI configuration lives in provider-specific directories but contains only adapter logic.

- `.github/workflows/proof.yml` — GitHub Actions adapter.
- Future: `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`.

No provider-specific logic may alter the canonical pipeline. Adapters invoke `npm run govern` only.

---

## Versioning Policy

| Artifact | Version Location | Bump Rule |
|---|---|---|
| Constitution | `docs/architecture/constitution.md` header | ADR + Baseline update |
| Language | `docs/term-inventory.md` | ADR |
| Proof schema | `proof.schema` inside proof object | ADR |
| Kernel | `docs/kernel-freeze.md` | Baseline change only |
| ATL | `docs/atl.md` | Assessment update |

---

## Enforcement

Local enforcement:
- Pre-commit hook runs `npm run govern` (fast path may be allowed, but full proof is required before merge).

CI enforcement:
- `npm run govern` is the only required check.
- Merges are blocked on failure.

Human enforcement:
- Maintainers verify the ADR is present for architectural changes.
- Maintainers verify ATL has not regressed.
- Gate satisfier policies are verified during code review.
