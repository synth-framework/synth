---
Title: Brownfield Adoption
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/planning.md, agents/knowledge-extraction.md
Knowledge Establishes: How agents analyze existing codebases and plan changes that respect existing architecture
Depends On: agents/constitution.md (Article V), agents/planning.md, agents/knowledge-extraction.md
Builds Toward: architecture-review.md, adr-proposal.md, migration-strategy.md
Version: 1.0.0
Status: stable
---

# Brownfield Adoption

## Purpose

Guide agents in working with existing ("brownfield") codebases — analyzing, understanding, and evolving them.

## Intent Signal

Brownfield adoption is detected when:
- The operator provides a repository path
- Existing code is referenced
- Context includes `repository: true`
- No explicit goals are provided

## Analysis Process

```
Repository → Structure → Patterns → Discoveries → Plan → ADRs
```

### Step 1: Structure Analysis

Identify:
- Directory layout
- Technology stack
- Build system
- Dependencies
- Configuration

### Step 2: Pattern Identification

Find:
- Architectural patterns used
- Coding conventions
- Testing approaches
- Integration points
- Data flow

### Step 3: Discovery Recording

Record everything learned:
- Technology choices (and their versions)
- Architectural patterns
- Integration points
- Known issues or technical debt
- Team conventions

### Step 4: Respectful Planning

When proposing changes:
- Match existing patterns where appropriate
- Propose evolution, not revolution
- Write ADRs for significant architectural changes
- Link changes to existing discoveries

## Anti-Patterns

- **Rewrite Urge:** Proposing to rewrite rather than evolve
- **Pattern Ignoring:** Imposing new patterns without understanding existing ones
- **Discovery Skipping:** Not recording what was learned about the codebase
- **Breaking Changes:** Modifying APIs without deprecation

## Related Documents

- [Constitution Article V](constitution.md#article-v-prefer-discovery-over-assumption)
- [Architecture Review](architecture-review.md)
- [ADR Proposal](adr-proposal.md)
- [Migration Strategy](migration-strategy.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
