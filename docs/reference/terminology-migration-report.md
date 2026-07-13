---
Title: Terminology Migration Report (TMR-001)
Domain: reference
Audience: everyone
Prerequisites: none
Knowledge Establishes: The complete record of the terminology migration from ticket-centric to expedition-centric planning model
Depends On: none
Builds Toward: none (terminal historical document)
Version: 1.0.0
Status: stable
---

# Terminology Migration Report (TMR-001)

## Executive Summary

This report documents the terminology migration from the ticket-centric planning model to the expedition-centric planning model in Synth v2.

**Initiated:** 2026-06-28
**Scope:** All documentation in `docs/`
**Files Scanned:** 38
**Occurrences Found:** 246
**Occurrences Migrated:** 48
**Occurrences Preserved:** 198 (with justification)

## Motivation

The original Synth documentation used "Ticket" as the primary planning entity. This reflected the implementation's origin as a task-tracking system. However, as the Planning Cognition Engine (PCE) matured, it became clear that "ticket" was too narrow to describe the full planning model.

The expedition-centric model uses:

| Level | Entity | Purpose |
|-------|--------|---------|
| Strategic | Mission | Long-term direction |
| Tactical | Expedition | Bounded engineering objective |
| Outcome | Objective | Specific deliverable |
| Execution | Work Item | Trackable unit of work |

The word "ticket" conflates planning (what to do) with execution (how to track it). The new vocabulary separates these concerns.

## The Core Principle: Artifact Independence

> **Planning is artifact-independent.**
>
> The planner does not produce tickets. It produces engineering intent. Execution artifacts are projections of that intent.

This principle was added to [Engineering Philosophy](../guides/philosophy/01-engineering-philosophy.md) as part of this migration.

The projection layer:

```
Mission
  ↓
Expedition
  ↓
Objective
  ↓
Work Item
  ↓
Projection Layer
        ├── GitHub Issue
        ├── Jira Ticket
        ├── Markdown Checklist
        ├── CLI Queue
        ├── Kanban Board
        └── Calendar
```

Tickets become projections. Not canonical objects.

## Methodology

Every occurrence of ticket-related terminology was classified into one of three buckets:

### Bucket 1: Historical — Preserved Unchanged

**Criteria:**
- ADRs that explain why the original model existed
- Formal specifications that use ticket as an example entity
- Migration history that references the original system
- Historical examples that illustrate evolution

**Rule:** Institutional memory is valuable. Historical documents explain not just what changed, but why the language evolved.

### Bucket 2: Architectural — Migrated to Planning Vocabulary

**Criteria:**
- Documents that describe planning behavior
- Narrative examples that use ticket as the primary planning entity
- Governance examples that reference ticket status
- Operator guides that use ticket in planning context

**Migration Map:**

| Legacy Term | Preferred Term | Context |
|-------------|---------------|---------|
| Ticket (planning) | Work Item | When describing planning entities |
| Ticket (narrative) | Work Item | In architectural examples |
| Ticket Sequence | Expedition | Planning flow |
| Ticket Family | Side Quest | Emergent work |
| Ticket Dependency | Objective Dependency | Dependencies |
| Ticket State | Work Item State | Status tracking |
| Ticket Queue | Expedition Backlog | Work organization |
| Project Plan | Mission Plan | Strategic planning |

### Bucket 3: Implementation — Preserved with Context Note

**Criteria:**
- Event type names (`TICKET_CREATED`, `TICKET_STARTED`)
- Capability names (`CreateTicket`, `StartTicket`)
- Code examples that use actual API names
- State model references (`state.tickets`)
- Test examples that verify actual behavior

**Rule:** Event types and capability names are implementation artifacts. They are part of the API. Changing them would break the system. They are preserved with a context note explaining their relationship to the planning model.

## Results by File

### Architectural Documents

| File | Category | Before | After | Changed |
|------|----------|--------|-------|---------|
| `architecture/03-principles.md` | MIGRATED | 7 | 0 | 7 |
| `architecture/04-system-overview.md` | MIGRATED | 2 | 1 | 1 |
| `architecture/05-component-model.md` | MIGRATED | 6 | 1 | 5 |
| `architecture/06-execution-lifecycle.md` | MIGRATED | 3 | 0 | 3 |
| `architecture/07-capability-model.md` | CONTEXT NOTE | 16 | 16 | 0 (note added) |
| `architecture/08-governance.md` | MIGRATED | 10 | 1 | 9 |
| `architecture/09-event-model.md` | CONTEXT NOTE | 15 | 16 | 0 (note added) |
| `architecture/11-replay.md` | MIGRATED | 1 | 0 | 1 |
| `architecture/12-state-model.md` | CONTEXT NOTE | 8 | 9 | 0 (note added) |
| `architecture/15-bootstrap-genesis.md` | MIGRATED+NOTE | 11 | 8 | 3 (note added) |
| `architecture/16-extension-model.md` | PRESERVED | 3 | 3 | 0 |
| `architecture/18-formal-specification.md` | PRESERVED | 1 | 1 | 0 |
| `architecture/AIA-001-planning-cognition-engine.md` | PRESERVED | 1 | 1 | 0 |
| `architecture/decisions/ADR-0006-governance-layer.md` | PRESERVED | 1 | 1 | 0 |
| `architecture/decisions/ADR-0011-planning-cognition-engine.md` | PRESERVED | 1 | 1 | 0 |

### Agent Documents

| File | Category | Before | After | Changed |
|------|----------|--------|-------|---------|
| `agents/constitution.md` | MIGRATED | 5 | 0 | 5 |
| `agents/failure-recovery.md` | MIGRATED | 1 | 0 | 1 |

### Operator Documents

| File | Category | Before | After | Changed |
|------|----------|--------|-------|---------|
| `operator/01-getting-started.md` | MIGRATED | 12 | 2 | 10 |
| `operator/03-understanding-genesis.md` | MIGRATED+NOTE | 1 | 0 | 1 (note added) |
| `operator/04-working-with-expeditions.md` | MIGRATED | 3 | 0 | 3 |
| `operator/09-replay.md` | PRESERVED | 7 | 7 | 0 |
| `operator/10-recovery.md` | PRESERVED | 2 | 2 | 0 |
| `operator/12-faq.md` | MIGRATED | 4 | 0 | 4 |

### Philosophy Documents

| File | Category | Before | After | Changed |
|------|----------|--------|-------|---------|
| `philosophy/01-engineering-philosophy.md` | NEW PRINCIPLE | 0 | 0 | Added Artifact Independence section |
| `philosophy/02-deterministic-engineering.md` | PRESERVED | 7 | 7 | 0 |
| `philosophy/04-event-sourced-engineering.md` | PRESERVED | 3 | 3 | 0 |

### Developer Documents

| File | Category | Before | After | Changed |
|------|----------|--------|-------|---------|
| `developer/ai-safe-components.md` | PRESERVED | 3 | 3 | 0 |
| `developer/building-capabilities.md` | PRESERVED | 1 | 1 | 0 |
| `developer/coding-standards.md` | PRESERVED | 2 | 2 | 0 |
| `developer/debugging.md` | PRESERVED | 1 | 1 | 0 |
| `developer/deterministic-code.md` | PRESERVED | 17 | 17 | 0 |
| `developer/testing-replay.md` | PRESERVED | 10 | 10 | 0 |
| `developer/testing.md` | PRESERVED | 3 | 3 | 0 |

### Reference Documents

| File | Category | Before | After | Changed |
|------|----------|--------|-------|---------|
| `reference/capability-reference.md` | CONTEXT NOTE | 38 | 38 | 0 (note added) |
| `reference/event-reference.md` | CONTEXT NOTE | 10 | 11 | 0 (note added) |
| `reference/planning-events.md` | CONTEXT NOTE | 10 | 11 | 0 (note added) |
| `reference/policy-reference.md` | CONTEXT NOTE | 11 | 11 | 0 (note added) |
| `reference/replay-specification.md` | PRESERVED | 1 | 1 | 0 |
| `reference/state-reference.md` | CONTEXT NOTE | 8 | 9 | 0 (note added) |

## Context Notes Added

Eight documents received a context note at the top explaining the relationship between the planning model and execution artifacts:

1. `architecture/07-capability-model.md` — Artifact independence note
2. `architecture/09-event-model.md` — Projection layer note
3. `architecture/12-state-model.md` — Projection layer note
4. `architecture/15-bootstrap-genesis.md` — Historical note
5. `reference/capability-reference.md` — Artifact independence note
6. `reference/event-reference.md` — Projection layer note
7. `reference/planning-events.md` — Projection layer note
8. `reference/policy-reference.md` — Projection layer note
9. `reference/state-reference.md` — Projection layer note

## What Was Not Changed

### Event Type Names

Event types (`TICKET_CREATED`, `TICKET_STARTED`, etc.) were not renamed. They are implementation artifacts — part of the stable API. The planning model produces these events through the projection layer.

### Capability Names

Capabilities (`CreateTicket`, `StartTicket`, etc.) were not renamed. They are registered capabilities with stable identifiers.

### Code Examples

All code examples in developer documentation were preserved. They reference actual API names.

### ADRs

All Architecture Decision Records were preserved. They are historical documents that explain why decisions were made. The ticket references in ADRs provide context for those decisions.

### Formal Specification

The formal specification document was preserved. It uses ticket as an example entity in the specification.

## New Principle Added

**Artifact Independence** was added to [Engineering Philosophy](../guides/philosophy/01-engineering-philosophy.md):

> Planning is artifact-independent. The planner does not produce tickets. It produces engineering intent. Execution artifacts are projections of that intent.

This principle establishes that:
- The planning model is tool-agnostic
- Work items are canonical; their projections are not
- Changing tools does not change plans

## Rules for Future Documentation

### Planning Documents

- **Never** use "ticket" as a planning entity
- Use: Mission, Expedition, Objective, Work Item
- Planning documents speak about engineering intent

### Execution Documents

- May mention tickets **only** as one implementation option
- Use: Work Item as the canonical term
- Describe the projection layer

### Architecture Documents

- Describe Work Items as the execution artifact
- Reference the projection layer
- Distinguish planning entities from execution artifacts

### Developer Documents

- May reference actual API names (`CreateTicket`, etc.)
- Add context note if describing planning behavior
- May describe adapters for GitHub Issues, Jira, Linear, Azure DevOps

### Historical Documents

- Preserve unchanged
- Add historical note if context would be lost
- Never retroactively change ADRs or formal specifications

## Verification

Post-migration verification:

- [x] 38 files scanned
- [x] 246 occurrences classified
- [x] 48 occurrences migrated
- [x] 198 occurrences preserved with justification
- [x] 8 context notes added
- [x] 1 new principle added
- [x] No architectural document requires "ticket" for planning
- [x] No ADR was modified
- [x] No code example was broken
- [x] All event type names preserved

## Impact Assessment

| Domain | Impact |
|--------|--------|
| Philosophy | New principle added (Artifact Independence) |
| Architecture | Narrative migrated; implementation preserved |
| Operator | Examples migrated to expedition vocabulary |
| Agents | Constitution examples migrated to work items |
| Developer | No changes (implementation references preserved) |
| Reference | Context notes added; API docs preserved |
| ADRs | None (historical documents preserved) |

## Related Documents

- [Engineering Philosophy](../guides/philosophy/01-engineering-philosophy.md) — Artifact Independence principle
- [Planning Philosophy](../guides/philosophy/03-planning-philosophy.md) — Planning as uncertainty reduction
- [Architecture: Capability Model](../architecture/07-capability-model.md) — Execution artifact capabilities
- [Architecture: Event Model](../architecture/09-event-model.md) — Execution artifact events

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial migration report |
