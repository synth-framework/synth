# EXP-ENV-005 — Filesystem Capability

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

Abstract filesystem interaction so SYNTH does not depend directly on OS filesystem semantics.

---

## Motivation

File paths, permissions, and syscalls are environmental. The Core should interact with files through a capability interface.

---

## Deliverables

1. **Filesystem capability interface**
2. **POSIX provider**
3. **Path abstraction**

---

## Acceptance

SYNTH can read, write, list, and observe files through the capability interface without direct filesystem calls in the Core.

---

## Definition of Done

- [x] Filesystem capability interface defined.
- [x] POSIX provider implemented.
- [x] Path abstraction documented.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- Drafted and approved **ADR-010 — Filesystem Capability**.
- Added ADR-010 to `docs/adr/README.md` and `docs/architecture/constitutional-baseline.md`.
- Implemented `src/environment/filesystem-capability.ts`:
  - `FilesystemProvider` interface: readFile, writeFile, listDirectory, pathExists, isDirectory, ensureDirectory, deleteFile.
  - `PosixFilesystemProvider` reference implementation using Node.js `fs/promises`.
  - `InMemoryFilesystemProvider` for deterministic testing.
- Added regression tests in `tests/environment-filesystem-capability.test.js` covering:
  - Read/write operations
  - Directory listing
  - Existence and directory checks
  - Directory creation
  - File deletion
  - Both in-memory and POSIX providers
- Added `test:environment-filesystem` npm script and included it in `test:all`.
- Updated `docs/expeditions/EXP-ENV-005.md` to Completed.
- Verified TypeScript compilation and unit tests.
- Expedition accepted via PR #59.
