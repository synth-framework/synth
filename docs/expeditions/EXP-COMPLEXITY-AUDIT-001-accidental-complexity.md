# EXP-COMPLEXITY-AUDIT-001 — Accidental Complexity Report

> Subsystems and patterns that exist because of evolution rather than necessity.

**Status:** Draft  
**Expedition:** `EXP-COMPLEXITY-AUDIT-001`  
**Date:** 2026-07-21  

---

## Method

Accidental complexity is identified by:

- Subsystems with no production callers outside tests.
- Subsystems whose responsibility overlaps another existing subsystem.
- Concepts promoted to canonical status before their authority was resolved.
- Events that encode workflow state rather than facts.
- Abstractions that cost more than the concrete cases they handle.

Evidence sources:

- `grep` for cross-subsystem imports in `src/`
- `package.json` scripts and `scripts/govern-profiler.js` for production workflows
- Test counts per subsystem
- File and line counts from `wc -l`
- Recent expedition history (`docs/expeditions/`)

---

## Finding 1 — Adapter proliferation

### Evidence

- `src/adapters/` contains **16 registered adapters** and **~5,650 lines** of TypeScript.
- Each adapter has a dedicated `adapter.ts` and `types.ts`, following a uniform pattern.
- Registered adapters: repository, github, tdd, bdd, conversation, document, filesystem, specification, knowledge-extraction, confidence, dependency, architecture, mission-builder, expedition-builder, objective-builder, wizard.
- Adapters are registered in `src/adapters/registry.ts`.
- Dedicated test scripts in `test:all`: `test:adapter`, `test:github`, `test:tdd`, `test:bdd`, `test:conversation`, `test:document`, `test:filesystem`, `test:specification`, `test:knowledge-extraction`, `test:confidence`, `test:dependency`, `test:architecture`, `test:mission-builder`, `test:expedition-builder`, `test:objective-builder`, `test:wizard`.

### Analysis

Adapters are an implementation-layer concern: they translate between SYNTH's model and external systems/files. However, several adapters duplicate capability-layer semantics:

- `mission-builder`, `expedition-builder`, `objective-builder`, and `wizard` adapters produce plans that the **Planning Cognition Engine** and **Mission Studio** also produce.
- `knowledge-extraction`, `confidence`, `dependency`, and `architecture` adapters overlap with **Discovery**, **Knowledge**, and **Verification** subsystems.
- `conversation` adapter overlaps with **First Contact** intent capture.

The adapter framework itself is small (`src/adapters/registry.ts`, 170 lines), but the per-adapter boilerplate multiplies cost.

### Accidental complexity

- **Multiple abstraction layers for the same user problem.** A mission can be created via domain capability, planning engine, mission-builder adapter, or Mission Studio.
- **Uniform adapter/types file pair for every external interface**, even when the interface is trivial.

---

## Finding 2 — Environment capability framework vs. adapters

### Evidence

- `src/environment/` contains **18 files** and **~3,725 lines**.
- `src/environment/providers/` contains only **one provider file**: `reference.ts`.
- Environment capabilities include: filesystem, process, runtime, forge, secrets, versioning, workspace, revision.
- Dedicated test scripts in `test:all`: `test:environment-*` (10 scripts).

### Analysis

The environment framework defines a capability-discovery model for external tools. However, its concrete usage is thin: only one provider exists, and many environment concerns are also handled by adapters (`filesystem` adapter, `github` adapter, repository adapter).

This creates **two parallel extension mechanisms**:

- `src/adapters/` — external-system adapters
- `src/environment/providers/` — environment capability providers

Both produce `Observation` values consumed by governance. The distinction between "adapter" and "environment provider" is not obvious from user-facing vocabulary.

### Accidental complexity

- **Dual extension model** for the same class of external integration.
- Large framework surface (`src/environment/`) relative to actual provider count (1).

---

## Finding 3 — Two cognition engines: Planning and Workspace

### Evidence

- `src/planning/` — **6 files**, **~773 lines**.
- `src/workspace/` — **8 files**, **~1,273 lines**.
- Both produce structured observations/reports from repository state.
- Planning: `PlanningEngine`, `PlanningCoordinator`, `IntentClassifier`, `QuestionGenerator`, `KnowledgeExtractor`, `ObjectiveSynthesizer`, `DiscoveryEvaluator`, `DecisionEvaluator`, `SideQuestManager`, `PlanningConfidence`.
- Workspace: `WorkspaceCognitionEnvironment`, `CanonicalLanguageAuditor`, `RepositoryHealth`, `SemanticVerifier`, `ExecutionArtifactAdapter`.

### Analysis

Planning Cognition Engine focuses on mission/expedition synthesis. Workspace Cognition Environment focuses on repository orientation and semantic verification. The boundary is reasonable, but both use the word "Cognition" and both produce reports that feed planning.

The overlap is in **knowledge extraction**: Planning has `KnowledgeExtractor`; Workspace has `CanonicalLanguageAuditor` and `SemanticVerifier`; Discovery has its own extraction pipeline.

### Accidental complexity

- **Multiple knowledge-extraction paths** (Planning, Workspace, Discovery, Knowledge adapters) with no single canonical extractor.
- Two "Cognition" subsystems increase the conceptual surface without a clear user-facing distinction.

---

## Finding 4 — First Contact pipeline

### Evidence

- `src/first-contact/` — **24 files**, **~2,864 lines**.
- Subdirectories: `artifact`, `clarify`, `extract`, `materialize`, `project`, `verify`.
- Dedicated test scripts in `test:all`: `test:first-contact-projection`, `test:first-contact-patterns`, `test:first-contact-quickstart`, `test:first-contact-archive-a`.
- CLI command: `src/cli/first-contact.ts`.

### Analysis

First Contact handles initial user intent capture and homepage generation. It overlaps with:

- **Genesis / Alignment** (intent capture, refinement, alignment contracts).
- **Mission Studio** (mission planning).
- **Documentation projection** (website/docs generation).
- **First-contact adapters** (`conversation` adapter).

The subsystem is large and product-specific (homepage), yet it sits inside the core source tree.

### Accidental complexity

- **Product-specific workflow** (homepage first-contact) embedded in core source.
- Overlap with Genesis intent refinement and Mission Studio planning.

---

## Finding 5 — Discovery subsystem

### Evidence

- `src/discovery/` — **27 files**, **~5,617 lines**.
- Subsystems: adapter registry, canonical, consumer registry, correlate, engine, normalize, projection capability executor, replay, session provider, plus `adapters/`, `capabilities/`, `consumers/`, `projections/`, `providers/`.
- Dedicated test scripts in `test:all`: `test:discovery` (bundles 12 discovery test files).

### Analysis

Discovery is a large subsystem for observing the repository and extracting facts. It overlaps with:

- **Workspace Cognition Environment** (`RepositoryHealth`, `SemanticVerifier`).
- **Knowledge subsystem** (`src/knowledge/`).
- **Planning KnowledgeExtractor**.
- **Environment capability discovery** (`src/environment/`).

The term "discovery" appears in multiple independent subsystems with different scopes.

### Accidental complexity

- **Multiple discovery frameworks** with overlapping goals: repository discovery, environment discovery, knowledge discovery.
- Large surface area relative to distinct user value.

---

## Finding 6 — Semantic modeling

### Evidence

- `src/semantic-modeling/` — **8 files**, **~1,315 lines**.
- Subdirectories: `domain`, `intent`.
- No dedicated test script in `test:all`.
- Imports checked: used by `src/genesis/` and `src/governance/`.

### Analysis

Semantic modeling provides intent/domain modeling abstractions. It overlaps with:

- **Genesis intent modeling** (`src/governance/intent-model.js`).
- **Planning Cognition Engine** intent classification.
- **Alignment Contracts**.

The subsystem was likely introduced to support Genesis but now coexists with the Genesis/Alignment implementation.

### Accidental complexity

- **Parallel intent/semantic model** alongside Genesis intent models and planning intent classification.

---

## Finding 7 — Governance engine proliferation

### Evidence

- `src/governance/` — **15 files**, **~3,388 lines**.
- Includes: `review-gate-engine.ts`, `review-gates.ts`, `divergence-gate.ts`, `alignment-contract.ts`, `intent-model.ts`, `refinement-layer.ts`, `refinement-report.ts`, `reference-evidence.ts`, `project-mission.ts`, plus planning helpers.
- Each engine has its own state machine and event vocabulary.

### Analysis

Recent expeditions added:

- Review gates (`EXP-PROGRAM-035`)
- Acceptance gates
- Divergence gates (`EXP-PROGRAM-036`)
- Intent models / refinement sessions / reports
- Alignment contracts
- Reference evidence
- Execution intents / graphs

These are all real concepts, but they introduce **multiple independent gate/state engines** rather than one composable gate abstraction. The result is:

- Review gate engine handles review/acceptance of expedition output.
- Divergence gate engine handles alignment between intent and contract.
- Execution graph engine handles expedition execution state.

Each has its own events, builders, and lifecycle.

### Accidental complexity

- **Multiple gate engines** instead of one parameterized gate primitive.
- **Workflow events** (`REVIEW_GATE_OPENED`, `EXECUTION_INTENT_STARTED`, `EXPEDITION_EXECUTION_COMMITTED`) encode process state rather than facts.

---

## Finding 8 — Execution intent / graph subsystem

### Evidence

- `src/execution/` — **3 files**, **~664 lines**.
- `src/runtime/executor.ts` builds derived `executionIntents` and `executionGraphs`.
- Events: `EXECUTION_INTENT_CREATED`, `EXECUTION_INTENT_GRAPH_CREATED`, `EXPEDITION_BRANCH_CREATED`, `EXECUTION_INTENT_STARTED/COMPLETED/FAILED/ROLLEDBACK`, `EXPEDITION_EXECUTION_COMMITTED/PROJECTED`.

### Analysis

Execution intents and graphs model how an expedition will execute. This overlaps with:

- **Expedition lifecycle** (`EXPEDITION_CREATED`, `EXPEDITION_STARTED`, `EXPEDITION_COMPLETED`).
- **Review/acceptance gates** (which also track expedition progress).
- **Capability execution** (which already produces effects).

The execution graph is a projection of expedition progress, but it has its own event vocabulary and derived state.

### Accidental complexity

- **Parallel expedition progress model** (lifecycle + execution graph).
- Events encode workflow transitions (`STARTED`, `COMPLETED`, `FAILED`) rather than facts.

---

## Finding 9 — CLI surface expansion

### Evidence

- `src/cli/` — **19 files**, **~8,236 lines**.
- Commands: `adapter`, `agent-artifacts`, `ai-interaction-manifest`, `ai-metadata`, `bootstrap-analyzer`, `bootstrap-apply`, `bootstrap-context`, `certification-runner`, `command-safety`, `explain-governance`, `explain-observability`, `first-contact`, `govern-delegation`, `repo`, `repository-identity`, `resume-briefing`, `status-briefing`, `synth`, `verify`.
- `src/cli/synth.ts` is the main CLI router.

### Analysis

The CLI is the largest single subsystem. Many commands are overlapping:

- `explain-governance`, `explain-observability`, `status-briefing`, `resume-briefing` all produce human-readable governance summaries.
- `ai-interaction-manifest` and `ai-metadata` are AI-specific metadata commands.
- `bootstrap-analyzer`, `bootstrap-apply`, `bootstrap-context` are bootstrap helpers.
- Several commands are not exercised by `npm run govern` unless explicitly tested.

### Accidental complexity

- **Large CLI surface** relative to core API.
- Multiple "explain" / "briefing" commands that could share a single query interface.

---

## Finding 10 — Verification vs. Validation

### Evidence

- `src/verification/` — **5 files**, **~692 lines**.
- `src/validation/` — separate directory (validators for capabilities).

### Analysis

`src/validation/` validates capability inputs. `src/verification/` runs post-execution checks and evidence verification. The names are nearly synonymous but refer to different lifecycle phases.

### Accidental complexity

- **Two subsystems with overlapping names** at different layers. Increases onboarding cost.

---

## Finding 11 — Compiler

### Evidence

- `src/compiler/` — **2 files**, **~289 lines**.
- No dedicated test script in `test:all`.

### Analysis

The compiler appears to process expedition/markdown artifacts into executable form. It has no dedicated test coverage in the production pipeline and minimal cross-references.

### Accidental complexity

- **Under-utilized subsystem** with unclear production role.

---

## Finding 12 — Repository governance vs. Repository adapters

### Evidence

- `src/repository/` — **5 files**, **~470 lines**.
- `src/adapters/repository/git.ts` — repository adapter.
- Repository governance capabilities in `src/capability/registry.ts`: `CreateBranch`, `OpenPullRequest`, `MergePullRequest`, `CreateRelease`, `ApprovePromotion`.

### Analysis

Repository state is tracked both as canonical state (`repository`, `branches`, `pullRequests`, `releases`) and through repository adapters. The canonical repository state is essential for forge integration, but the adapter layer duplicates some of this concern.

### Accidental complexity

- **Canonical state + adapter both model repository state.**

---

## Summary of accidental complexity

| Finding | Subsystem(s) | Evidence | Type |
|---|---|---|---|
| Adapter proliferation | `src/adapters/` (16 adapters, 5,650 lines) | `src/adapters/registry.ts`, 16 dedicated test scripts | Overlapping abstractions |
| Environment vs. adapters | `src/environment/`, `src/adapters/` | 1 environment provider, many adapters | Dual extension model |
| Two cognition engines | `src/planning/`, `src/workspace/` | Multiple knowledge extractors | Overlapping responsibilities |
| First Contact pipeline | `src/first-contact/` (2,864 lines) | Product-specific workflow in core | Scope creep |
| Discovery proliferation | `src/discovery/` (5,617 lines) | Overlaps with workspace, knowledge, environment | Multiple discovery frameworks |
| Semantic modeling | `src/semantic-modeling/` (1,315 lines) | Overlaps with Genesis and planning | Parallel model |
| Governance engine proliferation | `src/governance/` (3,388 lines) | Multiple gate engines | Workflow events as facts |
| Execution intent/graph | `src/execution/` (664 lines), derived state | Parallel expedition progress model | Workflow events as facts |
| CLI surface expansion | `src/cli/` (8,236 lines) | 19 CLI files, overlapping explain/briefing commands | Surface area |
| Verification vs. Validation | `src/verification/`, `src/validation/` | Name overlap, different layers | Naming ambiguity |
| Compiler | `src/compiler/` (289 lines) | No dedicated test script | Under-utilized |
| Repository dual model | `src/repository/`, `src/adapters/repository/` | State + adapter both model repository | Overlap |

---

## Essential vs. accidental distinction

These findings are **accidental** because:

- They do not implement SYNTH's core guarantees (immutable events, replay, single mutation authority, expedition lifecycle).
- They introduce parallel mechanisms for similar problems.
- They encode workflow state as events rather than deriving it from facts.
- They expand the conceptual surface without expanding user-facing value proportionally.

They are not "bad." They are candidates for measurement against the complexity budget.
