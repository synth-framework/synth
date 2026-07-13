---
Title: Repository Analysis
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/brownfield-adoption.md
Knowledge Establishes: How agents analyze code repositories systematically
Depends On: agents/constitution.md (Article V), agents/brownfield-adoption.md
Builds Toward: documentation-analysis.md, architecture-review.md
Version: 1.0.0
Status: stable
---

# Repository Analysis

## Purpose

Systematically analyze code repositories to extract architecture, patterns, and knowledge.

## Analysis Dimensions

| Dimension | What to Find | Output |
|-----------|-------------|--------|
| Structure | Directory layout, module organization | Discovery |
| Stack | Languages, frameworks, dependencies | Discovery |
| Patterns | Architectural patterns, conventions | Discovery |
| Tests | Testing approach, coverage | Discovery |
| Integration | APIs, external services | Discovery |
| Data | Database, storage, caching | Discovery |
| Deployment | Build, CI/CD, hosting | Discovery |
| Documentation | README, docs, comments | Discovery |

## Analysis Process

```
Read Structure → Identify Stack → Find Patterns → Check Tests → Map Integration → Record All
```

## Discovery Format

```
Discovery: "Repository uses microservices architecture
  with API Gateway, 5 services, PostgreSQL per service"
Category: architecture
Impact: high
Source: directory structure, docker-compose.yml
```

## Anti-Patterns

- **Surface Scan:** Only looking at top-level files
- **Assumption:** Assuming technologies without verification
- **No Recording:** Analyzing but not creating discoveries
- **Judgment:** Criticizing without understanding context

## Related Documents

- [Brownfield Adoption](brownfield-adoption.md)
- [Documentation Analysis](documentation-analysis.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
