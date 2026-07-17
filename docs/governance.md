# Synth Governance Specification

**Version:** 1.0.0  
**Status:** Active  
**Authority:** Architectural Constitution

---

## Principle

> The documentation defines governance; automation enforces it.

No hosting provider, CI platform, or local tool is the source of truth for Synth governance. This document is. GitHub Actions, GitLab CI, Jenkins, or a developer's laptop are all adapters that execute the canonical pipeline defined here.

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

## Audit Pipeline

| Proof Class | Script | Gate |
|-------------|--------|------|
| P1 Structural | `npm run test:audit` | No EventStore bypasses; no policy/capability mutations after seal. |
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
|----------|------------------|-----------|
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
