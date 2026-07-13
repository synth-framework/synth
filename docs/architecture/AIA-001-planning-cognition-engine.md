# Architecture Impact Assessment (AIA-001)

## Subject: Planning Cognition Engine (PCE) — Planning Architecture v3

## Status: Proposed

## Scope

This assessment evaluates the architectural impact of introducing the Planning Cognition Engine (PCE) as an orchestration layer above the Expedition Domain, which would be refactored into a pure canonical ledger.

**Architecture Review Update:** This assessment was revised to incorporate architecture review findings:
- The PCE does not authenticate itself to the Ledger. It produces Planning Permits.
- Two parallel trust models exist: Execution Permit and Planning Permit.
- Events describe engineering evolution, not object mutations.
- The PCE includes a Question Generator for uncertainty resolution.

## Documents Reviewed

- Architectural Constitution
- ADR-0001 through ADR-0010
- ADR-0011 (PCE Proposal — revised)
- [Engineering Cognition Principles](../engineering-cognition-principles.md)
- Expedition Engine v2 Specification
- All 18 Architecture Handbook sections
- Implementation: `dist/synth-v5.js` (5-layer kernel + Expedition Engine)

---

## Executive Summary

| Dimension | Impact | Risk | Action Required |
|-----------|--------|------|----------------|
| Constitutional compliance | Low | Low | Provisions 33-35 clarification |
| Trust boundaries | Medium | Medium | Planning Permit infrastructure |
| Determinism guarantees | Low | High | PCE reasoning must not enter ledger |
| Event model | Medium | Low | Rename to engineering-evolution style |
| Capability model | High | Medium | Deprecate 15 CRUD capabilities |
| Security model | Low | Low | Planning Permit validates all writes |
| Migration | High | Low | 5-phase migration |
| Testing | Medium | Medium | Permit validation; determinism boundary |

**Overall assessment: PROCEED WITH CONDITIONS (revised)**

The PCE proposal is architecturally sound. Architecture review corrected a significant error: the PCE should not authenticate itself to the Ledger. Instead, it should produce Planning Permits that the Ledger verifies, creating two parallel trust models. This symmetry is a stronger architecture than the original proposal.

---

## 1. Constitutional Analysis

### Article I — Authority (Provisions 1-3)

**Impact: None.**

The PCE does not introduce new mutation paths. It sits above the existing CommandBus and uses existing capabilities to write to the ledger. The single mutation authority (I1) is preserved.

**Verification:** PCE outputs are written through `CommandBus.dispatch()`, the same as all other mutations.

### Article II — Determinism (Provisions 4-6)

**Impact: Medium. Requires careful boundary design.**

The Expedition ledger remains deterministic. However, PCE reasoning (intent classification, objective synthesis) is inherently nondeterministic when LLM-driven. This is acceptable **only if** PCE reasoning is explicitly non-canonical.

**Requirement:** The Constitution must be interpreted as applying to canonical state only. PCE reasoning is transient by design, analogous to an engineer's thought process. Only the engineer's committed decisions are canonical.

**Risk:** If PCE reasoning leaks into canonical events (e.g., storing LLM reasoning chains in the event log), determinism is violated.

**Mitigation:** Ledger must structurally reject events that contain reasoning traces. This is a new enforcement requirement.

### Article III — Immutability of History (Provisions 7-10)

**Impact: None.**

The PCE does not modify the append-only event log semantics. If anything, it strengthens them by making the ledger more focused on immutable knowledge recording.

### Article IV — Governance (Provisions 11-14)

**Impact: Low.**

PCE decisions about what to write to the ledger are themselves governed. The existing policy engine applies to all ledger writes. PCE-specific governance (e.g., "must operator approve new objectives?") would be a new policy category.

**Requirement:** PCE-generated intents must pass through the same policy evaluation as all other intents.

### Article V — Authorization (Provisions 15-17)

**Impact: None.**

All PCE outputs written to the ledger carry InvocationPermits through the existing ExecutionCoordinator pipeline.

### Article VI — Replay (Provisions 18-20)

**Impact: Low.**

Planning replay reconstructs the Expedition ledger (Mission, Expedition, Objective, Discovery, Decision). PCE reasoning is not replayed and not expected to be. This is consistent with the design.

**Verification:** Replay of v3 events must produce identical planning state. No PCE state is replayed.

### Article VII — Structural Enforcement (Provisions 21-23)

**Impact: Medium. New enforcement point required.**

The PCE → ledger boundary must be structurally enforced. The ledger must not be writable except through PCE-orchestrated dispatches. This is analogous to the API → CommandBus boundary.

**New invariant needed:** I9 — Ledger writes must originate from the PCE channel or approved manual dispatches.

### Article VIII — Trust Boundaries (Provisions 24-26)

**Impact: Medium. New trust zone.**

The PCE introduces a new semi-trusted zone:

| Zone | Components | Trust Level |
|------|-----------|-------------|
| Trusted (existing) | CommandBus, RuntimeEngine, EventStore, PolicyEngine, Expedition Ledger | Unchanged |
| Semi-Trusted (existing) | Registry, Coordinator, Permits, Verifiers | Unchanged |
| **Semi-Trusted (new)** | **PCE, Intent Classifier, Knowledge Extractor, Objective Synthesizer** | **New** |
| Untrusted (existing) | API, Users, External Adapters | Unchanged |

The PCE is semi-trusted: it can influence what gets written to the ledger but cannot bypass the ledger's enforcement mechanisms.

### Article IX — Capability Control (Provisions 27-29)

**Impact: High. Requires deprecation.**

v2 CRUD capabilities (`CreateMission`, `AddObjective`, etc.) violate the principle that planning should emerge, not be manually constructed. These capabilities must be deprecated and replaced with PCE-orchestrated ledger writes.

**Required action:** Deprecation plan for 15 Expedition CRUD capabilities.

### Article X — Invariants (Provisions 30-32)

**Impact: Low.**

New invariants needed for the PCE → ledger boundary, but the existing invariant framework supports them.

### Article XI — Architecture and Implementation (Provisions 33-35)

**Impact: None.**

The PCE proposal is implementation-independent in its interface to the ledger. Specific AI providers, models, and prompt strategies are correctly identified as implementation details.

---

## 2. Trust Boundary Analysis

### New Boundary: PCE → Planning Permit → Planning Coordinator → Ledger

```
[PCE Reasoning Layer]
        |
        | (nondeterministic reasoning)
        |
        v
[Question Generator]
        |
        v
[Knowledge Resolver]
        |
        v
[Objective Synthesizer]
        |
        v
[Planning Permit Generator]
        |
        | (Planning Permit: signed authorization token)
        |
        v
[Planning Coordinator]
        |
        | (verifies Planning Permit signature)
        |
        v
[Expedition Ledger]
```

**What enters the boundary:** Engineering knowledge encoded in a valid Planning Permit
**What does not enter:** Reasoning chains, LLM conversations, temporary planning, unpermitted writes
**What must be verified:** Planning Permit is validly signed, intent is well-formed, capability is registered, policy allows
**Enforcement:** Planning Permit verification — structurally enforced, not conventional

**Key principle:** The Ledger does not trust the PCE. It trusts the Planning Permit. This mirrors the Execution architecture where the Runtime does not trust the ExecutionGate — it trusts the Execution Permit.

### Risk: Reasoning Leakage

**Scenario:** PCE includes reasoning metadata in intent payloads, which gets written to the event log.

**Impact:** Nondeterministic data becomes canonical. Replay divergence.

**Mitigation:** Ledger event schemas must structurally exclude reasoning fields. Validation layer must reject payloads containing reasoning traces. Planning Permit payload must be inspected for reasoning residue before validation.

### Risk: PCE Bypass

**Scenario:** Code writes directly to the ledger without producing a Planning Permit.

**Impact:** Planning governance is circumvented.

**Mitigation:** Ledger write channel requires a valid Planning Permit. Unsigned or invalid Permit = rejected write. This is structurally enforced by the Planning Coordinator, analogous to the ExecutionCoordinator verifying Execution Permits.

---

## 3. Determinism Impact

### What Remains Deterministic

| Component | Determinism Status |
|-----------|-------------------|
| Expedition Ledger | Deterministic (events replay identically) |
| Execution Kernel | Unchanged |
| Event Store | Unchanged |
| Policy Engine | Unchanged |
| Replay | Unchanged |

### What Is Explicitly Nondeterministic

| Component | Nondeterminism Source | Mitigation |
|-----------|----------------------|------------|
| Intent Classifier | LLM output varies | Multiple classifications → deterministic selection rule |
| Objective Synthesizer | LLM creativity | Synthesizer outputs are proposals; ledger records only accepted |
| Discovery Evaluator | Pattern recognition | Discovery is human or AI observation; the recording is deterministic |
| Planning Confidence | Statistical estimation | Confidence is advisory, not canonical |

### Critical Requirement

The nondeterministic boundary must be at the PCE → ledger interface, not inside the ledger. The PCE can think nondeterministically. The ledger must only receive deterministic writes.

**Test requirement:** Two identical PCE runs with the same inputs must produce the same ledger state. If they do not, the PCE is leaking nondeterminism into canonical state.

---

## 4. Event Model Impact

### New Event Types Required

| Event | Purpose | Ledger Impact |
|-------|---------|---------------|
| `MISSION_PROPOSED` | PCE proposes a mission | New; replaces MISSION_CREATED |
| `MISSION_ACCEPTED` | Operator accepts proposal | Rename of existing MISSION_APPROVED |
| `EXPEDITION_PROPOSED` | PCE proposes expedition | New; replaces EXPEDITION_CREATED |
| `OBJECTIVE_SYNTHESIZED` | PCE synthesizes objective | New; replaces OBJECTIVE_ADDED |
| `SIDE_QUEST_RECOGNIZED` | Temporary objective identified | New |
| `DISCOVERY_EVALUATED` | PCE evaluates discovery impact | New; extends DISCOVERY_RECORDED |
| `DECISION_EVALUATED` | PCE evaluates decision importance | New; extends DECISION_ACCEPTED |
| `ADR_CANDIDATE_IDENTIFIED` | Decision warrants ADR | New |

### Deprecated Event Types

| Event | Replacement | Timeline |
|-------|-------------|----------|
| `MISSION_CREATED` | `MISSION_PROPOSED` | Phase 3 |
| `EXPEDITION_CREATED` | `EXPEDITION_PROPOSED` | Phase 3 |
| `OBJECTIVE_ADDED` | `OBJECTIVE_SYNTHESIZED` | Phase 3 |
| `GenerateWorkItem` capability | PCE internal process | Phase 2 |

### Event Compatibility

Existing v2 events remain valid. Migration requires event aliasing (old events map to new semantics during replay). No event log rewriting.

---

## 5. Capability Model Impact

### Capabilities to Deprecate (15)

`CreateMission`, `ApproveMission`, `CompleteMission`, `ArchiveMission`
`CreateExpedition`, `ApproveExpedition`, `StartExpedition`, `CompleteExpedition`
`AddObjective`, `CompleteObjective`
`RecordDiscovery`
`AcceptDecision`, `RejectDecision`
`GenerateWorkItem`, `CompleteWorkItem`

### Replacement

These capabilities become internal PCE functions. The PCE synthesizes intents and dispatches them through existing infrastructure. No new kernel capabilities are required.

### Capabilities to Retain (7)

The original ticket/plan/project capabilities remain unchanged. They are execution-domain capabilities, not planning capabilities.

### Migration Timeline

| Phase | Action |
|-------|--------|
| 1 | Refactor Expedition Domain to ledger; mark CRUD capabilities deprecated |
| 2 | Build PCE; PCE uses existing (deprecated) capabilities internally |
| 3 | Replace deprecated capabilities with PCE-internal functions |
| 4 | Remove deprecated capabilities from registry |

---

## 6. Component Model Impact

### New Components (PCE Reasoning Layer)

| Component | Trust Level | Purpose |
|-----------|-------------|---------|
| IntentClassifier | Semi-trusted | Classifies operator intent into Genesis mode |
| QuestionGenerator | Semi-trusted | Identifies uncertainty; produces questions |
| KnowledgeResolver | Semi-trusted | Answers questions from documents, repository, context |
| ObjectiveSynthesizer | Semi-trusted | Produces stable outcomes from resolved understanding |
| DiscoveryEvaluator | Semi-trusted | Evaluates discoveries for impact and action |
| DecisionEvaluator | Semi-trusted | Evaluates whether decisions warrant ADR candidacy |
| PlanningConfidence | Semi-trusted | Estimates planning confidence |
| SideQuestManager | Semi-trusted | Recognizes, tracks, and links side quests |

### New Components (Planning Trust Layer)

| Component | Trust Level | Purpose |
|-----------|-------------|---------|
| PlanningPermit | Semi-trusted | Cryptographically signed authorization token |
| PlanningCoordinator | Trusted | Verifies Planning Permit before ledger write |
| PlanningEngine | Semi-trusted | Produces Planning Permits (the PCE's "ExecutionGate") |

### Modified Components

| Component | Change |
|-----------|--------|
| Expedition Domain | Stripped of CRUD; becomes pure ledger |
| CapabilityRegistry | Deprecate 15 CRUD capabilities |

### Unchanged Components

CommandBus, RuntimeEngine, PolicyEngine, ExecutionCoordinator, ReplayVerifier, ExecutionFingerprint, EventStore, StateStore, Genesis, Bootstrap — all unchanged. The Planning Permit is a new trust primitive, not a modification of existing components.

---

## 7. Security Impact

### Attack Surface

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| PCE prompt injection | High | Medium | Input sanitization; policy evaluation still applies |
| PCE output poisoning | Medium | High | Ledger validation rejects malformed outputs; Planning Permit must be valid |
| Reasoning leakage | Low | High | Structural rejection of reasoning traces in Permit payloads |
| Planning Permit forgery | Low | Critical | HMAC-SHA256 with bootstrap-only key; never exposed or persisted |
| Planning Permit bypass | Low | Critical | PlanningCoordinator rejects all unsigned or invalid Permits |
| PCE key exposure | Low | Critical | Key is ephemeral; regenerated at bootstrap; not in any export |

### Security Verdict

The PCE adds one new security primitive: the Planning Permit. This is structurally parallel to the Execution Permit and follows the same threat model. The key principle: **the ledger does not trust the PCE — it trusts the Planning Permit**. This is stronger than the original proposal (PCE authentication token) because it decouples trust from component identity.

All other PCE risks are bounded by existing enforcement mechanisms. The PCE does not weaken existing security.

---

## 8. Migration Plan (5 Phases)

### Phase 1: Planning Permit Infrastructure (Low Risk)

**Duration:** 1 cycle
**Actions:**
- Implement Planning Permit structure (parallel to Execution Permit)
- Implement PlanningCoordinator (parallel to ExecutionCoordinator)
- Add Planning Permit verification to ledger write path
- All existing tests must pass

**Validation:** 80/80 tests pass. Planning Permit can be created and verified independently.

### Phase 2: Ledger Refactor (Low Risk)

**Duration:** 1 cycle
**Actions:**
- Strip CRUD behavior from Expedition Domain
- Rename events to engineering-evolution style
- Ensure Expedition Domain only applies events (no construction logic)
- Mark 15 CRUD capabilities as deprecated
- Add event aliasing for backward replay

**Validation:** 80/80 tests pass. Replay produces identical state under new event names.

### Phase 3: PCE Skeleton (Medium Risk)

**Duration:** 2 cycles
**Actions:**
- Build PCE as module outside kernel
- Implement IntentClassifier with deterministic selection rules
- Implement QuestionGenerator (the key addition from architecture review)
- Implement KnowledgeExtractor for markdown documents
- PCE produces Planning Permits; dispatches through PlanningCoordinator

**Validation:** PCE outputs produce valid Planning Permits. Ledger accepts permitted writes. Policy evaluation catches invalid outputs.

### Phase 4: Full PCE Subsystems (Medium Risk)

**Duration:** 2 cycles
**Actions:**
- Implement ObjectiveSynthesizer, DiscoveryEvaluator, DecisionEvaluator
- Implement SideQuestManager
- Implement PlanningConfidence
- Build KnowledgeGraph query API
- Remove deprecated capabilities from registry

**Validation:** End-to-end planning workflow. Determinism test passes (same scenario twice = same ledger events).

### Phase 5: Integration and Documentation (Low Risk)

**Duration:** 1 cycle
**Actions:**
- Connect all PCE subsystems
- Write Engineering Cognition Principles documentation
- Comprehensive test suite
- Validate all planning replay remains consistent

**Validation:** Full test suite passes (80 existing + ~38 new). All invariants verified.

### Rollback Plan

At any phase, rollback to the previous state is possible because:
- The event log is append-only (no rewriting)
- Deprecated capabilities can be restored from git
- PCE is outside the kernel (separate module)
- Planning Permit infrastructure can be disabled without affecting existing execution

---

## 9. Testing Impact

### New Test Categories Required

| Category | Purpose |
|----------|---------|
| PCE Determinism Boundary | Verify nondeterministic reasoning does not leak into ledger |
| Event Schema Rejection | Verify ledger rejects reasoning traces |
| PCE Authentication | Verify ledger requires PCE channel authentication |
| Knowledge Graph | Verify graph construction from ledger events |
| Side Quest Lifecycle | Verify side quests are created, linked, and resolved |
| Planning Confidence | Verify confidence estimation is advisory only |
| Migration Replay | Verify v2 events replay correctly under v3 logic |

### Estimated Test Count

13 Expedition tests + 20 PCE tests + 5 migration tests = ~38 new tests

---

## 10. Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | PCE reasoning leaks into canonical state | Medium | Critical | Structural schema rejection; validation layer check |
| R2 | Planning Permit forgery/bypass | Low | Critical | HMAC-SHA256 signing; PlanningCoordinator verification; key never exposed |
| R3 | LLM nondeterminism affects reproducibility | High | Medium | Deterministic selection rules; only final outputs are canonical |
| R4 | Migration breaks existing replay | Low | High | Event aliasing; phased migration with rollback |
| R5 | PCE adds unacceptable latency | Medium | Low | Async processing; ledger writes are still synchronous |
| R6 | Complexity overwhelms maintainers | Medium | Medium | Clear separation; PCE is replaceable; ledger is stable |
| R7 | Planning Permit key exposure | Low | Critical | Key generated at bootstrap; never persisted; never exported |

---

## 11. Recommendations

### Recommendation 1: PROCEED

The Planning Cognition Engine is architecturally sound. It correctly addresses the CRUD smell in v2 and introduces a separation that mirrors the existing execution/reasoning split.

### Recommendation 2: Planning Permit Infrastructure (Not PCE Authentication)

**Corrected from original assessment.** The PCE does not authenticate itself to the Ledger. Instead, implement a **Planning Permit** — a cryptographically signed authorization token that is structurally parallel to the Execution Permit. The Ledger verifies the Planning Permit through a Planning Coordinator, just as the Runtime verifies the Execution Permit through the ExecutionCoordinator.

This creates two parallel trust models with beautiful symmetry:
```
Execution:  ExecutionGate → ExecutionPermit → ExecutionCoordinator → Runtime
Planning:   PlanningEngine → PlanningPermit → PlanningCoordinator → Ledger
```

The Ledger must not know what the PCE is. It only knows that it received a valid Planning Permit.

### Recommendation 3: Schema Rejection of Reasoning

The ledger event schemas must structurally reject any payload field that contains reasoning traces (e.g., `_llm_reasoning`, `_confidence_chain`, `_prompt_used`). This is a validation-layer rule, not a policy.

### Recommendation 4: Event Renaming

Rename planning events from object-mutation style to engineering-evolution style:
- `OBJECTIVE_SYNTHESIZED` → `PLAN_EXPANDED`
- `DISCOVERY_RECORDED` → `KNOWLEDGE_ACQUIRED`
- `DECISION_ACCEPTED` → `DIRECTION_SET`
- `EXPEDITION_CREATED` → `EXPEDITION_CHARTED`

### Recommendation 5: Phased Migration

Follow the 5-phase migration plan. Do not attempt to implement the PCE and deprecate v2 capabilities simultaneously.

### Recommendation 6: Determinism Test

Before Phase 5 completes, run the PCE determinism test: execute the same planning scenario through the PCE twice and verify the ledger events are identical. If they are not, the PCE is leaking nondeterminism and must be fixed before proceeding.

### Recommendation 7: No Constitutional Amendment Required

The PCE fits within the existing Constitution. It does not require new articles or provisions. It requires interpretation of existing provisions (specifically Article II: nondeterministic reasoning is acceptable outside canonical state).

A new document — the [Engineering Cognition Principles](../engineering-cognition-principles.md) — extends the Constitution into the planning domain. It is subordinate to the Constitution.

---

## 12. Conclusion

The Planning Cognition Engine represents a natural and necessary evolution of Synth's planning architecture. Architecture review strengthened the original proposal by replacing component-based authentication with permit-based trust, creating two parallel trust models of beautiful symmetry.

The primary risk — nondeterminism leakage — is mitigated by the Planning Permit boundary and schema-level rejection of reasoning traces. The PCE introduces one new security primitive (the Planning Permit) that mirrors the existing Execution Permit pattern.

The foundational invariant — **"No engineering knowledge becomes canonical until uncertainty has been resolved"** — explains the entire architecture. It is why the Question Generator exists, why the PCE is separate from the Ledger, and why only resolved understanding enters canonical history.

**Assessment: PROCEED WITH CONDITIONS (revised).**

The conditions are:
1. **Planning Permit infrastructure** (parallel to Execution Permit) — not PCE authentication
2. **Schema-level rejection of reasoning traces** in ledger payloads
3. **Event renaming** to engineering-evolution style
4. **5-phase migration** with rollback capability at each phase
5. **Determinism test** before Phase 5 completion (same scenario twice = identical ledger events)
6. **Engineering Cognition Principles** adopted as planning constitution

---

*Assessment conducted against Synth v2 with Expedition Engine*
*All 80 existing tests passing*
*Constitution, ADRs 0001-0011, Engineering Cognition Principles, and Architecture Handbook reviewed*
*Architecture review corrected original assessment: PCE authentication → Planning Permit*
