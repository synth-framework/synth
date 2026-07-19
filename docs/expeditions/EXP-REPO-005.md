# EXP-REPO-005 — Forge Adapter Contract

> **Architecture expedition.** Define a common interface for GitHub, GitLab, Bitbucket, Azure DevOps, Forgejo, and future forges.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-REPO-001  
**Blocks:** EXP-REPO-006

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Abstract forge interactions so SYNTH remains portable across hosting platforms.

---

## Deliverables

- `ForgeAdapter` interface in `src/repository/forge-adapter.ts`.
- Registry and factory pattern for adapter registration.
- Skeleton `GitHubAdapter` in `src/repository/adapters/github-adapter.ts`.
- ADR-038 documenting the Repository Governance Model and forge abstraction.

---

## Acceptance Criteria

- [x] Adapter interface covers PR open/update/close/merge, release creation, checks, comments, and reviews.
- [x] GitHub adapter skeleton implements the contract and is auto-registered on import.
- [x] Consumers can list registered forge providers and create adapters by name.

---

## Evidence

- `tests/synth-cli-repo.test.js` verifies `synth repo init` rejects unknown forge providers and accepts GitHub.
