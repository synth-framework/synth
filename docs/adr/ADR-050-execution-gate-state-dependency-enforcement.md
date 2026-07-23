# ADR-050 — Execution Gate State Dependency Enforcement (Freeze Lift)

**Status:** Proposed  
**Date:** 2026-07-22  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, Governance, Expedition Owners

---

## Context

EXP-PROGRAM-035 (Intent Refinement & Review Governance) established three gate types (Refinement, Review, Acceptance) and the stop condition that *"no dependent expedition may begin while an upstream expedition is awaiting any gate decision."* This condition is currently documented but not enforced at runtime — it relies on operator discipline and manual charter review.

EXP-GOVERNABILITY-005's convergence certification revealed three concrete gaps:

1. **No dependency graph enforcement** — Expedition `Depends On` / `Blocks` headers are documentary only. Nothing prevents a downstream expedition from beginning while upstream gates are unresolved.
2. **No status propagation** — A `partial_pass` certification result lives only in a JSON file. It does not block dependent expeditions.
3. **No gate-state-aware blocking** — The execution engine does not check upstream gate state before permitting capability execution.

Closing these gaps requires extending the execution path to check dependency state before allowing capability invocation. This touches the deterministic execution contract, which is frozen under ADR-040 (Era III — Validation & Hardening) and ADR-004.

However, the mechanism exists within the frozen architecture: the **Policy Engine** (part of the bootstrap layer, `src/policy/policy-engine.ts`) supports `DENY` and `REQUIRE_VERIFICATION` effects evaluated in Phase 2 of `ExecutionGate.execute()`. Adding a dependency enforcement policy does **not** modify the `ExecutionGate.execute()` public API, the event schema, replay semantics, or any kernel interface listed in `docs/kernel-freeze.md`.

The need was established before the freeze by EXP-PROGRAM-035 (chartered pre-freeze). The implementation is additive — it uses existing extensibility points. Nevertheless, because Era III freezes the *deterministic execution contract*, a documented ADR is warranted to acknowledge the scope and certify re-freeze.

## Decision

**Lift the freeze on the deterministic execution contract for the specific purpose of adding dependency-aware execution enforcement.**

The lift is limited to:

1. **DependencyRecord type and parser** — New data structures derived from expedition charter `Depends On` / `Blocks` headers. Pure additive: no existing types change.
2. **Status propagation logic** — When a certification result is recorded (pass, partial_pass, fail), propagate gate state to downstream dependents. Pure additive: no existing event handlers change.
3. **Gate-state check** — Implemented as a Policy Engine policy (`DependencyEnforcementPolicy`) that returns `DENY` when a capability invocation originates from an expedition with unresolved upstream dependencies. Evaluated in Phase 2 of the existing `ExecutionGate.execute()` contract — no change to the gate method signature.

### What is NOT changed

- `ExecutionGate.execute()` signature — unchanged.
- `ExecutionGate.executeGenesis()` signature — unchanged.
- `SynthEvent` schema — no new required or optional fields.
- Replay semantics — `rebuildState()` fold is unchanged.
- State hash algorithm — unchanged.
- Proof schema — unchanged (`synth-proof-v1`).
- Mutation authorities — unchanged. Only ExecutionGate appends to EventStore.
- Capability registry freeze — unchanged. No new capabilities registered post-seal.
- Policy engine freeze — unchanged. Policy is registered before `seal()`.
- Adapter lifecycle — unchanged.
- Event model semantics — unchanged.
- Public vocabulary — unchanged.

### Re-freeze certification

Once EXP-GATE-013 is complete and its acceptance criteria are verified:

1. Run `npm run govern` to produce a new proof artifact.
2. Verify P1–P5 proof classes pass.
3. Update `docs/kernel-freeze.md` if any kernel component was affected (none anticipated — the policy mechanism is already listed as "Mutable Interfaces" via audit gates).
4. This ADR is marked as `Accepted` with a re-freeze certification note.
5. No further freeze lifts are permitted under this ADR — any future extension to the execution contract requires a new ADR.

## Consequences

### Easier

- Dependency chains become machine-enforceable rather than documentary.
- The `partial_pass` → `fail` → `pass` progression is tracked as a runtime state transition.
- Downstream expeditions cannot accidentally execute while upstream is unresolved.
- Program 027 can resume with confidence that its dependency chain is enforced.
- The pattern is general and applicable to any future certification expedition.

### Harder

- Operators cannot bypass dependency enforcement without explicitly resolving the upstream gate.
- Existing expedition charters with stale dependencies will surface as blocked states.
- The policy engine now carries a stateful enforcement concern (requires dependency state to be resolvable during policy evaluation).

## Proof Impact

| Proof Class | Impact | Verification |
|---|---|---|
| **P1 Structural** | None. No new mutation authority. Policy engine already enforces the mutation invariant. | Existing `test:audit` passes. |
| **P2 Behavioral** | None. Determinism is preserved — same state + same invocation → same dependency decision. | Existing `test:replay` and `test:determinism` pass. |
| **P3 Historical** | None. Existing events are unchanged; replay is backward-compatible. | Existing replay compatibility tests pass. |
| **P4 Adversarial** | Strengthened. Additional enforcement layer prevents out-of-order execution. | New adversarial scenarios for dependency bypass. |
| **P5 Reproducibility** | None. Dependency graph is derived from documentary sources (charter headers) — deterministic. | Existing build + proof pipeline unchanged. |

## Kernel Impact

No kernel component listed in `docs/kernel-freeze.md` is modified:

- **ExecutionGate**: Public API unchanged. The dependency check operates within the existing Phase 2 (Policy Check) mechanism.
- **Event schema**: Unchanged.
- **Replay semantics**: Unchanged.
- **Proof schema**: Unchanged.
- **Mutation authorities**: Unchanged.
- **Adapter lifecycle**: Unchanged.

The policy engine is listed as part of the "Frozen Kernel Components" in the constitutional baseline (as `policyEngine.freeze()` prevents runtime rule changes). The dependency policy is registered **before** `seal()` is called, so the freeze invariant is preserved.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

Once EXP-GATE-013 is complete and the re-freeze is certified, this ADR's status is updated to `Accepted` and the constitutional baseline freeze declaration is reaffirmed.

## Related

- `docs/expeditions/EXP-GATE-013.md` — Gate State & Dependency Enforcement (implements this ADR)
- `docs/expeditions/EXP-PROGRAM-035.md` — Intent Refinement & Review Governance (parent program)
- `docs/adr/ADR-004-synth-eras-and-protected-assets.md` — Frozen assets definition
- `docs/adr/ADR-040-era-iii-validation-and-hardening.md` — Era III freeze charter
- `docs/kernel-freeze.md` — Kernel component freeze list
- `docs/architecture/constitutional-baseline.md` — Constitutional freeze declaration
- `src/policy/policy-engine.ts` — Policy engine (enforcement mechanism)
- `src/core/bootstrap.ts` — Bootstrap ordering (policy registration window)
