# SYNTH Certification DSL

The Certification DSL is a declarative format for describing failure and recovery scenarios that the SYNTH Certification Framework can execute deterministically. Each scenario is a YAML file that separates intent (what failure is being tested) from execution (how the scenario is prepared and verified).

## Design Principles

1. **Public surface only.** Scenarios may only invoke documented CLI commands and inspect documented artifacts.
2. **Deterministic.** The same scenario on the same SYNTH version produces the same verdict.
3. **Replayable.** A scenario definition plus a SYNTH version is sufficient to reproduce the certification report.
4. **Recovery is required.** Every failure scenario MUST include a recovery phase that uses only public commands.

---

## File Layout

Scenarios live in a certification library directory. The default library is `tests/certifications/`.

```text
tests/certifications/
  discovery-rejects-mutating-command.yaml
  expedition-create-missing-mission.yaml
  bootstrap-without-govern-script.yaml
  ...
```

---

## Schema

### Top-level fields

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | yes | string | Unique scenario identifier. |
| `name` | yes | string | Human-readable scenario name. |
| `description` | yes | string | What the scenario exercises and why. |
| `taxonomy` | yes | string[] | Failure taxonomy categories/subtypes. |
| `level` | yes | 1 \| 2 \| 3 | Certification maturity level. |
| `workspace` | no | object | Files to create in the isolated scenario workspace. |
| `setup` | no | Step[] | Commands that prepare the workspace before the failure injection. |
| `steps` | yes | Step[] | Commands that exercise the failure condition. |
| `recovery` | yes | Step[] | Commands that recover from the failure using public workflows. |
| `verify` | yes | Step[] | Commands that prove the recovered state is consistent. |

### `workspace` object

| Field | Required | Type | Description |
|---|---|---|---|
| `files` | no | File[] | Files to write into the workspace before setup. |

### `File` object

| Field | Required | Type | Description |
|---|---|---|---|
| `path` | yes | string | Relative path inside the workspace. |
| `content` | yes | string | File contents. |

### `Step` object

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | yes | string | Human-readable step label. |
| `command` | yes | string[] | CLI command as an array of tokens. The first token is the SYNTH subcommand; remaining tokens are arguments. |
| `expect` | yes | Expectation | Expected outcome of the step. |
| `capture` | no | object | Values to extract from JSON output for use in later steps. |

### `Expectation` object

| Field | Required | Type | Description |
|---|---|---|---|
| `status` | yes | 0 \| "non-zero" | Expected exit status. |
| `stdoutContains` | no | string \| string[] | Strings that must appear in stdout. |
| `stderrContains` | no | string \| string[] | Strings that must appear in stderr. |
| `jsonPath` | no | object | Key-value pairs matched against parsed JSON output. |

### `capture` object

| Field | Required | Type | Description |
|---|---|---|---|
| `jsonPath` | yes | object | Map of variable names to JSONPath-like dot paths. Captured values are substituted into later command arguments using `{{variableName}}`. |

---

## Example

```yaml
id: discovery-rejects-mutating-command
name: Mutating command rejected during Discovery
description: >
  When --discovery-mode is active, a MUTATING command must be rejected
  before it mutates repository or governance state.
taxonomy:
  - operator.invalid-command
  - discovery
level: 2

workspace:
  files:
    - path: package.json
      content: '{"name": "cert-test", "version": "1.0.0"}'

steps:
  - name: docs generate rejected during discovery
    command: ["--discovery-mode", "docs", "generate"]
    expect:
      status: "non-zero"
      stdoutContains:
        - "MUTATING"
        - "cannot run during Discovery"

recovery:
  - name: docs generate succeeds outside discovery mode
    command: ["docs", "generate"]
    expect:
      status: 0

verify:
  - name: replay remains consistent
    command: ["explain", "replay"]
    expect:
      status: 0
```

---

## Variable Substitution

Steps may reference values captured from earlier steps:

```yaml
setup:
  - name: create mission draft
    command: ["mission", "create", "--subject", "Certification Mission", "--purpose", "Test"]
    capture:
      jsonPath:
        draftId: "draftId"
    expect:
      status: 0

steps:
  - name: approve without evidence fails
    command: ["mission", "approve", "--draft-id", "{{draftId}}"]
    expect:
      status: "non-zero"
      stdoutContains: "confidence"
```

---

## Certification Levels

| Level | Name | Purpose |
|---|---|---|
| 1 | Workflow Certification | Normal operator journey under expected conditions. |
| 2 | Failure Certification | Injected failures and boundary conditions. |
| 3 | Resilience Certification | Long-running operational behavior and compatibility. |

---

## Public-Surface-Only Rule

The following are prohibited in any certification scenario:

- Internal modules or APIs.
- Direct event-log editing.
- Hash recomputation.
- Inspection of runtime objects outside documented CLI output.
- Test-only hooks or environment variables not documented as public.

If a scenario cannot recover without using a prohibited mechanism, the scenario MUST fail certification. This rule forces recovery paths to become part of the product surface.
