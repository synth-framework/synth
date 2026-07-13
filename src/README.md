# `src/` — Source Code

This directory contains the canonical TypeScript source for the Synth v2 execution kernel and its surrounding systems.

## Organization

| Directory | Responsibility |
|---|---|
| `adapters/` | Adapters that bridge external systems into Synth's canonical data model |
| `api/` | Public API surface and intent handling |
| `capability/` | Capability definitions and the capability registry |
| `cli/` | Command-line interface |
| `command/` | Command parsing and validation |
| `compiler/` | Deterministic plan compilation |
| `control/` | Execution control and gating |
| `core/` | Core kernel types and utilities |
| `documentation/` | Documentation generation and projection engine |
| `domain/` | Domain models and business rules |
| `genesis/` | Genesis bootstrap and initialization |
| `governance/` | Expedition governance, policies, and permits |
| `infra/` | Infrastructure adapters |
| `mission-studio/` | Mission Studio planning and snapshot lineage |
| `observability/` | Logging, events, and diagnostics |
| `planning/` | Planning cognition engine |
| `policy/` | Policy enforcement |
| `runtime/` | Deterministic runtime engine |
| `types/` | Shared TypeScript types |
| `validation/` | Validation utilities |
| `workspace/` | Workspace cognition environment |

## Build

TypeScript compiles into `dist/` via `npm run build`.
