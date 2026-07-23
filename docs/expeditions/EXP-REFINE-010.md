# EXP-REFINE-010 — Interactive Decision Acquisition

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 3 — Interactive Refinement  
**Authority:** Synth Architectural Constitution

---

## Goal

Introduce a canonical interaction model that allows the Refinement Layer to acquire missing knowledge through structured, deterministic decision requests rather than relying exclusively on free-form conversation.

---

## Purpose

The Refinement Layer identifies uncertainty. The Decision Acquisition Engine determines the smallest set of questions required to eliminate that uncertainty. Adapters render those decisions using the richest interaction primitives they support. The refinement process remains deterministic regardless of the interaction surface.

This expedition turns "asking questions" into a reusable, replayable governance capability.

---

## New Concepts

### Interactive Decision

A structured request for a single piece of missing knowledge. It is independent of any UI or adapter.

```text
id
intentModelId
decisionType
question
description
options          // for choice-based types
required
blocking
createdAt
```

### Decision Request

A batch of Interactive Decisions produced by the Decision Acquisition Engine for a single refinement iteration.

```text
id
intentModelId
sessionId
decisions[]
purpose
confidenceTarget
createdAt
```

### Decision Response

The operator's answer, captured as evidence.

```text
id
requestId
decisionId
value            // string | string[] | boolean
reason
evidenceReference
createdAt
```

### Interaction Capability

A capability advertised by an adapter describing which decision types it can render.

```text
free_text
single_choice
multi_choice
boolean
approval
confirmation
ranking
priority_ordering
file_selection
image_selection
reference_selection
```

### Interaction Renderer

Adapter-specific logic that translates an Interactive Decision into the appropriate surface (CLI prompt, Mission Studio UI, chat message, etc.).

---

## Supported Decision Types

| Type | Description | Example |
|---|---|---|
| `free_text` | Open answer | "Describe the primary user." |
| `single_choice` | Select one | "Which platform is primary?" |
| `multi_choice` | Select many | "Which integrations are required?" |
| `boolean` | Yes/no | "Is this public-facing?" |
| `approval` | Approve/reject with reason | "Approve this interpretation?" |
| `confirmation` | Acknowledge | "Confirm this constraint is correct." |
| `ranking` | Order items | "Rank these priorities." |
| `priority_ordering` | Assign relative priority | "Order these milestones." |
| `file_selection` | Choose files | "Select reference documents." |
| `image_selection` | Choose images | "Select the authoritative design." |
| `reference_selection` | Choose existing artifact | "Select the approved architecture diagram." |

---

## Adapter Capability Model

Every AI adapter advertises its interaction capabilities.

Example:

```text
supports:
  ✓ free_text
  ✓ single_choice
  ✓ multi_choice
  ✓ approval
  ✓ confirmation
  ✗ ranking
  ✗ image_selection
```

The Refinement Engine never chooses presentation. It asks for a Decision Request. The adapter chooses the rendering.

---

## Decision Generation Rules

The Decision Acquisition Engine must:

- Minimize the number of questions.
- Maximize confidence gained per question.
- Avoid redundant questions across refinement sessions.
- Merge related uncertainties into single decisions when possible.
- Stop asking once confidence exceeds the required threshold.
- Support optional questions.
- Support blocking questions that prevent refinement from continuing until answered.

---

## Decision Evidence

Every answer becomes evidence.

```text
Intent
  ↓
Decision Request
  ↓
Response
  ↓
Evidence
  ↓
Intent Model Revision
```

Replay reconstructs the entire refinement conversation from Decision Requests and Responses.

---

## Degradation Rules

When an adapter cannot render a decision type, the engine degrades to a compatible alternative:

- `ranking` → `single_choice` of "most important" or `free_text`
- `image_selection` → `reference_selection` or `free_text`
- `multi_choice` → repeated `single_choice` or `free_text`
- `file_selection` → `reference_selection` or `free_text`

No refinement logic depends on a specific AI provider or UI surface.

---

## Deliverables

1. `InteractiveDecision` artifact schema in `src/governance/interactive-decision.ts`.
2. `DecisionRequest` and `DecisionResponse` artifact schemas.
3. Decision Acquisition Engine that selects questions from an Intent Model's ambiguity.
4. Adapter capability detection and negotiation.
5. Interaction renderer interface for CLI, Mission Studio, and AI chat adapters.
6. Replay event types for `INTERACTIVE_DECISION_CREATED`, `DECISION_REQUESTED`, `DECISION_RESPONDED`.
7. Unit tests covering decision generation, adapter capability negotiation, and degradation.

---

## Acceptance Criteria

- Interactive Decision becomes a canonical governance artifact.
- Decision requests are replayable.
- Adapters declare interaction capabilities.
- The refinement engine selects decision types independently of UI.
- Unsupported interaction types automatically degrade to compatible alternatives.
- Every decision response becomes evidence.
- Replay faithfully reconstructs all refinement interactions.
- Mission Studio can render decision requests.
- CLI adapters present equivalent terminal interactions.
- AI chat adapters present equivalent conversational interactions.
- No refinement logic depends on a specific AI provider.

---

## Out of Scope

- Natural-language generation of questions from arbitrary text.
- Real-time bidirectional chat sessions.
- Automated decision-making without operator input.

---

## Related

- ADR-047 — Intent Refinement and Alignment Governance
- ADR-048 — Genesis Lifecycle and Alignment Contracts
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-001 — Refinement Layer Model
- EXP-REFINE-004 — Refinement Questions Engine
- EXP-REFINE-011 — Intent Interpretation Model
