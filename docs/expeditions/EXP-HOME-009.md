# EXP-HOME-009 — Capabilities Explorer

> **Product expedition.** Build a grid of runtime concepts that links to documentation.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-004 (Artifact System)  
**Blocks:** EXP-HOME-015

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

Provide a browsable grid of SYNTH capabilities that reinforces the public vocabulary and links visitors to canonical documentation.

---

## Origin Evidence

Visitors need a quick overview of what SYNTH does. A capabilities grid grounded in runtime concepts is more honest than a feature marketing grid.

---

## Required Change

### 1.1 Capabilities

```text
Mission
Discovery
Governance
Replay
Compiler
Kernel
Knowledge
Architecture
Adapters
```

### 1.2 Card behavior

- Each capability is an Artifact Card variant.
- Hover reveals a one-sentence description.
- Click links to the canonical documentation page.

### 1.3 Adapter capability

Adapters are first-class capabilities. The homepage must surface the adapter ecosystem as a capability area that explains how Synth integrates with external tools and sources without modifying core governance.

### 1.4 Consistency

- Use semantic colors.
- Maintain calm computing principles.
- Avoid feature-checklist language.

---

## Deliverables

1. **Capabilities Explorer Specification** under `docs/design/capabilities-explorer.md`.
2. **Capabilities grid component**.
3. **Documentation links** for each capability.

---

## Acceptance Criteria

- Each capability maps to a runtime SYNTH concept.
- Adapters are surfaced as a first-class capability with a clear link to adapter documentation.
- Grid is responsive and accessible.
- Links lead to canonical documentation.

---

## Out of Scope

- Architecture explorer (EXP-HOME-008).
- Genesis experience (EXP-HOME-003).
- Workflow visualization (EXP-HOME-005).

---

## Success Criteria

The expedition succeeds when a visitor can browse capabilities and understand which SYNTH concept each represents.
