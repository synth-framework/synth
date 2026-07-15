# EXP-ENV-001 — Environment Discovery Framework

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-PROGRAM-007  
**Blocks:** EXP-ENV-002, EXP-ENV-003, EXP-ENV-004, EXP-ENV-005, EXP-ENV-006, EXP-ENV-007, EXP-ENV-008, EXP-ENV-009, EXP-ENV-010, EXP-ENV-011, EXP-ENV-012

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

Establish autonomous environment discovery as the first step of every SYNTH execution.

---

## Motivation

Before SYNTH can execute a Mission, it must understand the environment in which it operates. Today this knowledge is implicit and hardcoded. This expedition makes discovery explicit, autonomous, and evidence-producing.

---

## Deliverables

1. **Discovery orchestrator**
   - Runs before execution planning.
   - Produces a canonical environment description.

2. **Discovery rules**
   - What to observe.
   - How to observe without mutation.

3. **Evidence artifact**
   - Machine-readable discovery record.

---

## Acceptance

SYNTH can discover a fresh environment and produce a replayable evidence artifact without human configuration.

---

## Definition of Done

- [x] Discovery orchestrator defined.
- [x] Discovery rules documented.
- [x] Evidence artifact schema defined.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- Drafted and approved **ADR-006 — Environment Discovery Framework**.
- Added ADR-006 to `docs/adr/README.md` and `docs/architecture/constitutional-baseline.md`.
- Implemented the Environment Layer under `src/environment/`:
  - `src/environment/types.ts` — environment-agnostic types for capability families, discovery rules, observations, providers, and the `DiscoveryEvidence` artifact.
  - `src/environment/rules.ts` — built-in discovery rules for Environment, Workspace, Filesystem, Revision, Package, Runtime, Process, Tool, and Forge families.
  - `src/environment/orchestrator.ts` — `DiscoveryOrchestrator` that runs rules, resolves providers, and produces a canonical evidence artifact.
  - `src/environment/node-context.ts` — Node.js-backed `ObservationContext`; the only environment-specific module in the layer.
  - `src/environment/providers/reference.ts` — reference capability providers bridging existing adapters to the Environment Layer.
  - `src/environment/index.ts` — public exports.
- Added regression tests in `tests/environment-discovery.test.js` covering:
  - Orchestrator API
  - Default rule coverage
  - Evidence artifact shape
  - Workspace classification
  - Revision detection
  - Package manager detection
  - Provider resolution and overrides
  - Rule error handling
  - Compatibility decisions
  - Node observation context
- Added `test:environment-discovery` npm script and included it in `test:all`.
- Verified TypeScript compilation with `npm run build`.
- Verified tests pass with `node tests/environment-discovery.test.js`.
- Expedition accepted via PR #53.
