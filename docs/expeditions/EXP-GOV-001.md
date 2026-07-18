# EXP-GOV-001 — Continuous Governance

**Status:** Completed  
**Priority:** High  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**Depends On:** EXP-SMA-001, EXP-DET-001, EXP-AUD-002  
**Blocks:** None (final foundational expedition)

---

## Objective

Make proof generation part of the development lifecycle. No architectural change may reach `main` without producing a valid proof artifact.

This expedition does not add kernel features. It adds the governance layer that enforces the architecture.

---

## Phases

### Phase 1 — Governance Specification

Document the governance contract before automating it.

- `docs/governance.md` — proof lifecycle, canonical command, merge evidence, ADR process, CI adapter policy.
- `docs/atl.md` — Architectural Trust Level definitions and current assessment.
- `docs/architecture/constitutional-baseline.md` — formal baseline declaration.
- `docs/kernel-freeze.md` — frozen kernel interfaces and change process.

**Rule:** documentation defines governance; automation enforces it.

---

### Phase 2 — Local Governance

Implement the canonical local pipeline as a single npm command.

```bash
npm run govern
```

Runs:

1. `npm run build`
2. `npm run test:all`
3. `npm run proof`

All other entry points (local hooks, CI adapters) call this command.

---

### Phase 3 — CI Adapters

Create platform-agnostic adapters that invoke the canonical command.

- `.github/workflows/proof.yml` — GitHub Actions adapter.
- Future adapters may be added for GitLab, Azure, Jenkins.

No provider-specific logic is allowed in the architecture. Adapters are thin shells.

---

### Phase 4 — Constitutional Baseline

Declare the `Synth v2 Constitutional Baseline`. From this point:

- The Constitution is stable.
- The proof system is mandatory.
- Kernel changes require ADRs and updated proofs.
- Expeditions shift from repairing the kernel to extending it while preserving guarantees.

---

### Phase 5 — Kernel Freeze

Formalize the frozen kernel:

- `ExecutionGate` API
- `SynthEvent` schema
- Replay semantics
- State hash algorithm
- Proof schema
- Mutation authorities
- Registry/policy freeze mechanisms

Mutable interfaces (new capabilities, projections, audit gates) may still be extended.

---

## Proof Model Extension

The proof system now supports three capabilities:

1. **Generate** — `npm run proof`
2. **Verify** — `npm run proof:verify`
3. **Reproduce** — `npm run proof:verify` re-runs the pipeline and compares hashes

The proof object includes:

- `trust.level` — ATL
- `baseline` — Constitution, kernel, language, and proof schema versions
- `reproduction` — expected hashes and reproduction command

---

## Verification

- `npm run govern` passes.
- `npm run proof:verify` reproduces the latest proof.
- GitHub Actions adapter runs `npm run govern` on PR and push.
- Pre-commit hook runs `npm run govern`.
- ATL assessment is ATL-7.

---

## Definition of Done

- [x] Governance specification documents written.
- [x] ATL definitions written and current assessment documented.
- [x] Canonical `npm run govern` command exists.
- [x] CI adapter invokes `npm run govern` only.
- [x] Local pre-commit hook installed from `.githooks/`.
- [x] ADR template and process documented.
- [x] Constitutional Baseline declared.
- [x] Kernel Freeze declared.
- [x] Proof schema supports generation, verification, and reproduction.
- [x] Full verification passes: build, tests, audit, replay, determinism, adversarial, proof, reproduction.
