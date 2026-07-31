# EXP-CLI-002 — Human-Readable CLI Output Mode

> Add a `--human` output mode and clean structured output so operators and mixed human-agent sessions can read CLI responses without parsing JSON.

**Status:** Executing  
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

JSON-by-default is correct for agents, but humans and mixed sessions need prose. Bootstrap currently interleaves `INFO` logs with JSON output, breaking simple parsers. This expedition:

1. Adds a global `--human` flag that emits plain-text summaries.
2. Routes diagnostic logs to stderr so stdout stays clean in machine mode.
3. Ensures every command returns a one-line "what happened / what next" sentence.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| H1 | Mixed log/JSON streams break parsing | High | In progress |
| H2 | No human-readable output mode | High | In progress |
| H3 | Error messages list state but not recovery action | Medium | In progress |

---

## Deliverables

### 1. Global `--human` flag

Supported on commands such as:

- `synth status --human`
- `synth bootstrap . --approve --human`
- `synth mission create ... --human`

Expected example for `synth status --human`:

```text
Project: TaskPRO
Phase: executing
Active mission: Establish governance baseline... (3efa0a0c)
Active expedition: Fix mobile runtime defects (13ab9c7) — executing
Next step: complete the expedition when convergence certification is available.
No blockers.
```

### 2. Clean machine output by default

- `INFO` bootstrap logs go to stderr.
- stdout emits exactly one JSON object per command.

### 3. Improved error messages

Every error JSON includes:

- `message`: what went wrong
- `nextStep`: suggested command or recovery action

---

## Design Notes

### Global `--human` flag

`src/cli/synth.ts` `parseArgs()` recognizes `--human` anywhere on the command line and stores it in `flags.human`. The flag is threaded through to command handlers and the shared print helpers.

### Output contract

- **Machine mode (default):** exactly one JSON object per command on stdout.
- **Human mode (`--human`):** prose summary on stdout; structured JSON is suppressed.
- **Logs:** bootstrap and other diagnostic `INFO` logs are written to stderr in both modes so stdout stays clean for machines.

### Human formatter

`src/cli/print.ts` owns `printHuman()` and helpers for common shapes (status, error, list, plan). Each command that supports `--human` provides a `toHuman()` renderer or uses shared defaults.

### Error messages

`printError()` always emits `nextStep`/`suggestion` when provided, both in JSON and human modes. In human mode the suggestion is rendered as an actionable sentence.

---

## Acceptance Criteria

1. `synth status --human` exits 0 and prints a prose summary.
2. `synth bootstrap . --approve` stdout contains exactly one JSON object.
3. `synth bootstrap . --approve --human` stdout contains no JSON.
4. All existing CLI contract tests still pass.
5. `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Natural-language generation for arbitrary events.
- Changing the JSON schema.
- Non-CLI interfaces.

---

## Governance

### Protected

- CLI contract (single JSON object to stdout).
- Public vocabulary.

### Not included

- Changes to command semantics.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-CLI-001.md`
