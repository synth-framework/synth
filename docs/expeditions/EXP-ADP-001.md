# EXP-ADP-001 — Surface Repository Adapter During Onboarding

> Make the repository adapter visible to operators and agents as soon as they enter the guided onboarding flow.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** TaskPRO onboarding retrospective, bulletproof-agent-governance requirements  
**Depends On:** EXP-CAPTRANS-001 (`synth capabilities`), EXP-CAPTRANS-002 (missing-capability handling)  
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

Today an operator can run `synth capabilities` and see that the `repository-adapter` capability is installed, but they have no way to know whether SYNTH actually sees a usable git repository in the current directory. During onboarding this is a critical piece of context:

- If a git repo is present, commits and branches can be governed.
- If git is only present in a parent directory, the operator may be initializing governance in a subdirectory.
- If no git repo exists, the operator should be told before they expect automatic commit/tag behavior.

This expedition adds a read-only `repositoryAdapter` snapshot to the `synth first-contact` plan and completion output.

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| A1 | Agents cannot tell whether the repository adapter is actually attached to a git repo | High | Proposed |
| A2 | Onboarding plan does not surface source-history availability | Medium | Proposed |

## Deliverables

### 1. Repository adapter snapshot

Extend `synth first-contact` (bare, `--dry-run`, and `--approve`) to include:

```json
{
  "repositoryAdapter": {
    "detected": "git",
    "initialized": true,
    "branch": "main",
    "remoteConfigured": true,
    "uncommittedChanges": false,
    "hooksInstalled": false,
    "health": "unhealthy",
    "nextStep": "synth adapter install-hooks"
  }
}
```

Possible `detected` values:

- `"git"` — `.git` exists in the target directory.
- `"external"` — `.git` exists only in a parent directory.
- `"none"` — no git history detected.

### 2. Actionable next step

The snapshot's `nextStep` should change based on detection:

- Git present but hooks missing → `synth adapter install-hooks`
- Git present and healthy → `synth repo status`
- No git → `synth adapter init` or manual `git init`
- External git → warn that governance is being initialized in a subdirectory

### 3. Tests

`tests/first-contact-adapter-surface.test.js` covering:

- Git repo detection in plan output.
- Non-git brownfield detection.
- Empty directory detection.
- Snapshot carried through `--approve` completion output.

## Acceptance Criteria

1. `synth first-contact --dry-run` in a git repo includes a `repositoryAdapter` snapshot with `detected: "git"`.
2. `synth first-contact` in a directory without git includes `detected: "none"`.
3. The snapshot includes `branch`, `remoteConfigured`, `uncommittedChanges`, `hooksInstalled`, and `health`.
4. The snapshot's `nextStep` is actionable and varies with state.
5. Existing first-contact onboard tests continue to pass.
6. `npm run build` succeeds and targeted tests pass.

## Out of Scope

- Adding repository adapter status to `synth status` or `synth explain identity`.
- Auto-initializing git repositories during onboarding.
- Changing `synth capabilities` output.

## Governance

### Protected

- Public vocabulary.
- Event model (no new event types).
- ExecutionGate as sole mutation authority.

### Not included

- New constitutional rules.
- Changes to replay semantics.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-CAPTRANS-001.md`
- `docs/expeditions/EXP-CAPTRANS-002.md`
