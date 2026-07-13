# Knowledge Evolution

## How Synth Architecture Changes Over Time

**Version:** 1.0.0
**Status:** Governance Document
**Classification:** Architectural Constitution — Level 2
**Date:** 2026-06-29

---

## Purpose

This document defines the process by which Synth's architecture, vocabulary, and governing documents evolve.

Architecture is not static. It changes as the system grows. But architectural change must be deliberate, traceable, and reversible.

This document ensures that every change to Synth's governing principles follows a defined process and leaves an audit trail.

---

## Core Principle

> Architecture may evolve, but it must never drift.

Evolution is deliberate change with documented rationale.

Drift is undocumented change that accumulates without decision.

This document defines the process for the former and prevents the latter.

---

## Hierarchy

```
Architectural Constitution
        |
        v
Agent Constitution
        |
        v
Ubiquitous Language
        |
        v
Agent Workspace Specification
        |
        v
SYNTH AUDIT BLUEPRINT
        |
        v
KNOWLEDGE EVOLUTION  <-  YOU ARE HERE
```

This document defines how all documents above it may change.

---

## Evolution Categories

### 1. Architectural Constitution Amendments

Changes to the highest-level architectural principles.

**Scope:** Changes to `docs/architecture/constitution.md`

**Process:**
1. Propose amendment as ADR with "Constitutional" classification
2. Require two-thirds approval of designated architectural stewards
3. Implement behind feature flag or versioning mechanism
4. Full architectural audit before activation
5. 30-day observation period before ratification

**What constitutes a constitutional amendment:**
- Changes to layer definitions
- Changes to single mutation authority model
- Changes to event sourcing model
- Changes to trust boundaries
- Addition or removal of architectural layers

**What does NOT require constitutional amendment:**
- Adding terms to ubiquitous language
- Adding new capabilities
- Adding new ADRs
- Workspace specification changes
- Documentation improvements

### 2. Vocabulary Evolution

Changes to the ubiquitous language.

**Scope:** Changes to `ubiquitous-language.md`

**Process:**
1. Propose change with migration analysis
2. Identify all documents and code using the old term
3. Demonstrate backward compatibility or migration path
4. Update all dependent documents simultaneously
5. Update CanonicalLanguageAuditor if hardcoded terms affected
6. Full language audit to verify consistency

**Rules:**
- Forbidden terms may be added without migration period
- Approved terms may not be removed without deprecation period (minimum 1 version)
- Term definitions may be clarified without process
- New layers may be added with ADR

### 3. Specification Updates

Changes to operational specifications.

**Scope:** Changes to `AWS-001-agent-workspace-specification.md`, `SKR-001.md`, `INTENT-001.md`

**Process:**
1. Propose as ADR referencing the specification
2. Demonstrate no violation of higher-level documents
3. Update the specification
4. Update dependent implementations
5. Update conformance tests
6. Verification through audit

### 4. ADR Lifecycle

Architecture Decision Records have their own lifecycle.

**States:**

| State | Meaning | Transition To |
|-------|---------|---------------|
| `proposed` | Under discussion | `accepted` or `rejected` |
| `accepted` | Ratified, binding | `superseded` |
| `superseded` | Replaced by newer ADR | — |
| `rejected` | Not accepted | `proposed` (if reconsidered) |
| `archived` | Historical reference only | — |

**Rules:**
- No implementation may contradict an `accepted` ADR
- A `superseded` ADR's replacement must explicitly address all decisions it overrides
- `rejected` ADRs remain in the archive for reference
- ADRs may not be deleted

### 5. Knowledge Representation Evolution

Changes to SKR (Synth Knowledge Representation).

**Scope:** Changes to `SKR-001.md`

**Process:**
1. Propose as ADR with "SKR" classification
2. Demonstrate no violation of KI-001 through KI-008
3. Update node type or relationship type lists
4. Update conformance tests
5. Update CanonicalLanguageAuditor
6. Update all knowledge graphs using affected types
7. Full SKR conformance test run

**Invariant:** SKR changes must never violate KI-001 through KI-008.

---

## Change Classification

Every change must be classified before implementation.

### Classification Matrix

| Change Type | Document Level | Process Required | Audit Required |
|-------------|---------------|-----------------|----------------|
| Add new ADR | Specification | ADR submission | No |
| Amend constitution | Constitution | Constitutional process | Yes |
| Add vocabulary term | Vocabulary | ADR + language audit | Yes |
| Remove vocabulary term | Vocabulary | Deprecation + ADR + language audit | Yes |
| Clarify definition | Vocabulary | Documentation update | No |
| Add SKR node type | Knowledge | ADR + SKR conformance | Yes |
| Add capability | Implementation | ADR | No |
| Change workspace | Specification | ADR + conformance tests | Yes |
| Fix bug | Implementation | Standard process | No |
| Refactor code | Implementation | Standard process | No |

---

## Migration Rules

When architectural change affects existing code or documents:

### Backward Compatibility

- Runtime must maintain backward compatibility for at least one major version
- Event log must remain replayable across all versions
- API translation layer handles legacy capability names
- Deprecated terms remain in forbidden lists until fully migrated

### Migration Sequence

```
1. New concept introduced (alongside old)
2. All consumers updated to new concept
3. Old concept marked deprecated
4. One-version grace period
5. Old concept removed from active use
6. Old concept preserved in replay layer only
7. Full audit after removal
```

This is the pattern used for EXP-TERM-001 (Ticket → WorkItem).

---

## Versioning

### Document Versions

All governance documents carry semantic versioning:

- **Major (X.0.0):** Architectural change, constitution amendment, breaking invariant change
- **Minor (x.Y.0):** New feature, new term, new ADR, new capability
- **Patch (x.y.Z):** Clarification, typo fix, example addition

### Version Dependencies

| Document | Current | Dependencies |
|----------|---------|-------------|
| `ubiquitous-language.md` | 1.0.0 | Constitution |
| `AWS-001-agent-workspace-specification.md` | 1.0.0 | Constitution, Ubiquitous Language |
| `SKR-001.md` | 1.0.0 | Constitution, ASC-001, INTENT-001 |
| `synth-audit-blueprint.md` | 1.0.0 | All above |
| `knowledge-evolution.md` | 1.0.0 | All above |

A change to a lower document may require version bumps in dependent documents.

---

## Audit Trail

Every architectural change must leave an audit trail.

### Required Artifacts

| Artifact | Purpose |
|----------|---------|
| ADR | Records the decision |
| Diff | Shows what changed |
| Migration report | Shows impact on existing code/docs |
| Conformance test results | Proves invariants still hold |
| Audit report | Records verification |

### The Audit Trail Chain

```
ADR (decision)
    |
    v
Diff (implementation)
    |
    v
Migration report (impact)
    |
    v
Conformance tests (verification)
    |
    v
Audit report (final validation)
```

No architectural change is complete without all five artifacts.

---

## Emergency Changes

In exceptional circumstances, architecture may change without full process.

### Emergency Criteria

- Security vulnerability requiring architectural change
- Data corruption requiring event model change
- Critical nondeterminism requiring runtime change
- External dependency requiring layer boundary change

### Emergency Process

1. Document the emergency and its justification
2. Make the minimum viable change
3. Full architectural audit within 48 hours
4. Retroactive ADR within 1 week
5. If the change is rejected, implement rollback plan

---

## Prohibited Changes

The following may never change, even by constitutional amendment:

| Invariant | Rationale |
|-----------|-----------|
| Single Mutation Authority | Without this, determinism is impossible |
| Event sourcing model | Without this, replay is impossible |
| Replay determinism | Without this, trust is impossible |
| Audit requirement | Without this, governance is impossible |

These are the system's foundational axioms. They define Synth's identity. Changing them would create a different system.

---

## Related Documents

| Document | Relationship |
|----------|-------------|
| `synth-audit-blueprint.md` | Defines how changes are verified after implementation |
| `ubiquitous-language.md` | Subject to vocabulary evolution rules |
| `AWS-001-agent-workspace-specification.md` | Subject to specification update rules |
| `SKR-001.md` | Subject to knowledge representation evolution rules |

---

*Document: Knowledge Evolution*
*Status: Governance Document*
*Version: 1.0.0*
*Classification: Architectural Constitution — Level 2*
