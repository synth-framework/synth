# EXP-DISC-003 — Adapter Introspection

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

Let operators and agents discover what an adapter does without reading its source code. Add `synth adapter info <name>` to expose adapter metadata, state, and health in a structured, machine-parseable form.

---

## Motivation

The TaskPRO field experiment (N5) showed that agents had to read source files to understand adapter capabilities. Source reading is a discoverability failure. Every registered adapter already carries metadata; the CLI simply needs to surface it.

---

## Scope

```text
synth adapter info <name>
        ↓
{
  status: "ok",
  name: "...",
  metadata: { name, version, kind, category, description, capabilities },
  state: "...",
  health: { state, message }
}
```

In scope:

- Add `info` subcommand to the adapter CLI.
- Output adapter metadata, current lifecycle state, and health.
- Work for all adapters registered in `AdapterRegistry`.
- Regression tests for known adapters and unknown-adapter error handling.

Out of scope:

- Changing adapter interfaces or implementations.
- Adding new adapter capabilities.
- Mutable adapter configuration via `info`.

---

## Deliverables

1. **`adapter info <name>` command** — implemented in `src/cli/adapter.ts`.
2. **Structured JSON output** — includes `metadata`, `state`, and `health`.
3. **Error handling** — unknown adapter returns non-zero exit with structured error.
4. **Regression guards** — permanent tests in `test:all`:
   - `synth adapter info repository` returns metadata.
   - `synth adapter info <unknown>` fails prescriptively.

---

## Acceptance

```text
synth adapter info repository
        ↓
status: ok
metadata includes name, version, kind, category, description
state is a valid AdapterState
health is a valid AdapterHealth
```

- Every registered adapter can be introspected.
- Output uses public vocabulary only.
- Unknown adapters fail with a clear error.
- All existing tests continue to pass.
- `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Command plumbing

Add `info` case to adapter CLI.

### Phase 2 — Output format

Return metadata, state, and health as JSON.

### Phase 3 — Fixtures

Write tests for repository adapter and unknown adapter.

### Phase 4 — Verify

Run fixture suite, neighbor tests, and documentation gates.

---

## Risks

| Risk | Mitigation |
|---|---|
| `info` creates side effects by instantiating adapter | `info` only reads `metadata`, `state`, and `health`; it does not call `enable()` or `configure()`. |
| Adapter metadata is missing or inconsistent | Test exercises every registered adapter; missing metadata is surfaced as a test failure. |
| Output leaks implementation vocabulary | Use public vocabulary only; vocabulary audit gate applies. |

---

## Definition of Done

- [x] `synth adapter info <name>` returns structured metadata, state, and health.
- [x] Unknown adapter returns structured error and non-zero exit.
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add `info` subcommand to `src/cli/adapter.ts`.
2. Define structured output schema.
3. Write regression tests.
4. Wire tests into `test:all`.
5. Verify and request acceptance.

---

## Completion Notes

- Added `info` subcommand to `src/cli/adapter.ts`.
- `synth adapter info <name>` creates the requested adapter (without enabling or configuring it) and emits structured JSON containing `metadata`, `state`, and `health`.
- Unknown adapters exit non-zero with a structured error.
- Added `tests/adapter-introspection.test.js` covering repository, filesystem, unknown adapter, and default-to-repository behavior.
- Wired `test:adapter-introspection` into `test:all`.
- Local validation passed: build, typecheck, fixture suite, `synth-cli`, `operator-briefing`, `verify-expedition-governance`, and `check-links`.
- Full governance validation deferred to CI `proof` job.
