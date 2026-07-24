# EXP-ADOPT-016 — AI Discoverability

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth  
**Phase:** V — AI Ecosystem  
**Authority:** Synth Architectural Constitution

---

## Goal

Ensure AI agents and LLMs can accurately discover, understand, and use SYNTH.

---

## Purpose

SYNTH's AI ecosystem depends on machines being able to find and interpret documentation. This expedition optimizes content for LLM consumption and registers SYNTH in AI discovery channels.

---

## Deliverables

1. **LLM-friendly documentation audit and optimization**: clear headings, structured data, and no hidden context.
2. **MCP registry entries** for SYNTH capabilities.
3. **Skill registry entries** for `packages/synth-agent-sdk`.
4. **`llms.txt` or equivalent crawler guidance file** at the site root.
5. **Prompt examples** for common SYNTH tasks.
6. **Evaluation suite** testing LLM comprehension.

---

## Acceptance Criteria

- An independent LLM can answer 10 canonical SYNTH questions from docs alone.
- MCP registry entry passes validation.
- Skill registry entry is published for `packages/synth-agent-sdk`.
- `llms.txt` is reachable at the site root.
- Evaluation suite has at least an 80% pass rate on comprehension questions.

---

## Out of Scope

- Training custom models.
- Embedding SYNTH code in model pretraining.
- Modifying core runtime for LLM use.

---

## Related

- EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth
- EXP-ADOPT-003 — Documentation Hub
- EXP-ADOPT-017 — Skill Ecosystem
- EXP-PROGRAM-032 — AI Agent Integration
