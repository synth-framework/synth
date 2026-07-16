# Changelog

All notable changes to Synth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- EXP-PROGRAM-002 — SYNTH Public Release Program.
- EXP-REL-001 — Repository Organization with file naming conventions.
- EXP-REL-002 — Public Documentation (README, Mission Studio Guide, Examples Guide, FAQ).
- EXP-REL-003 — Example Certification (Todo, Blog, CRM, Legacy Node, Polyglot, Monolith).
- EXP-REL-004 — Website (static site under `website/`).
- EXP-REL-005 — Open Source Readiness (LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, templates, release workflow).

## [2.0.0-rc.2] — 2026-07-16

The Era I certification release: architecture validation closes, and the first-contact adoption baseline is frozen as historical evidence. Certification-style release notes are published with the GitHub release.

### Added
- EXP-PROGRAM-010 — Constitutional Hardening Program (7 expeditions): proposal-graph sealing in Mission Studio, signed and certified snapshot artifacts, Genesis intake certification, semantic replay verification, P6 Graph Integrity as a constitutional proof dimension, hardening observability (`synth explain`), permanent regression suites.
- EXP-FIRSTCONTACT-009 — Canonical Journey Re-recording: Archive B (hardened pipeline; 32 events; zero aggregate graph violations under `--strict-graph`; signed snapshot artifact) alongside hash-pinned Archive A (36 violations preserved immutably as forensic evidence); derived Archive A/B comparison projected to docs and website; reproducible recording harness (`record` mode in the shared example runner).
- EXP-PROGRAM-011 / 012 / 013 — Chartered adoption programs: Operator Trust & CLI Integrity, Runtime Self-Description, Cognitive Continuity (dependency-chained).
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
