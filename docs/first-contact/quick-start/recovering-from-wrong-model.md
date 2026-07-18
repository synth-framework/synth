> **Projection notice.** This document is a deterministic projection of the canonical [ConversationPattern](../../../first-contact/conversation-patterns/) artifacts. Do not edit by hand; regenerate with `node scripts/generate-first-contact-quickstart.js`.

# I want to understand this project before making any changes.

**Trigger:** I want to understand this project before making any changes.

**Canonical confidence:** 1

## Preconditions

- Repository initialized: false
- Lifecycle phase: uninitialized
- State summary: uninitialized directory; phase: uninitialized
- Expected status fields: status, kind, phase, summary, missions, activeExpeditions, blockers, warnings, nextActions, eventCount, stateHash

## Suggested trajectory

### Turn 1: `status`

**Intent:** Initial inspection before any SYNTH evidence exists.

**Expected reasoning state:**

- Understood as: existing React Native / frontend application
- Confidence: 0.8

### Turn 2: `init --name Hospitality Design System`

**Intent:** Initialize SYNTH governance so intent-shaped evidence becomes visible.

**Expected reasoning state:**

- Understood as: existing React Native / frontend application
- Confidence: 0.6
- Unknowns: why initialize if app exists

### Turn 3: `status`

**Intent:** Re-evaluate interpretation after SYNTH initialization evidence is available.

**Expected reasoning state:**

- Understood as: specification-stage design repository
- Confidence: 0.7
- Unknowns: implementation timeline

## Decision points

- **Turn 2:** Divergence from 'existing React Native / frontend application' to 'existing React Native / frontend application' after 'init --name Hospitality Design System'.
- **Turn 3:** Model corrected from 'existing React Native / frontend application' to 'specification-stage design repository' via 'status'.

## Successful prompts

- status — Initial inspection before any SYNTH evidence exists.
- status — Re-evaluate interpretation after SYNTH initialization evidence is available.

## Anti-patterns

- Assuming 'existing React Native / frontend application' before establishing 'existing React Native / frontend application'.
- Treating a specification repository as an incomplete application.

## Misinterpretation categories

- intent-confusion

## Supporting evidence

- Session `recovering-from-wrong-model` — [evidence](../../../first-contact/sessions/baseline-recovering-from-wrong-model-evidence.json)
