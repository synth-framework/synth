> **Projection notice.** This document is a deterministic projection of the canonical [ConversationPattern](../../../first-contact/conversation-patterns/) artifacts. Do not edit by hand; regenerate with `node scripts/generate-first-contact-quickstart.js`.

# I want to understand this project before making any changes.

**Trigger:** I want to understand this project before making any changes.

**Canonical confidence:** 0.95

## Preconditions

- Repository initialized: true
- Lifecycle phase: initialized
- State summary: initialized project; phase: initialized
- Expected status fields: status, kind, phase, summary, missions, activeExpeditions, blockers, warnings, nextActions, eventCount, stateHash

## Suggested trajectory

### Turn 1: `status`

**Intent:** Determine the current governance state of the repository.

**Expected reasoning state:**

- Understood as: unknown repository
- Confidence: 0.1
- Unknowns: project purpose; lifecycle phase; next valid action

### Turn 2: `explain`

**Intent:** Read the operator briefing to understand project intent and constraints.

**Expected reasoning state:**

- Understood as: governed project with documentation
- Confidence: 0.4
- Unknowns: specific domain; active mission

### Turn 3: `docs generate`

**Intent:** Materialize documentation projections from the knowledge base.

**Expected reasoning state:**

- Understood as: specification-stage hospitality automation platform
- Confidence: 0.7
- Unknowns: implementation plan

## Decision points

- **Turn 2:** Model corrected from 'unknown repository' to 'governed project with documentation' via 'explain'.
- **Turn 3:** Model corrected from 'governed project with documentation' to 'specification-stage hospitality automation platform' via 'docs generate'.

## Successful prompts

- status — Determine the current governance state of the repository.
- explain — Read the operator briefing to understand project intent and constraints.
- docs generate — Materialize documentation projections from the knowledge base.

## Supporting evidence

- Session `repository-introduction` — [evidence](../../../first-contact/sessions/baseline-repository-introduction-evidence.json)
