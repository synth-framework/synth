# ADR-021 — Enforce Pull-Request Workflow for All Source Changes

**Status:** Proposed  
**Date:** 2026-07-19  
**Author:** SYNTH Operations  
**Deciders:** Operator

---

## Context

During EXP-AIFC-008 a source change was committed directly to the `main` branch because repository branch-protection rules were bypassed. Direct pushes to `main` bypass the review boundary, make rollback and audit harder, and prevent CI from certifying the merge boundary before the change enters the canonical line of development. The intended governance model is that every source change is proposed, reviewed, and merged through a pull request.

## Decision

All source changes that affect the `main` branch must be introduced through a pull request. Direct pushes to `main` are prohibited. Enforcement is provided by GitHub branch-protection rules configured to require:

1. **Pull-request review** before merging.
2. **Passing status checks** (including the canonical `npm run govern` proof gate) before merging.
3. **No administrative bypass** of branch-protection rules.
4. **Linear history** where practical, to keep the commit history replayable and easy to reason about.

The workflow is:

```
Create feature branch
        │
        ▼
Open pull request
        │
        ▼
CI runs npm run govern
        │
        ▼
Review and approval
        │
        ▼
Merge to main
```

Emergency fixes follow the same path. There is no "hotfix bypass" that writes directly to `main`; urgency is handled by fast-tracking review and CI, not by bypassing the boundary.

## Consequences

- Every change has a reviewable, linkable artifact with discussion and approval history.
- CI certifies the merge boundary before a change enters `main`.
- Rollback is a single revert operation on a merge commit or PR.
- Tooling and agent scripts must create branches and open PRs instead of pushing directly to `main`.
- Iteration is slightly slower because every change needs a branch, PR, and CI run, but auditability and correctness improve.

## Proof Impact

- **P3 (Governance):** The PR workflow itself becomes part of governance certification. Proofs must include a reference to the PR that introduced the certified commit.
- **P5 (Operational resilience):** Rollback and recovery scenarios can assume changes are reachable through PR history.

## Kernel Impact

No kernel components listed in `docs/kernel-freeze.md` are modified by this ADR. This is a process and repository-configuration decision.

## Constitutional Baseline Impact

No changes to `docs/architecture/constitutional-baseline.md` are required. The ADR reinforces the existing governance principle that the documentation defines governance and automation enforces it.

## Related

- [ADR-018 — npm Package Publication Through PR and Tag](ADR-018-npm-publication-through-pr-and-tag.md)
- [Synth Governance Specification](../governance.md)
- [EXP-AIFC-008 — Greenfield Operator Experience](../expeditions/EXP-AIFC-008.md)
