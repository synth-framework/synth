# EXP-DIST-002 — Agent Skill Projection Pipeline

> **Product expedition.** Generate platform-specific agent skills from the Canonical AI Capability Model.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Depends On:** EXP-DIST-001  
**Blocks:** EXP-DIST-006

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

Produce ChatGPT, Claude, Gemini, and Codex skills that are semantically equivalent because they are all projections of one Canonical AI Capability Model.

---

## Deliverables

- `src/distribution/projection-engine.ts` — projection registry and engine.
- Skill projections: `chatgpt-skill`, `claude-skill`, `gemini-skill`, `codex-instructions`.
- Each projection includes role, trigger, core instructions, capabilities, skills, protocols, and safety constraints.
- CLI command `synth distribute project --target <skill>`.

---

## Acceptance Criteria

- [x] Multiple skill projections can be generated from the same model.
- [x] Projections include public vocabulary and governance constraints.
- [x] Projections do not leak forbidden implementation terminology.

---

## Evidence

- `tests/distribution.test.js` validates skill projections.
- `tests/synth-cli-distribute.test.js` exercises `synth distribute project --target chatgpt-skill`.
