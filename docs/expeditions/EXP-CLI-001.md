# EXP-CLI-001 — CLI Consistency & AI Portability

> **Developer experience expedition.** Ensure every CLI command produces structured JSON output, the discovery safety model covers all commands, and error handling is uniform.

**Status:** Proposed  
**Kind:** Developer Experience Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 1 — CLI  
**Authority:** Synth Architectural Constitution  
**Depends On:** None  
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

## Findings Addressed

| ID | Finding | Severity |
|----|---------|----------|
| C4 | `adapter.ts` produces no structured JSON output — uses console.log/console.error throughout | Critical |
| C5 | `cmdGovern` line 1849 uses `Promise.reject()` instead of `process.exit` | Critical |
| H7 | 15+ missing entries in command safety registry — commands blocked in discovery mode | High |
| H8 | `printError` lacks `kind` discriminator — error outputs not machine-discriminable | High |
| H9 | 3 different error output patterns across CLI handlers | High |
| M11 | No dedicated help handlers for `validate` or `explain` namespaces | Medium |
| M12 | `synth validate --full` classified as `READ_ONLY` but runs mutating govern pipeline | Medium |
| M13 | `adapter.ts` spawns child process, losing structured output | Medium |
| L6 | Duplicate `printJson`/`printError` definitions across 8 files | Low |
| L7 | Agent telemetry not merged in subcommand module outputs | Low |

---

## Deliverables

1. **`adapter.ts` refactor** — Replace all console.log/console.error with structured JSON output via shared print utilities. Call functionality directly instead of spawning child process.
2. **Error output unification** — Single `printError(message, { kind?, code? })` pattern producing `{"status":"error","kind":"...","error":"..."}`. Convert all manual `printJson({status:"error",...})` calls.
3. **`cmdGovern` fix** — Replace `Promise.reject(new Error(...))` at line 1849 with `printError`.
4. **Discovery safety model completion** — Add all missing entries to `command-safety.ts` and `classifyInvocation`. Verify every CLI subcommand is classified.
5. **Help handlers** — Add `cmdValidateHelp()` and `cmdExplainHelp()` showing subcommands and flags.
6. **Shared print module** — Extract `printJson`/`printError` into `src/cli/print.ts`, imported by all CLI files. Merge agent telemetry into shared implementation.
7. **Validate --full safety fix** — Classify `validate --full` as `MUTATING` separately from base `validate`.
8. **Tests** — Verify every command produces valid JSON with `status` field. Verify discovery mode blocks correct commands.

---

## Acceptance Criteria

1. `synth adapter` produces structured JSON output consistent with other commands.
2. Every error response includes `status`, `kind`, and `error` fields.
3. Discovery safety model classifies every CLI subcommand.
4. `synth validate --help` shows validate subcommands.
5. `synth explain --help` shows explain subcommands.
6. Agent telemetry is present in all subcommand module outputs.
7. All existing tests pass.

---

## Out of Scope

- New CLI commands or flags (performed in GATE-013, REFINE-015, REFINE-016).
- CLI performance optimization.
- Terminal UI (human-readable mode).

---

## Relationship to Other Work

- **EXP-GATE-013** — Added `validate dependencies` and `validate artifact` subcommands; this expedition ensures they're properly covered by the safety model.
- **EXP-REFINE-015** — Added `mission verify-charter` and `--evidence-file`; this expedition ensures coverage.
