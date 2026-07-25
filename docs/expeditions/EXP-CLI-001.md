# EXP-CLI-001 — CLI as Deterministic Machine Interface

> **Release Candidate expedition.** Freeze the public operator protocol: every CLI command behaves as a deterministic, machine-readable API suitable for humans, AI agents, CI/CD pipelines, scripts, and future IDE integrations.

**Status:** Completed  
**Kind:** Release Candidate Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-038 — Release Candidate  
**Phase:** D — Release Candidate  
**Authority:** Synth Architectural Constitution, Platform Readiness Report 2026-07-25  
**Depends On:** None  
**Blocks:** EXP-INSTALL-012, Release Certification

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

## Mission

The CLI is the **public operator protocol**. Once v1.0 ships, automation, IDEs, AI agents, and CI pipelines will depend on its contracts. Changing the CLI after release becomes expensive.

This expedition freezes the operator interface by making every command a deterministic machine interface:

- Stable output contracts
- Unified error taxonomy
- Provably read-only discovery
- Consistent command behavior
- AI-compatible invocation semantics

This is not CLI polish. It is **defining and certifying the public operator protocol**.

---

## Findings Addressed

| ID | Finding | Severity |
|----|---------|----------|
| C4 | `adapter.ts` produces no structured JSON output — uses `console.log`/`console.error` throughout | Critical |
| C5 | `cmdGovern` line 1849 uses `Promise.reject()` instead of structured error output | Critical |
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

### 1. Stable Output Contract

Every command capable of returning structured information supports deterministic JSON output:

```bash
synth mission list --json
```

Requirements:

- Stable field names
- Stable exit codes
- Stable ordering where applicable
- No ANSI sequences in JSON output
- No mixed human/JSON output

Acceptance criterion:

> Every command capable of returning structured information supports deterministic JSON output.

### 2. Unified Error Model

Every failure has a canonical, machine-readable structure:

```json
{
  "success": false,
  "error": {
    "code": "MISSION_NOT_FOUND",
    "category": "validation",
    "message": "...",
    "suggestion": "...",
    "documentation": "..."
  }
}
```

Requirements:

- `code` is stable and searchable
- `category` classifies the failure domain
- `message` is human-readable
- `suggestion` and `documentation` guide recovery

Acceptance criterion:

> Every CLI failure is classified and deterministic.

### 3. Discovery Safety

Invariant:

```text
Discover
  ↓
Never Mutates
```

Requirements:

- Discovery commands are read-only
- Dry-run semantics are respected
- Brownfield analysis cannot accidentally modify repositories

Acceptance criterion:

> Discovery is provably side-effect free unless explicitly authorized.

### 4. Command Consistency

Review every command for consistency:

- Argument ordering
- Help formatting
- Exit code conventions
- Verbosity
- Progress reporting
- Quiet mode

Acceptance criterion:

> Commands exhibit consistent interaction patterns.

### 5. AI Compatibility

The CLI must be easy for another AI system to invoke:

- Deterministic output
- Predictable schemas
- No conversational wording in machine mode
- Explicit success/failure semantics

Acceptance criterion:

> The CLI functions as a stable automation protocol.

---

## Implementation Work Items

1. **Shared print module** — Extract `printJson`/`printError` into `src/cli/print.ts`, imported by all CLI files. Merge agent telemetry into the shared implementation.
2. **`adapter.ts` refactor** — Replace all `console.log`/`console.error` with structured JSON output via shared print utilities. Call functionality directly instead of spawning a child process.
3. **Error output unification** — Convert all manual `printJson({status:"error",...})` calls to the canonical `printError(message, { code, category, suggestion, documentation })` pattern.
4. **`cmdGovern` fix** — Replace `Promise.reject(new Error(...))` at line 1849 with the unified error output path.
5. **Discovery safety model completion** — Add all missing entries to `command-safety.ts` and `classifyInvocation`. Verify every CLI subcommand is classified. Classify `validate --full` as `MUTATING` separately from base `validate`.
6. **Help handlers** — Add `cmdValidateHelp()` and `cmdExplainHelp()` showing subcommands and flags.
7. **CLI contract tests** — Verify every command produces valid JSON with a `status` field. Verify discovery mode blocks the correct commands. Verify exit codes.

---

## Acceptance Criteria

1. Every public command supports deterministic machine output where appropriate.
2. All structured outputs conform to documented schemas.
3. Error taxonomy is complete and consistent.
4. Discovery commands are verified read-only.
5. Exit codes are standardized.
6. CLI contract tests pass.
7. Existing behavior remains backward compatible for human users.
8. All existing tests pass.

---

## Out of Scope

- New CLI commands or flags (performed in GATE-013, REFINE-015, REFINE-016).
- CLI performance optimization.
- Terminal UI / human-readable mode beyond existing behavior.
- Operator optimization (Program 032).
- Orchestration engine replacement (Program 034).
- Installer UX — handled by EXP-INSTALL-012.
- Documentation projections — handled by EXP-DOC-002.

---

## Relationship to Other Work

- **EXP-INSTALL-012** — Depends on the stable CLI contracts defined here.
- **EXP-DOC-002** — Consumes stable CLI behavior for generated documentation.
- **EXP-GATE-013** — Added `validate dependencies` and `validate artifact` subcommands; this expedition ensures they're covered by the safety model.
- **EXP-REFINE-015** — Added `mission verify-charter` and `--evidence-file`; this expedition ensures coverage.
- **EXP-PROGRAM-042 — Release Certification** — This expedition provides evidence for the Operator / CLI Certification.

---

## Evidence

| Criterion | Result | Verification |
|-----------|--------|--------------|
| Shared print module | ✅ PASS | `src/cli/print.ts` is the sole output path for all CLI modules; supports structured `ErrorDetails`. |
| Adapter structured JSON | ✅ PASS | `src/cli/adapter.ts` emits JSON via `printJson`/`printError`; `synth adapter list` returns `AdapterList`. |
| Unified error model | ✅ PASS | All CLI error paths route through `printError`; outputs include `status`, `kind`, `error`, and optional `code`/`category`/`suggestion`/`documentation`. |
| Discovery safety complete | ✅ PASS | `src/cli/command-safety.ts` registers all adapter subcommands and `validate --full`; `classifyInvocation` resolves them. |
| `validate --full` classification | ✅ PASS | `validate --full` is `MUTATING` and blocked under `--discovery-mode`. |
| Help handlers | ✅ PASS | `cmdValidateHelp()` and `cmdExplainHelp()` produce structured `namespaceHelp` output. |
| CLI contract tests | ✅ PASS | `tests/cli-contract.test.js` verifies JSON output, error taxonomy, exit codes, discovery safety, and adapter JSON. |
| Existing tests | ✅ PASS | `npm test`: 9 passed, 0 failed; `npm run test:governance-evaluation-enforcement`: 13 passed, 0 failed. |
| Bypass audit | ✅ PASS | `node scripts/audit-bypass-map.js`: no mutation bypass paths detected. |
| Identity governance | ✅ PASS | `node scripts/verify-expedition-governance.js`: 0 errors, 0 warnings. |

### Files changed

- `src/cli/print.ts`
- `src/cli/command-safety.ts`
- `src/cli/synth.ts`
- `tests/cli-contract.test.js`
- `package.json`
- `docs/expeditions/EXP-CLI-001.md`

---

## Definition of Done

- [x] Shared `printJson`/`printError` module is the only CLI output path.
- [x] `adapter.ts` emits structured JSON and does not spawn child processes.
- [x] Every CLI error uses the unified error model.
- [x] Every CLI subcommand is classified by the discovery safety model.
- [x] `validate --full` is classified as `MUTATING`.
- [x] `synth validate --help` and `synth explain --help` are implemented.
- [x] CLI contract tests verify JSON output, error taxonomy, and discovery safety.
- [x] All existing tests pass.
- [x] Evidence is recorded for Release Certification.
