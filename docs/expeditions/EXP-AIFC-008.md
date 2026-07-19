# EXP-AIFC-008 — Greenfield Operator Experience

> **Product expedition.** Design the CLI and interactive flow for greenfield onboarding.

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-007  
**Blocks:** EXP-AIFC-009

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

Make greenfield onboarding self-guiding and teachable through the CLI. The operator experience must:

- Provide a clear entry point (`synth first-contact` or equivalent).
- Show progress through the Discovery lifecycle.
- Explain why each question is being asked.
- Support dry-run previews of materialization.
- Provide consistent help text for every subcommand.

---

## Required Change

### 8.1 Command structure

Proposed CLI surface:

```bash
synth first-contact start "Let's build a space mission tracker"
synth first-contact status
synth first-contact clarify
synth first-contact project
synth first-contact verify
synth first-contact approve
synth first-contact materialize --dry-run
synth first-contact materialize --approve
```

### 8.2 Progress reporting

Display the current phase, confidence level, and next required action.

### 8.3 Dry-run support

`materialize --dry-run` shows what would be created without mutating state.

### 8.4 Help and diagnostics

Every subcommand owns its `--help` output. Diagnostics explain invalid state transitions.

---

## Deliverables

1. **CLI design specification** under `docs/guides/greenfield-cli.md`.
2. **Command implementations** for the greenfield onboarding surface.
3. **Help text and progress output** for each phase.
4. **UX tests** covering normal flow, ambiguity, and capability failure.

---

## Acceptance Criteria

- An operator can complete greenfield onboarding using only documented CLI commands.
- `--help` works for every subcommand.
- `--dry-run` previews materialization without creating state.
- Invalid state transitions produce explanatory diagnostics.
- The CLI teaches the workflow rather than requiring memorization.

---

## Out of Scope

- Backend extraction, projection, or verification engines (built in previous expeditions).
- IDE, MCP, or Web integrations.
- Replay and governance integration (EXP-AIFC-009).

---

## Success Criteria

The expedition succeeds when a new operator can derive the greenfield workflow from the CLI itself and complete onboarding without coaching.
