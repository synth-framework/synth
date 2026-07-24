# EXP-HOME-006 — Discovery Phase (v2)

> **Product expedition.** Define the Discovery phase inside Mission Studio: unknowns, constraints, findings, and the transition from raw intent to understood intent.

**Status:** Completed (pending acceptance)  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-003 (Mission Studio UI Specification), EXP-HOME-004 (Homepage / Mission Studio Integration)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/governance-visualization.md`](../design/governance-visualization.md).

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

Transform the former Governance Visualization scope into the Discovery phase of Mission Studio. This phase demonstrates how SYNTH explores intent, surfaces unknowns, identifies constraints, and produces findings before proposing a Mission.

---

## Origin Evidence

Visitors often believe AI tools generate code immediately. Discovery is the proof that SYNTH first understands: it asks questions, identifies boundaries, and records evidence. The Discovery phase must make that process visible and credible.

---

## Required Change

### 1.1 Phase purpose

- Explore the captured intent.
- Surface unknowns and constraints.
- Produce findings and domain observations.
- Prepare the visitor for Mission proposal.

### 1.2 Discovery artifacts

- **Finding Card:** validated observation about the intent.
- **Unknown Card:** open question that must be resolved.
- **Constraint Card:** boundary or limitation discovered during exploration.
- **Domain Card:** initial entities, relationships, or bounded contexts.
- **Evidence Strip:** sources and confidence for each finding.

### 1.3 Unknowns

- Unknowns are first-class artifacts, not failures.
- Each unknown shows confidence, impact, and whether it blocks Mission proposal.
- Visitors may see unknowns resolve as Discovery progresses.

### 1.4 Constraints

- Constraints appear as a dedicated artifact type.
- Each constraint includes category (technical, organizational, temporal, regulatory) and rationale.
- Constraints inform the Mission and Expedition proposals.

### 1.5 Sidebar highlights

- Discovery phase is highlighted.
- Intent phase is marked completed.
- Progress indicator advances.
- Unknown and constraint counts may appear as status badges.

### 1.6 Status badges

- Status: `Exploring`, `Unknowns Found`, `Constraints Identified`, `Findings Ready`.

### 1.7 Scroll transition

- Entering Discovery from Intent fades in the first finding.
- Progressing through Discovery reveals unknowns, constraints, and domain observations in sequence.
- Scrolling forward advances the Discovery narrative; scrolling backward returns to earlier Discovery artifacts.

### 1.8 Animation

- Findings appear with staggered, calm motion.
- Unknowns resolve with a subtle state change.
- Constraint cards emphasize boundaries without alarming visual noise.

---

## Deliverables

1. **Discovery Phase Specification** under `docs/design/governance-visualization.md`.
2. **Finding, Unknown, Constraint, and Domain artifact components**.
3. **Evidence strip component** showing confidence and source.
4. **Discovery narrative sequence** tied to scroll progress.
5. **Tests** verifying artifact rendering, unknown resolution, and phase transition.

---

## Acceptance Criteria

- Discovery artifacts are rendered from the component catalog.
- Unknowns and constraints are visible and explained.
- Sidebar highlights Discovery and shows progress.
- Status badges reflect Discovery state.
- Scroll transitions move through findings, unknowns, constraints, and domain artifacts.
- Discovery completes before Mission phase can begin.
- Animations are calm and respect reduced-motion preferences.

---

## Out of Scope

- Intent phase (EXP-HOME-005).
- Mission phase (EXP-HOME-007).
- Full Genesis Discovery implementation (EXP-PROGRAM-022).

---

## Success Criteria

The expedition succeeds when a visitor can explain what Discovery produced, what remains unknown, and why those unknowns matter before the Mission is proposed.

---

## Related documents

- `docs/design/governance-visualization.md`
- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-004.md`
- `docs/expeditions/EXP-HOME-005.md`
- `docs/expeditions/EXP-HOME-007.md`
