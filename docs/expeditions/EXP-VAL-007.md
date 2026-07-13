# EXP-VAL-007 — Agentic Mission Lifecycle Correction

**Status:** Completed  
**Kind:** Validation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-003 — SYNTH Validation Program  
**Depends On:** EXP-VAL-006  
**Blocks:** EXP-PROGRAM-003 completion

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Context

During the Validation Program we discovered that `synth mission create` attempts to immediately approve a Mission by calling `MissionStudio.approve()`. This causes the command to fail when Mission Studio correctly rejects approval due to insufficient confidence.

This is **not** a Mission Studio bug.

Mission Studio is behaving correctly.

The problem is that the CLI assumes the following lifecycle:

```text
Idea
↓
Mission Create
↓
Approved Mission
↓
Genesis
```

This contradicts the intended architecture.

The correct lifecycle is:

```text
Idea
↓
Mission Draft
↓
Mission Studio Session
↓
Mission Proposal
↓
Approval Decision
↓
Approved Mission Snapshot
↓
Genesis
↓
Execution
↓
Replay
```

Mission creation and Mission approval are distinct responsibilities and must become distinct operations.

---

## Objectives

Correct the CLI semantics to match the SYNTH architecture.

Do **not** weaken Mission Studio.

Do **not** lower confidence thresholds.

Do **not** fake evidence quality.

Instead, expose the actual planning lifecycle.

---

## Required Changes

### 1. Split Mission Creation from Mission Approval

`synth mission create` must:

- create a Planning Session
- collect observations
- run Mission Studio planning
- generate Mission Proposals
- return the Planning Session identifier
- return confidence
- return unknowns
- return questions
- return proposed Missions

It must **not** call `approveModel()`.

Create a second command:

```text
synth mission approve
```

which performs:

```text
MissionStudio.approve(...)
```

using an existing Planning Session.

---

### 2. Introduce Mission Draft as a First-Class Artifact

The CLI currently jumps directly from Idea to Approved Snapshot.

Instead, introduce a public concept:

```text
Mission Draft
```

A Mission Draft represents:

- Planning Session
- observations
- world model
- proposals
- confidence
- unknowns
- planning decisions

It exists before approval.

This is a public lifecycle artifact, not merely an implementation detail.

---

### 3. Preserve Mission Studio Authority

Do **not** implement any of the following:

- ❌ Lower approval thresholds.
- ❌ Change confidence weights.
- ❌ Mark CLI observations as "certain".
- ❌ Auto-approve low-confidence Missions.

Mission Studio remains the sole authority regarding approval.

---

### 4. Improve API Semantics

Currently:

```json
{
  "status": "error"
}
```

is returned when approval is denied.

This mixes transport failures with policy decisions.

Instead distinguish transport success from business decision.

Example:

```json
{
  "status": "ok",
  "decision": {
    "approved": false,
    "reason": "Confidence below threshold",
    "confidence": 0.67
  },
  "proposals": [...]
}
```

Operational failures (invalid session, internal exceptions, missing parameters) should continue returning:

```json
{
  "status": "error"
}
```

---

### 5. CLI Exit Codes

Operational failures:

```text
exit code 1
```

Examples:

- invalid command
- invalid parameters
- bootstrap failure
- runtime exception

Business decisions:

```text
exit code 0
```

Examples:

- Mission not approved
- More evidence required
- Confidence below threshold

The command executed successfully; the decision was simply "not approved".

---

### 6. AI-Native Interaction

The CLI should support conversational workflows.

Example:

```text
$ synth mission create --subject "SYNTH Migration" --purpose "Adopt SYNTH governance for deterministic execution."

Mission Draft created.

Planning Session:
    ps_01H...

Confidence:
    0.67

Mission Studio requires additional evidence.

Unknowns:

• Deployment target
• Existing repository
• Team size

Questions:

1. Is this a greenfield or brownfield project?
2. What technology stack exists today?
3. What are the primary objectives?

Proposed Mission:

SYNTH Migration

No approval has been performed.

Next step:

synth mission approve --draft-id <draft-id>
```

This output is intentionally designed for AI agents to consume.

---

## AI-Native Design Principle

Remember the primary architecture principle:

```text
Human
↓
AI Agent
↓
SYNTH
```

The human expresses intent.

The AI gathers evidence.

Mission Studio evaluates confidence.

The human approves.

Genesis commits.

Execution begins.

The CLI should optimize for this interaction model instead of behaving like a traditional imperative command-line tool.

---

## Validation Updates

Update the Validation Program accordingly.

The benchmark must no longer assume automatic approval.

Instead validate:

- ✅ Mission Draft created
- ✅ Planning Session created
- ✅ Proposal generated
- ✅ Confidence computed
- ✅ Unknowns reported
- ✅ Approval requested
- ✅ Approval succeeds only after sufficient evidence

---

## Acceptance Criteria

The implementation is considered complete when all of the following are true:

- [x] `mission create` no longer attempts automatic approval.
- [x] Mission approval is an explicit operation.
- [x] Mission Studio confidence model remains unchanged.
- [x] Confidence thresholds remain unchanged.
- [x] No evidence quality is artificially inflated.
- [x] CLI exit codes distinguish operational failures from business decisions.
- [x] AI benchmark reflects the new lifecycle.
- [x] Documentation and examples are updated to describe the new agentic workflow.
- [x] `npm run govern` passes without modifications to Mission Studio's approval semantics.

---

## Guiding Principle

**Do not modify the architecture to satisfy the benchmark. Modify the benchmark and the public interface to accurately reflect the architecture.**

The Validation Program exists to expose mismatches between implementation and design. This is one of those cases. The correct solution is to align the public workflow with SYNTH's AI-native philosophy, not to weaken the deterministic planning model.

---

## Implementation Plan

1. **Create `synth mission draft` semantics** — Split `cmdMissionCreate` in `src/cli/synth.ts` so it only creates a Planning Session and returns proposals, confidence, unknowns, and questions. Remove the call to `approveModel`.
2. **Create `synth mission approve` command** — Add `cmdMissionApprove` that takes a Planning Session and calls `MissionStudio.approve`. Return a decision object distinguishing approval, rejection, and operational errors.
3. **Update API semantics** — Modify `SynthAPI.missionStudioOperation` `approveModel` case to return `status: "ok"` with `{ decision: { approved: false, reason, confidence }, proposals }` when Mission Studio rejects approval, and `status: "error"` only for operational failures.
4. **Update CLI exit codes** — `printError` continues to exit with code 1. Business decisions (approval rejected) exit with code 0.
5. **Update AI Benchmark** — Change `scripts/ai-benchmark.js` prompt suite to use `mission create` for draft generation and `mission approve` for approval. Validate draft creation, proposals, and explicit approval flow.
6. **Update tests** — Adjust `tests/ai-benchmark.test.js`, `tests/adoption-validation.test.js`, and any CLI tests to expect the new lifecycle.
7. **Update agent documentation** — Rewrite `docs/guides/agents/prompts/create-mission.md` to describe the two-step workflow.
8. **Verify** — Run `npm run build`, `npm run test:all`, `npm run proof`, `npm run docs:check-links`, `npm run audit:repository`.

---

## Completion Notes

- **Status:** Completed.
- **CLI changes:** `synth mission create` now creates a Planning Session and returns a `MissionDraft` with `draftId`, `confidence`, `unknowns`, `questions`, and `proposals`. It no longer calls `MissionStudio.approve()`. `synth mission approve --draft-id <id>` performs the explicit approval step and returns a `MissionApprovalDecision`.
- **API changes:** `approveModel` returns `status: "ok"` with `{ decision: { approved: false, reason, confidence }, proposals }` when Mission Studio rejects approval; operational failures still return `status: "error"`.
- **Exit codes:** Business decisions (approval rejected) exit with code `0`; operational failures exit with code `1`.
- **Mission Studio unchanged:** confidence weights, thresholds, and evidence quality were not modified.
- **AI Benchmark updated:** `scripts/ai-benchmark.js` now runs `mission create` → `mission approve --draft-id <id>` and records `missionDraftCreated` and `missionApprovalDecision`.
- **Documentation updated:** Agent integration guides, the create-mission prompt, the adoption-study protocol, and the SYNTH AI Benchmark audit report (`docs/audits/SYNTH-AI-BENCHMARK-001.md`) now describe the agentic lifecycle.
- **Verification:** `npm run build`, `npm run test:ai-benchmark`, and full `npm run govern` all passed. A proof was generated and accepted: `proof/proof-2026-07-13T03-29-32-198Z.json`.
