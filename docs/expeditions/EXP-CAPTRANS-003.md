# EXP-CAPTRANS-003 — Capability Registry Accuracy

> Fix `synth capabilities` so command-surface capabilities that are implemented in the CLI are reported as `available`, and add a regression test that fails if a listed command disappears.

**Status:** Completed and accepted  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-044 — Operational Readiness & Self-Hosting  
**Authority:** Synth Architectural Constitution, EXP-CAPTRANS-001 findings  
**Depends On:** EXP-CAPTRANS-001, EXP-CAPTRANS-002, EXP-EVENTLOG-001, EXP-DOCS-001  
**Blocks:** EXP-DIST-009 (skill/MCP manifests must advertise true capabilities)

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

`synth capabilities` is the source of truth for what the installed CLI can do. It currently reports `documentation-generation` and `event-log-query` as `unavailable` even though `synth docs generate` and `synth log --expedition <id>` are implemented and wired. This undermines operator trust and causes generated agent skills and MCP manifests to advertise an incorrect surface.

This expedition fixes the capability-detection logic so that command-surface capabilities are reported accurately, and adds a regression guard that catches future drift between implemented commands and the capability catalog.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| C4 | `synth capabilities` reports `documentation-generation` as `unavailable` despite `synth docs generate` existing | High | Fix planned |
| C5 | `synth capabilities` reports `event-log-query` as `unavailable` despite `synth log --expedition <id>` existing | High | Fix planned |
| C6 | No automated guard prevents command-surface capabilities from drifting out of sync with the CLI | Medium | Fix planned |

---

## Deliverables

### 1. Command-surface capability detection

Update `src/cli/capabilities-data.ts` so that an expected capability can be marked as implemented through a CLI command surface, not only through a runtime capability or adapter.

Approach:

- Extend `ExpectedCapability` with an optional `requiredCommands?: string[]` field.
- When neither `requiredRuntimeCapability` nor `requiredAdapter` is set, check whether all `requiredCommands` are implemented in the CLI.
- A command is considered implemented when its namespace and subcommand are wired in the CLI dispatcher.

Expected result:

```json
{
  "id": "documentation-generation",
  "name": "Documentation Generation",
  "status": "available",
  "commands": ["synth docs generate"]
}
```

### 2. Update expected capability definitions

```typescript
{
  id: "documentation-generation",
  name: "Documentation Generation",
  requiredCommands: ["synth docs generate"],
  commands: ["synth docs generate"],
}
{
  id: "event-log-query",
  name: "Event Log Query",
  requiredCommands: ["synth log --expedition <id>"],
  commands: ["synth log --expedition <id>"],
}
```

### 3. CLI dispatcher introspection

In `cmdCapabilities()` (or a shared helper), build the set of implemented commands from the CLI's own dispatch metadata so the capability check does not rely on a second manual list.

If that creates a circular dependency, expose a small `IMPLEMENTED_CLI_COMMANDS` constant from a neutral module that `capabilities-data.ts` can import.

### 4. Regression test

Add `tests/capability-registry-accuracy.test.js` that:

- Runs `synth capabilities`.
- Asserts `documentation-generation` status is `available`.
- Asserts `event-log-query` status is `available`.
- Asserts every capability whose `requiredCommands` are implemented is reported as `available`.
- Fails if a capability is marked `available` but its required command is not implemented (prevents false positives).

### 5. Update generated distribution artifacts

After the fix, regenerate `distribution/agent-skills/*.md`, `distribution/ide-rules/*`, and `distribution/mcp/manifest.json` so they advertise the corrected capability set.

---

## Acceptance Criteria

1. `synth capabilities` reports `documentation-generation` as `available`.
2. `synth capabilities` reports `event-log-query` as `available`.
3. Every expected capability with `requiredCommands` is marked `available` only when those commands are implemented.
4. `tests/capability-registry-accuracy.test.js` passes and guards against future drift.
5. `npm run build` succeeds and existing capability tests still pass.
6. Distribution artifacts under `distribution/` reflect the corrected capability list.

---

## Out of Scope

- Implementing new documentation or event-log features (the commands already exist).
- Changing the runtime capability registry model.
- Modifying `docs/reference/capability-list.json` generation logic.
- Adding new CLI commands beyond what is required to detect existing ones.

---

## Governance

### Protected

- Capability model.
- Public vocabulary.
- CLI output contract (single JSON object on stdout).

### Not included

- New runtime concepts.
- Event model changes.

---

## Evidence

- Source changes
  - `src/cli/capabilities-data.ts` — `ExpectedCapability` extension and availability logic.
  - `src/cli/synth.ts` — `cmdCapabilities()` passes implemented-command metadata; help text updated if needed.
  - `src/cli/command-safety.ts` — no changes expected; `capabilities` remains `READ_ONLY`.
- Test changes
  - `tests/capability-registry-accuracy.test.js` — regression tests for command-surface capability reporting.
- Distribution changes
  - Regenerated `distribution/agent-skills/*.md`, `distribution/ide-rules/*`, `distribution/mcp/manifest.json`.
- Build/validation
  - `npm run build` succeeds.
  - `node tests/capability-registry-accuracy.test.js` passes.
  - `node tests/capabilities-cli.test.js` still passes.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-044.md`
- `docs/expeditions/EXP-CAPTRANS-001.md`
- `docs/expeditions/EXP-CAPTRANS-002.md`
- `docs/expeditions/EXP-EVENTLOG-001.md`
- `docs/expeditions/EXP-DOCS-001.md`
