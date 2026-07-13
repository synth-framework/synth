# SYNTH AUDIT BLUEPRINT

## Architectural Verification Methodology

**Version:** 1.0.0
**Status:** Governance Document
**Classification:** Architectural Constitution — Level 2
**Date:** 2026-06-29

---

## Purpose

This document defines the official methodology for performing a full architectural audit of Synth.

An audit is **not** a code review.

An audit is an evidence-based architectural verification process whose objective is to determine whether the implementation faithfully enforces the architectural constitution of Synth.

Every conclusion produced during an audit must be backed by observable evidence from the codebase.

Opinions are not evidence.

Assumptions are not evidence.

---

## Core Principle

The auditor must assume the implementation is incorrect until sufficient evidence proves otherwise.

The purpose of an audit is to falsify architectural assumptions, not to confirm them.

Every architectural invariant should be treated as potentially violated until verified.

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
Knowledge Evolution
        |
        v
SYNTH AUDIT BLUEPRINT  <-  YOU ARE HERE
```

This document defines how every implementation is objectively measured against the principles established by the documents above it.

---

## Audit Philosophy

The audit proceeds from architecture downward.

Never begin from implementation details.

The order is always:

1. Architectural Constitution
2. Architectural Specifications
3. Domain Model
4. Runtime Flow
5. Infrastructure
6. Implementation Details

Never reverse this order.

---

## What An Audit Is Not

| Not An Audit | Is An Audit |
|-------------|-------------|
| Searching for bugs | Verifying architectural invariants |
| Code style review | Tracing mutation paths |
| Performance analysis | Checking layer boundaries |
| Refactoring suggestions | Falsifying architectural assumptions |
| Syntax checking | Evidence-based verification |

---

## Phase 1 — Understand the Architecture

Before reading any code, the auditor must understand:

* Architectural Constitution
* Agent Constitution
* Ubiquitous Language
* Agent Workspace Specification
* Runtime Lifecycle
* Core Domain Concepts

No implementation analysis begins until these documents are understood.

### Entry Criteria

The auditor must be able to recite, without reference:
- The five layers of the execution kernel
- The single mutation authority
- The event sourcing model
- The planning-execution boundary
- The projection layer's responsibilities

If the auditor cannot do this, the audit has not begun.

---

## Phase 2 — Define Architectural Invariants

Identify the system's non-negotiable invariants.

Examples include:

| Invariant | Identifier | Source Document |
|-----------|-----------|-----------------|
| Single Mutation Authority | SMA-001 | Architectural Constitution |
| Event sourcing rules | ES-001 | Architectural Constitution |
| Aggregate ownership | AO-001 | Architectural Constitution |
| Repository boundaries | RB-001 | Architectural Constitution |
| Layer dependencies | LD-001 | Architectural Constitution |
| Runtime lifecycle | RL-001 | Agent Workspace Specification |
| Knowledge evolution rules | KE-001 | Knowledge Evolution |
| Agent responsibilities | AR-001 | Agent Constitution |
| Canonical knowledge independent of execution | KI-001 | SKR-001 |
| Execution vocabulary below planning | KI-002 | SKR-001 |
| Protocol vocabulary below projection | KI-003 | SKR-001 |
| Planning on canonical concepts only | KI-004 | SKR-001 |
| Knowledge layer defines ubiquitous language | KI-008 | SKR-001 |

Each invariant becomes an audit target.

Each target receives a dedicated verification section in the audit report.

---

## Phase 3 — Trace the Runtime

For every invariant:

Trace execution through the entire runtime.

```
API
  |
  v
Execution Gate
  |
  v
Runtime Engine
  |
  v
Domain
  |
  v
Repositories
  |
  v
Event Store
  |
  v
Persistence
```

Every mutation path must be verified.

If an alternate path exists, document it.

If a path bypasses a layer, flag it as a Critical finding.

---

## Phase 4 — Attempt to Break the Architecture

The auditor actively searches for violations.

### Verification Questions

| Question | Invariant Target | Severity If Violated |
|----------|-----------------|----------------------|
| Can state mutate without the Execution Gate? | SMA-001 | Critical |
| Can repositories bypass aggregates? | AO-001 | Critical |
| Can events be skipped or reordered? | ES-001 | Critical |
| Can invariants be bypassed by direct mutation? | SMA-001 | Critical |
| Can agents violate ownership boundaries? | AR-001 | Critical |
| Can dependency direction be inverted? | LD-001 | Major |
| Can planning access execution primitives directly? | KI-004 | Critical |
| Can projection vocabulary leak into planning? | KI-003 | Major |
| can knowledge depend on execution mechanisms? | KI-001 | Critical |
| Can the workspace redefine canonical terms? | KI-008 | Major |

The objective is to find architectural escape hatches.

An escape hatch is any code path that allows behavior forbidden by the architecture.

---

## Phase 5 — Gather Evidence

Every finding requires evidence.

### Acceptable Evidence Types

| Type | Example | Weight |
|------|---------|--------|
| Source file with line number | `dist/synth-v5.js:456` | Primary |
| Function definition | `function applyDomain()` | Primary |
| Call chain | `CommandBus.dispatch -> RuntimeEngine.run -> applyDomain` | Primary |
| Dependency graph | `import { x } from "y"` | Supporting |
| Runtime trace | Stack trace showing mutation path | Primary |
| Test assertion | `assert.strictEqual(replay.consistent, true)` | Supporting |
| Configuration value | `POLICY_VERSION_HASH` | Supporting |

Each finding should reference the exact implementation responsible.

No unsupported claims are allowed.

---

## Phase 6 — Classify Findings

Each finding receives a severity.

### Critical

Architecture violated.

Core invariant broken.

Immediate remediation required.

Example: State mutation bypassing CommandBus.

### Major

Architecture technically preserved but weakened.

Potential future failure.

Requires correction.

Example: Duplicate capability registration without validation.

### Minor

Maintainability issue.

Naming inconsistency.

Documentation mismatch.

Non-critical duplication.

Example: Comment refers to old term name.

### Observation

Interesting implementation detail.

No action currently required.

Example: Clever use of closure for encapsulation.

---

## Phase 7 — Root Cause Analysis

For every issue determine:

- What invariant failed?
- Why did it fail?
- What architectural assumption allowed it?
- How can the architecture prevent recurrence?

Never stop at symptom-level fixes.

### Root Cause Analysis Template

```
Finding: [identifier]
Invariant: [which invariant was violated]
Symptom: [what went wrong]
Root Cause: [why the architecture allowed it]
Architectural Gap: [what's missing from the architecture]
Recommendation: [how to strengthen the architecture]
```

---

## Phase 8 — Recommend Architectural Fixes

Recommendations should improve architecture before improving code.

### Preferred Recommendations

- Removing complexity
- Strengthening boundaries
- Clarifying ownership
- Making invalid states impossible

### Avoid

- Cosmetic refactoring that does not improve architectural integrity
- Code style changes
- Performance optimizations unless architecturally justified
- Adding features to mask architectural weakness

---

## Phase 9 — Verification

After implementation changes:

Repeat the audit.

Never assume a fix is correct.

Verify it.

### Verification Steps

1. Re-run the same verification questions from Phase 4.
2. Check that the invariant is now enforced.
3. Verify no new escape hatches were introduced.
4. Update the audit report with verification evidence.

---

## Evidence Standard

Every conclusion must satisfy:

- **Observable** — Can be seen in the codebase
- **Reproducible** — Can be verified by another auditor
- **Traceable** — Links to specific files, lines, functions
- **Architecturally justified** — Connects to a documented invariant

Evidence always outweighs intuition.

---

## Auditor Rules

The auditor shall:

- Never guess
- Never assume
- Never infer hidden behavior without evidence
- Always inspect implementation
- Always verify runtime flow
- Always challenge architectural assumptions
- Always document evidence

The auditor shall not:

- Recommend refactoring for style
- Optimize without architectural justification
- Accept "it works" as evidence
- Skip phases
- Reverse the audit order

---

## Deliverable Format

Each audit produces:

### Executive Summary

Overall architectural health in one paragraph.

### Architecture Score

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Constitution compliance | PASS/WARN/FAIL | [reference] |
| Runtime integrity | PASS/WARN/FAIL | [reference] |
| Domain integrity | PASS/WARN/FAIL | [reference] |
| Infrastructure integrity | PASS/WARN/FAIL | [reference] |
| Maintainability | PASS/WARN/FAIL | [reference] |
| Risk level | LOW/MEDIUM/HIGH | [reference] |

### Findings

Each finding includes:

- Identifier (e.g., AUDIT-2026-001-A1)
- Severity (Critical/Major/Minor/Observation)
- Description
- Evidence (file, line, function)
- Impact
- Root Cause
- Recommendation
- Verification Steps

### Final Assessment

One of:

| Assessment | Meaning |
|------------|---------|
| **PASS** | Architecture fully enforced. Zero critical or major findings. |
| **PASS WITH OBSERVATIONS** | Architecture enforced. Minor findings or observations only. |
| **PASS WITH MAJOR FINDINGS** | Architecture preserved but weakened. Major findings require correction. |
| **FAIL** | Architecture violated. Critical findings require immediate remediation. |

---

## Audit Triggers

An audit is required when:

- Kernel code changes (any modification to `dist/synth-*.js`)
- Architecture document changes (any modification to `docs/architecture/`)
- New ADR is added
- Constitution is amended
- Major dependency update
- Security incident
- Nondeterminism detected
- Release preparation

An audit is recommended when:

- New feature added
- Refactoring performed
- Documentation updated
- Test coverage changes

---

## Continuous Audit

Certain checks run automatically on every session:

| Check | Method | Document |
|-------|--------|----------|
| Canonical language | `languageAuditor.auditSource()` | AWS-001 |
| Semantic verification | `semanticVerifier.verify()` | AWS-001 |
| Repository health | `health.check()` | AWS-001 |
| Replay determinism | `replayVerifier.verify()` | Architectural Constitution |

These are not substitutes for full audits. They are continuous verification.

---

## Definition of Success

A successful audit does not prove that Synth is correct.

A successful audit increases confidence that Synth's implementation faithfully enforces its architectural principles while exposing any deviations that threaten long-term integrity.

The audit exists to preserve the architecture — not merely the code.

---

## Related Documents

| Document | Relationship |
|----------|-------------|
| `ubiquitous-language.md` | Vocabulary contract — defines terms used in audit findings |
| `AWS-001-agent-workspace-specification.md` | Workspace — provides continuous audit capabilities |
| `SKR-001.md` | Knowledge representation — defines invariants KI-001 through KI-008 |
| `knowledge-evolution.md` | Defines how architecture changes — audited against this blueprint |

---

*Document: SYNTH AUDIT BLUEPRINT*
*Status: Governance Document*
*Version: 1.0.0*
*Classification: Architectural Constitution — Level 2*
