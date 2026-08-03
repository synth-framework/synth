# EXP-CLI-005 — Governance Entity Show Commands

> Add `synth program show <id>` and `synth expedition show <id>` so operators can inspect a single governance entity without grepping markdown files.

**Status:** Completed and accepted  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-044 — Operational Readiness & Self-Hosting  
**Authority:** Synth Architectural Constitution, EXP-CLI-003 findings  
**Depends On:** EXP-CLI-001 (CLI consistency), EXP-CLI-003 (list commands), EXP-GRAPH-001 (shared dependency-graph primitive)  
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

`synth program list` and `synth expedition list` answer *"What exists?"* but not *"Tell me about this one."* Operators and agents currently read `docs/expeditions/EXP-*.md` directly to get the full charter, dependencies, and status. A CLI show command closes that gap and keeps agents inside the machine-readable surface.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| S1 | No CLI command returns a single program charter | High | Fix planned |
| S2 | No CLI command returns a single expedition charter | High | Fix planned |
| S3 | Agents must grep markdown to inspect entity metadata | Medium | Fix planned |

---

## Deliverables

### 1. `synth program show <id>`

Returns the program charter record plus its expeditions.

```bash
synth program show EXP-PROGRAM-044
synth program show EXP-PROGRAM-044 --format json
synth program show EXP-PROGRAM-044 --human
```

Structured output:

```json
{
  "status": "ok",
  "kind": "ProgramShow",
  "program": {
    "id": "EXP-PROGRAM-044",
    "name": "Operational Readiness & Self-Hosting",
    "kind": "Program",
    "status": "Active",
    "priority": "High",
    "openExpeditions": 5,
    "completedExpeditions": 0
  },
  "expeditions": [
    { "id": "EXP-CAPTRANS-003", "name": "Capability Registry Accuracy", "status": "Proposed", "priority": "High" },
    { "id": "EXP-CLI-005", "name": "Governance Entity Show Commands", "status": "Proposed", "priority": "High" }
  ]
}
```

If the program does not exist, return a structured `ProgramNotFound` error with a suggestion to run `synth program list`.

### 2. `synth expedition show <id>`

Returns the expedition charter record plus upstream/downstream context.

```bash
synth expedition show EXP-CAPTRANS-003
synth expedition show EXP-CAPTRANS-003 --format json
synth expedition show EXP-CAPTRANS-003 --human
```

Structured output:

```json
{
  "status": "ok",
  "kind": "ExpeditionShow",
  "expedition": {
    "id": "EXP-CAPTRANS-003",
    "name": "Capability Registry Accuracy",
    "kind": "Governance Expedition",
    "status": "Proposed",
    "priority": "High",
    "program": "EXP-PROGRAM-044",
    "dependsOn": ["EXP-CAPTRANS-001", "EXP-CAPTRANS-002", "EXP-EVENTLOG-001", "EXP-DOCS-001"],
    "blocks": ["EXP-DIST-009"]
  },
  "program": {
    "id": "EXP-PROGRAM-044",
    "name": "Operational Readiness & Self-Hosting"
  },
  "upstream": [
    { "id": "EXP-CAPTRANS-001", "name": "Capability Transparency CLI", "status": "Completed" }
  ],
  "downstream": [
    { "id": "EXP-DIST-009", "name": "Distribution Manifest Accuracy", "status": "Proposed" }
  ]
}
```

If the expedition does not exist, return a structured `ExpeditionNotFound` error with a suggestion to run `synth expedition list`.

### 3. `--human` mode

```text
Program: EXP-PROGRAM-044 — Operational Readiness & Self-Hosting
Status: Active | Priority: High
Open expeditions: 5 | Completed: 0

Expeditions:
  EXP-CAPTRANS-003  Proposed  Capability Registry Accuracy
  EXP-CLI-005       Proposed  Governance Entity Show Commands
```

### 4. Help updates

Update `cmdProgramHelp()` and `cmdExpeditionHelp()` to include the new `show` subcommands.

### 5. Tests

Add `tests/governance-show-cli.test.js` covering:

- `synth program show <existing-id>` returns the program and its expeditions.
- `synth program show <missing-id>` returns `ProgramNotFound`.
- `synth expedition show <existing-id>` returns the expedition with upstream/downstream context.
- `synth expedition show <missing-id>` returns `ExpeditionNotFound`.
- `--human` mode produces prose output.
- `--format json` emits exactly one JSON object on stdout.

---

## Acceptance Criteria

1. `synth program show <id>` returns the program record and its expeditions.
2. `synth expedition show <id>` returns the expedition record plus program, upstream, and downstream context.
3. Missing IDs produce structured errors with recovery suggestions.
4. `--human` mode produces readable prose.
5. Help text lists the new commands.
6. `npm run build` succeeds and new tests pass.
7. Existing list/rank tests still pass.

---

## Out of Scope

- Editing programs or expeditions from the CLI.
- Web UI rendering.
- Embedding full markdown charter text in the JSON output (title, status, dependencies, and program context are sufficient).
- Adding show commands for missions or snapshots.

---

## Governance

### Protected

- Public vocabulary.
- Expedition identity rules.
- CLI output contract.

### Not included

- New event types.
- Changes to governance lifecycle semantics.

---

## Evidence

- Source changes
  - `src/governance/inventory.ts` — optional helper to look up a single program/expedition by id.
  - `src/cli/synth.ts` — `cmdProgramShow()`, `cmdExpeditionShow()`, dispatch wiring, help updates.
  - `src/cli/command-safety.ts` — classify `program show` and `expedition show` as `READ_ONLY`.
- Test changes
  - `tests/governance-show-cli.test.js` — contract tests for show commands, missing IDs, and human mode.
- Build/validation
  - `npm run build` succeeds.
  - `node tests/governance-show-cli.test.js` passes.
  - `node tests/governance-inventory-cli.test.js` still passes.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-044.md`
- `docs/expeditions/EXP-CLI-001.md`
- `docs/expeditions/EXP-CLI-003.md`
- `docs/expeditions/EXP-CLI-004.md`
- `docs/expeditions/EXP-GRAPH-001.md`
