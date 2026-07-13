---
Title: Learn Synth — Guided Expedition Tutorial
Domain: tutorials
Audience: everyone
Prerequisites: none
Knowledge Establishes: Practical understanding of Synth through simulated expedition experience
Depends On: philosophy/00-introduction.md, operator/01-getting-started.md
Builds Toward: operator/02-your-first-expedition.md
Version: 1.0.0
Status: stable
---

# Learn Synth: Guided Expedition Tutorial

## Welcome

This tutorial simulates a Synth expedition. You will not modify any files. You will read, observe, and learn.

## The Scenario

You are a developer joining a team that uses Synth. Your first mission is to build a user authentication system. This tutorial walks you through how Synth guides that work.

---

## Objective 1: Understand Genesis

**What you learn:** How Synth systems are born.

Read the Genesis event in the event log. This is the first event, the system's birth certificate.

```
SYSTEM_GENESIS {
  projectName: "Auth System",
  systemId: "auth-system-001",
  partitions: 4
}
```

**Key insight:** Every Synth system starts with a Genesis event. It establishes identity.

**Your turn:** Imagine you are creating a Synth system for your project. What would the Genesis event contain?

---

## Objective 2: Observe Planning

**What you learn:** How Synth plans before acting.

The agent receives the request: "Build authentication."

Before writing any code, the agent:
1. Classifies intent: "Intent-Only Build" (sparse request)
2. Generates questions:
   - "What authentication methods? OAuth, SAML, password?"
   - "What is the user model?"
   - "What security requirements exist?"
3. Extracts knowledge from any provided documents
4. Synthesizes objectives

**Key insight:** Synth does not act immediately. It resolves uncertainty first.

**Your turn:** You are asked to "build a dashboard." What questions would you ask?

---

## Objective 3: Review Discoveries

**What you learn:** How knowledge is recorded.

During the authentication expedition, the team makes discoveries:

```
DISCOVERY_RECORDED {
  id: "D-1",
  description: "OAuth 2.0 PKCE is required for mobile apps",
  impact: "high"
}

DISCOVERY_RECORDED {
  id: "D-2",
  description: "Existing user table has no email verification",
  impact: "medium"
}

DISCOVERY_RECORDED {
  id: "D-3",
  description: "Session timeout should be configurable",
  impact: "low"
}
```

**Key insight:** Discoveries are recorded as they happen. They become part of the permanent record.

**Your turn:** What discoveries might emerge during your dashboard project?

---

## Objective 4: Review Decisions

**What you learn:** How decisions are made and recorded.

The team must choose an authentication approach:

```
DECISION_ACCEPTED {
  id: "DC-1",
  title: "Use OAuth 2.0 with PKCE",
  chosenAlternative: "OAuth 2.0 PKCE",
  alternatives: ["SAML", "Password-only", "OAuth 2.0 PKCE"],
  consequences: {
    positive: ["Secure", "Industry standard", "Mobile support"],
    negative: ["Implementation complexity"]
  }
}
```

**Key insight:** Decisions include alternatives and consequences. They are recorded permanently.

**Your turn:** What decisions would your dashboard project require?

---

## Objective 5: Observe Replay

**What you learn:** How Synth verifies state.

The event log now contains:
```
1. SYSTEM_GENESIS
2. MISSION_CREATED
3. MISSION_APPROVED
4. EXPEDITION_CREATED
5. EXPEDITION_APPROVED
6. EXPEDITION_STARTED
7. OBJECTIVE_ADDED (×3)
8. DISCOVERY_RECORDED (×3)
9. DECISION_ACCEPTED
```

Replay these events. The state is reconstructed deterministically. Every time.

**Key insight:** State is derived from events. If you have the events, you have everything.

**Your turn:** What would happen if event 8 (DISCOVERY_RECORDED) was removed?

---

## Objective 6: Understand Canonical State

**What you learn:** The difference between knowledge and reasoning.

The event log contains:
- Events (what happened) — CANONICAL
- Decisions (what was chosen) — CANONICAL
- Discoveries (what was learned) — CANONICAL

The event log does NOT contain:
- "I thought about X but chose Y" — reasoning, not canonical
- "My confidence was 0.7" — reasoning, not canonical
- "The prompt I used was..." — reasoning, not canonical

**Key insight:** The ledger contains knowledge. Reasoning stays in the agent's context.

**Your turn:** Why is this separation important?

---

## Objective 7: Complete the Expedition

**What you learn:** How work is completed in Synth.

The expedition completes:
```
OBJECTIVE_COMPLETED (×3)
EXPEDITION_COMPLETED
MISSION_COMPLETED
```

The team has:
- Built authentication
- Recorded 3 discoveries
- Made 1 decision
- Created a permanent audit trail

**Key insight:** Completion is explicit. It requires verification and recording.

---

## Summary

You have experienced:
1. **Genesis** — System birth
2. **Planning** — Uncertainty reduction
3. **Discoveries** — Knowledge recording
4. **Decisions** — Explicit choices
5. **Replay** — Deterministic verification
6. **Canonical State** — Knowledge vs reasoning
7. **Completion** — Explicit finish

## Next Steps

→ [Your First Real Expedition](../../operator/02-your-first-expedition.md)

## Related Documents

- [Getting Started](../../operator/01-getting-started.md)
- [Your First Expedition](../../operator/02-your-first-expedition.md)
- [Introduction](../philosophy/00-introduction.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
