# EXP-AIFC-002 — Discovery Artifact Schema

> **Architecture expedition.** Design the immutable, replayable Discovery artifact that captures greenfield intent before any project state exists.

**Status:** Completed and accepted  
**Started:** 2026-07-19  
**Completed:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-001  
**Blocks:** EXP-AIFC-003, EXP-AIFC-004, EXP-AIFC-005

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Define the canonical schema for a First Contact Discovery artifact. The artifact must be:

- **Complete enough** to generate a Mission and architecture candidates.
- **Immutable** once approved.
- **Replayable** from its inputs and the clarification transcript.
- **Hashable** for governance proofs.

---

## Required Change

### 2.1 Define artifact fields

A Discovery artifact contains at minimum:

```text
id
sessionId
version
createdAt
intent
  — plain-language description
  — extracted goals
  — success criteria
audience
  — primary users
  — stakeholders
environment
  — target runtime
  — language preferences
  — platform constraints
capabilities
  — required capabilities
  — optional capabilities
constraints
  — functional constraints
  — non-functional constraints
unknowns
  — identified uncertainties
  — confidence score per field
risks
  — technical risks
  — product risks
confidence
  — overall confidence score
  — minimum confidence threshold
architectureCandidates[]
  — candidate projections (added in EXP-AIFC-005)
transcript[]
  — operator inputs
  — clarification questions and answers
provenance
  — source events
  — validator versions
```

### 2.2 Specify serialization

The artifact must serialize deterministically to JSON and support canonical hashing. Array ordering and key ordering must be stable.

---

## Deliverables

1. **Discovery Artifact Schema** document under `docs/reference/first-contact-artifact-schema.md`.
2. **JSON Schema** file for validation.
3. **Example artifacts** for at least two greenfield scenarios.
4. **ADR** on artifact semantics, immutability, and replay.

---

## Acceptance Criteria

- The schema validates example artifacts.
- Every field required for Mission generation is present.
- The artifact is deterministic and can be hashed.
- Approved artifacts cannot be silently mutated.
- The schema is versioned.

---

## Out of Scope

- Extracting values from operator input (EXP-AIFC-003).
- Generating architecture candidates (EXP-AIFC-005).
- Materializing the project (EXP-AIFC-007).

---

## Success Criteria

The expedition succeeds when downstream expeditions can read, write, and validate Discovery artifacts against a stable schema.
