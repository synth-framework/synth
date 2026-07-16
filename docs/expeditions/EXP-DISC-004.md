# EXP-DISC-004 — Clean Machine Output

**Status:** Completed (pending acceptance)  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-012 — Runtime Self-Description  
**Depends On:** EXP-PROGRAM-011  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N5)

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

Make SYNTH's JSON output machine-clean. When an operator or AI agent passes `--json`, diagnostic bootstrap logs must not pollute the output stream, so the payload can be parsed without filtering around `~22 INFO lines`.

---

## Motivation

The TaskPRO field experiment (N5) showed that bootstrap INFO lines precede structured JSON output. Agents had to parse around log noise or risk misinterpreting the response. Clean machine output is a prerequisite for reliable programmatic interaction with SYNTH.

---

## Scope

```text
synth <command> --json
        ↓
stdout: pure JSON
stderr: errors only (no INFO/WARN/DEBUG)
```

In scope:

- Global `--json` flag recognized by the CLI.
- Suppression of bootstrap INFO/WARN/DEBUG logs when `--json` is present.
- Preservation of ERROR logs to stderr.
- Regression tests proving clean output for commands that bootstrap.

Out of scope:

- Changing log levels for non-JSON invocations.
- Changing the structured output schema of any command.
- Adapter CLI output (separate surface).

---

## Deliverables

1. **`--json` flag support** — recognized globally; sets internal quiet-log mode.
2. **Logger quiet mode** — `Logger.info`, `.warn`, `.debug` become no-ops when `SYNTH_QUIET_LOGS=1`; `.error` still emits.
3. **Regression guards** — permanent tests in `test:all`:
   - `synth status --json` produces no INFO logs on stderr.
   - `synth status` (without `--json`) still emits INFO logs.
   - `synth --json status` and `synth status --json` both work.

---

## Acceptance

```text
synth status --json
        ↓
stderr contains no INFO/WARN/DEBUG lines
stdout is valid JSON
```

- Any command that bootstraps the runtime produces clean JSON on stdout when `--json` is passed.
- Errors still surface on stderr and cause non-zero exit.
- All existing tests continue to pass.
- `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Flag and logger plumbing

Detect `--json` and wire logger quiet mode.

### Phase 2 — Baseline fixtures

Capture current behavior as a regression test.

### Phase 3 — Implement suppression

Make `--json` suppress INFO/WARN/DEBUG logs.

### Phase 4 — Verify

Run fixture suite, neighbor CLI tests, and full governance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Errors hidden along with INFO | Only INFO/WARN/DEBUG are suppressed; ERROR remains. |
| `--json` breaks existing parsing | Existing commands emit identical JSON; only surrounding noise is removed. |
| Logger used before env is set | Detection happens before command dispatch, before any bootstrap call. |

---

## Definition of Done

- [x] `--json` flag recognized globally.
- [x] INFO/WARN/DEBUG logs suppressed when `--json` is present.
- [x] ERROR logs still emitted to stderr.
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add global `--json` detection.
2. Modify `Logger` to respect quiet mode.
3. Write regression tests.
4. Wire tests into `test:all`.
5. Verify and request acceptance.

---

## Completion Notes

- Added global `--json` flag detection in `src/cli/synth.ts`.
- When `--json` is present, the CLI sets `SYNTH_QUIET_LOGS=1` before dispatching any command.
- Updated `src/observability/tracer.ts` so `Logger.info`, `.warn`, and `.debug` are no-ops when `SYNTH_QUIET_LOGS=1`; `Logger.error` remains active so failures still surface.
- Added `tests/clean-machine-output.test.js` covering:
  - `synth status --json` emits no diagnostic logs.
  - `synth --json status` emits no diagnostic logs.
  - `synth status` (without `--json`) still emits diagnostic logs.
  - Error responses are preserved under `--json`.
- Wired `test:clean-machine-output` into `test:all`.
- Local validation passed: build, typecheck, fixture suite, `synth-cli`, `operator-briefing`, `verify-expedition-governance`, and `check-links`.
- Full governance validation deferred to CI `proof` job.
