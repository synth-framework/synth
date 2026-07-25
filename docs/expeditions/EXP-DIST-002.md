# EXP-DIST-002 — Agent Skill Projection Pipeline

> Expand the Canonical AI Capability Model into platform-specific agent skills and system prompts for the major AI ecosystems.

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Authority:** Synth Architectural Constitution, EXP-PROGRAM-029 charter  
**Depends On:** EXP-DIST-001 — Canonical AI Capability Model  
**Blocks:** EXP-DIST-003 — SYNTH MCP Server  
**Adoption metric:** Number of distinct AI agent platforms with a generated skill  
**Target:** ≥ 4 platforms (Claude, Codex, ChatGPT, Gemini)

---

## Goal

Turn the Canonical AI Capability Model into complete, platform-native agent skills for every major AI ecosystem where developers and operators might encounter SYNTH. Each skill must be a faithful projection of the canonical model, tailored to the conventions and constraints of its target platform.

---

## Scope

### In scope

- Agent skill projections for:
  - Claude (Skill / System Prompt)
  - Codex (Repository Instructions)
  - ChatGPT (Custom GPT / Knowledge Pack)
  - Gemini (Gem / Instructions)
- A template-based projection architecture so adding new agent platforms is mechanical.
- Consistent structure across all skills: identity, vocabulary, command safety, protected assets, governance lifecycle, workflows.
- Contract tests proving that every agent skill is derived from the canonical model and remains deterministic.

### Out of scope

- Live MCP server implementation (EXP-DIST-003)
- IDE rules (EXP-DIST-005)
- npm package publishing (EXP-DIST-004)
- Website redesign (EXP-DIST-007)

---

## Core abstraction

```text
Canonical AI Capability Model
        ↓
Agent Skill Templates
        ↓
├── agent-skills/claude.md
├── agent-skills/codex.md
├── agent-skills/chatgpt.md
└── agent-skills/gemini.md
```

Each skill is a projection, not a hand-written document. The projection engine selects the appropriate template and fills it from the canonical model.

---

## Acceptance criteria

1. Agent skills exist for Claude, Codex, ChatGPT, and Gemini.
2. Each skill includes:
   - Platform-appropriate identity statement
   - The seven public concepts
   - Discovery-safe commands
   - Mutating commands and approval requirements
   - Protected assets and escalation rules
   - Governance lifecycle phases
   - Common operator workflows
3. The projection engine uses a shared template mechanism rather than one-off generators per platform.
4. Contract tests assert that all agent skills are deterministic and match committed output.
5. `npm run distribution:verify-freshness` passes.
6. `npm run docs:verify-freshness` passes after documentation is regenerated.

---

## Work plan

### Phase 1 — Template architecture

- Refactor `scripts/project-ai-capabilities.js` to separate platform templates from the canonical model.
- Define a common agent-skill template contract.

### Phase 2 — Platform-specific generators

- Implement Claude skill generator.
- Implement Codex repository instructions generator.
- Implement ChatGPT custom GPT / knowledge pack generator.
- Implement Gemini gem / instructions generator.

### Phase 3 — Projection and validation

- Generate all agent skills.
- Update tests to assert the expanded surface.
- Run `npm run distribution:verify-freshness`.

### Phase 4 — Documentation and closure

- Regenerate documentation projections.
- Update `docs/Era-IV-Roadmap.md` to mark EXP-DIST-002 as completed.
- Mark expedition as `Completed and accepted`.

---

## Evidence

- [x] Agent skill templates committed.
- [x] Four platform-specific skills generated and committed.
- [x] Projection engine refactored to use templates.
- [x] Contract tests passing.
- [x] Distribution freshness passing.
- [x] Documentation freshness passing.

---

## Notes

- This expedition intentionally stops at generated text artifacts. Packaging and publishing skills to marketplaces or registries is future work.
- Skills should be conservative. It is easier to add platforms later than to remove incorrectly published guidance.
- All skills must respect the v1.0 frozen architecture and use only the seven public concepts in public-facing explanations.
