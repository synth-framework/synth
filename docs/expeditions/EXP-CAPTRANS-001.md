# EXP-CAPTRANS-001 — Capability Transparency CLI

> Expose what the installed CLI can and cannot do, including missing capabilities and available adapters.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CLI-001 (CLI consistency), EXP-GOV-024 (Convergence Certification capability)  
**Blocks:** EXP-CAPTRANS-002 (graceful missing-capability handling)

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

The TaskPRO expedition got stuck because Convergence Certification was required but no command exposed it. Adapters exist (e.g., repository adapter) but agents do not discover them naturally. This expedition adds `synth capabilities` so the CLI advertises its surface and gaps.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| C1 | Missing capabilities are silently referenced | Critical | Fixed |
| C2 | Repository adapter is not surfaced during onboarding | Medium | Fixed |
| C3 | Agent cannot tell if a CLI fix is needed | High | Fixed |

---

## Deliverables

### 1. `synth capabilities` command

Lists:

- Installed capabilities with status `available`.
- Missing capabilities with status `unavailable` and a reason.
- Adapters registered in the current project.
- Commands that depend on each capability.

Example:

```json
{
  "status": "ok",
  "kind": "CapabilityReport",
  "capabilities": [
    { "id": "convergence-certification", "status": "unavailable", "reason": "No CLI handler registered" },
    { "id": "repository-adapter", "status": "available", "provider": "git" },
    { "id": "documentation-generation", "status": "available" }
  ]
}
```

### 2. Capability checks in status

`synth status` warns when a required capability for the current phase is missing.

### 3. Adapter discovery in onboarding

The guided first-contact flow lists the repository adapter and what it will observe.

---

## Acceptance Criteria

1. `synth capabilities` exits 0 and returns structured capability status. ✅
2. Convergence Certification is listed as `available` now that EXP-GOV-024's command is registered. ✅
3. Missing capabilities (e.g. `event-log-query`) are listed as `unavailable` with a reason. ✅
4. Registered adapters are listed in the report. ✅
5. Existing adapter tests still pass. ✅
6. `npm run build` succeeds and targeted tests pass. ✅

---

## Out of Scope

- Implementing all missing capabilities.
- Changing the capability registry model.

---

## Governance

### Protected

- Capability model.
- Public vocabulary.

### Not included

- New runtime concepts.

---

## Evidence

- Source changes
  - `src/cli/synth.ts` — added `cmdCapabilities()`, `cmdCapabilitiesHelp()`, command dispatch, and help routing.
  - `src/cli/command-safety.ts` — classified `capabilities` as `READ_ONLY` and discovery-safe.
  - `src/mission-studio/adapter-registry.ts` — reused to enumerate registered adapters.
- Test changes
  - `tests/capabilities-cli.test.js` — contract tests for the capability report, availability detection, adapter enumeration, help output, and discovery-mode safety.
- Build/validation
  - `npm run build` succeeds.
  - `node tests/capabilities-cli.test.js` passes.
  - Existing CLI tests (`synth-cli.test.js`, `convergence-certification-cli.test.js`, `synth-cli-govern-explain.test.js`, `synth-cli-repo.test.js`) still pass.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
- `docs/expeditions/EXP-CLI-001.md`
