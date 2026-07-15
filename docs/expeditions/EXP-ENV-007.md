# EXP-ENV-007 — Runtime & Package Capability

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

Abstract runtime and package management so SYNTH does not depend directly on Node.js or npm.

---

## Motivation

Runtimes and package managers are environmental. The Core should request package operations and runtime inspection through capabilities.

---

## Deliverables

1. **Runtime capability interface**
2. **Package capability interface**
3. **Node.js / npm provider**

---

## Acceptance

SYNTH can inspect available runtimes and resolve packages through the capability interface without Node.js-specific logic in the Core.

---

## Definition of Done

- [x] Runtime capability interface defined.
- [x] Package capability interface defined.
- [x] Node.js / npm provider implemented.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- **ADR:** [ADR-012 — Runtime & Package Capability](../adr/ADR-012-runtime-package-capability.md) (Accepted).
- **Implementation:** `src/environment/runtime-capability.ts` defines `RuntimeProvider` and `PackageProvider` interfaces with `RuntimeInfo`/`PackageRequest`/`PackageInfo` data types, plus the `NodeRuntimeProvider` and `NpmPackageProvider` reference implementations. Both providers compose the `ToolProvider` capability from ADR-011 — no direct `child_process` usage. Exported via `src/environment/index.ts`.
- **Test coverage:** `tests/environment-runtime-capability.test.js` — 9 tests covering real `node`/`npm` detection, missing runtimes, version-query failure fallback, install/uninstall command construction via scripted ToolProvider, and `npm ls --json` parsing (including malformed output).
- **npm script:** `test:environment-runtime`, included in `test:all`.
- Core runtime/package call sites are unchanged; migration behind the capability is deferred to EXP-ENV-012 per program sequencing.
- Expedition accepted via PR #61.
