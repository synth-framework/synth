---
Title: Repository Bootstrap
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: How an AI agent transforms any repository into a Synth project
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Repository Bootstrap

The `synth bootstrap` command transforms any repository into a Synth project.

## Supported repository types

- **Empty** — fresh directory with no files.
- **Existing** — project with source code but no Synth configuration.
- **Brownfield** — legacy project with mixed or outdated structure.
- **Polyglot** — project with multiple languages.

## Command

```bash
# Preview what Synth would propose without making changes
synth bootstrap --dry-run

# Apply the proposed configuration
synth bootstrap --approve

# Bootstrap with optional website and example scaffolding
synth bootstrap --approve --with-website --with-example
```

## What it does

1. **Analyzes** the repository using Synth adapters:
   - filesystem
   - architecture
   - dependency
   - knowledge-extraction
   - specification

2. **Detects** repository type, languages, frameworks, and tests.

3. **Generates** Mission and Expedition proposals via Mission Studio.

4. **Requires approval** (`--approve`) before mutating the repository.

5. **Applies** the configuration:
   - Creates `.synth/manifest.json`.
   - Generates documentation if `docs/` exists.
   - Optionally scaffolds `website/`.
   - Optionally creates an example under `examples/`.
   - Runs `npm run govern` if a `govern` script exists.

## Safety

- `--dry-run` produces no mutations.
- Without `--approve`, the command only prints proposals.
- Existing source files are never overwritten.

## Example

```bash
synth bootstrap --approve --name "My Project"
```

Expected output is JSON describing the repository type, proposals, and applied artifacts.
