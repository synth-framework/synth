---
Title: Documentation Analysis
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/repository-analysis.md
Knowledge Establishes: How agents analyze existing documentation to extract knowledge
Depends On: agents/constitution.md (Article V), agents/repository-analysis.md
Builds Toward: brownfield-adoption.md, knowledge-extraction.md
Version: 1.0.0
Status: stable
---

# Documentation Analysis

## Purpose

Extract structured knowledge from existing documentation (READMEs, specs, wikis, comments).

## What to Extract

| Source | Extract |
|--------|---------|
| README | Purpose, setup, architecture overview |
| API docs | Endpoints, contracts, dependencies |
| Architecture docs | Patterns, decisions, constraints |
| Comments | Implementation notes, warnings |
| Commit history | Evolution, rationale |
| Issues/PRs | Known problems, decisions |

## Process

```
Read → Extract Patterns → Structure → Cross-Reference → Record
```

## Anti-Patterns

- **Ignoring docs:** Analyzing code without reading docs
- **Blind trust:** Accepting docs without verification
- **No cross-reference:** Not checking docs against code
- **No recording:** Learning from docs but not creating discoveries

## Related Documents

- [Repository Analysis](repository-analysis.md)
- [Knowledge Extraction](knowledge-extraction.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
