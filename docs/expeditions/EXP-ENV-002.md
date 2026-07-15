# EXP-ENV-002 — Capability Graph Model

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-001  
**Blocks:** EXP-ENV-003, EXP-ENV-004, EXP-ENV-005, EXP-ENV-006, EXP-ENV-007, EXP-ENV-008, EXP-ENV-009

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

Define the canonical model through which SYNTH represents capabilities and their providers.

---

## Motivation

Capabilities describe what an environment can do. Implementations describe how. A canonical graph model lets SYNTH reason about capabilities independently of providers.

---

## Deliverables

1. **Capability node schema**
2. **Provider edge schema**
3. **Resolution algorithm**
4. **Graph serialization format**

---

## Acceptance

SYNTH can build a capability graph from a discovery artifact and resolve a provider for any requested capability.

---

## Definition of Done

- [x] Capability schema defined.
- [x] Provider schema defined.
- [x] Resolution algorithm documented.
- [x] Tests verify graph construction and resolution.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- Drafted and approved **ADR-007 — Capability Graph Model**.
- Added ADR-007 to `docs/adr/README.md` and `docs/architecture/constitutional-baseline.md`.
- Extended `src/environment/types.ts` with graph types:
  - `CapabilityNode`, `ProviderNode`, `CapabilityGraphEdge`
  - `CapabilityGraph`, `ProviderPath`, `ResolutionResult`
- Implemented `src/environment/graph.ts`:
  - `CAPABILITY_CATALOG` with all 12 constitutional capability families.
  - `CAPABILITY_DEPENDENCIES` expressing known capability requirements.
  - `CapabilityGraphBuilder` for constructing graphs from discovery evidence.
  - `CapabilityResolver` for deterministic provider selection with transitive dependency resolution.
  - Canonical graph serialization with schema `synth-capability-graph-v1`.
- Added regression tests in `tests/environment-capability-graph.test.js` covering:
  - Catalog completeness
  - Graph construction
  - Provider selection and priority
  - Transitive dependency resolution
  - Circular dependency detection
  - Serialization shape
  - Canonical sorting
  - Multi-capability provider aggregation
- Added `test:environment-capability-graph` npm script and included it in `test:all`.
- Verified TypeScript compilation and test suite.
- Expedition accepted via PR #56.
