# EXP-EVIDENCE-001 — Automatic Expedition Evidence Capture

> Bundle proof with an expedition automatically so completion is backed by verifiable artifacts instead of manually maintained files.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-EVENTLOG-001 (event-log query CLI), EXP-GUARD-001 (derived-state guardrails)  
**Blocks:** EXP-GATE-001 (mandatory verification gates before expedition completion)

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

In the TaskPRO migration, agents created proof files by hand (`proof/legacy-expeditions-e1-e13.md`) and occasionally forgot to attach them to the expedition before attempting completion. The CLI rejected completion for missing evidence, but the only way to "attach" evidence was to reference a path manually. This expedition adds an explicit, auditable evidence-capture command that:

1. Collects relevant artifacts (git diff, test output, explicit attachments).
2. Stores them in a deterministic location keyed by expedition ID.
3. Appends an `EVIDENCE_ATTACHED` event to the event log.
4. Surfaces the evidence path in `synth explain status` and `synth expedition list`.

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| E1 | Proof files created manually and not reliably attached | High | Proposed |
| E2 | No CLI command to bundle evidence with an expedition | High | Proposed |
| E3 | `synth expedition complete` cannot verify evidence exists | Medium | Proposed |

## Deliverables

### 1. `synth expedition evidence` command

```bash
synth expedition evidence --id <expedition-id> \
  [--git-diff] \
  [--test-results <path>] \
  [--attach <path> ...] \
  [--note <text>]
```

Behavior:

- `--git-diff` writes `proof/expeditions/<expedition-id>/git-diff.patch` from `git diff HEAD`.
- `--test-results <path>` copies the referenced test-output file into the evidence bundle.
- `--attach <path>` copies one or more explicit files into the bundle.
- `--note <text>` adds a human-readable note to the `EVIDENCE_ATTACHED` event.
- The command is idempotent: running it again for the same expedition appends new attachments but does not delete previous ones.

### 2. Deterministic evidence directory

```text
proof/
└── expeditions/
    └── <expedition-id>/
        ├── manifest.json          # list of captured artifacts with hashes
        ├── git-diff.patch         # if --git-diff
        ├── test-results.txt       # if --test-results
        └── attachments/
            └── <filename>         # if --attach
```

### 3. `EVIDENCE_ATTACHED` event

Appends an event to `.synth/data/event-log.jsonl`:

```json
{
  "type": "EVIDENCE_ATTACHED",
  "expeditionId": "a483d20106f5875d",
  "attachments": [
    { "path": "proof/expeditions/a483d20106f5875d/git-diff.patch", "hash": "sha256:..." },
    { "path": "proof/expeditions/a483d20106f5875d/test-results.txt", "hash": "sha256:..." }
  ],
  "note": "Captured git diff and test output",
  "timestamp": "...",
  "agent": { "session": "...", "identity": "..." }
}
```

### 4. Evidence-aware status

- `synth explain status` reports whether the active expedition has attached evidence and lists the artifact paths.
- Evidence is stored on the replay-derived expedition state as `attachments` so future gates (e.g., `EXP-GATE-001`) can enforce mandatory evidence before completion.

### 5. Tests

- `tests/expedition-evidence.test.js` covering:
  - `--git-diff` produces a patch file.
  - `--attach` copies explicit files.
  - `--test-results` copies test output.
  - Re-running is idempotent.
  - `EVIDENCE_ATTACHED` event is appended.
  - `synth expedition complete` blocks without evidence and succeeds with evidence.

## Acceptance Criteria

1. `synth expedition evidence --id <id> --git-diff` creates `proof/expeditions/<id>/git-diff.patch` and appends an `EVIDENCE_ATTACHED` event.
2. Multiple `--attach` flags are supported and recorded in the manifest.
3. The command is idempotent across repeated invocations.
4. `synth explain status` surfaces evidence presence and artifact paths.
5. `npm run build` succeeds and targeted tests pass.

## Notes

- Mandatory evidence verification before `synth expedition complete` is intentionally left to `EXP-GATE-001` so it can be coordinated with the existing Convergence Certification requirement rather than creating overlapping or conflicting gates.

## Out of Scope

- Evidence signing or cryptographic verification ( Workstream F).
- Automatic test execution (the command accepts a pre-existing test-results file).
- Web UI or external artifact storage.

## Governance

### Protected

- ExecutionGate as sole mutation authority.
- Event model.
- Public vocabulary.

### Not included

- New constitutional rules.
- Changes to replay semantics.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-EVENTLOG-001.md`
- `docs/expeditions/EXP-GUARD-001.md`
- `docs/expeditions/EXP-GATE-001.md`
