---
Title: Semantic Versioning
Domain: reference
Audience: maintainers
Prerequisites: docs/governance.md
Knowledge Establishes: How Synth versions releases
Depends On: docs/governance.md
Builds Toward: release workflow
Version: 1.0.0
Status: stable
---

# Semantic Versioning

Synth follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## Version Format

```text
MAJOR.MINOR.PATCH
```

## Rules

- **MAJOR** — Breaking change to the public contract or frozen kernel.
- **MINOR** — New capability within the existing public contract.
- **PATCH** — Bug fix or documentation correction.

## Public Contract

The public contract is the seven concepts (Mission, Expedition, Evidence, Plan, Event, State, Replay) and the proof classes (P1–P5). Breaking changes to these require a major version bump.

## Era Mapping

- **Era I — Foundation:** Led to v2.0.0.
- **Era II — Adoption:** v2.x.x releases. No architecture changes.
- **Era III — Evolution:** Will lead to v3.0.0 when the architecture lock is lifted.

## Release Process

1. Ensure `npm run govern` passes.
2. Update `CHANGELOG.md`.
3. Push a tag matching `v*.*.*`.
4. The release workflow creates a GitHub release and attaches the proof artifact.
