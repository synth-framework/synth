# EXP-ADP-005 — Conversation Adapter

**Status:** Completed  
**Kind:** Evidence Adapter  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-000, EXP-ADP-OBS-001  
**Blocks:** Mission Studio operator input

---

## Purpose

Read natural-language operator input and emit canonical Observations for Mission Studio.

The Conversation Adapter is the simplest Evidence Adapter. It demonstrates how arbitrary human language becomes structured, traceable, confidence-scored knowledge without Mission Studio ever touching the raw conversation.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Evidence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Translate operator intent into Mission Studio input |

---

## Responsibilities

- Accept conversation turns.
- Store turns immutably.
- Extract intent, actor, constraint, and unknown observations.
- Emit `Observation[]` through `observe()`.
- Never mutate runtime state.
- Never infer beyond what the text supports.

---

## Input

```typescript
ConversationTurn {
  role: "operator" | "system" | "assistant"
  text: string
  timestamp: number
}
```

Example:

```typescript
{
  role: "operator",
  text: "I want to build a CRM.",
  timestamp: Date.now()
}
```

---

## Output

```typescript
Observation {
  id: "obs-intent-..."
  source: { adapter: "conversation", locator: "turn-..." }
  category: "intent"
  subject: "CRM"
  evidence: [{ description: "Operator conversation turn", snippet: "I want to build a CRM.", fingerprint: "..." }]
  confidence: "high"
  timestamp: number
  metadata: { role: "operator" }
}
```

---

## Extraction Patterns

Current deterministic extractors:

| Pattern | Category | Example |
|---------|----------|---------|
| "I want to build a ..." | `intent` | "I want to build a CRM" → CRM |
| "As a [actor]..." | `actor` | "As a user, I want ..." → user |
| "must / should / need to ..." | `constraint" | "Users must log in" → constraint |
| No recognized pattern | `unknown` | captures raw text |

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`observe()` is available once enabled.

---

## Invariants

- `observe()` is read-only.
- Only operator turns are analyzed by default.
- Every observation includes evidence referencing the source turn.
- Confidence is deterministic based on pattern match quality.
- No state outside the adapter is modified.

---

## Success Criteria

- Operator input produces at least one Observation.
- Mission Studio receives only canonical Observations.
- Adapter passes lifecycle and health checks.
- Extraction is deterministic for the same transcript.

---

## Completion Criteria

Conversation Adapter is complete when:

- `src/adapters/conversation/adapter.ts` implements `ObservableAdapter`.
- `src/adapters/conversation/types.ts` defines the input/output contracts.
- The adapter is registered in `AdapterRegistry`.
- Tests cover lifecycle, intent extraction, actor extraction, constraint extraction, and unknown fallback.
