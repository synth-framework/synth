# EXP-HOME-023 — AI Operator Adapter

> **Architecture expedition.** Provide a deterministic operator adapter for the homepage that can later be replaced by live AI adapters.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-017 (Homepage Genesis Projection), EXP-HOME-022 (Runtime Abstraction Layer)  
**Blocks:** EXP-HOME-024 (Projection Contract)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Let the homepage demonstrate the operator ↔ SYNTH interaction pattern without calling remote AI models. A deterministic `DemoOperator` plays the operator role so visitors can watch the workflow unfold.

---

## Origin Evidence

The Mission Studio concept includes an AI agent operating alongside SYNTH. For Phase 1, the homepage cannot depend on paid AI APIs or hosted models. A deterministic demo operator satisfies the product need while preserving the architecture for future live adapters.

---

## Required Change

### 1.1 Operator interface

Define an operator adapter interface such as:

```ts
interface OperatorAdapter {
  proposeIntent(context: DemoContext): Promise<string>
  answerClarification(questions: ClarificationQuestion[]): Promise<ClarificationAnswer[]>
  approveMission(mission: MissionProjection): Promise<boolean>
  selectExample(examples: DemoExample[]): Promise<string>
}
```

### 1.2 DemoOperator implementation

`DemoOperator` returns predetermined responses for curated examples. For free-form input, it may fall back to deterministic heuristics or simply stop and let the visitor take over.

### 1.3 Future adapters

The interface must be implementable by future live adapters:

- `GeminiOperator`
- `ChatGPTOperator`
- `ClaudeOperator`
- `LocalOperator`

No UI changes are required when swapping adapters.

---

## Deliverables

1. **Operator adapter interface**.
2. **`DemoOperator` implementation** for curated examples.
3. **Integration** with the Mission Studio state machine.
4. **Tests** verifying adapter swapability.

---

## Acceptance Criteria

- The homepage can run a complete demo using only `DemoOperator`.
- The operator adapter is injectable.
- A mock adapter can drive the same state machine for tests.
- The interface can be implemented by a future live AI adapter without UI changes.

---

## Out of Scope

- Live AI model integration.
- Streaming chat protocols.
- Authentication or cost models.

---

## Success Criteria

The expedition succeeds when a visitor can watch the homepage run a complete Genesis demo as if an operator were interacting with SYNTH, without any remote AI call.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-017 — Homepage Genesis Projection](EXP-HOME-017.md)
- [EXP-HOME-022 — Runtime Abstraction Layer](EXP-HOME-022.md)
- [EXP-HOME-024 — Projection Contract](EXP-HOME-024.md)
