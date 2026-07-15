# ADR-017 — Constitutional Compliance & Core Boundary Enforcement

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 §7 established the Core Boundary Rule: no component in `src/core`, `src/runtime`, `src/control`, `src/domain`, `src/mission-studio`, `src/genesis`, or `src/planning` may directly import environment-specific modules, and named EXP-ENV-012 as the expedition that enforces it. ADR-010 through ADR-016 delivered every capability interface needed for the Core to be environment-independent.

A compliance inventory found exactly one violation in the named Core directories: `src/mission-studio/snapshot-store.ts` imported `fs/promises` and `path` directly. All remaining `crypto` imports in Core directories are pure computation (hashing, HMAC), not environment interaction. Everything else (`src/infra`, `src/cli`, `src/adapters`, `src/workspace`, `src/documentation`) lies outside the named Core directories and interacts with the environment by design.

`src/mission-studio` is a Protected Asset (ADR-004): it shall not be modified *without an approved Architecture Expedition*. EXP-ENV-012 is that approved expedition, and this ADR documents the modification.

## Decision

### 1. Core Boundary Audit

A static audit (`scripts/audit-core-boundary.js`) scans the seven directories named in ADR-006 §7 and rejects any direct import of environment modules:

```text
fs, fs/promises, child_process, os, path,
net, http, https, process,
worker_threads, cluster, dgram, dns, tls
(including their node:-prefixed forms, import/export/require)
```

`crypto` is **not** forbidden: it is deterministic pure computation with no interaction with the operating system, filesystem, network, or process environment. Forbidding it would provide no independence value.

The audit is wired into `test:all` and therefore into `npm run govern` and the Proof Gate. A violation fails governance permanently, not just on the day this ADR lands.

### 2. Snapshot Store Migration

`FileSystemSnapshotStore` in `src/mission-studio/snapshot-store.ts` is migrated behind the `FilesystemProvider` capability (ADR-010). The class keeps its constructor signature `(dir, provider?)`; by default it builds a `PosixFilesystemProvider` rooted at `dir`. All persistence operations (`save`, `get`, `list`, existence checks) flow through the capability interface.

**Behavior is unchanged:** the immutability invariant (`INVARIANT_VIOLATION` on overwrite), absent-snapshot semantics (`undefined`), lineage filtering and ordering, and Map serialization all operate exactly as before. The modification replaces *how* bytes reach the filesystem, not *what* the store guarantees. This is a migration within the Allowed column of ADR-004, performed under the approved EXP-ENV-012 Architecture Expedition.

### 3. Out-of-Core Layers Unchanged

`src/infra`, `src/cli`, `src/adapters`, `src/workspace`, and `src/documentation` are not named in ADR-006 §7. They are the environment-facing layers the Core delegates to. Their direct environment access is by design and is not a violation. Future expeditions may migrate individual components behind capability providers (e.g. `src/infra` consuming Environment Layer providers, per ADR-006), but that is an optimization, not a compliance requirement.

### 4. Core Boundary Rule

Unchanged from ADR-006 §7 — now mechanically enforced. No component in the seven named Core directories may import environment-specific modules directly. All environment interaction flows through the Environment Layer.

## Consequences

- **Easier:** The Core Boundary Rule is now enforced by governance, not by convention.
- **Easier:** Mission Studio persistence can run on any `FilesystemProvider`, including in-memory providers for tests.
- **Easier:** The compliance inventory is repeatable — the audit reports the complete violation list on every run.
- **Harder:** New environment-facing needs inside the Core must add a capability (or use an existing one) instead of a quick direct import — which is precisely the intent.

## Proof Impact

- **P1 Structural:** Strengthened — the Core boundary is mechanically verified on every proof run.
- **P2 Behavioral:** Unchanged — the snapshot store's guarantees are preserved.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Strengthened — a whole class of environment-coupling regressions is now blocked at the gate.
- **P5 Reproducibility:** Unchanged.

## Kernel Impact

No frozen kernel components are modified behaviorally. The `FileSystemSnapshotStore` modification is an internal implementation migration under an approved Architecture Expedition; its public contract and guarantees are unchanged. Replay, ExecutionGate, the Event Model, the Capability Model, and the Constitutional Baseline are untouched.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-004-synth-eras-and-protected-assets.md`
- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-010-filesystem-capability.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-012.md`
