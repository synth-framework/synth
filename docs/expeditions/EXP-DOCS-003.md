# EXP-DOCS-003 — Agent Planning Guide Update

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-008 — Documentation & Projections  
**Depends On:** EXP-DOCS-001  
**Blocks:** EXP-DOCS-006

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

Align the AI agent guides with the Environment Layer so that agents plan against discovered environment capabilities rather than implicit environmental assumptions.

---

## Motivation

EXP-ENV-011 delivered AI Environment Planning (ADR-016): agents are expected to discover the environment before planning and to express plans in terms of environment capabilities. The agent guides in `docs/guides/agents/` predate this work. An agent following the current guides may plan against assumptions the Environment Layer was built to eliminate, reproducing exactly the environment drift EXP-PROGRAM-007 removed from the core.

---

## Deliverables

1. **Guide audit**
   - Review `docs/guides/agents/` for planning, validation, and capability guidance that predates the Environment Layer.
   - Record which guides are accurate, which need updates, and which are unaffected.

2. **Planning guide update**
   - Update `docs/guides/agents/planning.md` and related guides so environment discovery is the first planning stage and plans reference environment capabilities.
   - Cross-link ADR-016 and the capability reference.

3. **Entry-point consistency**
   - Verify `docs/guides/agents/index.md`, `handbook.md`, and `AGENTS.md` are consistent with the updated guidance.

---

## Acceptance

- Agent guides instruct environment discovery before planning, consistent with ADR-016.
- No agent guide instructs behavior that bypasses or contradicts the Environment Layer.
- `npm run docs:check-links` passes.

---

## Phases

### Phase 1 — Audit

Review every agent guide and record findings.

### Phase 2 — Update planning guidance

Bring the planning guides in line with environment discovery and capability-aware planning.

### Phase 3 — Update entry points

Align the index, handbook, and AGENTS.md where needed.

### Phase 4 — Verify

Run documentation integrity checks and the full validation plan.

---

## Risks

| Risk | Mitigation |
|---|---|
| Large guide surface makes audit shallow | Time-box per guide; record explicit audit verdicts |
| Guidance duplicates ADR-016 | Guides reference the ADR instead of restating it |
| AGENTS.md is a Protected-adjacent contract | Change only what the Environment Layer makes stale |

---

## Definition of Done

- [ ] Agent guide audit completed with per-guide verdicts.
- [ ] Planning guides updated for environment discovery and capability-aware planning.
- [ ] Index, handbook, and AGENTS.md consistent with the updated guidance.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit `docs/guides/agents/` and record verdicts.
2. Update planning guidance.
3. Align entry-point documents.
4. Run documentation integrity checks and validation.
5. Request acceptance.

---

## Completion Notes

Pending.
