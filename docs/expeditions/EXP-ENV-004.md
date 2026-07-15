# EXP-ENV-004 — Revision Capability

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

Abstract revision system interaction so SYNTH is not coupled to Git.

---

## Motivation

Revision systems are environmental. The Core should reason about revisions as capabilities, not as Git commands.

---

## Deliverables

1. **Revision capability interface**
2. **Git provider**
3. **Revision discovery rules**

---

## Acceptance

SYNTH can create, inspect, and traverse revisions through the capability interface. The Core contains no direct Git commands.

---

## Definition of Done

- [x] Revision capability interface defined.
- [x] Git provider implemented.
- [x] Discovery rules documented.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- Drafted and approved **ADR-009 — Revision Capability**.
- Added ADR-009 to `docs/adr/README.md` and `docs/architecture/constitutional-baseline.md`.
- Implemented `src/environment/revision-capability.ts`:
  - `RevisionProvider` interface: discover, isRepository, getCurrentBranch, getCommitHash, getRemotes, getStatus.
  - `GitRevisionProvider` reference implementation.
  - Revision descriptor, remote, and status types.
- Added regression tests in `tests/environment-revision-capability.test.js` covering:
  - Provider metadata
  - Repository detection
  - Branch and commit hash retrieval
  - Remote parsing from `.git/config`
  - Working tree status (clean, modified, untracked, ahead/behind)
  - Full discovery descriptor
- Added `test:environment-revision` npm script and included it in `test:all`.
- Updated `docs/expeditions/EXP-ENV-004.md` to Completed.
- Verified TypeScript compilation and unit tests.
- Expedition accepted via PR #58.
