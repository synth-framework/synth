# EXP-ENV-003 — Workspace Capability

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

Abstract workspace interaction so SYNTH never depends directly on filesystem layout or working directory semantics.

---

## Motivation

The workspace is an environmental concept. SYNTH should interact with it through a capability interface rather than direct path manipulation.

---

## Deliverables

1. **Workspace capability interface**
2. **Default filesystem provider**
3. **Workspace discovery rules**

---

## Acceptance

SYNTH can locate, inspect, and prepare a workspace through the capability interface without direct filesystem calls in the Core.

---

## Definition of Done

- [x] Workspace capability interface defined.
- [x] Filesystem provider implemented.
- [x] Discovery rules documented.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- Drafted and approved **ADR-008 — Workspace Capability**.
- Added ADR-008 to `docs/adr/README.md` and `docs/architecture/constitutional-baseline.md`.
- Implemented `src/environment/workspace-capability.ts`:
  - `WorkspaceProvider` interface: discover, locateRoot, listProjects, readManifest, prepare.
  - `FilesystemWorkspaceProvider` default implementation.
  - Workspace descriptor, manifest, and prepared result types.
- Updated `src/environment/node-context.ts` to resolve absolute paths correctly, enabling workspace providers to operate on roots outside `process.cwd()`.
- Added regression tests in `tests/environment-workspace-capability.test.js` covering:
  - Provider metadata
  - Root location by SYNTH manifest and package.json
  - Upward root search
  - Manifest reading
  - Project listing
  - Workspace discovery
  - Workspace preparation
- Added `test:environment-workspace` npm script and included it in `test:all`.
- Updated `docs/expeditions/EXP-ENV-003.md` to Completed.
- Verified TypeScript compilation and test suite.
- Expedition accepted via PR #57.
