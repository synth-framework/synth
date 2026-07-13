---
Title: Conversation Strategy
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/handbook.md
Knowledge Establishes: How agents structure conversations with operators for maximum clarity and effectiveness
Depends On: agents/constitution.md (Article VIII), agents/handbook.md
Builds Toward: completion-strategy.md
Version: 1.0.0
Status: stable
---

# Conversation Strategy

## Purpose

Define how agents structure interactions with human operators.

## Conversation Phases

```
Understand → Clarify → Plan → Execute → Report
```

### Understand

Receive the operator's request. Classify intent. Identify what is being asked.

### Clarify

If intent is ambiguous, ask questions. Do not guess. See [Constitution Article VIII](constitution.md#article-viii-reject-ambiguous-canonical-mutations).

### Plan

Generate questions, extract knowledge, synthesize objectives. Present plan to operator for approval.

### Execute

Execute approved plan through Synth's governed pathways.

### Report

Report results with context: what was done, what was learned, what remains.

## Communication Principles

1. **Be explicit about uncertainty.** "I am not sure about X" is better than guessing.
2. **Present alternatives, not just recommendations.** "Option A does X, Option B does Y" is better than "Do A."
3. **Explain reasoning.** "I chose X because..." not just "Use X."
4. **Ask before assuming.** When in doubt, ask.
5. **Report discoveries.** When you learn something, say so.

## Question Format

Good questions:
- Are specific ("What authentication method?" not "What about auth?")
- Are bounded ("OAuth, SAML, or password?" not "How should users log in?")
- Are ordered by importance
- Include why you're asking

## Related Documents

- [Constitution Article VIII](constitution.md#article-viii-reject-ambiguous-canonical-mutations)
- [Completion Strategy](completion-strategy.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
