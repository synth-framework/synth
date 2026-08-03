---
Title: Task Orchestration Reference
Domain: reference
Audience: operators, agents, contributors
Prerequisites: public-vocabulary.md
Knowledge Establishes: How Synth tasks are defined, discovered, and executed
Depends On: public-vocabulary.md
Version: 2.4.1
Status: stable
---

# Task Orchestration Reference

Synth replaces static `package.json` scripts with a canonical, governed **task model**. A task is a deterministic unit of work with metadata, dependencies, grouping, tags, and execution semantics. The task engine gives operators and agents a single way to discover, explain, and run work across greenfield and brownfield projects.

This reference describes the task schema, how tasks are discovered, the CLI surface, and how tasks relate to npm scripts and CI.

## What is a task?

A task is a declarative artifact that says:

- **What** work to do (`command`).
- **Why** it exists (`description`, `tags`).
- **When** it runs (`dependsOn`, `group`).
- **How long** it takes (`estimatedDurationMs`).
- **What** it needs (`capabilities`).

Tasks are immutable. You create or update a task by adding or replacing its JSON definition, not by editing derived state.

## Task schema

Tasks are defined in `*.task.json` files.

```json
{
  "id": "build",
  "description": "Compile TypeScript sources to dist/.",
  "command": "npx tsc",
  "group": "build",
  "dependsOn": [],
  "tags": ["build", "typescript", "compilation"],
  "estimatedDurationMs": 15000,
  "capabilities": ["NodeJS", "TypeScript"],
  "lifecycle": "accepted"
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `id` | yes | Stable identifier. Must be unique within the registry. |
| `description` | yes | Human-readable purpose. |
| `command` | yes | Shell command or capability invocation to execute. |
| `group` | yes | Canonical namespace. See [Task groups](#task-groups). |
| `dependsOn` | no | Array of task ids that must run first. Forms the dependency graph. |
| `tags` | no | Searchable classifications. |
| `estimatedDurationMs` | no | Planning input for ordering and timeouts. |
| `capabilities` | no | Required runtime capabilities. Used by capability-aware scheduling. |
| `lifecycle` | no | `proposed`, `accepted`, `deprecated`, or `removed`. Defaults to `accepted`. |

## Task discovery

The task registry discovers tasks from:

1. `data/tasks/*.task.json` — project-level tasks.
2. `.synth/tasks/*.task.json` — project-local governed tasks.
3. Framework tasks distributed with Synth.

The registry enforces:

- Unique task ids.
- Valid dependency references.
- No duplicate definitions.

## Task groups

Canonical groups organize tasks by concern:

| Group | Example tasks |
|---|---|
| `build` | `build`, `build:agent-sdk` |
| `runtime` | runtime integrity checks |
| `documentation` | `docs:generate`, `docs:check-links` |
| `installer` | bootstrap and installation checks |
| `governance` | `govern`, `verify` |
| `discovery` | environment and capability discovery |
| `environment` | environment setup and validation |
| `certification` | certification and adversarial audits |
| `proof` | proof generation and publishing |
| `release` | release and distribution tasks |
| `distribution` | package and installer distribution |
| `ai` | AI benchmark and validation tasks |

Use groups to run related tasks together:

```bash
synth task run documentation
```

## CLI commands

### List tasks

```bash
synth task list
synth task list --group governance
synth task list --tag proof
```

### Explain a task

```bash
synth task explain govern
```

Output includes full metadata, transitive dependencies, and downstream consumers.

### Visualize the task graph

```bash
synth task graph --format json
synth task graph --format dot
synth task graph --format mermaid
```

### Diagnose the registry

```bash
synth task doctor
```

Reports cycles, orphaned tasks, deprecated tasks, and missing dependencies.

### Run a task

```bash
synth task run build
synth task run build --dry-run
synth task run governance
```

Dependencies are resolved and executed in topological order. `--dry-run` returns the planned order without running commands.

### Discover affected tasks

```bash
synth task affected --task build --task docs:generate
```

Returns the set of tasks transitively affected by changes to the named tasks.

### Generate a new task

```bash
synth task generate lint --group certification --command "npx eslint src/"
```

Writes a new `data/tasks/<id>.task.json` file. Refuses to overwrite an existing task unless `--force` is passed.

## npm scripts as adapters

Synth does not remove npm scripts overnight. Instead, `package.json` scripts become thin adapters that delegate to the task engine:

```json
{
  "scripts": {
    "build": "tsc && node scripts/generate-dist-manifest.js",
    "test": "node dist/cli/synth.js task run test",
    "govern": "node dist/cli/synth.js task run govern",
    "docs:generate": "node dist/cli/synth.js task run docs:generate"
  }
}
```

This preserves operator muscle memory while making the task model the source of truth. Legacy scripts remain as shims until an acceptance gate deprecates them.

## CI invocation

CI workflows invoke the task engine directly:

```yaml
- run: npm run build
- run: node dist/cli/synth.js task run govern
```

npm becomes a local convenience; CI delegates orchestration to Synth. This avoids duplicating script knowledge in GitHub Actions.

## Migration from npm scripts

To migrate an existing npm script:

1. Create `data/tasks/<script-name>.task.json` with the appropriate group and dependencies.
2. Run `synth task doctor` to validate the registry.
3. Replace the `package.json` script with `node dist/cli/synth.js task run <id>`.
4. Verify `npm run <name>` and `synth task run <name>` produce the same result.

Do not mark the original npm script `deprecated` until the adapter migration is accepted.

## Best practices

- Keep task ids stable; changing an id breaks dependencies.
- Declare real dependencies; do not rely on implicit ordering.
- Use tags for cross-cutting concerns, groups for execution namespaces.
- Set `estimatedDurationMs` to help the planner order work.
- Run `synth task doctor` before completing an expedition that touches tasks.

## Related

- [Public Vocabulary](public-vocabulary.md)
- [Operator Guide](../operator/14-local-vs-ci-validation.md)
- `docs/expeditions/EXP-PROGRAM-034.md`
