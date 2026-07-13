# Synth v2 Architectural Audit Report

**Audit ID:** AUDIT-2026-06-29  
**Auditor:** Kimi Code CLI  
**Date:** 2026-06-29  
**Blueprint:** `docs/synth-audit-blueprint.md`  
**Scope:** Full architectural verification of the Synth v2 repository against the Architectural Constitution, Agent Constitution, Ubiquitous Language, AWS-001, SKR-001, and Knowledge Evolution documents.

---

## Executive Summary

The repository contains **two parallel implementations**:

1. **`dist/synth-v5.js`** — a standalone monolithic kernel that is actually executed by `npm start` and `npm test`. It substantially enforces the Synth architecture, including the single mutation authority, event sourcing, policy governance, cryptographic attestation, replay verification, and the AWS-001 workspace orientation pipeline.

2. **`src/`** — a 50-file modular TypeScript codebase representing the intended architecture. It is **not built, not run, and not type-checked**. It fails to enforce the single mutation authority, uses a deprecated domain model, violates the ubiquitous language, and lacks the workspace implementation.

The existing verification scripts (`npm run test:all`) execute against `dist/synth-v5.js` and pass. However, the static bypass-audit script is configured to exempt the very files in `src/` that contain violations, so it reports a false clean. The modular source is therefore architecturally compromised without any automated detection.

**Overall Assessment: FAIL** — Critical architectural invariants are violated in the modular source, and the audit infrastructure itself is weakened by exemptions that hide violations.

---

## Architecture Score

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Constitution compliance | **FAIL** | `src/runtime/executor.ts:71` writes to `EventStore` outside `CommandBus`; `src/genesis/intake.ts` writes directly; `src/core/bootstrap.ts` claims genesis goes through gate but does not. |
| Runtime integrity | **WARN** | `dist/synth-v5.js` runtime integrity is good; `src/` runtime integrity is broken. Tests run against `dist/`. |
| Domain integrity | **FAIL** | `src/` uses deprecated `Ticket` domain (`src/domain/ticket.ts`, `src/capability/registry.ts`). `dist/` correctly uses `WorkItem` per EXP-TERM-001. |
| Infrastructure integrity | **WARN** | `dist/` has guarded EventStore with `GUARD_PASS`; `src/` has an unused guard file and returns an unguarded `EventStore` from `createInfra`. |
| Maintainability | **FAIL** | Two divergent implementations; modular source is dead code with import bugs and no build pipeline. |
| Risk level | **HIGH** | Any future attempt to switch to the modular source would silently reintroduce direct mutation paths and deprecated terminology. |

---

## Findings

### AUDIT-2026-06-29-C1: Single Mutation Authority Violated in Modular Runtime

**Severity:** Critical  
**Invariant:** SMA-001 (Architectural Constitution Provision 1–3)  
**Description:** The modular runtime executor persists events directly to the `EventStore`, bypassing `CommandBus` / `ExecutionGate`.

**Evidence:**
- `src/runtime/executor.ts:71` — `await ctx.eventStore.appendBatch(events)` inside `execute()`.
- `src/runtime/engine.ts:10–12` — comments explicitly list "Persist events to the event store" as a runtime responsibility.
- `src/control/execution-gate.ts:104` — gate calls `this.runtime.execute(invocation)` and assumes persistence is complete, but the runtime itself performs the write.

**Impact:** The `ExecutionGate` is not the single mutation authority. A caller with access to `RuntimeEngine` can mutate state without policy validation, permit signing, or queue ordering.

**Root Cause:** The modular source conflates "execution" with "persistence." The runtime was given an `EventStore` dependency and told to write events, rather than returning events to the authority layer.

**Recommendation:** Remove `EventStore` from `RuntimeEngine` and `executor`. The runtime should return `{ output, events }`. Only `CommandBus` / `ExecutionGate` may call `eventStore.appendBatch()`.

**Verification Steps:**
1. Remove `.append`/`.appendBatch` from `src/runtime/executor.ts`.
2. Ensure `src/core/command-bus.ts` (or `src/control/execution-gate.ts`) is the only file that calls `eventStore.appendBatch()`.
3. Re-run `scripts/audit-bypass-map.js` with `executor.ts` removed from `EXEMPT_FILES` and confirm exit 0.

---

### AUDIT-2026-06-29-C2: Genesis Bypasses the Execution Gate in Modular Source

**Severity:** Critical  
**Invariant:** SMA-001; bootstrap flow documented in `src/core/command-bus.ts:14` and `src/control/execution-gate.ts:13`.

**Description:** Genesis writes seed events directly to `EventStore` despite documentation stating "Genesis → ExecutionGate → Runtime → EventStore."

**Evidence:**
- `src/genesis/intake.ts:65`, `:92`, `:117`, `:143`, `:159` — direct `await this.eventStore.append(event)` calls.
- `src/core/bootstrap.ts:108–114` — comment says "GENESIS (through the gate — no backdoor mutation)" but passes `infra.eventStore` (unguarded) to `GenesisIntake` and calls `genesis.initialize()` directly.
- `src/control/execution-gate.ts:177–211` — `executeGenesis()` exists but is never invoked by bootstrap.

**Impact:** The first events in the canonical log are written outside the single authority path, undermining the architectural proof for all subsequent state.

**Root Cause:** Bootstrap optimization prioritized convenience over invariant enforcement. Genesis was treated as a special case rather than routed through the gate.

**Recommendation:** Route all genesis seed events through `ExecutionGate.executeGenesis()` or `CommandBus.dispatch()`. If a raw store is required for bootstrap, it must be explicitly quarantined and never exposed after seal, as done in `dist/synth-v5.js`.

**Verification Steps:**
1. Verify `GenesisIntake` receives only a configuration, not an `EventStore`.
2. Verify every seed event is dispatched via the gate.
3. Verify no `eventStore.append` remains in `src/genesis/intake.ts`.

---

### AUDIT-2026-06-29-C3: EventStore Guard Is Dead Code in Modular Source

**Severity:** Critical  
**Invariant:** SMA-001; SYNTH-LOCK-1 (`src/core/command-bus.ts`, `src/infra/event-store.guard.ts`).

**Description:** A guard implementation exists but is never applied, so no runtime enforcement prevents direct EventStore writes.

**Evidence:**
- `src/infra/event-store.guard.ts` — full guard implementation, but only self-referenced.
- `src/infra/index.ts:39` — `const eventStore = new EventStore(...)`; no wrapping.
- `grep -R 'createGuardedEventStore' src/` returns only `src/infra/event-store.guard.ts` itself.
- `grep -R 'GUARD_PASS\|IllegalMutationError' src/` returns only definitions, no usage.

**Impact:** The single mutation authority is purely conventional in `src/`; any module with an `EventStore` reference can write directly.

**Root Cause:** The guard was written but never integrated into `createInfra()` or `bootstrap()`.

**Recommendation:**
1. Make `createInfra()` return `{ rawEventStore, eventStore: createGuardedEventStore(rawEventStore) }`.
2. Pass `rawEventStore` only to genesis (bootstrap-only) and `eventStore` to runtime and `CommandBus`.
3. Activate/deactivate the guard pass exclusively inside `CommandBus.dispatch()`.

**Verification Steps:**
1. Attempt a direct `eventStore.append()` from a test and confirm it throws `IllegalMutationError`.
2. Confirm `CommandBus.dispatch()` still succeeds.

---

### AUDIT-2026-06-29-C4: Capability and Policy Registries Are Not Frozen in Modular Source

**Severity:** Critical  
**Invariant:** I5 (Trust Boundary Document); Provision 29 (Architectural Constitution); Agent Constitution Article X.

**Description:** The modular `Registry` and `PolicyEngine` lack freeze mechanisms, allowing post-bootstrap mutation of capabilities and policies.

**Evidence:**
- `src/capability/registry.ts:13–46` — `register()` has no `_frozen` check; no `freeze()` method.
- `src/policy/policy-engine.ts:52–63` — exposes `unregister()`; no `freeze()` method.
- `dist/synth-v5.js:2024–2046` and `:1663+` — both registries freeze after seal; `src/` has no equivalent.

**Impact:** Operational mode cannot be sealed. Capabilities and policies can change at runtime, violating the capability-control and governance invariants.

**Root Cause:** The seal/freeze transition is documented in architecture but omitted from the modular implementation.

**Recommendation:**
1. Add `_frozen` flag and `freeze()` to `Registry` and `PolicyEngine`.
2. Have bootstrap call `registry.freeze()` and `policyEngine.freeze()` before entering operational mode.
3. Throw `InvariantViolation` on post-freeze `register()`/`unregister()`.

**Verification Steps:**
1. Attempt `registry.register({ name: "EvilCap" })` after seal and confirm it throws.
2. Attempt `policyEngine.unregister("...")` after seal and confirm it throws.

---

### AUDIT-2026-06-29-M1: Modular Source Uses Deprecated "Ticket" Terminology

**Severity:** Major  
**Invariant:** Ubiquitous Language; EXP-TERM-001 (`docs/reference/term-inventory.md`); KI-008 (SKR-001).

**Description:** The entire modular source uses "Ticket" instead of the canonical "WorkItem," despite the running kernel having completed the migration.

**Evidence:**
- `src/domain/ticket.ts:10` — `export function createTicket(...)`.
- `src/capability/registry.ts:51` — `name: "CreateTicket"`, `description: "Create a new ticket"`.
- `src/types/state.ts:62` — `tickets: Record<string, Ticket>`.
- `src/types/event.ts:33–35` — `TICKET_STARTED`, `TICKET_COMPLETED`, `TICKET_BLOCKED`.
- `src/main.ts:70, 77, 84, 91, 115, 124` — dispatches `StartTicket`, `CompleteTicket`, `CreateTicket`.
- `docs/reference/term-inventory.md` documents EXP-TERM-001 as "Complete" for `dist/synth-v5.js`; no equivalent migration was applied to `src/`.

**Impact:** The modular source contradicts the ubiquitous language, the TERM-INVENTORY migration report, and the running system. Re-activating `src/` would regress the terminology standard.

**Root Cause:** EXP-TERM-001 was executed only on the monolithic kernel, not the modular source.

**Recommendation:** Apply EXP-TERM-001 to `src/`:
1. Rename `src/domain/ticket.ts` → `src/domain/work-item.ts`; functions to `createWorkItem`, etc.
2. Update `src/types/state.ts`, `src/types/event.ts`, `src/runtime/replay.ts`.
3. Update `src/capability/registry.ts` to register `CreateWorkItem`, etc.
4. Update `src/main.ts` and tests.

**Verification Steps:**
1. `grep -R "Ticket\|ticket" src/` returns only historical comments and migration docs.
2. CanonicalLanguageAuditor scans `src/` and reports zero forbidden terminology.

---

### AUDIT-2026-06-29-M2: Audit Bypass Script Is Configured to Ignore Violations

**Severity:** Major  
**Invariant:** SYNTH AUDIT BLUEPRINT Phase 5 (evidence standard); Phase 4 (attempt to break architecture).

**Description:** `scripts/audit-bypass-map.js` exempts the files that contain direct mutation paths, allowing it to report a clean scan while violations exist.

**Evidence:**
- `scripts/audit-bypass-map.js:50` — `executor.ts` exempted with reason "Superseded by CommandBus" (it is not superseded in `src/`).
- `scripts/audit-bypass-map.js:55` — `intake.ts` exempted with reason "Genesis: pre-bus raw store bootstrap" (the modular genesis does not use a raw store).
- `scripts/audit-bypass-map.js:45` — `bootstrap.ts` exempted.

**Impact:** The static audit cannot detect the most serious mutation bypasses in the modular source. It gives a false sense of architectural integrity.

**Root Cause:** The exemptions were copied from the dist architecture without verifying the modular source's actual behavior.

**Recommendation:**
1. Remove `executor.ts`, `intake.ts`, and `bootstrap.ts` from `EXEMPT_FILES`.
2. Fix the underlying violations in those files.
3. Keep exemptions only for genuinely legitimate paths (e.g., `command-bus.ts`, `event-store.guard.ts`).

**Verification Steps:**
1. Run `node scripts/audit-bypass-map.js` after removing exemptions and confirm it reports violations until they are fixed.
2. After fixes, confirm exit 0.

---

### AUDIT-2026-06-29-M3: Modular Source Is Disconnected from the Running System

**Severity:** Major  
**Invariant:** Knowledge Evolution (architecture may not drift); AWS-001 (workspace is deterministic entry point).

**Description:** `src/` is not compiled, not executed, and has no build pipeline. The system runs from `dist/synth-v5.js`, a separate monolithic artifact.

**Evidence:**
- `package.json` has no `build` script; `npm start` runs `dist/main.js`.
- `dist/main.js` imports from `./synth-v5.js`, not from compiled `src/`.
- `node_modules` is missing; TypeScript is not installed.
- `src/main.ts:145` — uses `buildTypedIR` without importing it, so it would not compile.
- `tests/synth.test.js` imports `dist/synth-v5.js`.

**Impact:** The modular architecture is purely documentation. Any architectural guarantees in `src/` are untested and unverified. The two implementations have diverged.

**Root Cause:** Development shifted to the monolithic kernel for expediency, leaving the modular source stale.

**Recommendation:**
1. Decide on a single source of truth: either restore the build pipeline for `src/` or delete/consolidate the dead code.
2. If `src/` is kept, add a `build` script, fix `src/main.ts`, and make tests import from `dist/` compiled output.
3. Run `npm install` so TypeScript is available.

**Verification Steps:**
1. `npm run build` produces `dist/` from `src/`.
2. `npm start` uses the compiled `dist/main.js`.
3. `npm test` passes against the compiled output.

---

### AUDIT-2026-06-29-M4: Workspace Orientation Pipeline Not Implemented in Modular Source

**Severity:** Major  
**Invariant:** AWS-001 (Agent Workspace Specification); KI-008.

**Description:** The AWS-001 8-phase orientation pipeline and `.synth/` descriptor generation exist only in `dist/synth-v5.js`, not in `src/`.

**Evidence:**
- `grep -R 'WorkspaceCognitionEnvironment\|writeDescriptors\|getIdentity\|getEnvironment' src/` returns nothing.
- `.synth/` directory and its JSON files are generated by `dist/synth-v5.js` at runtime.
- `src/core/bootstrap.ts` returns no `workspace` field.

**Impact:** The modular source cannot perform deterministic orientation, which AWS-001 mandates as the entry point for every engineering session.

**Root Cause:** The workspace was implemented only in the monolithic kernel.

**Recommendation:** Port `WorkspaceCognitionEnvironment`, `CanonicalLanguageAuditor`, `SemanticVerifier`, and `RepositoryHealth` from `dist/synth-v5.js` into modular `src/` modules, or generate them from a shared source.

**Verification Steps:**
1. `src/core/bootstrap.ts` returns a `workspace` object.
2. `.synth/workspace.json`, `health.json`, `language.json`, etc. are generated deterministically.

---

### AUDIT-2026-06-29-M5: Health Check Is Superficial

**Severity:** Major  
**Invariant:** AWS-001 Phase 6; SYNTH AUDIT BLUEPRINT Phase 5 (evidence standard).

**Description:** The `RepositoryHealth` check reports architectural health as "pass" based on file existence, not on actual invariant enforcement.

**Evidence:**
- `.synth/health.json` reports all checks as pass, including "Kernel source present" and "No forbidden imports".
- The health check does not verify that the kernel source enforces single mutation authority, frozen registry, or correct terminology.
- The modular source violates all of these, yet health reports pass.

**Impact:** Operators and agents are given a false "ready" status for a system whose source does not enforce its own architecture.

**Root Cause:** Health checks were implemented as filesystem presence checks rather than architectural invariant checks.

**Recommendation:** Add invariant-based health checks:
1. Scan `src/` for direct `EventStore` writes.
2. Verify `Registry`/`PolicyEngine` freeze capability exists and is called.
3. Run `CanonicalLanguageAuditor` against `src/` and surface violations as WARN/FAIL.

**Verification Steps:**
1. Introduce a deliberate terminology violation in `src/` and confirm health reports it.
2. Confirm health fails if `src/runtime/executor.ts` directly writes to EventStore.

---

### AUDIT-2026-06-29-m1: `src/main.ts` References Undefined `buildTypedIR`

**Severity:** Minor  
**Invariant:** Maintainability; build integrity.

**Description:** `src/main.ts` calls `buildTypedIR(caps)` on line 145 without importing it.

**Evidence:**
- `src/main.ts:145` — `const ir = buildTypedIR(caps)`.
- `grep -n 'import.*buildTypedIR' src/main.ts` returns nothing.
- `src/compiler/type-checker.ts:220` exports `buildTypedIR`, and `src/core/bootstrap.ts:28` imports it.

**Impact:** The modular demo entrypoint would fail to compile, further confirming `src/` is not the running system.

**Recommendation:** Add `import { buildTypedIR } from "./compiler/type-checker.js"` to `src/main.ts`, or remove the demo IR code.

**Verification Steps:**
1. Run TypeScript compilation on `src/main.ts` and confirm no import errors.

---

### AUDIT-2026-06-29-m2: Bootstrap Log Uses Deprecated "tickets"

**Severity:** Minor  
**Invariant:** Ubiquitous Language.

**Description:** `src/core/bootstrap.ts:128` logs `... ${Object.keys(genesisResult.canonicalState.tickets).length} tickets`.

**Impact:** Small terminology inconsistency in logs; indicates incomplete EXP-TERM-001 migration.

**Recommendation:** Update to "work items" and use `canonicalState.workItems` after migrating state shape.

---

### AUDIT-2026-06-29-O1: `dist/synth-v5.js` Substantially Enforces the Architecture

**Severity:** Observation  
**Description:** The monolithic kernel correctly implements single mutation authority (with guard pass), policy engine freezing, registry freezing, replay verification, execution fingerprinting, and the AWS-001 workspace pipeline.

**Evidence:**
- `dist/synth-v5.js:1801` — `createGuardedEventStore` with `GUARD_PASS`.
- `dist/synth-v5.js:2211–2217` — `CommandBus.dispatch()` activates/deactivates guard pass around `appendBatch`.
- `dist/synth-v5.js:2479` — Genesis uses `infra.rawEventStore`, quarantined from operational path.
- `dist/synth-v5.js:2496–2526` — `seal()` freezes registry and policy.
- `dist/synth-v5.js:1156+` — `WorkspaceCognitionEnvironment` with 8-phase orientation.
- `npm run test:all` passes 113 tests.

**Note:** Genesis still writes outside `CommandBus`, but it is explicitly scoped to bootstrap via the raw store and is not exposed after seal. This is a documented bootstrap exception.

---

### AUDIT-2026-06-29-O2: SKR-001 Contains Forbidden Node Type Examples

**Severity:** Observation  
**Description:** `docs/architecture/SKR-001.md:208,213,218` contains `kind: Agent`, `kind: Tool`, `kind: Workflow` as examples of what nodes are NOT.

**Evidence:**
- `docs/architecture/SKR-001.md:202–221` — "What Nodes Are NOT" section.

**Assessment:** Per the Ubiquitous Language audit rules, forbidden terms may appear in migration reports, historical ADRs, and compatibility documentation. These examples are pedagogical and acceptable. However, they could be flagged incorrectly by a naive auditor; recommend adding an explicit "examples of prohibited forms" label if the document is ever machine-parsed.

---

## Final Assessment

| Assessment | Meaning |
|------------|---------|
| **PASS** | Architecture fully enforced. Zero critical or major findings. |
| **PASS WITH OBSERVATIONS** | Architecture enforced. Minor findings or observations only. |
| **PASS WITH MAJOR FINDINGS** | Architecture preserved but weakened. Major findings require correction. |
| **FAIL** | Architecture violated. Critical findings require immediate remediation. |

**Selected Assessment: FAIL**

The modular `src/` implementation violates the single mutation authority, uses a deprecated domain model, lacks registry/policy freezing, and is disconnected from verification. The audit script is configured to ignore these violations. While the monolithic `dist/synth-v5.js` kernel preserves the architecture, the repository as a whole cannot be considered architecturally sound because its intended modular source does not enforce the constitution.

---

## Recommendations Priority

1. **Stop treating `src/` as the canonical implementation until it is fixed.** The current source of runtime truth is `dist/synth-v5.js`.
2. **Fix SMA-001 in `src/`** by removing EventStore writes from `RuntimeEngine`/`executor` and routing genesis through the gate.
3. **Integrate the EventStore guard** in `src/infra/index.ts` and `src/core/bootstrap.ts`.
4. **Add freeze/seal semantics** to `Registry` and `PolicyEngine`.
5. **Apply EXP-TERM-001** to `src/` (Ticket → WorkItem).
6. **Remove false exemptions** from `scripts/audit-bypass-map.js`.
7. **Add invariant-based health checks** that scan `src/` for direct writes and forbidden terms.
8. **Restore the build pipeline** or delete the dead modular source to end the divergence.

---

*Report generated according to `docs/synth-audit-blueprint.md`.*
