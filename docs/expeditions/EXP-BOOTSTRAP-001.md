# EXP-BOOTSTRAP-001 — Explain Bootstrap Stages and Emit Clean JSON Output

> Replace the `synth bootstrap . --approve` black box with explicit, named stages and clean machine/human output so operators and agents can follow what is happening and what to do next.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** TaskPRO brownfield onboarding retrospective, EXP-ONBOARD-001 operator feedback, EXP-PROGRAM-043 Workstream A  
**Depends On:** EXP-ONBOARD-001, EXP-MIGRATE-001, EXP-OUTPUT-001  
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

Real-world onboarding showed that `synth bootstrap . --approve` runs 13+ internal steps while emitting interleaved INFO logs and a single final JSON blob. Operators cannot tell:

- Which stage is running.
- Whether a failure is recoverable.
- What the next command should be after bootstrap finishes.

This expedition makes bootstrap transparent:

1. Name every bootstrap stage.
2. Emit a structured stage stream so callers can observe progress.
3. Keep stdout as clean JSON by default; route diagnostic logs to stderr.
4. Add `--human` mode that prints prose stage descriptions and next steps.
5. Include a `nextSteps` field in the final output.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| B1 | Bootstrap stages are invisible to the operator | Critical | Fixed in `runBootstrap` stage runner |
| B2 | INFO logs interleave with stdout JSON | High | Already routed to stderr by `Logger`; verified by tests |
| B3 | Final bootstrap output does not suggest next actions | High | Fixed via `nextSteps` field |
| B4 | No human-readable bootstrap progress mode | Medium | Fixed via `--human` flag |

---

## Deliverables

### 1. Named bootstrap stages in `src/cli/bootstrap-apply.ts`

Define a canonical list of stages:

```text
analyze        — inspect repository structure and history
propose        — generate mission and expedition proposals
validate       — check preconditions before mutating the filesystem
init           — create .synth/ manifest and data directory
genesis        — record PROJECT_INITIALIZED through ExecutionGate
artifacts      — write agent context and validation map
docs           — generate initial documentation (if docs/ exists)
govern         — run npm run govern when available
```

Each stage reports:

```json
{
  "stage": "init",
  "status": "running",
  "description": "Creating .synth/ manifest and data directory"
}
```

### 2. Structured progress output

When `--human` is not provided, the CLI emits:

- One final JSON object to stdout.
- Optional `--stream-stages` flag emits a newline-delimited JSON stage stream.
- Diagnostic logs go to stderr only.

Final JSON shape:

```json
{
  "status": "ok",
  "kind": "BootstrapResult",
  "targetDir": "/path/to/project",
  "stages": [
    { "stage": "analyze", "status": "completed", "durationMs": 120 },
    { "stage": "propose", "status": "completed", "durationMs": 340 },
    { "stage": "init", "status": "completed", "durationMs": 80 }
  ],
  "nextSteps": [
    "synth status",
    "synth mission create --subject '...' --purpose '...'"
  ]
}
```

### 3. `--human` mode

`synth bootstrap [path] --approve --human` prints:

```text
Analyzing repository... done (120ms)
Generating proposals... done (340ms)
Initializing project... done (80ms)

Project initialized at /path/to/project

Next steps:
  synth status
  synth mission create --subject '...' --purpose '...'
```

### 4. Log routing cleanup

- `Logger` output goes to stderr.
- stdout is reserved for structured responses.
- Existing consumers that parse stdout remain compatible.

### 5. Tests

- `tests/bootstrap-stages.test.js` verifies stage names and order.
- `tests/bootstrap-output.test.js` verifies stdout is valid JSON and logs go to stderr.
- `tests/bootstrap-human.test.js` verifies `--human` prose output.

---

## Evidence

- **Implementation:** PR #262 — https://github.com/synth-framework/synth/pull/262
- **Tests:**
  - `tests/bootstrap-output.test.js` — structured JSON output, stage stream to stderr, log routing
  - `tests/bootstrap-human.test.js` — `--human` prose mode
- **Verification:**
  - `npm run build` ✅
  - `node tests/bootstrap-output.test.js` ✅
  - `node tests/bootstrap-human.test.js` ✅
  - `node tests/migration.test.js` ✅
  - `npm run govern` ✅
- **Note on CLI completion:** `synth expedition complete` could not be used because this repository's SYNTH project state is not initialized with an event-log expedition record (`EXP-BOOTSTRAP-001` does not exist). The charter was closed manually and the change is carried forward with the next work item.

## Acceptance Criteria

1. ✅ `synth bootstrap [path] --dry-run` lists stages without mutating the repo.
2. ✅ `synth bootstrap [path] --approve` emits a JSON result with `stages` and `nextSteps`.
3. ✅ Diagnostic logs are not written to stdout.
4. ✅ `synth bootstrap [path] --approve --human` prints prose progress and next steps.
5. ✅ Each stage has a stable `stage` identifier.
6. ✅ Existing bootstrap behavior and tests continue to pass.
7. ✅ `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Changing the bootstrap domain logic or proposal generation.
- New lifecycle gates during bootstrap.
- Removing the existing `--with-website` or `--with-example` flags.

---

## Governance

### Protected

- ExecutionGate as sole mutation authority.
- Event model and replay semantics.
- Public vocabulary.

### Not included

- New event types.
- Changes to the `SynthEvent` envelope.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-ONBOARD-001.md`
- `docs/expeditions/EXP-MIGRATE-001.md`
- `docs/expeditions/EXP-OUTPUT-001.md`
- `src/cli/bootstrap-apply.ts`
