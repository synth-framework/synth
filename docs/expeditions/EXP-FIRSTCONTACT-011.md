# EXP-FIRSTCONTACT-011 — Agent First Contact Learning System

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-010  
**Blocks:** Future first-contact quick-start library and onboarding contract

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

## Purpose

Extend the SYNTH First Contact experience into an evidence-driven learning system that captures agent behavior during initial repository interaction and transforms those observations into validated quick-start conversation patterns.

---

## Objective

Determine:

- What agents misunderstand during first contact.
- What evidence causes model correction.
- Which questions produce the highest information gain.
- Which responses create the lowest-friction path toward correct project understanding.
- Which interactions should become canonical quick-start examples.

---

## Problem Statement

Current first contact assumes we know what agents need.

This expedition tests the opposite assumption:

> The first contact experience should learn what reasoning entities require to construct the correct initial model.

An agent entering a repository is performing interpretation:

```text
Unknown Environment
        |
        v
Evidence Collection
        |
        v
Initial Mental Model
        |
        v
Action Selection
```

The failure mode is not lack of intelligence.

The failure mode is incorrect initial topology.

As observed:

```text
React Native concepts
+
components
+
navigation
+
missing implementation

=
"incomplete application"
```

when the intended model was:

```text
knowledge repository
+
specification artifacts
+
future implementation target
```

The objective is to identify the minimum intervention required to move the agent toward the correct attractor state.

---

## Scope

### Included

#### 1. First Contact Experiment Harness

Execute controlled agent sessions against SYNTH repositories.

Capture:

- initial interpretation
- assumptions
- questions asked
- files inspected
- commands executed
- decisions made
- recovery behavior after correction

#### 2. Agent Trajectory Recording

Create evidence artifacts:

```text
evidence/
 └── first-contact/
      ├── session-001/
      │    ├── transcript.md
      │    ├── actions.json
      │    ├── assumptions.md
      │    └── corrections.md
      │
      └── session-002/
```

#### 3. Misinterpretation Taxonomy

Classify failures:

##### Category A — Intent confusion

Example:

```text
"Is this an application?"
```

when:

```text
"This is a specification repository."
```

##### Category B — Missing context

Example:

```text
No package.json detected.
```

Agent assumes:

```text
broken project
```

instead of:

```text
pre-implementation state
```

##### Category C — Governance confusion

Example:

Agent starts modifying:

```text
.synth/
governance/
contracts/
```

instead of working on the product.

##### Category D — Vocabulary mismatch

Example:

Human says:

```text
Mission
```

Agent interprets:

```text
task list
```

instead of:

```text
governed transformation objective
```

---

## Evidence Model

Each first contact session produces:

```text
FirstContactEvidence
{
    repository_state,
    agent_initial_model,
    evidence_consumed,
    interpretation_changes,
    interventions,
    final_model,
    success_conditions
}
```

---

## Quick Start Generation

The quick-start examples are generated from successful evidence.

Not:

```text
Example:
"Create a project"
```

but:

```text
Observed:

Agent entered unknown repository.

Initial interpretation:
"Existing React Native application."

Intervention:
"Clarify repository intent."

Result:
Agent correctly identified:
"Specification repository."

Pattern extracted:
Repository Intent Clarification.
```

---

## Canonical Artifacts

The reusable knowledge lives as deterministic, evidence-backed artifacts:

```text
first-contact/
 └── conversation-patterns/
      ├── repository-discovery.json
      ├── architecture-exploration.json
      ├── implementation-start.json
      ├── documentation-project.json
      └── recovery-patterns.json
```

## Output Artifacts

The expedition produces:

```text
first-contact/
 └── conversation-patterns/          # canonical, evidence-backed patterns
      └── *.json

docs/
 └── first-contact/
      └── quick-start/                # projections of canonical patterns
           ├── repository-discovery.md
           ├── architecture-exploration.md
           ├── implementation-start.md
           ├── documentation-project.md
           └── recovery-patterns.md
```

Documentation is a projection; `conversation-patterns/*.json` is the source of truth.

---

## Example Quick Start Conversation Format

Generated from evidence:

### Scenario: New SYNTH Project Repository

#### Agent

> I have inspected the repository. It contains documentation, architecture artifacts, and governance files, but no implementation code.

#### System

> This repository represents a product specification state. Implementation has not started. Your role is to understand the intended system before generating implementation artifacts.

#### Agent

> Understood. I will treat existing documentation as the source of intent and avoid assuming missing implementation files are errors.

This is not a tutorial. It is a **trajectory correction pattern**.

---

## Success Metrics

### 1. Initial Interpretation Accuracy

Before intervention:

```text
What did the agent think this was?
```

After intervention:

```text
Did it converge to intended repository purpose?
```

### 2. Correction Cost

Measure:

```text
number of messages
+
files inspected
+
wrong actions
```

required to reach correct understanding.

Lower is better.

### 3. Intent Fidelity

Measure:

```text
Initial intent
        |
        v
Agent reconstructed model
```

The goal is maximum preservation with minimum transmitted context.

This connects directly to the earlier principle:

> The best knowledge transfer does not minimize information; it minimizes unnecessary deformation of the receiver's model.

---

## Deliverables

### EXP-FIRSTCONTACT-011-A — First Contact Evidence Schema ✅

Define the schema for `FirstContactEvidence` artifacts.

### EXP-FIRSTCONTACT-011-B — Agent Experiment Runner ✅

Create a harness for executing controlled agent sessions and capturing trajectories.

### EXP-FIRSTCONTACT-011-C — Conversation Pattern Extractor ✅

Produce deterministic `ConversationPattern` artifacts from `FirstContactEvidence`.

Implemented in `src/first-contact/patterns.ts` and `scripts/extract-conversation-patterns.js`.

### EXP-FIRSTCONTACT-011-D — Pattern Validation ✅

Verify minimum evidence count, confidence threshold, deterministic extraction, and absence of conflicting trajectories before a pattern is promoted from provisional to canonical.

Implemented in `src/first-contact/patterns.ts` and tested in `tests/first-contact-patterns.test.js`.

### EXP-FIRSTCONTACT-011-E — Projection Layer ✅

Generate `docs/first-contact/quick-start/` as projections of canonical `ConversationPattern` artifacts.

Implemented in `scripts/generate-first-contact-quickstart.js` and tested in `tests/first-contact-quickstart.test.js`.

### EXP-FIRSTCONTACT-011-F — First Contact Experience v2 Specification ✅

Document the self-improving first-contact system design.

Authored in `docs/first-contact/experience-v2.md`.

---

## Phases

### Phase 1 — Define evidence schema ✅

Establish the `FirstContactEvidence` structure and taxonomy categories.

### Phase 2 — Build experiment runner ✅

Create the harness, run controlled sessions across diverse repository types, and generate baseline evidence artifacts.

### Phase 3 — Pattern extraction ✅

Produce deterministic `ConversationPattern` artifacts from `FirstContactEvidence`. Every field must trace back to evidence; the extractor must not invent.

### Phase 4 — Pattern validation ✅

Promote a pattern from provisional to canonical only when it passes:

- minimum evidence count
- confidence threshold
- deterministic extraction
- no conflicting trajectories

### Phase 5 — Projection layer ✅

Generate `docs/first-contact/quick-start/` Markdown projections from canonical `ConversationPattern` artifacts.

### Phase 6 — Specify v2 experience ✅

Produce the First Contact Experience v2 specification and onboarding contract.

---

## Governance

### Protected

- First Contact intent
- Evidence model
- Agent trajectory capture
- ConversationPattern artifact and derivation process
- Quick-start projection process

### Not included

- SYNTH architecture changes
- CLI redesign
- Governance model changes
- New project workflows

This expedition observes and improves the **entry experience**, not SYNTH itself.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-PROGRAM-009.md` | Program container for Canonical First Contact Experience. |
| `docs/expeditions/EXP-FIRSTCONTACT-010.md` | Agent Ground Truth Discovery; provides the observed trajectories this expedition transforms into patterns. |
| `docs/audits/initialization-governance-audit-2026-07-18.md` | Baseline audit identifying the resolver/initialization gap that affects first-contact behavior. |
