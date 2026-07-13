---
Title: Question Generation
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/planning.md
Knowledge Establishes: How agents identify and resolve uncertainty through systematic questioning
Depends On: agents/constitution.md (Article I), agents/planning.md
Builds Toward: knowledge-extraction.md, planning.md
Version: 1.0.0
Status: stable
---

# Question Generation

## Purpose

Before planning or acting, an agent must identify what it does not know. Question generation is the mechanism for making uncertainty explicit.

## When to Generate Questions

Generate questions:
- Before creating a mission (purpose? constraints? success criteria?)
- Before creating an expedition (goal? acceptance criteria? risks?)
- Before adding an objective (what outcome? dependencies?)
- Before making a decision (alternatives? consequences?)
- When intent is ambiguous
- When context is missing

## Question Categories

| Category | Purpose | Example |
|----------|---------|---------|
| Scope | Define boundaries | "What is in scope for this expedition?" |
| Governance | Identify constraints | "What constraints govern this mission?" |
| Acceptance | Define success | "How will success be measured?" |
| Intent | Clarify purpose | "What outcome does this objective achieve?" |
| Dependency | Identify prerequisites | "What does this depend on?" |
| Risk | Identify threats | "What risks should be tracked?" |
| Identity | Ensure naming | "What identifier should be assigned?" |

## Question Priority

| Priority | Meaning | Action |
|----------|---------|--------|
| Critical | Blocking — cannot proceed without answer | Must be answered |
| High | Important — significantly affects planning | Should be answered |
| Medium | Relevant — useful context | Nice to have |

## Resolution

Questions must be resolved before planning commits:
- Answer from available documents
- Ask the operator
- Research independently
- Acknowledge as unknown (record in discovery)

## Anti-Patterns

- **No Questions:** Proceeding without generating questions
- **Ignored Questions:** Generating but not answering critical questions
- **Vague Questions:** "What about this?" instead of specific inquiries
- **Question Hoarding:** Generating questions but never resolving them

## Related Documents

- [Constitution Article I](constitution.md#article-i-reduce-uncertainty-before-planning)
- [Constitution Article V](constitution.md#article-v-prefer-discovery-over-assumption)
- [Planning](planning.md) — Questions feed into planning

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
