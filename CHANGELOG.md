# Changelog

All notable changes to Synth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.6.0] — 2026-08-09

### Added

- feat(governance): allow concurrent expedition execution
- feat(cli): batch expedition approve/commit/start
- feat(expedition): capture git-diff evidence against baseline commit
- feat(cli): add synth release command with dry-run, --approve, and safety gates (EXP-867406b42c125929)
- feat(expedition): add synth expedition refine command
- feat(expedition): add cancel CLI command and structured error logging
- feat: decouple expedition completion from convergence certification
- feat(governance): fully regenerable AGENTS.md root contract (#292)
- feat(governance): EXP-GATE-013 gate state and dependency enforcement
- feat(governance): Add convergence evaluation and certification flow
- feat(cli): Add governance report, list, show, and mission commands
- feat(capability): Update capability registry and generated AI manifests
- feat(cli): Make synth project AGENTS.md discoverable and section-aware
- feat(cli): Add synth repair state for canonical-state divergence recovery (#287)
- feat(bootstrap-002): initialize synth-v2 as a SYNTH project
- feat(cli): CAPTRANS-003 capability registry accuracy and CLI-005 program/expedition show commands
- feat(validation): integrate Program 030 planner with task graph (EXP-TASK-012)
- feat(cli): weighted governance inventory and next-action ranking (EXP-CLI-004)
- feat(git): EXP-GIT-001 governance state snapshots (#264)
- feat(first-contact): EXP-AIFC-011 detected-stack adapter & workflow recommendation (#263)
- feat(043): close EXP-MIGRATE-001 and implement EXP-BOOTSTRAP-001 (#262)
- feat(IDENTITY-001): implement identity transport layer (#252)
- feat(cli): stable warning IDs and docs provenance fixes (EXP-WARN-001)
- feat(cli): Event-log query CLI (EXP-EVENTLOG-001)
- feat(cli): Pre-flight dry-run for expedition lifecycle commands (EXP-DRYRUN-001)
- feat(cli): Human-readable --human output mode (EXP-CLI-002)
- feat(governance): Derived-state protection and expedition scope (EXP-GUARD-001)
- feat(cli): Actionable synth explain status with situation classifier (EXP-EXPLAIN-001)
- feat(cli): Add governance inventory list commands (EXP-CLI-003)
- feat(cli): Add guided first-contact onboard command (EXP-ONBOARD-001)
- feat(governance): Close EXP-GOV-024 brownfield migration blockers

### Fixed

- fix(cli): idempotent AI manifest generation and ignore .synth/ai derived files
- fix(replay): make state hash sensitive to expedition/mission metadata (EXP-867406b42c125929)
- fix(validation): map ProjectConfig and AI metadata; release 2.5.3 (#295)
- fix(cli): SYNTH v2.5.1 wild-test bug remediation (#294)
- fix(runtime): Harden state consistency, replay, and lifecycle validation
- fix(rank): treat 'deferred' as non-completed in program composition parsing
- fix(governance): Move path resolution out of Core boundary (EXP-GUARD-001)

### Other

- expedition(35898c7b9f08eb45): contextual CLI error hints
- expedition(034d3ecc2cc0015e): pre-check git status before expedition completion
- chore(release): bump version to 2.5.5
- [EXP-13b5b82a1dcb5a56] Add synth explain agents command for AI agent onboarding
- [EXP-b205c069fdc08d29] Bump version to 2.5.4
- [EXP-b205c069fdc08d29] Improve brownfield capability classification and validation planner
- [EXP-85e6e14936159482] Add expedition explain alias and friendly unknown-subcommand error
- chore(ai): regenerate capability and interaction manifests for refine command
- chore(ai): regenerate capability and interaction manifests
- docs(governance): mark EXP-REFINE-014 completed and certify ProjectMission reference (#293)
- chore(governance): regenerate AI lifecycle manifest and AGENTS.md
- docs(contract): Regenerate AGENTS.md and sync agents contract
- docs(guides): Update discovery, onboarding, and state analysis guides
- chore(release): Bump version to 2.5.0
- docs(expeditions): Mark Program 029 as completed and accepted (#289)
- docs(expeditions): Mark Program 044 and EXP-GOV-025 as completed (#288)
- EXP-BOOTSTRAP-002: Initialize synth-v2 as a SYNTH project
- EXP-DOC-008: Generated Documentation Provenance charter
- docs(program-044): EXP-DOC-008 Generated Documentation Provenance charter and CLI output alignment
- Program 044: Operational Readiness — CAPTRANS-003 + CLI-005
- docs(program-044): charters for Operational Readiness, CAPTRANS-003, CLI-005, and prefix-registry hygiene
- Merge pull request #283 from synth-framework/exp-gov-023-agent-governance-adherence
- EXP-GOV-023: agent governance adherence
- Merge pull request #282 from synth-framework/exp-dist-008-capability-list-consumption
- EXP-DIST-008: consume Program 043 capability list in AI projections
- docs(expeditions): close Program 031 and update Program 029 coordination
- docs(adr): accept ADR-044 and mark EXP-PROGRAM-034 as Completed
- docs(tasks): add task orchestration reference and update operator guide
- docs(expeditions): mark EXP-PROGRAM-043 as Completed
- docs(expeditions): normalize EXP-AIFC-011 status case
- docs(expeditions): mark EXP-WARN-001 as Completed
- docs(expeditions): mark EXP-GATE-014 as Completed
- docs(expeditions): align charter statuses for completed Program 034/043 work
- guard(docs): stop tracking generated docs in version control (EXP-GUARD-002)
- docs(cli): charter EXP-CLI-004 weighted governance inventory and next-action recommendation
- docs(031): close REVIEW-002 and REVIEW-003 convergence charters
- EXP-GRAPH-001: complete shared dependency-graph primitive
- docs(governance): EXP-REVIEW-001 first convergence review of 043 and 034 (#266)
- docs(roadmap): Era IV critical path and Program 043 completion (#265)
- EXP-MIGRATE-001: Legacy Synth state migration (#261)
- docs(migration): record EXP-REVIEW-007 CONVERGED and approve EXP-MIGRATE-001
- docs(migration): ADR-039 convergence review for EXP-MIGRATE-001
- docs(migration): charter EXP-MIGRATE-001 legacy state archive-or-import
- EXP-APPROVAL-001: Two-party approval for destructive operations
- docs(043): mark SIGN-001 complete and add APPROVAL-001 convergence review (#256)
- EXP-SIGN-001: implement event-log signing and verification (#255)
- docs(043): mark IDENTITY-001 complete and add SIGN-001 convergence review (#254)
- EXP-IDENTITY-001: consume captured identity in lifecycle events and synth log filters (#253)
- docs(031,034): post-ONBOARD-002 sequencing and current state (#251)
- docs(IDENTITY-001): ADR-039 Convergence Review — CONVERGED (#250)
- docs(expeditions): charter Workstream F remaining expeditions
- charter: EXP-AIFC-011 detected-stack adapter & workflow recommendation (#248)
- docs(IDENTITY-001): add ADR-039 Convergence Review gate and payload-only scope (#247)
- docs(043): mark ONBOARD-002 complete and charter EXP-IDENTITY-001 (#246)
- EXP-ONBOARD-002: Migrate First-Contact Onboarding to the Task Engine (#245)
- EXP-ONBOARD-002: charter first-contact task-engine migration (#244)
- EXP-REVIEW-003: Program 043 convergence review (#243)
- EXP-TASK-006: CI orchestration adapter (#242)
- EXP-TASK-005: reduce package.json to synth task adapter layer (#241)
- EXP-TASK-004: npm script migration
- EXP-TASK-003: task execution CLI
- EXP-TASK-002: read-only task CLI
- EXP-TASK-001: task schema and registry
- EXP-REVIEW-002: second convergence review of Program 034 (#236)
- EXP-PROGRAM-034/TASK-004: implement task graph on shared dependency-graph primitive (#235)
- EXP-GRAPH-001: implement shared dependency-graph primitive (#234)
- EXP-GRAPH-001: charter shared dependency-graph primitive implementation (#233)
- EXP-REVIEW-001: first convergence review of Program 043 and Program 034 (#232)
- EXP-ADP-001: surface repository adapter during onboarding (#231)
- EXP-GATE-014: mandatory verification gates before expedition completion (#230)
- docs: mark EXP-EVIDENCE-001 and EXP-EVENTLOG-001 completed in program tracker
- docs: mark EXP-CAPTRANS-002 and EXP-AGENTS-001 completed in program tracker
- EXP-CAPTRANS-002: graceful missing-capability handling
- Merge pull request #228 from synth-framework/exp-agents-001-sync
- Regenerate AGENTS.md with provenance footer
- Add tests for AGENTS.md synchronization
- Add synth project AGENTS.md CLI command and help
- Add AGENTS.md contract generator module
- Add EXP-AGENTS-001 charter and AGENTS prefix
- Merge pull request #227 from synth-framework/exp-evidence-001-auto-capture
- Fix capability count assertion and broken generated-docs link after evidence capture
- Update EXP-EVIDENCE-001 charter and add evidence capture tests
- Add synth expedition evidence command for automatic evidence capture
- Add EVIDENCE_ATTACHED event, replay handling, and AttachEvidence capability
- Merge EXP-GUARD-002 generated-docs process improvements
- Add EXP-EVIDENCE-001 charter and EVIDENCE prefix
- Merge origin/main; keep generated docs untracked
- Merge pull request #226 from synth-framework/exp-eventlog-001-completed
- Add EXP-GUARD-002 charter for CI-generated documentation
- Stop tracking docs/generated/*.md and verify freshness by determinism
- Regenerate documentation projections after main merge
- Merge origin/main; resolve generated docs conflicts by regeneration
- Merge pull request #225 from synth-framework/exp-warn-001-stable-warning-ids
- Regenerate documentation projections after main merge
- Merge origin/main; resolve generated docs conflicts by regeneration
- Regenerate documentation projections after computedAt fix
- Make documentation expedition computedAt injectable for deterministic tests
- Regenerate documentation projections after main merge
- Merge origin/main; resolve generated docs conflicts by regeneration
- docs: regenerate projections for PR 226 freshness
- Merge main into exp-warn-001-stable-warning-ids and regenerate projections
- Merge pull request #224 from synth-framework/exp-dryrun-001-completed
- Merge main and regenerate projections
- docs: regenerate projections for PR 224 freshness
- docs(expeditions): mark EXP-EVENTLOG-001 as completed
- Merge pull request #223 from synth-framework/exp-eventlog-001-cli-query
- Merge main into exp-eventlog-001-cli-query and regenerate projections
- docs: regenerate projections on eventlog branch after prefix registration
- docs: regenerate projections after EVENTLOG prefix registration
- chore(expeditions): register EVENTLOG prefix for EXP-EVENTLOG-001
- docs: regenerate projections after WARN prefix registration
- chore(expeditions): register WARN prefix for EXP-WARN-001
- docs: regenerate projections with provenance metadata (EXP-WARN-001)
- docs(expeditions): mark EXP-DRYRUN-001 as completed
- Merge pull request #222 from synth-framework/exp-dryrun-001-lifecycle-dry-run
- docs: regenerate projections for freshness (EXP-DRYRUN-001)
- docs: regenerate projections (freshness fix)
- docs: regenerate projections for EXP-EVENTLOG-001
- docs(expeditions): update PROGRAM-043 sequencing and mark CLI-002, EXPLAIN-001 completed
- docs(expeditions): snapshot EXP-DRYRUN-001 with PR reference and deferred scope
- docs: regenerate projections for EXP-DRYRUN-001
- Merge pull request #221 from synth-framework/exp-cli-002-human-output-mode
- docs: Regenerate projections after EXP-CLI-002
- Merge pull request #220 from synth-framework/exp-guard-001-derived-state-protection
- Merge branch 'main' into exp-guard-001-derived-state-protection
- docs: Regenerate projections after EXP-GUARD-001
- Merge pull request #219 from synth-framework/exp-explain-001-actionable-status
- docs: Regenerate projections after EXP-EXPLAIN-001
- Merge pull request #218 from synth-framework/exp-cli-003-governance-inventory
- Merge pull request #217 from synth-framework/exp-onboard-001-guided-first-contact
- Merge pull request #216 from synth-framework/exp-program-043-agent-onboarding
- docs: Regenerate projections and certification matrix
- test(cli): Add synth capabilities contract tests and complete EXP-CAPTRANS-001
- docs(governance): Define EXP-PROGRAM-043 agent onboarding program and charters
- EXP-DIST-004: npm Package Distribution
- EXP-DIST-003: SYNTH MCP Server
- EXP-DIST-005: IDE Rules Projection
- Fix documentation projection determinism
- EXP-DIST-002: Agent Skill Projection Pipeline
- Regenerate documentation projections
- EXP-DIST-001: Canonical AI Capability Model and initial projections
- docs(history): add Era III retrospective and roadmap governance rule
- docs(roadmap): add Era IV readiness review and adoption criteria
- docs(platform): add canonical SYNTH Platform front door
- docs(generated): regenerate projections after Era IV rebaseline
- docs(governance): Era III → Era IV portfolio rebaseline


## [2.5.1] — 2026-08-07

### Added

- `scripts/create-pr.sh` helper that wraps `gh pr create` and always uses `--body-file` to avoid shell interpolation issues with backticks and Markdown syntax.

### Fixed

- `scripts/check-links.js` now excludes `knowledge/AGENTS-intro.md` from standalone link checking. That file is a source fragment embedded into the generated `AGENTS.md`, so its links are validated in the generated document.

### Documentation

- `docs/expeditions/EXP-REFINE-014.md` marked as Completed with evidence pointing to `src/governance/project-mission.ts`, the `synth mission project` CLI, and the unit-test suite.
- `docs/adr/ADR-045-governance-lifecycle-state-machine.md` now references `src/governance/project-mission.ts` as the canonical `ProjectMission` reference implementation.

## [2.4.1] — 2026-07-25

### Fixed

- `scripts/install.sh` now parses the JSON `synth --version` contract
  introduced in 2.4.0, so bootstrap installation certification passes.
- `src/governance/adr-registry.ts` no longer crashes when `docs/adr` is
  absent, which is the case for the published npm package. This allows
  `synth init` and `synth doctor` to succeed after a clean global install.

## [2.4.0] — 2026-07-25

The SYNTH Platform v1.0 Release.

This release marks the stabilization of the SYNTH platform for general adoption.
All remaining v1.0 architecture (kernel, SDK, event model, governance lifecycle,
and replay engine) is frozen and certified.

### Platform v1.0 Certification

- Added the SYNTH Platform v1.0 Manifest at
  `docs/certifications/synth-platform-v1-0-manifest.json`.
- Added `scripts/generate-platform-manifest.js` to regenerate the manifest from
  the current source tree.
- Added `scripts/validate-clean-clone.sh` to verify that the repository builds,
  tests, governs, and certifies from a fresh clone.
- Issued five certification tracks under EXP-PROGRAM-042: Reproducibility,
  Operator Experience, Governance, Architecture Baseline, and Release Readiness.

### Clean-Clone Hardening

- Tracked `docs/generated/` as the committed documentation baseline so that
  `docs:verify-freshness` passes on a clean checkout.
- Removed the undefined `test:first-contact-projection` script from `test:all`.
- Relaxed the `govern-profiler` percentage-sum tolerance for dry-run summaries.
- Excluded volatile `versioning.pullRequest` observations from the discovery
  evidence content hash, making discovery deterministic across clones.

## [2.3.0] — 2026-07-19

The Operator Surface Stabilization Release.

This release completes the stabilization of SYNTH's operator surface before the Incremental Governance program (EXP-PROGRAM-021) begins. Brownfield onboarding, CLI diagnostics, deterministic runtime transitions, and replay recovery are now considered stable foundations.

### Brownfield Bootstrap Hardening

Completed EXP-BROWNFIELD-001, making brownfield onboarding deterministic, mutation-safe, and self-guiding.

- Brownfield Bootstrap Specification in `docs/guides/brownfield-bootstrap-specification.md`.
- Discovery Safety Model with READ_ONLY / PROPOSAL_ONLY / MUTATING command classification.
- Runtime transition contract: Draft → Approved → Committed → Executing → Completed.
- Agent context contract via `.synth/context.json`.
- Namespace-owned CLI help for every command.
- Brownfield Certification test suite in `tests/brownfield-certification.test.js`.

### CLI UX and Diagnostics Hardening

Completed EXP-CLI-001.

- Fixed misleading `govern skipped` diagnostic when `package.json` exists without a `govern` script.
- Eliminated duplicate stdout logging during bootstrap and diagnostics.
- Clarified documentation capabilities vs. generated documentation.
- Removed the `shell: true` deprecation warning from `synth govern`.
- Split `synth doctor` into Runtime Health and Project Health sections.
- Added `synth discover --export` for explicit, immutable discovery baselines.

### Runtime Correctness and Recovery

Completed EXP-RUNTIME-001.

- Mission approval is now atomic: `MISSION_CREATED` and `MISSION_APPROVED` runtime events are emitted before the certified snapshot is persisted.
- Added `synth repair replay` with dry-run and `--approve` modes.
- Repair detects drift between certified Mission snapshots and runtime state and emits compensating events through the `ExecutionGate`.
- Added runtime event-guarantee certification tests in `tests/runtime-repair.test.js`.

### Programs and Process

- Chartered EXP-PROGRAM-021 — Incremental Governance, to transform `npm run govern` into a dependency-aware, fingerprint-based incremental validation system.
- Added ADR-018 — npm Package Publication Through PR and Tag.

## [2.2.0] — 2026-07-18

The First Contact Learning System Release.

### Agent First Contact Learning System

Completed EXP-FIRSTCONTACT-011, turning the First Contact experience into an evidence-driven learning system.

- Canonical `ConversationPattern` artifacts derived from observed first-contact sessions.
- Pattern extraction, validation, promotion, and persistence in `src/first-contact/patterns.ts`.
- `scripts/extract-conversation-patterns.js` to generate patterns from session evidence.
- Quick-start Markdown projections generated from canonical patterns into `docs/first-contact/quick-start/`.
- `scripts/generate-first-contact-quickstart.js` with `--check` drift detection.
- First Contact Experience v2 specification and agent onboarding contract in `docs/first-contact/experience-v2.md`.
- New tests: `tests/first-contact-patterns.test.js`, `tests/first-contact-quickstart.test.js`.

### Governance Cleanup

Marked completed in their charters: EXP-GOV-007, EXP-GOV-008, EXP-GOV-009, EXP-INIT-001, EXP-EXEC-002, EXP-EXEC-003, EXP-EXEC-005.

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
