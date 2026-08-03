# EXP-OUTPUT-001 — Separate Structured stdout from Diagnostic Logs

> Route diagnostic INFO/WARN/DEBUG logs to stderr so that stdout remains a single, deterministic JSON object per CLI command.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, EXP-CLI-001  
**Depends On:** EXP-CLI-001 (CLI as Deterministic Machine Interface)  
**Blocks:** EXP-BOOTSTRAP-001

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

Mixed log streams and JSON output break simple parsers and make it hard for agents to consume CLI results. This expedition establishes the output contract that every SYNTH command follows:

- **Machine mode (default):** exactly one JSON object on stdout.
- **Human mode (`--human`):** prose on stdout, no JSON.
- **Diagnostic logs:** always written to stderr, never stdout.

---

## Deliverables

1. Shared `print.ts` module that owns all CLI output.
2. `Logger` configured to write INFO/WARN/DEBUG to stderr.
3. `printJson()` emits exactly one JSON object to stdout in machine mode.
4. `printError()` emits structured JSON in machine mode and prose in human mode.
5. Contract tests proving stdout contains exactly one JSON object per command.

---

## Acceptance Criteria

1. `synth bootstrap . --approve` stdout contains exactly one JSON object.
2. `synth status` stdout contains exactly one JSON object.
3. Diagnostic bootstrap logs appear on stderr, not stdout.
4. `--human` mode emits no JSON on stdout.

---

## Out of Scope

- Natural-language generation beyond simple prose summaries.
- Changing the JSON schema.
- Non-CLI interfaces.

---

## Evidence

- Source changes
  - `src/cli/print.ts` — shared output module with human mode support.
  - `src/observability/tracer.ts` — stderr log routing.
  - `src/cli/synth.ts` — all commands route through shared print helpers.
- Test changes
  - `tests/human-output-mode.test.js` — stdout JSON count and human prose.
  - `tests/cli-contract.test.js` — single JSON object contract.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-CLI-001.md`
- `docs/expeditions/EXP-BOOTSTRAP-001.md`
