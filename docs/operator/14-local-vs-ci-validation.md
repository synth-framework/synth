# Local vs CI Validation

**Scope:** How to validate changes during development and before merging.

**Status:** Active as of EXP-VAL-012.

---

## The rule

- **Local work:** use `synth validate` for fast feedback.
- **Merge gate:** CI always runs the full `npm run govern`.

Adaptive validation is an optimization, not a replacement. The constitutional proof is unchanged.

---

## `synth validate`

Analyzes the current change set and runs only the validations that could be affected:

```bash
synth validate
```

Output is JSON and includes:

- `files`: changed files detected by `git diff`.
- `affectedCapabilities`: capabilities impacted by the change.
- `protectedAssets`: any Protected Assets touched.
- `risk`: `low`, `medium`, or `high`.
- `run`: scripts to execute.
- `skip`: scripts that are safe to skip.
- `confidence`: coverage of the capability map.
- `execution`: results of each executed script (when not in dry-run mode).

If a Protected Asset is touched, `run` becomes `["govern"]` and the full pipeline executes.

---

## `synth validate --dry-run`

Preview the plan without running anything:

```bash
synth validate --dry-run
```

Useful for agents that want to report what would run before spending time on it.

---

## `synth validate --full`

Run the complete canonical governance pipeline locally:

```bash
synth validate --full
```

This is equivalent to `npm run govern`.

---

## CI behavior

GitHub Actions continues to run:

```bash
npm run govern
```

on every pull request and merge. This guarantees that every change merged to `main` passes the full constitutional verification: build, all tests, replay, determinism, adversarial audit, and proof generation.

An optional informational workflow may run `synth validate --dry-run` to display the optimized plan, but it does not gate the merge.

---

## When to use which

| Situation | Command |
|---|---|
| Quick local check during iteration | `synth validate` |
| Preview the plan | `synth validate --dry-run` |
| Final local verification before merge | `synth validate --full` or `npm run govern` |
| Merge gate in CI | `npm run govern` |

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All planned validations passed. |
| `1` | A planned validation failed or a required file/resource was missing. |

---

## Running tasks through the task engine

Synth also exposes a canonical task engine. The same validations are available as tasks:

```bash
synth task run validate
synth task run govern
synth task run docs:generate
```

Use `synth task list` to discover available tasks and `synth task explain <id>` to inspect what a task does before running it. CI invokes tasks directly:

```bash
node dist/cli/synth.js task run govern
```

This keeps `package.json` as a thin adapter layer and makes the task model the single source of truth for how work is executed.

## Best practice

Never use `synth validate` alone as justification to skip `npm run govern` before merging. The adaptive planner may only run a subset of tests; the full pipeline is the constitutional guarantee.
