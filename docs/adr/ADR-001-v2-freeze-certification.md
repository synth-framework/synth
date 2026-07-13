# ADR-001 — Synth v2 Freeze Certification

**Status:** Accepted  
**Date:** 2026-07-12  
**Author:** Synth Architecture  
**Deciders:** Synth v2 Productization Program (EXP-PROGRAM-001)

---

## Context

The Synth v2 Productization Program (EXP-PROGRAM-001) has completed all implementation and certification expeditions:

- EXP-PROD-001 — Mission Snapshot Lineage
- EXP-PROD-002 — Documentation Expedition
- EXP-PROD-003 — Operator Journey Certification
- EXP-PROD-004 — Mental Model Simplification

The architecture, documentation, operator journey, and public vocabulary are now stable. The remaining question is whether the system is ready to declare v2 frozen.

## Decision

Declare Synth v2 architecture frozen as of 2026-07-12.

The freeze means:

1. No new architectural concepts may be introduced without an ADR.
2. The kernel components listed in `docs/architecture/constitutional-baseline.md` are stable.
3. The public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay) is stable for v2.
4. All future changes must demonstrate preservation of P1–P5 proof classes.
5. `npm run govern` is the required audit gate for every release.

## Consequences

- **Easier:** External contributors can rely on a stable architecture and public surface.
- **Easier:** Marketing, onboarding, and operator docs can be finalized.
- **Harder:** Future architectural changes require ADRs and proof of preservation.
- **Harder:** The temptation to add "just one more concept" must be resisted until v2.1.

## Proof Impact

- **P1 Structural:** Verified by `test:audit` and proof generation.
- **P2 Behavioral:** Verified by `test:replay` and `test:determinism`.
- **P3 Historical:** Verified by replay compatibility tests.
- **P4 Adversarial:** Verified by `test:adversarial`.
- **P5 Reproducibility:** Verified by `npm run govern` and proof artifact generation.

## Kernel Impact

No kernel components are modified by this decision. This ADR certifies that the existing kernel satisfies the constitutional baseline.

## Constitutional Baseline Impact

Updates `docs/architecture/constitutional-baseline.md` to add:

- Freeze Certification Date: 2026-07-12
- Freeze ADR: ADR-001
- Latest verified proof artifact reference

The kernel version remains 1.0. The baseline date remains 2026-06-29 because the constitutional invariants have not changed; this ADR certifies that those invariants are now fully implemented and verified.

## Related

- `docs/architecture/constitutional-baseline.md`
- `docs/expeditions/EXP-PROD-005.md`
- `docs/operator/synth-v2-freeze-report.md`
- `proof/proof-2026-07-12T07-21-11-599Z.json`
