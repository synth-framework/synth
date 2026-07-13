# INTENT-001: Execution Is an Implementation of Engineering Intent

## Status: Architectural Vision
## Date: 2026-06-28
## Classification: ADR Candidate

---

## The General Pattern

Both migrations (Ticket → WorkItem and Capability → Intent) are instances of a single architectural principle:

> **Canonical cognition is separate from execution mechanism.**

| Canonical Cognition | Execution / Projection |
|---------------------|----------------------|
| Mission | Project (optional) |
| Expedition | Sprint / Iteration (optional) |
| Objective | Epic / Story (optional) |
| WorkItem | Jira Ticket / GitHub Issue / Linear Issue |
| **Intent** | **Capability invocation** |

Capability occupies the same architectural layer as GitHub Issue: it is an implementation mechanism, not part of the planning language.

---

## The Compiler Analogy

The Synth architecture resembles a compiler pipeline:

```
Engineering Intent        ← Source code (what the engineer wants)
        │
        ▼
    Understanding         ← Lexical analysis (parse the request)
        │
        ▼
    Planning              ← Semantic analysis (resolve uncertainty)
        │
        ▼
    Decision              ← Optimization (choose approach)
        │
        ▼
Execution Plan            ← Intermediate representation
        │                    (expand intent to operations)
        ▼
Capability Sequence       ← Bytecode (smallest executable ops)
        │
        ▼
Event Stream              ← Machine code (canonical record)
        │
        ▼
Projection                ← Runtime output (external tools)
```

The Capability is **bytecode**. It is the smallest executable operation in the system. Planners do not think in bytecode. Engineers do not think in bytecode. Bytecode is the execution layer's language.

### What This Means

| Layer | Language | Example |
|-------|----------|---------|
| Intent | Engineering | "Implement authentication" |
| Execution Plan | Operational | "Create WorkItems A,B; Schedule Expedition" |
| Capability | Instruction | `CreateWorkItem()`, `CreateExpedition()` |
| Event | Record | `WORK_ITEM_CREATED`, `EXPEDITION_CREATED` |

A single intent may compile to multiple capabilities. A single decision may expand to an execution plan containing many capability invocations.

---

## The Missing Layer: Execution Plan

The current architecture omits an important stage:

```
Intent
    ↓
Understanding
    ↓
Planning
    ↓
Decision
    ↓
Execution Plan    ← MISSING
    ↓
Execution
    ↓
Projection
```

### Why Execution Plan Matters

An execution plan expands a single decision into a sequence of operations:

**User Intent:** "Implement authentication"

**Decision:** "Approved — use OAuth 2.0 with PKCE"

**Execution Plan:**
```
1. CreateWorkItem { id: "WI-AUTH-1", title: "Set up OAuth provider" }
2. CreateWorkItem { id: "WI-AUTH-2", title: "Implement PKCE flow" }
3. CreateWorkItem { id: "WI-AUTH-3", title: "Store tokens securely" }
4. CreateExpedition { id: "E-AUTH-1", goal: "OAuth integration" }
5. RecordDiscovery { description: "OAuth library supports PKCE" }
```

**Execution (Capability Sequence):**
```
CreateWorkItem() → WORK_ITEM_CREATED
CreateWorkItem() → WORK_ITEM_CREATED
CreateWorkItem() → WORK_ITEM_CREATED
CreateExpedition() → EXPEDITION_CREATED
RecordDiscovery() → DISCOVERY_RECORDED
```

The execution plan is the bridge between high-level intent and low-level execution. Without it, the system jumps directly from decision to capability — which works for simple cases but breaks down for complex ones.

---

## The True Relationship

Today:
```
Intent
   ↓
Capability    ← Capability is treated as architecture
   ↓
Event
```

Target:
```
Intent
    ↓
Intent Interpreter
    ↓
Execution Plan
    ↓
Capability Invocation(s)    ← Capability is bytecode
    ↓
Events
```

### What Is an Intent Interpreter?

The Intent Interpreter translates engineering intent into an execution plan. It understands:
- What the operator wants (Intent)
- What the system can do (Capability Registry)
- How to compose capabilities into plans (Execution Plan Generator)

It is the compiler frontend. The Capability Registry is the instruction set.

---

## Architectural Invariants

From the principle "Execution is an implementation of engineering intent," derive five invariants:

### I1: The planner never emits execution instructions directly.

The Planning Cognition Engine produces intents (Mission, Expedition, Objective). It never produces capability invocations. The execution layer compiles intent to capability.

### I2: Execution operations are implementation details.

The name of a capability, its parameters, and its behavior may change without affecting planning semantics. `CreateWorkItem` could become `GenerateWorkItem` without any planning document changing.

### I3: Canonical knowledge is independent of execution mechanisms.

Discoveries, decisions, and objectives are canonical. They describe engineering knowledge. How that knowledge is executed (which capabilities are invoked) is implementation.

### I4: Projection adapters isolate external tooling.

GitHub Issues, Jira Tickets, Linear Issues — these are external projections. No canonical knowledge depends on them. No planning logic references them. They exist only in the projection layer.

### I5: Execution primitives may evolve without changing planning semantics.

New capabilities can be added, old capabilities deprecated, capability parameters changed — all without affecting the planning model. The planning model is stable. The execution model evolves.

---

## Naming

The Capability Registry should eventually be renamed to reflect its true role:

| Current Name | Proposed Name | Rationale |
|-------------|---------------|-----------|
| `CapabilityRegistry` | `ExecutionPrimitiveRegistry` | These are execution primitives, not architectural capabilities |
| `CapabilityRegistry` | `ExecutionOperationRegistry` | Operations that the execution layer can perform |
| `CapabilityRegistry` | `ExecutionInstructionRegistry` | Instructions in the execution instruction set |

The planner should not care what the registry is called. The planner never interacts with it directly.

---

## Governance Mechanism: Architectural Language Audit

The ability to audit the repository for violations of architectural language is a reusable governance mechanism.

### The Pattern

1. Define canonical vocabulary (what belongs in each layer)
2. Define execution vocabulary (what is implementation)
3. Audit for leakage (execution terms in canonical layers)
4. Migrate violations (demote execution terms to their layer)
5. Preserve compatibility (at system boundaries only)

### Audit Questions

| Question | Checks For |
|----------|-----------|
| Does any infrastructure term appear in the planning layer? | Leakage of DB, network, file system concepts |
| Does any persistence term appear in the cognition layer? | Leakage of storage, caching, serialization concepts |
| Does any vendor-specific concept appear in the canonical model? | Leakage of GitHub, Jira, AWS, etc. |
| Does any implementation optimization appear in architectural documentation? | Leakage of performance, caching, batching |
| Does any execution primitive appear in planning contracts? | Leakage of capability names into intent |

### Audit History

| Audit | Canonical Entity | Execution Projection | Date |
|-------|-----------------|---------------------|------|
| EXP-TERM-001 | WorkItem | Ticket | 2026-06-28 |
| ASC-001 | Intent | Capability | Proposed |

---

## Comparison: The Two Migrations

| Dimension | Ticket → WorkItem | Capability → Intent |
|-----------|-------------------|---------------------|
| **Canonical entity** | WorkItem | Intent |
| **Execution projection** | Legacy Ticket | Capability invocation |
| **General principle** | Artifact-independence | Execution-is-implementation |
| **Translation layer** | API: CreateTicket → CreateWorkItem | Architectural: capability field → intent.type |
| **Registry impact** | Removed Ticket entries | Rename capabilityRegistry → executionPrimitiveRegistry |
| **Policy impact** | Removed Ticket scopes | Rename capability → intent in conditions |
| **Validation impact** | Removed Ticket from idRequired | Rename validateInvocation → validateIntent |
| **Domain impact** | Removed Ticket wrappers | Minimal (already clean) |
| **State impact** | Unified to workItems | None (already clean) |
| **Event impact** | Preserved TICKET_* as aliases | None (events are canonical) |
| **References** | 48 occurrences | ~110 occurrences |

---

## Why This ADR Matters

"Execution is an implementation of engineering intent" is a durable architectural principle. It should remain true even if:

- Synth changes programming language
- The runtime is replaced
- Integration targets change (new project management tools)
- The event format evolves
- The planning model expands

The principle separates what the system **knows** (engineering intent) from what the system **does** (execute capabilities). Knowledge is canonical. Execution is implementation.

---

## Acceptance Criteria (for future expedition)

- [ ] Intent contract uses `intent.type` not `capability` as primary field
- [ ] `capabilityRegistry` renamed to `executionPrimitiveRegistry` (or equivalent)
- [ ] `validateInvocation` renamed to `validateIntent`
- [ ] Policy scopes use `intents` not `capabilities`
- [ ] CommandBus routes by `cmd.intent.type`
- [ ] Execution Plan layer introduced between Decision and Execution
- [ ] Capability documented as execution bytecode, not architectural concept
- [ ] All 5 invariants are auditable
- [ ] All tests pass
- [ ] No replay regression

---

## Related Documents

- [docs/audits/ASC-001-report.md](./audits/ASC-001-report.md) — Ticket → WorkItem consolidation
- [Philosophy: Artifact Independence](./guides/philosophy/01-engineering-philosophy.md)
- [Philosophy: Engineering Philosophy](./guides/philosophy/01-engineering-philosophy.md)

---

*Document: INTENT-001*
*Status: Architectural vision, ready for expedition when prioritized*
*Classification: ADR Candidate — Execution Is an Implementation of Engineering Intent*
