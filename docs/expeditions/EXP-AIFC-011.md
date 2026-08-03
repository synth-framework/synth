# EXP-AIFC-011 — Detected-Stack Adapter & Workflow Recommendation

> **Architecture/Product expedition.** Consume an approved Discovery artifact and selected ArchitectureCandidate, then recommend SYNTH adapters and a default workflow template for the materialization context.

**Status:** Completed  
**Kind:** Architecture/Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** TaskPRO real-world onboarding retrospective, EXP-AIFC-007 mission materialization findings, EXP-ADP-000 adapter architecture  
**Depends On:** EXP-AIFC-007, EXP-AIFC-008, EXP-AIFC-009, EXP-ONBOARD-002  
**Blocks:** none

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

## Objective

After an operator approves a Discovery artifact and selects an architecture, First Contact materialization should know which SYNTH adapters are relevant and what default workflow sequence to propose. This expedition adds a deterministic recommendation layer that:

- Maps the detected runtime, language, and capabilities from the Discovery artifact to registered SYNTH adapter ids with confidence scores.
- Selects a default workflow template based on the selected architecture type.
- Presents both recommendations during `synth first-contact materialize --dry-run`.
- Requires explicit `--approve` before any adapter is activated in `.synth/manifest.json` or capability configuration.
- Emits the recommendations into the materialization context so downstream expeditions can consume them as structured evidence.

---

## Scope

### In Scope

- Detected-stack adapter recommendation engine.
- Workflow template selection engine.
- Extension of the materialization preview (`--dry-run`) to show `recommendedAdapters` and `workflowTemplate`.
- Extension of the approved materialization output to include `recommendedAdapters` and `workflowTemplate`.
- Registration of recommended adapters in `.synth/manifest.json` and/or capability configuration only after `--approve`.
- Human approval gate before adapter activation.
- Integration with the existing `src/first-contact/materialize/` pipeline (EXP-AIFC-007).
- Unit tests and CLI tests for recommendation output and approval gate behavior.
- Updates to first-contact CLI help text to describe the new preview fields.

### Out of Scope

- Root dotfile configuration (`.synthrc` / `synth.yml`). This is explicitly excluded.
- New external adapter implementations.
- Changes to the core capability registry or event model.
- Brownfield migration recommendation logic.
- Dynamic marketplace fetching of adapters.

---

## Required Change

### 11.1 Adapter recommendation engine

The engine consumes:

```text
approvedArtifact.intent
approvedArtifact.environment.targetRuntime
approvedArtifact.environment.languagePreferences[]
approvedArtifact.environment.platformConstraints[]
approvedArtifact.capabilities.required[]
approvedArtifact.capabilities.optional[]
selectedArchitecture.id
selectedArchitecture.name
```

It produces a ranked list of `RecommendedAdapter` entries:

```text
adapterId          : string   (e.g., "repository", "github", "tdd", "nextjs-runtime")
kind               : "integration" | "methodology" | "runtime"
confidence         : number   (0.0–1.0)
reason             : string
required           : boolean
capabilities       : string[]
```

Confidence scoring rules (rule-based v1):

1. Required capability match: +0.4 if the adapter directly satisfies a required capability.
2. Language/runtime match: +0.3 if the adapter is known to support the detected language/runtime.
3. Platform constraint match: +0.2 if the adapter satisfies a platform constraint.
4. Optional capability match: +0.1 per optional capability matched.
5. Cap at 1.0. Any score below 0.25 is dropped from the recommended list.

Example mappings:

| Detected signal | Recommended adapter | Kind |
|---|---|---|
| `targetRuntime: "node"`, language `typescript`, intent mentions web UI | `nextjs-runtime` | runtime |
| `targetRuntime: "node"`, language `typescript`, API mentioned | `api-route` | runtime |
| Language `python`, entry type CLI | `python-cli` | runtime |
| Required capability `testing` | `tdd` | methodology |
| Required capability `ci` / platform `github` | `github` | integration |
| Platform constraint `git` present | `repository` | integration |

### 11.2 Workflow template selection engine

The engine selects a default `WorkflowTemplate` from a canonical catalog based on the selected architecture type.

```text
id                 : string
name               : string
architectureTypes  : string[]
phases             : WorkflowPhase[]
```

Where each `WorkflowPhase` is:

```text
id                 : string
title              : string
description        : string
expeditionSubject  : string
requiredAdapters[] : string[]
nextPhase          : string | null
```

Canonical templates (v1):

- **Next.js full-stack chatbot**  
  `ui-component → api-route → integration-test → documentation`

- **Python CLI**  
  `intent → test → package → publish`

- **Generic greenfield**  
  `baseline-capture → architecture-validation → first-increment`

Selection priority:

1. Exact match against `selectedArchitecture.name` or `selectedArchitecture.id`.
2. Match against `approvedArtifact.environment.targetRuntime`.
3. Match against primary language in `approvedArtifact.environment.languagePreferences`.
4. Fallback to the generic greenfield template.

### 11.3 Output shape

The materialization preview (`--dry-run`) and the final materialization result include:

```json
{
  "recommendedAdapters": [
    {
      "adapterId": "tdd",
      "kind": "methodology",
      "confidence": 0.9,
      "reason": "Required capability 'testing' detected",
      "required": true,
      "capabilities": ["testing"]
    }
  ],
  "workflowTemplate": {
    "id": "nextjs-chatbot",
    "name": "Next.js Full-Stack Chatbot",
    "architectureTypes": ["nextjs-chatbot", "nextjs-fullstack"],
    "phases": [
      { "id": "ui-component", "title": "UI Component", ... },
      ...
    ]
  }
}
```

These fields are also added to `MaterializationResult` and to the persisted Discovery artifact (`discovery-artifact.json`) under a new `recommendations` key.

### 11.4 Human gate

- `--dry-run` shows the recommendations and clearly labels them as **pending approval**.
- No adapter is written to `.synth/manifest.json` or capability config unless `materialize --approve` is executed.
- The operator may override individual recommendations with `--adapter <adapterId>=<enabled|disabled>` (future flag; charter only reserves the surface).
- If capability verification status is not `passed`, materialization fails before recommendations are evaluated.

### 11.5 Integration points

- `src/first-contact/materialize/engine.ts`: add `recommendAdapters()` and `selectWorkflowTemplate()` helpers; include results in `MaterializationResult` and event payload.
- `src/first-contact/materialize/types.ts`: add `RecommendedAdapter`, `WorkflowTemplate`, `WorkflowPhase`, and extend `MaterializationResult`.
- `src/cli/first-contact.ts`: include `recommendedAdapters` and `workflowTemplate` in the `--dry-run` preview and in the `--approve` response.
- `.synth/manifest.json`: add a `recommendedAdapters` array listing adapter ids and versions (registration on approval only).
- Capability config: if the manifest supports an `activeAdapters` section, populate it from approved recommendations.
- Event model: extend `MISSION_MATERIALIZED` payload with `recommendedAdapters` and `workflowTemplate` so replay reproduces the same context.

---

## Deliverables

1. **Adapter recommendation module** under `src/first-contact/materialize/recommend.ts`.
2. **Workflow template catalog** under `src/first-contact/materialize/templates/`.
3. **Extended materialization types** in `src/first-contact/materialize/types.ts`.
4. **Updated materialization engine** in `src/first-contact/materialize/engine.ts`.
5. **Updated first-contact CLI** in `src/cli/first-contact.ts`.
6. **Tests** covering recommendation scoring, template selection, dry-run output, and approval gate.
7. **Updated first-contact help text** describing the new preview fields.

---

## Acceptance Criteria

- `synth first-contact materialize --dry-run` displays `recommendedAdapters` and `workflowTemplate`.
- Adapters are scored deterministically for equivalent Discovery artifacts.
- At least three canonical workflow templates exist (Next.js full-stack chatbot, Python CLI, generic greenfield).
- `--dry-run` does not write adapters to `.synth/manifest.json` or capability config.
- `synth first-contact materialize --approve` persists recommended adapters in `.synth/manifest.json`.
- The `MISSION_MATERIALIZED` event payload includes the recommendations.
- Replay reproduces the same recommended adapter list and workflow template.
- Capability verification failures still block materialization before recommendations are evaluated.
- Help text explains the new preview fields.

---

## Risks

| Risk | Mitigation |
|---|---|
| Over-fitting recommendations to a few hard-coded stacks | Keep the v1 catalog small and versioned; design the scoring rules so new adapters can be added without engine changes. |
| Operator confusion if recommended adapters activate implicitly | Require `--approve` and label every `--dry-run` adapter as pending. |
| Manifest bloat from many low-confidence adapters | Drop scores below 0.25 and require `required: true` or `confidence >= 0.6` for auto-activation. |
| Event payload growth | Keep recommendation payload bounded (max 16 adapters, max 12 phases per template). |
| Divergence between CLI preview and persisted output | Use the same `recommendAdapters()`/`selectWorkflowTemplate()` functions for both paths. |

---

## Evidence

- `src/first-contact/materialize/recommend.ts` — deterministic adapter scoring engine (`recommendAdapters`) and workflow template selection (`selectWorkflowTemplate`).
- `src/first-contact/materialize/templates/index.ts` — canonical workflow catalog: Next.js full-stack chatbot, Python CLI, and generic greenfield.
- `src/first-contact/materialize/types.ts` — extended `MaterializationResult` with `RecommendedAdapter` and `WorkflowTemplate`.
- `src/first-contact/materialize/engine.ts` — computes recommendations, adds them to `MISSION_MATERIALIZED`, persists them in `.synth/manifest.json` and the Discovery artifact.
- `src/cli/first-contact.ts` — previews recommendations on `materialize --dry-run` (labeled pending approval) and includes them in `materialize --approve` output.
- `tests/first-contact-recommendation.test.js` — covers determinism, scoring thresholds, template selection, dry-run gate, manifest persistence, and event payload.
- `npm run govern` passes after implementation.

---

## Related Documents

- `docs/expeditions/EXP-AIFC-007.md` — Mission Materialization Pipeline
- `docs/expeditions/EXP-AIFC-008.md` — Greenfield Operator Experience
- `docs/expeditions/EXP-AIFC-009.md` — Replay and Governance Integration
- `docs/expeditions/EXP-PROGRAM-043.md` — Agent Onboarding & Operator Experience
- `docs/adapter-architecture.md` — Synth Adapter Architecture
- `src/first-contact/materialize/engine.ts`
- `src/first-contact/materialize/types.ts`
- `src/cli/first-contact.ts`
