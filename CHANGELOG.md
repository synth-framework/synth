# Changelog

All notable changes to Synth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] — 2026-07-18

The Runtime Boundary Release. SYNTH now stores governed project runtime data under `.synth/data/` while keeping the source repository independent of `.synth/`.

### Runtime Data Boundary

- Co-located runtime authority and projections under `.synth/data/` for SYNTH-governed projects.
- Added automatic, byte-preserving migration from legacy repo-root `data/` to `.synth/data/`.
- Added `src/infra/paths.ts` as the single source of truth for runtime data paths.
- Added `src/infra/migrate-data-dir.ts` for one-time migration triggered by CLI and verification commands.
- Ungoverned directories — including the SYNTH source repository — continue to use repo-root `data/`.

## [2.0.0] — 2026-07-18

The Governed Execution Release. SYNTH 2.0 is now capable of transforming approved Expeditions into governed repository changes.

### Execution Pipeline

Completed the path from approved Expedition to repository artifact.

- **Execution Intent Model** — introduced explicit execution contracts between planning and runtime; added `ExecutionIntent`, `ExecutionIntentGraph`, and execution lifecycle events.
- **Work Item Runtime** — added deterministic execution dispatch through injected capabilities with lifecycle event emission.
- **Branch-per-Expedition Workflow** — Expeditions now receive isolated repository branches via `VersioningCapability`, recording the base commit in replay.
- **Commit-as-Evidence** — repository revisions are recorded as execution evidence via `EXPEDITION_EXECUTION_COMMITTED` events.
- **Pull Request Projection** — added `ForgeCapability` integration; pull requests are projected execution artifacts recorded via `EXPEDITION_EXECUTION_PROJECTED` events.

### Repository Versioning Capability

Repository operations are now modeled as governed capabilities.

- Generic `VersioningCapability` contract.
- Git reference adapter (`src/environment/git-versioning-provider.ts`).
- GitHub Forge adapter (`src/environment/forge-capability.ts`).
- Repository state observations: branches, commits, remotes, divergence, pull requests.
- Deterministic certification tests for repeatable repository state.

### Governance Maturation

Improved system verification and replay capabilities.

- `synth verify` — executable verification engine with six checks.
- Constitutional layer boundary documentation.
- Projection model documentation.
- Governance Record replay projection.

### Cognitive Continuity

Improved operator recovery and zero-history understanding.

- `synth explain resume` — resume briefing from replayable evidence.
- Interruption benchmark with Repository Authority Index measurement (RAI 0.87 baseline).
- TaskPRO regression journey.

### Runtime Self-Description

Improved runtime transparency.

- Operator briefing (`synth status`).
- Adapter introspection (`synth adapter info`).
- Clean `--json` machine output.
- Runtime integrity checks (`synth doctor`).
- Repository identity detection (`synth explain identity`).

### Internal Milestones

Completed and accepted:

- EXP-PROGRAM-012 — Runtime Self-Description
- EXP-PROGRAM-013 — Cognitive Continuity
- EXP-PROGRAM-014 — Governance Maturation
- EXP-PROGRAM-015 — Repository Versioning Capability
- EXP-PROGRAM-016 — Governed Expedition Execution

All accepted, merged, and passing CI.

## [2.0.0-rc.3] — 2026-07-17

The Era II adoption baseline release: Runtime Self-Description is complete, and the CLI can now be trusted, understood, and resumed by a new reasoning system.

### Added
- EXP-PROGRAM-012 — Runtime Self-Description Program (6 expeditions): Operator Briefing (`synth status`), Extraction Reporting, Adapter Introspection (`synth adapter info`), Clean Machine Output (`--json`), Runtime Integrity (`synth doctor` dist verification), Repository Identity (`synth explain identity`).
- `synth docs generate` returns extraction counts and warns loudly when Markdown files match but zero concepts are extracted.
- `synth adapter info <name>` exposes adapter metadata, state, and health without reading source.
- Global `--json` flag suppresses bootstrap diagnostic logs for machine-clean CLI output.
- `synth doctor` verifies installed `dist/` files against a build-time SHA-256 manifest.
- `synth explain identity` projects repository kind, phase, authority, expected inputs/outputs, and transformation direction from replayable evidence.

### Fixed
- `--json` is now correctly propagated to `synth explain` subcommands.

## [2.0.0-rc.2] — 2026-07-16

The Era I certification release: architecture validation closes, and the first-contact adoption baseline is frozen as historical evidence. Certification-style release notes are published with the GitHub release.

### Added
- EXP-PROGRAM-002 — SYNTH Public Release Program.
- EXP-PROGRAM-010 — Constitutional Hardening Program (7 expeditions): proposal-graph sealing in Mission Studio, signed and certified snapshot artifacts, Genesis intake certification, semantic replay verification, P6 Graph Integrity as a constitutional proof dimension, hardening observability (`synth explain`), permanent regression suites.
- EXP-FIRSTCONTACT-009 — Canonical Journey Re-recording: Archive B (hardened pipeline; 32 events; zero aggregate graph violations under `--strict-graph`; signed snapshot artifact) alongside hash-pinned Archive A (36 violations preserved immutably as forensic evidence); derived Archive A/B comparison projected to docs and website; reproducible recording harness (`record` mode in the shared example runner).
- EXP-PROGRAM-011 / 012 / 013 — Chartered adoption programs: Operator Trust & CLI Integrity, Runtime Self-Description, Cognitive Continuity (dependency-chained).
- EXP-REL-001 — Repository Organization with file naming conventions.
- EXP-REL-002 — Public Documentation (README, Mission Studio Guide, Examples Guide, FAQ).
- EXP-REL-003 — Example Certification (Todo, Blog, CRM, Legacy Node, Polyglot, Monolith).
- EXP-REL-004 — Website (static site under `website/`).
- EXP-REL-005 — Open Source Readiness (LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, templates, release workflow).
- TaskPRO first-contact field experiment evidence annex: independent zero-shot audit (rc.1, Windows, autonomous AI agent) characterizing the trust, discoverability, and continuity gaps that Programs 011–013 answer.

### Fixed
- Mission Studio proposal parent references (identity-space defect producing the 36 graph violations preserved in Archive A).
- Example runner proof `stateHash` (was `undefined`).

## [2.0.0-rc.1] — 2026-07-12

Architecture freeze and certification milestone. This marker represents the v2 kernel freeze and initial public vocabulary baseline, not a published npm package release.

### Added
- Synth v2 freeze.
- Seven public concepts: Mission, Expedition, Evidence, Plan, Event, State, Replay.
- Deterministic execution kernel with replay verification.
- Mission Studio with snapshot lineage.
- Documentation expedition generating seven target docs.
- Operator journey certification.
- Public vocabulary and architecture simplification.
- ADR-001 — Synth v2 Freeze Certification.
- ADR-002 — Product Boundary.
- ADR-003 — Synth v2.1 Validation Program Charter.
- ADR-004 — Synth Eras and Protected Assets.

### Changed
- Repository file naming convention to kebab-case.

## [1.0.0] — 2026-06-29

### Added
- Initial Synth v2 architecture and kernel.
- Event sourcing, replay, and proof generation.
