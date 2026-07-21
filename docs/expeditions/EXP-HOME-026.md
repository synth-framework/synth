# EXP-HOME-026 — Homepage Intent Model

> **Genesis expedition.** Capture the explicit and implicit intent for the Mission Studio homepage before any implementation proceeds.

**Status:** Refinement Report Approved — Approved for Alignment  
**Kind:** Genesis Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** none  
**Blocks:** EXP-HOME-027, EXP-HOME-028, EXP-HOME-001, EXP-HOME-002, EXP-HOME-003, EXP-HOME-025

> **Authority:** ADR-045 — Governance Lifecycle & State Machine Specification

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

Produce a canonical `Intent Model` for the Mission Studio homepage that captures not only what was explicitly requested, but also the implicit expectations, forbidden interpretations, and unresolved ambiguity that would otherwise be lost.

---

## Origin Evidence

Program 027 began with the directive to make Mission Studio the SYNTH homepage. The existing design boards, LDS-002 tokens, component catalog, and storyboard references contain strong visual intent, but they do not by themselves constitute a governed interpretation. The homepage incident demonstrated that an agent can be compliant with specifications while diverging from intent. This expedition prevents that failure mode by making the intent explicit and reviewable before implementation resumes.

---

## Required Change

### 1.1 Explicit objectives

- The SYNTH homepage is the first screen of SYNTH.
- Mission Studio is the homepage, not a component within a marketing page.
- The homepage immerses visitors in a guided, interactive Mission Studio experience.
- Supporting content appears only after Mission Studio completes its lifecycle.

### 1.2 Implicit objectives

- The experience should feel like entering a deterministic synthesis environment, not browsing a SaaS landing page.
- The visual language must project engineering trust, calm, and clarity.
- Every visible element must correspond to a real SYNTH concept.
- The homepage must be comprehensible to a first-time visitor within five minutes.

### 1.3 Forbidden interpretations

- Generic SaaS dashboard
- Marketing-first landing page
- Chat interface as the primary interaction model
- Decorative AI imagery disconnected from runtime concepts
- Page-jump navigation instead of persistent workspace

### 1.4 Allowed interpretations

- Scroll-driven workspace phase transitions
- Hero section that invites visitors into Mission Studio
- Light workspace theme as default
- Typography and spacing adjustments within token system

---

## Definition of Done

- [x] Intent Model artifact is created for Program 027.
- [x] Intent Model references all canonical evidence (design boards, LDS-002, storyboards, existing frozen expeditions).
- [x] Explicit objectives, implicit objectives, forbidden interpretations, and allowed interpretations are documented.
- [x] Confidence level and known unknowns are recorded.
- [x] Refinement Gate resolves to `Refined Intent` with an approved Refinement Report.
- [x] Refinement Report is explicitly approved for alignment (governance decision separate from recommendation).
- [x] Intent Model is approved for Alignment Contract creation.

---

## Artifacts

### Intent Model

The canonical Intent Model for Program 027 is recorded at:

```text
docs/governance/program-027/intent-model.json
```

Registered in the event store via:

```bash
synth intent create --file docs/governance/program-027/intent-model.json
```

### Refinement Report

The Refinement Report capturing the inaugural Program 036 review is recorded at:

```text
docs/governance/program-027/refinement-report.json
```

Produced via:

```bash
synth intent refine --intent-model-id intent-model-mru144mr-j9lxxw \
  --answers docs/governance/program-027/refinement-answers.json \
  --recommendation approve_for_alignment \
  --reason "Refinement review confirms intent is clear, evidence-bound, and aligned with Governance Architecture v1.0."
```

The Intent Model was then submitted for downstream Alignment Contract creation:

```bash
synth intent submit --intent-model-id intent-model-mru144mr-j9lxxw
```

### Refinement Approval

The Refinement Report was reviewed and explicitly approved for alignment, preserving the constitutional distinction between recommendation and governance decision:

```bash
synth intent approve --report-id refinement-report-mru1jfin-5blzig \
  --decision approved_for_alignment \
  --reason "Refinement Report reviewed and approved. Intent Model is clear, evidence-bound, and ready for Alignment Contract creation under Governance Architecture v1.0."
```

## Out of Scope

- Alignment Contract creation (EXP-HOME-027).
- Mission approval (EXP-HOME-028).
- Any homepage implementation.

---

## Acceptance Criteria

- A contributor can read the Intent Model and understand what the homepage is supposed to feel like, not just what components it contains.
- The Intent Model is bound to at least one visual reference and one behavioral reference.
- Forbidden interpretations are non-empty and specific enough to prevent generic dashboard drift.
