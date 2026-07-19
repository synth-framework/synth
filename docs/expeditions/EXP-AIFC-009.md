# EXP-AIFC-009 — Replay and Governance Integration

> **Architecture expedition.** Integrate First Contact Discovery artifacts with replay verification and governance proofs.

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-007, EXP-AIFC-008  
**Blocks:** EXP-AIFC-010

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

Ensure First Contact Discovery sessions are first-class replayable artifacts. The integration must:

- Emit events for every Discovery phase transition.
- Record the Discovery artifact in a form the replay verifier can consume.
- Include Discovery proofs in governance output.
- Preserve the immutability and provenance of approved artifacts.

---

## Required Change

### 9.1 Discovery event model

Define events for:

```text
FIRST_CONTACT_STARTED
INTENT_EXTRACTED
CLARIFICATION_TURN
ARCHITECTURE_PROJECTED
CAPABILITY_VERIFIED
DISCOVERY_APPROVED
MISSION_MATERIALIZED
EXPEDITIONS_PROPOSED
```

### 9.2 Artifact provenance

Every approved Discovery artifact carries:

```text
sessionId
eventIds[]
artifactHash
validatorVersion
```

### 9.3 Governance proof integration

The governance pipeline must verify that:

- Approved Discovery artifacts are present and intact.
- Materialized Missions trace back to an approved Discovery artifact.
- Expedition proposals trace back to the same artifact.

---

## Deliverables

1. **Discovery event definitions** added to the event model.
2. **Replay verifier extensions** for Discovery artifacts.
3. **Governance proof integration** for First Contact sessions.
4. **ADR** on Discovery replay semantics.

---

## Acceptance Criteria

- A Discovery session replays to the same state from its events.
- Artifact integrity is verified by hash.
- Governance proofs include Discovery provenance.
- Materialized Missions include a reference to the originating Discovery artifact.

---

## Out of Scope

- Changing core replay semantics.
- Changing the Mission lifecycle.
- Certification with operators (EXP-AIFC-010).

---

## Success Criteria

The expedition succeeds when `synth explain replay` can reconstruct a greenfield project from First Contact events and governance verifies the artifact chain.
