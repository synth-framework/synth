# Changelog

All notable changes to Synth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- EXP-CONT-001 — Resume Briefing (`synth explain resume`): deterministic projection of "what happened / what was decided / what is next" from replayable evidence for zero-history operators.
- EXP-CONT-002 — Interruption Benchmark (`scripts/interruption-benchmark.js`): kill-at-checkpoint matrix measuring the Repository Authority Index (RAI); baseline aggregate RAI 0.87.
- EXP-CONT-003 — TaskPRO Regression Journey (`scripts/taskpro-regression.js`): re-runs the canonical first-contact scenario and asserts that N1–N6/N8 failure modes are prevented or paved on the hardened build.
- EXP-GOV-002 — Governance Record (`synth explain governance`): deterministic projection of governance transitions (initialization, approval, governance_update, verification, bootstrap, reconciliation) from replay.
- `synth explain resume` now reads certified `ApprovedMissionModelSnapshot` artifacts so that missions approved through Mission Studio are reconstructable even before they are emitted to the event log.
- `docs/reference/repository-authority-index.md` — RAI definition and scoring rubric.
- EXP-PROGRAM-013 — Cognitive Continuity Program chartered (EXP-CONT-001, EXP-CONT-002, EXP-CONT-003).
- EXP-PROGRAM-014 — Governance Maturation Program chartered (EXP-GOV-002, EXP-GOV-003, EXP-GOV-004, EXP-GOV-005).
- EXP-GOV-003 — Constitutional Layer Boundaries (`docs/architecture/constitutional-layer-boundaries.md`): defines Governance vs. Implementation vs. Expedition vs. Bootstrap, with E1-derived examples and a decision matrix.
- EXP-GOV-004 — Projection Model (`docs/architecture/projection-model.md`): taxonomy of source of truth, canonical state, projections, cached projections, and forbidden duplication, with artifact classification table and E1 answers.
- EXP-GOV-005 — Verification Engine (`synth verify`): executable governance invariant verification with six checks (replay integrity, projection consistency, evidence referential integrity, assertion provenance, governance invariants, drift), structured report with prescriptive `nextStep`, and regression tests wired into `npm run govern`.
- EXP-PROGRAM-014 — Governance Maturation Program completed and accepted (EXP-GOV-002 through EXP-GOV-005).
- EXP-PROGRAM-012 — Runtime Self-Description Program marked completed and accepted.
- EXP-PROGRAM-013 — Cognitive Continuity Program marked completed and accepted.
- EXP-PROGRAM-015 — Repository Versioning Capability Program marked active.
- EXP-VCS-001 — Versioning Capability Contract: generic repository-versioning operations (`initializeRepository`, `createRevision`, `switchRevision`, `integrateRevision`, `publishRevision`, `createSnapshot`, `compareRevisions`, `history`, `synchronize`) and observation types; Git provided as the reference mapping.
- EXP-VCS-002 — Git Versioning Adapter (`src/environment/git-versioning-provider.ts`): reference implementation of the `VersioningCapability` using Git operations invoked through the Environment Process capability; registered as `git-versioning` provider.
- EXP-VCS-003 — GitHub Forge Adapter (`src/environment/forge-capability.ts`): extends `ForgeProvider` with remote mutations (`createPullRequest`, `mergePullRequest`, `forkRepository`) implemented via the `gh` CLI; credentials remain delegated to `gh`.

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

## [2.0.0] — 2026-07-12

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
