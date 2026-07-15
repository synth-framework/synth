# EXP-ENV-008 — Forge Capability

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-002  
**Blocks:** EXP-ENV-010

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

Abstract forge/platform interaction so SYNTH is not coupled to GitHub.

---

## Motivation

Forges are environmental. The Core should interact with platforms through a capability interface.

---

## Deliverables

1. **Forge capability interface**
2. **GitHub provider**
3. **Issue/PR/release abstractions**

---

## Acceptance

SYNTH can read repository metadata, issues, and releases through the capability interface without GitHub-specific logic in the Core.

---

## Definition of Done

- [x] Forge capability interface defined.
- [x] GitHub provider implemented.
- [x] Abstractions documented.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- **ADR:** [ADR-013 — Forge Capability](../adr/ADR-013-forge-capability.md) (Accepted).
- **Implementation:** `src/environment/forge-capability.ts` defines the `ForgeProvider` interface plus forge-agnostic `ForgeRepository`/`ForgeIssue`/`ForgePullRequest`/`ForgeRelease`/`ForgeListOptions` abstractions, and the `GitHubForgeProvider` reference implementation. The provider composes the `ToolProvider` capability (ADR-011) via the `gh` CLI; authentication is delegated to `gh` — no credential handling in the provider. Read-only scope per ADR-013. Exported via `src/environment/index.ts`.
- **Abstractions:** documented in ADR-013 §2 (forge-agnostic vocabulary; provider-specific fields stay inside providers).
- **Test coverage:** `tests/environment-forge-capability.test.js` — 8 tests covering repository metadata parsing, failure tolerance, issue listing with labels, malformed-entry skipping, PR branch mapping, release listing, unparseable output, and `gh` failure handling — all via scripted ToolProvider fakes (no live `gh` calls).
- **npm script:** `test:environment-forge`, included in `test:all`.
- The product-boundary `GitHubAdapter` in `src/adapters/github/` is unchanged; the Forge capability is an Environment Layer artifact. Core migration is deferred to EXP-ENV-012 per program sequencing.
- Expedition accepted via PR #62.
