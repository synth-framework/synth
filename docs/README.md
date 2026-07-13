# Synth Documentation

This directory contains the canonical documentation for Synth v2.

## Start Here

| If you want to... | Read this |
|---|---|
| Understand Synth in one paragraph | [Root README](../README.md) |
| Install and run Synth in five minutes | [Quick Start](getting-started/README.md) |
| Learn the public concepts | [Public Vocabulary](reference/public-vocabulary.md) |
| See the high-level flow | [Public Architecture](reference/public-architecture.md) |
| Plan work in Synth | [Mission Studio Guide](operator/mission-studio-guide.md) |
| Run examples | [Examples Guide](operator/examples-guide.md) |
| Understand the operator journey | [Operator Journey](operator/13-operator-journey.md) |
| Get answers quickly | [FAQ](operator/12-faq.md) |

## Documentation Domains

| Domain | Audience | Contents |
|---|---|---|
| [getting-started/](getting-started/) | New operators | First-time setup and quick start |
| [operator/](operator/) | Operators, developers, PMs | Day-to-day guides and workflows |
| [guides/](guides/) | Everyone | Philosophy, tutorials, agent guidance, and contributor guides |
| [architecture/](architecture/) | Architects, senior developers | System architecture and decisions |
| [reference/](reference/) | Everyone | Schemas, vocabularies, inventories, and quick lookup |
| [examples/](examples/) | Operators | Documentation for the example repositories |
| [expeditions/](expeditions/) | Maintainers | Approved and proposed work |
| [adr/](adr/) | Architects | Architecture Decision Records |
| [generated/](generated/) | Tools | Auto-generated architecture guides |
| [audits/](audits/) | Reviewers | Audit reports and certification evidence |

## Public Vocabulary

All public-facing documentation uses exactly seven concepts:

**Mission, Expedition, Evidence, Plan, Event, State, Replay.**

Internal component names (ExecutionGate, Capability Registry, adapters, etc.) belong in developer and generated documentation only. See [ADR-002 — Product Boundary](adr/ADR-002-product-boundary.md).

## Governance

Documentation changes follow the same governance as code changes. Era II work (Adoption) may modify docs, examples, and website assets. It may not modify the public vocabulary or architectural model without an ADR. See [ADR-004 — Synth Eras and Protected Assets](adr/ADR-004-synth-eras-and-protected-assets.md).
