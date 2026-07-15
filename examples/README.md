# `examples/` — Canonical Example Projects

This directory contains reference projects that demonstrate Synth operating on realistic repositories.

## Examples

| Example | Description |
|---|---|
| `todo/` | Minimal task-tracking application |
| `blog/` | Content-driven web application |
| `crm/` | Customer relationship management backend |
| `legacy-node/` | Legacy Node.js application with migration path |
| `polyglot/` | Multi-language repository |
| `monolith/` | Large monolithic application |
| `first-contact/` | The canonical recorded journey for the First Contact experience |
| `_shared/` | Shared example runner (not a standalone example) |

Each example includes its own Mission and produces generated documentation and proof artifacts when run.

## Running an Example

Each example supports `npm run govern` from within its own directory.

Example runs produce local build artifacts — `data/`, `proof/`, and `docs-generated/` — which are not tracked in version control. Per the Projection Rule (EXP-PROGRAM-008), projection outputs are build artifacts, not authoritative project state.
