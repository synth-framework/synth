---
Title: Knowledge Extraction
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/question-generation.md
Knowledge Establishes: How agents extract structured knowledge from documents and conversations
Depends On: agents/constitution.md (Article V), agents/question-generation.md
Builds Toward: decision-evaluation.md, discovery-evaluation.md
Version: 1.0.0
Status: stable
---

# Knowledge Extraction

## Purpose

Extract structured engineering knowledge from unstructured documents and conversations.

## What to Extract

| Category | Patterns | Example |
|----------|----------|---------|
| Requirements | "shall", "must", "should", "will" | "The system shall encrypt all data" |
| Constraints | "constraint", "limit", "bound", "only" | "Only AES-256 is permitted" |
| Risks | "risk", "danger", "caution", "warn" | "Risk of data loss during migration" |
| Architecture | "ADR-", "RFC", "Layer", "Component" | "ADR-0042 specifies event sourcing" |
| Entities | Headings, named components | "Authentication Service" |
| Dependencies | "requires", "depends on", "needs" | "Requires PostgreSQL 14+" |

## Extraction Process

```
Document → Parse → Identify Patterns → Structure → Validate → Store
```

1. **Parse:** Read the document
2. **Identify:** Find requirement, constraint, risk patterns
3. **Structure:** Convert to structured knowledge records
4. **Validate:** Verify extracted knowledge is accurate
5. **Store:** Record discoveries in Synth

## Validation

Before using extracted knowledge:
- Verify with operator if ambiguous
- Cross-reference with existing discoveries
- Flag contradictions
- Note confidence level

## Recording

Extracted knowledge becomes discoveries:

```javascript
// Each extracted requirement becomes a discovery
{
  id: "D-REQ-1",
  expeditionId: "E-1",
  description: "Requirement extracted: System shall encrypt all data at rest",
  context: "Extracted from security-spec.md section 3.2",
  impact: "high"
}
```

## Anti-Patterns

- **Over-extraction:** Extracting everything rather than what's relevant
- **Under-extraction:** Missing critical requirements
- **Fabrication:** Inventing requirements not in the document
- **No Context:** Recording extracted knowledge without source attribution

## Related Documents

- [Constitution Article V](constitution.md#article-v-prefer-discovery-over-assumption)
- [Question Generation](question-generation.md)
- [Discovery Evaluation](discovery-evaluation.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
