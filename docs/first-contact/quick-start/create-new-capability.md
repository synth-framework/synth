> **Projection notice.** This document is a deterministic projection of the canonical [ConversationPattern](../../first-contact/conversation-patterns/) artifacts. Do not edit by hand; regenerate with `node scripts/generate-first-contact-quickstart.js`.

# I need to add authentication to this project.

**Trigger:** I need to add authentication to this project.

**Canonical confidence:** 1

## Preconditions

- Repository initialized: true
- Lifecycle phase: initialized
- State summary: initialized project; phase: initialized
- Expected status fields: status, kind, phase, summary, missions, activeExpeditions, blockers, warnings, nextActions, eventCount, stateHash

## Suggested trajectory

### Turn 1: `status`

**Intent:** Establish current state before proposing a change.

**Expected reasoning state:**

- Understood as: feature request: authentication
- Confidence: 0.3
- Unknowns: existing identity model; governance state

### Turn 2: `explain`

**Intent:** Understand existing decisions and project boundaries.

**Expected reasoning state:**

- Understood as: system transformation requiring governed change
- Confidence: 0.5
- Unknowns: mission alignment; expedition scope

### Turn 3: `mission create --subject Authentication --purpose Add identity and access control to the hospitality platform`

**Intent:** Create a governed mission for the capability.

**Expected reasoning state:**

- Understood as: governed transformation: authentication mission
- Confidence: 0.75
- Unknowns: approval path

## Decision points

- **Turn 2:** Model corrected from 'feature request: authentication' to 'system transformation requiring governed change' via 'explain'.
- **Turn 3:** Model corrected from 'system transformation requiring governed change' to 'governed transformation: authentication mission' via 'mission create --subject Authentication --purpose Add identity and access control to the hospitality platform'.

## Successful prompts

- status — Establish current state before proposing a change.
- explain — Understand existing decisions and project boundaries.
- mission create --subject Authentication --purpose Add identity and access control to the hospitality platform — Create a governed mission for the capability.

## Supporting evidence

- Session `create-new-capability` — [evidence](../sessions/baseline-create-new-capability-evidence.json)
