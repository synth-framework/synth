# EXP-CLI-003 — Governance Inventory List Commands

> Add `synth expedition list` and `synth program list` commands that return a clean, filterable view of open and completed governance work.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CLI-001 (CLI consistency & AI portability)  
**Blocks:** None

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

Today the only ways to see what programs and expeditions exist are:

- `synth explain identity` — returns aggregate counts.
- `synth validate dependencies` — returns a dependency graph.
- `node scripts/verify-expedition-governance.js` — validates identity rules.

None of them answer the simple question: *"What is open right now?"* Agents and operators should be able to list programs and expeditions with filters for status, priority, and program ownership.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| L1 | No list command for open programs/expeditions | High | Fixed |
| L2 | Discovering open work requires grepping markdown or parsing dependency JSON | Medium | Fixed |

---

## Deliverables

### 1. `synth program list`

Lists programs with filters:

```bash
synth program list
synth program list --status Proposed
synth program list --status "Active,Proposed" --priority Critical
```

Output fields:

- `id`
- `name`
- `status`
- `priority`
- `openExpeditions` count
- `completedExpeditions` count

### 2. `synth expedition list`

Lists expeditions with filters:

```bash
synth expedition list
synth expedition list --status Draft
synth expedition list --program EXP-PROGRAM-043
synth expedition list --status "Draft,Proposed" --priority High
```

Output fields:

- `id`
- `name`
- `status`
- `program`
- `priority`
- `dependsOn`
- `blocks`

### 3. `--human` mode

When combined with EXP-CLI-002, produce prose tables:

```text
Open expeditions in EXP-PROGRAM-043:
  EXP-ONBOARD-001   Draft   Guided first-contact command
  EXP-CLI-002       Draft   Human-readable output mode
  EXP-CLI-003       Draft   Governance inventory list commands
  ...
```

---

## Acceptance Criteria

1. `synth program list` exits 0 and returns structured JSON. ✅
2. `synth expedition list` exits 0 and returns structured JSON. ✅
3. Both commands support `--status`, `--priority`, and `--program` filters. ✅
4. Counts are consistent with `synth explain identity`. ✅
5. Results are derived from `docs/expeditions/*.md`. ✅
6. `npm run build` succeeds and targeted tests pass. ✅

---

## Out of Scope

- Editing programs or expeditions from the list command.
- Web UI or dashboard rendering.
- Sorting beyond default alphabetical/id order.

---

## Governance

### Protected

- Public vocabulary.
- Expedition identity rules.

### Not included

- New event types.
- Changes to the governance lifecycle.

---

## Evidence

- Source changes
  - `src/governance/inventory.ts` — read-only parser for expedition charters producing program and expedition records.
  - `src/cli/synth.ts` — added `cmdProgramList()` and `cmdExpeditionList()`, wired `program list` and `expedition list` dispatch, help, and invocation classification.
  - `src/cli/command-safety.ts` — classified `program list` and `expedition list` as `READ_ONLY`.
- Test changes
  - `tests/governance-inventory-cli.test.js` — contract tests for list output, status/priority/program filters, help output, and discovery-mode safety.
- Build/validation
  - `npm run build` succeeds.
  - `node tests/governance-inventory-cli.test.js` passes.
  - `npm run test:synth-cli` and first-contact CLI tests still pass.
  - `node scripts/verify-expedition-governance.js` passes.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-CLI-001.md`
- `docs/expeditions/EXP-CLI-002.md`
