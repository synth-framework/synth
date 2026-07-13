# EXP-AX-002 — AI First Experience

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-AX-001  
**Blocks:** EXP-AX-003, EXP-AX-005

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

Make AI the primary interface for SYNTH.

---

## Motivation

SYNTH's primary operator is an AI agent, not a human reading architecture documentation. The repository must expose a root-level contract that tells any coding assistant how to operate inside a SYNTH project safely and correctly.

---

## Deliverables

1. **Root `AGENTS.md`**
   - AI operator contract at repository root.
   - Responsibilities, constraints, and commands.
   - Mission lifecycle.
   - Replay and recovery workflow.
   - Links to deeper guides.

2. **Agent guides under `docs/guides/agents/`**
   - Per-agent instructions for Claude Code, Cursor, Codex, Gemini CLI, Windsurf.
   - Prompt catalog.
   - Repository bootstrap instructions.
   - Mission lifecycle examples.
   - Validation workflow.

3. **AI-native CLI refinements**
   - Ensure all CLI commands produce structured JSON by default.
   - Ensure error output is actionable for agents.

4. **Bootstrap-from-agent verification**
   - Verify an agent can initialize a repository using only `AGENTS.md`.

---

## Acceptance

A frontier coding model can initialize a repository using only:

```text
AGENTS.md
```

without opening architecture documentation.

Specifically:

- `AGENTS.md` is at repository root.
- It contains installation, bootstrap, mission lifecycle, replay, recovery, and validation instructions.
- It forbids bypassing Mission Studio, Genesis, and Replay.
- An agent following it can run `synth init`, `synth mission create`, `synth mission approve`, and `npm run govern`.

---

## Phases

### Phase 1 — Contract draft

Write the root `AGENTS.md`.

### Phase 2 — Agent guide audit

Ensure `docs/guides/agents/` covers the full operator journey.

### Phase 3 — Prompt catalog

Publish tested prompts for the five core operations.

### Phase 4 — Agent simulation

Run a dry-run where a model or scripted agent follows `AGENTS.md` end-to-end.

### Phase 5 — Refinement

Iterate on unclear instructions discovered during simulation.

---

## Risks

| Risk | Mitigation |
|---|---|
| AGENTS.md is too long | Keep the contract concise; link to details |
| Agents ignore constraints | Use imperative language and explicit prohibitions |
| Prompts are model-specific | Test across supported agents |

---

## Definition of Done

- [ ] `AGENTS.md` exists at repository root.
- [ ] `AGENTS.md` defines AI responsibilities and prohibitions.
- [ ] Agent guides are complete and cross-referenced.
- [ ] Prompt catalog covers install, bootstrap, mission lifecycle, replay, and recovery.
- [ ] An agent can initialize and operate a SYNTH repository using only `AGENTS.md`.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Create `AGENTS.md` at repository root.
2. Audit and complete `docs/guides/agents/index.md`.
3. Verify per-agent guides are current.
4. Update prompt catalog if needed.
5. Add a test or script that simulates an agent following `AGENTS.md`.
6. Build and verify.

---

## Completion Notes

Pending.
