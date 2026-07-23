# Test Suite Reverse Engineering — Classification & Collision Analysis

> Analysis of all 153 test files to identify subsystem ownership and duplicated implementation patterns.
>
> **Purpose:** Feed `EXP-SIMPLIFICATION-002` with evidence about where test implementations can be unified without eliminating test coverage.

---

## Executive Summary

| Metric | Value |
|---|---|
| Total test files | 153 |
| Files using `node:test` blocks | ~133 |
| Script-style certification files | ~20 |
| Files creating temp directories | 62 |
| Files bootstrapping full SYNTH context | 14 |
| Distinct helper functions duplicated across files | 40+ |

### Highest-leverage unifications

1. **CLI test harness** — `runSynth`, `parseJson`, `withTempDir`, and temp-project setup are copy-pasted across ~25 files.
2. **Governance read-model fixtures** — `writeEventLog`, `writeManifest`, `loadComputeEventHash`, and state-seeding helpers are duplicated across briefing, resolver, stale-state, transition, and verify tests.
3. **Replay event builders** — `makeEvent`, `missionCreated`, `expeditionCreated`, `objectiveAdded`, `validLog` are duplicated across graph-integrity, replay-graph-integrity, validation-expansion, and explain-observability tests.
4. **Adapter contract setup** — `makeObservation` and lifecycle-transition assertions are duplicated across 15+ adapter and mission-studio tests.
5. **Execution domain fixtures** — `makeWorkItem`, `makeExpedition`, `makeObjective` are duplicated across all `execution-*.test.js` files.
6. **Trust/decision workflow** — `makeWorkspace`, `createDraft`, `approve`, `evidenceAdd` are duplicated across decision-events, draft-integrity, evidence-path, and runtime-repair.
7. **Installer harness** — `runInstaller`, `makeTempDir`, `createFakeNpm` are duplicated across all installer tests.

### Strategic insight

The test suite does not have a duplication-of-tests problem. It has a **duplication-of-test-infrastructure** problem. The same helper functions, temp-directory setup, CLI invocation patterns, and event-building utilities are recreated in file after file. Unifying these into shared test helpers would reduce maintenance surface without removing any test scenario.

---

## Methodology

1. Enumerated every `tests/**/*.test.js` file.
2. Extracted the header comment and first test names from each file.
3. Classified each file by subsystem using filename prefix + header description.
4. Grepped for duplicated helper-function definitions across files.
5. Grepped for shared setup patterns (`bootstrap`, `mkdtemp`, `rebuildState`, `materialize`).
6. Cross-referenced imports to find tests consuming the same production modules.

---

## Classification by Subsystem

### 1. Adapters (`adapter-*.test.js`) — 17 files

| File | Feature | Notes |
|---|---|---|
| `adapter-architecture.test.js` | Architecture adapter observations | |
| `adapter-bdd.test.js` | BDD adapter lifecycle + test generation | Writes files directly |
| `adapter-confidence.test.js` | Confidence adapter observations | |
| `adapter-conversation.test.js` | Conversation adapter lifecycle | |
| `adapter-dependency.test.js` | Dependency adapter observations | |
| `adapter-document.test.js` | Document adapter parsing | Shared `cleanFixtures`/`writeFixture` pattern |
| `adapter-expedition-builder.test.js` | Expedition builder adapter | |
| `adapter-filesystem.test.js` | Filesystem adapter observations | Shared `cleanFixtures`/`writeFixture` pattern |
| `adapter-introspection.test.js` | `synth adapter info` CLI | Copy-pastes CLI harness |
| `adapter-knowledge-extraction.test.js` | Knowledge extraction adapter | |
| `adapter-mission-builder.test.js` | Mission builder adapter | |
| `adapter-objective-builder.test.js` | Objective builder adapter | |
| `adapter-specification.test.js` | Specification adapter parsing | Shared `cleanFixtures`/`writeFixture` pattern |
| `adapter-tdd.test.js` | TDD adapter lifecycle + test generation | Writes files directly |
| `adapter-wizard.test.js` | Wizard adapter observations | |
| `adapter.test.js` | Repository (Git) adapter | |
| `github-adapter.test.js` | GitHub adapter | |

**Collision pattern:** Every adapter test repeats the same lifecycle assertions (`starts in discovered state`, `transitions through lifecycle`, `health check passes`). A shared `assertAdapterLifecycle(adapter)` helper could replace dozens of near-identical tests.

---

### 2. Discovery (`discovery-*.test.js`) — 15 files

| File | Feature | Notes |
|---|---|---|
| `discovery-adapter-contract.test.js` | Adapter contract for Discovery | |
| `discovery-capability-contract.test.js` | Capability contract for Discovery | |
| `discovery-consumer-integration.test.js` | Bootstrap consumes Discovery output | Bootstraps full context |
| `discovery-consumers.test.js` | Discovery consumption layer registry | |
| `discovery-correlate.test.js` | Correlate stage | |
| `discovery-findings.test.js` | Findings projection | Shared `makeGraph` with project-model tests |
| `discovery-git-adapter.test.js` | Git adapter for Discovery | |
| `discovery-normalize.test.js` | Normalize stage | Shared `obs` helper with correlate |
| `discovery-observation-capability.test.js` | Observation capability contract | |
| `discovery-operational-artifact-adapter.test.js` | Operational artifact adapter | |
| `discovery-project-model-rules.test.js` | Project model validation rules | Shared `makeGraph` with findings |
| `discovery-project-model.test.js` | Project model projection | Shared `makeGraph` with findings/rules |
| `discovery-projection-capability.test.js` | Projection capability executor | |
| `discovery-replay-contract.test.js` | Discovery replay contract | |
| `discovery-replay.test.js` | Discovery replay verifier | |
| `discovery-session-provider.test.js` | Discovery session provider | Bootstraps full context |

**Collision pattern:** Discovery has its own replay/contract/observation tests that mirror the kernel replay tests but specialized for Discovery events. `discovery-replay`, `discovery-replay-contract`, and `environment-discovery-evidence` all verify Discovery output against replay.

---

### 3. Environment / Providers (`environment-*.test.js`) — 12 files

| File | Feature | Notes |
|---|---|---|
| `environment-capability-graph.test.js` | Capability graph | |
| `environment-capability-report.test.js` | Capability report | Shared `makeInMemoryContext` |
| `environment-discovery-evidence.test.js` | Discovery evidence + replay | Shared `makeInMemoryContext` |
| `environment-discovery.test.js` | Environment discovery | Shared `makeInMemoryContext` |
| `environment-filesystem-capability.test.js` | Filesystem capability | |
| `environment-forge-capability.test.js` | Forge (GitHub) capability | Shared `createFakeTools` |
| `environment-process-capability.test.js` | Process/tool capability | |
| `environment-revision-capability.test.js` | Revision capability | Shared `makeContext` |
| `environment-runtime-capability.test.js` | Runtime/package capability | Shared `createFakeTools` |
| `environment-secrets-capability.test.js` | Secrets/identity capability | |
| `environment-versioning-capability.test.js` | Versioning capability | Shared `makeContext` |
| `environment-versioning-certification.test.js` | Versioning certification | |
| `environment-workspace-capability.test.js` | Workspace capability | Shared `makeContext` |

**Collision pattern:** Environment capability tests share `makeInMemoryContext`, `makeContext`, and `createFakeTools` helpers that are nearly identical. The Discovery evidence tests overlap heavily with `discovery-replay` and `discovery-consumer-integration`.

---

### 4. First Contact (`first-contact-*.test.js`) — 13 files

| File | Feature | Notes |
|---|---|---|
| `first-contact-certification.test.js` | End-to-end certification | CLI harness copy-paste |
| `first-contact-clarify.test.js` | Clarification strategy | |
| `first-contact-cli.test.js` | CLI surface | CLI harness copy-paste |
| `first-contact-experiment.test.js` | Experiment runner | CLI harness copy-paste |
| `first-contact-extract.test.js` | Intent extraction | |
| `first-contact-materialize.test.js` | Mission materialization | Shared materialization setup with replay |
| `first-contact-patterns.test.js` | Conversation patterns | |
| `first-contact-project.test.js` | Architecture projection | |
| `first-contact-projection.test.js` | Projection system/archive | |
| `first-contact-quickstart.test.js` | Quickstart flow | (No header) |
| `first-contact-replay.test.js` | Replay integration | Shared materialization setup |
| `first-contact-verify.test.js` | Capability verification | |

**Collision pattern:** `first-contact-materialize`, `first-contact-replay`, and `first-contact-certification` all exercise the same materialization pipeline end-to-end. They differ mainly in which assertions they make afterward. A shared `materializeAndVerify()` helper would collapse significant duplication.

---

### 5. Genesis (`genesis-*.test.js`) — 2 files

| File | Feature | Notes |
|---|---|---|
| `genesis-hardening.test.js` | Snapshot validation + certification | Bootstraps context |
| `genesis-snapshot-bridge.test.js` | Snapshot → seed events | Shared `makeSnapshot` helper |

---

### 6. Governance Engine (`govern-*.test.js`, `governance-*.test.js`) — 8 files

| File | Feature | Notes |
|---|---|---|
| `govern-benchmark.test.js` | Benchmark harness | |
| `govern-profiler.test.js` | Govern profiler | |
| `govern-recursion-guard.test.js` | Recursion guard | CLI harness copy-paste |
| `governance-incremental.test.js` | Incremental engine | |
| `governance-lifecycle-contract.test.js` | Lifecycle contract CLI | CLI harness + setup shared with expedition-lifecycle |
| `governance-optimization.test.js` | Optimization engine | |
| `governance-orchestration.test.js` | Orchestrator | |
| `governance-record.test.js` | Governance records | CLI harness + event-log helpers |

---

### 7. Governance Resolver / Read Models — 6 files

| File | Feature | Notes |
|---|---|---|
| `governance-resolver.test.js` | Governance Resolver | Heavy helper sharing |
| `operator-briefing.test.js` | `synth status` briefing | Heavy helper sharing |
| `resume-briefing.test.js` | `synth explain resume` | Heavy helper sharing |
| `stale-state.test.js` | Stale state detection | Heavy helper sharing |
| `transition-engine.test.js` | Transition engine | Heavy helper sharing |
| `verify-engine.test.js` | `synth verify` | Heavy helper sharing |

**Collision pattern:** These six files define overlapping helpers: `writeEventLog`, `writeManifest`, `loadComputeEventHash`, `testUninitialized`, `testInitializedNoMission`, `testApprovedNoExpeditions`, `testExecuting`, `testBrokenDecisionLogWarning`, `testPlanningDraftBelowThreshold`, `testBlocked`. They are all testing different projections of the same canonical state. A single `GovernanceReadModelFixture` helper could seed the same states and let each test assert its specific projection.

---

### 8. Review Gates & Alignment — 5 files

| File | Feature | Notes |
|---|---|---|
| `alignment-divergence.test.js` | Alignment contract divergence | Shared `makeCtx`/`cleanData`/`run` |
| `intent-refinement.test.js` | Intent refinement | Shared `makeCtx` |
| `lifecycle-enforcement.test.js` | Agent lifecycle enforcement | Shared `makeCtx`/`cleanData`/`run` |
| `project-mission.test.js` | Mission projection from alignment | Shared `makeCtx`/`cleanData`/`run` |
| `review-gate-engine-integration.test.js` | Review gate engine | Shared `makeCtx` + `createRunner` |
| `review-gate-validation.test.js` | Review gate validation | |
| `review-gates.test.js` | Review gate behavior | Shared `makeRefinedIntentInput` |

**Collision pattern:** `alignment-divergence`, `lifecycle-enforcement`, `project-mission`, and parts of `synth.test.js` use nearly identical `makeCtx`, `cleanData`, `run`, and `makeDataDir` helpers to set up a temporary governed project. This is the same fixture pattern as governance resolver tests but implemented separately.

---

### 9. Execution (`execution-*.test.js`) — 5 files

| File | Feature | Notes |
|---|---|---|
| `execution-branch.test.js` | Branch-per-expedition workflow | Shared `makeWorkItem`/`makeExpedition`/`makeObjective` |
| `execution-commit.test.js` | Commit-as-evidence | Shared fixtures |
| `execution-intent.test.js` | Execution intent model | Bootstraps context |
| `execution-projection.test.js` | Pull request projection | Shared fixtures |
| `execution-runtime.test.js` | Work item runtime | Shared fixtures |

**Collision pattern:** All four non-bootstrap execution tests share `makeWorkItem`, `makeExpedition`, and `makeObjective` fixtures. A single `execution-fixtures.js` helper would unify them.

---

### 10. Kernel / Replay / Runtime — 9 files

| File | Feature | Notes |
|---|---|---|
| `synth.test.js` | Full kernel suite | 88 uses of `bootstrap`/`rebuildState`; mega-fixture |
| `replay-graph-integrity.test.js` | Replay + graph integrity | Shared `writeTmpLog`/`makeVerifier` with validation-expansion |
| `validation-expansion.test.js` | Certification regression suite | Shared helpers with replay-graph-integrity |
| `graph-integrity.test.js` | Graph integrity proofs | Shared event builders with replay tests |
| `runtime-integrity.test.js` | `synth doctor` / dist integrity | CLI harness copy-paste |
| `runtime-repair.test.js` | Runtime correctness/recovery | CLI + trust workflow helpers |
| `stale-state.test.js` | Stale state detection | (Also in read-model group) |
| `historical-aliases.test.js` | Historical alias registry | Shared `makeEvent` with graph/replay tests |
| `historical-normalizer.test.js` | Historical normalizer | Shared `makeEvent` with graph/replay tests |
| `identity-resolver.test.js` | Identity resolver | Shared `makeEvent` with graph/replay tests |
| `reference-resolver.test.js` | Reference resolver | Shared `makeEvent` with graph/replay tests |

**Collision pattern:** The kernel tests are the biggest concentration of duplicated event builders. `missionCreated`, `expeditionCreated`, `objectiveAdded`, `workItemCreated`, `workItemGenerated`, `validLog`, `makeEvent`, `sha256File`, `findViolations`, `writeTmpLog`, and `makeVerifier` all appear in multiple files. These should live in a shared `kernel-test-fixtures.js` module.

---

### 11. CLI / Operator Experience — 8 files

| File | Feature | Notes |
|---|---|---|
| `synth-cli.test.js` | AI-native operator CLI | Heavy CLI harness |
| `synth-cli-govern-explain.test.js` | `synth validate --explain` | CLI harness copy-paste |
| `synth-cli-repo.test.js` | Repository governance CLI | CLI harness copy-paste |
| `operator-briefing.test.js` | `synth status` | (Also in read-model group) |
| `resume-briefing.test.js` | `synth explain resume` | (Also in read-model group) |
| `operator-journey.test.js` | Full operator journey | Bootstraps context |
| `explain-observability.test.js` | `synth explain` observability | Shared event builders |
| `clean-machine-output.test.js` | `--json` stderr hygiene | CLI harness copy-paste |

**Collision pattern:** Every CLI test reimplements `runSynth`, `parseJson`, temp-project creation, and JSON-output cleanup. A single `cli-test-harness.js` module would remove this duplication entirely.

---

### 12. Mission Studio / Planning — 7 files

| File | Feature | Notes |
|---|---|---|
| `mission-studio.test.js` | Mission Studio core | Shared `makeObservation` |
| `mission-studio-adapter-collector.test.js` | Adapter observation collector | Shared `createMockAdapter` with api-adapter-integration |
| `mission-studio-adapter-mapper.test.js` | Adapter mapper | Shared `makeObservation` |
| `mission-studio-proposal-graph.test.js` | Proposal graph integrity | Shared `makeObservation` |
| `mission-studio-snapshot-integrity.test.js` | Snapshot integrity | Shared `makeObservation` + `makeApprovedSnapshot` |
| `mission-studio-snapshot-lineage.test.js` | Snapshot lineage | Shared `makeObservation` + `makeApprovedSnapshot` |
| `project-mission.test.js` | Mission projection capability | (Also in review/alignment group) |
| `api-adapter-integration.test.js` | API / Mission Studio / Genesis | Shared `createMockAdapter` |

**Collision pattern:** Mission Studio tests share `makeObservation` with adapter tests and each other. Snapshot integrity/lineage share `makeApprovedSnapshot`. Adapter collector shares `createMockAdapter` with API adapter integration.

---

### 13. Initialization / Bootstrap — 7 files

| File | Feature | Notes |
|---|---|---|
| `initialization-adapter-contract.test.js` | Init adapter contract | |
| `initialization-evidence.test.js` | Init evidence artifact | CLI + read-event-log helpers |
| `initialization-lifecycle.test.js` | Init as replayable transition | CLI + read-event-log helpers |
| `initialization-replay.test.js` | Init replay determinism | CLI + read-event-log helpers |
| `synth-bootstrap.test.js` | Bootstrap workflows | CLI harness copy-paste |
| `bootstrap-discovery-integration.test.js` | Bootstrap + Discovery integration | Bootstraps context |

**Collision pattern:** `initialization-evidence`, `initialization-lifecycle`, `initialization-replay`, and `runtime-repair` all share `readEventLog` helper patterns. Bootstrap tests share the standard CLI harness.

---

### 14. Knowledge / Semantic — 4 files

| File | Feature | Notes |
|---|---|---|
| `canonical-knowledge.test.js` | Canonical Knowledge Graph | Shared `testAdapterContract` helper |
| `canonical-knowledge-validation.test.js` | Knowledge validation | Shared `testAdapterContract` helper |
| `semantic-intent.test.js` | Semantic intent modeling | Shared `testAdapterContract` helper |
| `semantic-domain.test.js` | Semantic domain modeling | Shared `testAdapterContract` helper |

**Collision pattern:** All four define `testAdapterContract` with nearly identical logic. One shared helper would suffice.

---

### 15. Documentation / Publication — 6 files

| File | Feature | Notes |
|---|---|---|
| `documentation-expedition.test.js` | Docs expedition | |
| `documentation-integrity.test.js` | Docs integrity checks | Shared `runScript`/`testNpmScriptsExist` |
| `extraction-reporting.test.js` | Extraction reporting CLI | CLI harness copy-paste |
| `continuous-publication.test.js` | Publication pipeline | Shared `runScript`/`testNpmScriptsExist` |
| `public-vocabulary-audit.test.js` | Public vocabulary audit | Shared `findViolations` with homepage test |
| `homepage-public-vocabulary.test.js` | Homepage vocabulary audit | Shared `findViolations` with public-vocabulary test |
| `homepage-first-contact-acceptance.test.js` | Homepage first-contact flow | |

---

### 16. Installer — 7 files

| File | Feature | Notes |
|---|---|---|
| `installer-contract.test.js` | Installer contract | Shared `runInstaller` |
| `installer-distribution.test.js` | Distribution resolution | Shared `runInstaller` |
| `installer-engine.test.js` | Install workflow | Shared `runInstaller`/`makeTempDir`/`createFakeNpm` |
| `installer-environment.test.js` | Environment detection | Shared `runInstaller` |
| `installer-manifest.test.js` | Manifest generation | Shared `makeTempDir` |
| `installer-upgrade.test.js` | Upgrade workflow | Shared `runInstaller`/`makeTempDir`/`createFakeNpm` |
| `installer-verify.test.js` | Verification workflow | Shared `runInstaller`/`makeTempDir`/`createFakeNpm` |

**Collision pattern:** All installer tests share `runInstaller`. Engine/upgrade/verify share `makeTempDir` and `createFakeNpm`. A single `installer-test-harness.js` is the obvious fix.

---

### 17. Certification / Quality — 8 files

| File | Feature | Notes |
|---|---|---|
| `certification-framework.test.js` | Certification DSL/runner | CLI harness copy-paste |
| `agent-certification.test.js` | Agent interoperability | CLI harness copy-paste |
| `ai-benchmark.test.js` | AI benchmark harness | Shared `runScript`/`testNpmScriptsExist` |
| `brownfield-certification.test.js` | Brownfield workflow cert | CLI harness copy-paste |
| `brownfield-validation.test.js` | Brownfield validation | CLI harness copy-paste |
| `first-contact-certification.test.js` | First Contact cert | CLI harness copy-paste |
| `environment-versioning-certification.test.js` | Versioning capability cert | |
| `freeze-certification.test.js` | Freeze artifact cert | |

**Collision pattern:** Certification files are script-style and mostly orchestrate external commands. They reuse the same CLI harness as other CLI tests.

---

### 18. Repository / Identity / Impact — 5 files

| File | Feature | Notes |
|---|---|---|
| `repository-governance.test.js` | Repository governance | Bootstraps + replay |
| `repository-identity.test.js` | `synth explain identity` | CLI harness |
| `impact-analyzer.test.js` | Impact analysis | |
| `protected-asset-escalation.test.js` | Protected asset escalation | |
| `validation-mapping.test.js` | Capability↔test mapping | Shared `loadJson` |
| `validation-planner.test.js` | Validation planner | Shared `loadJson` + protected-asset escalation |

---

### 19. Trust / Decisions / Evidence — 4 files

| File | Feature | Notes |
|---|---|---|
| `decision-events.test.js` | Decision event durability | Shared trust workflow helpers |
| `draft-integrity.test.js` | Draft integrity + confidence | Shared trust workflow helpers |
| `evidence-path.test.js` | Evidence path confidence | Shared trust workflow helpers |
| `runtime-repair.test.js` | Runtime repair | Shared trust workflow helpers |

**Collision pattern:** These four files share `makeWorkspace`, `createDraft`, `approve`, `evidenceAdd`, `initWorkspace`, `align`, `draftPath`, `writeDraft`. They are all setting up the same trust/decision workflow to test different invariants. A `trust-workflow-fixture.js` helper is warranted.

---

### 20. ExecutionGate Safety — 1 file

| File | Feature | Notes |
|---|---|---|
| `governance/execution-gate-regression.test.js` | Mutation boundary | Newly added; standalone |

---

## Collision Detail Tables

### Collision A — CLI Test Harness (highest impact)

**Helper functions duplicated in 20+ files:**

| Helper | Approx. files | Purpose |
|---|---|---|
| `runSynth` | 25 | Spawn `synth` CLI in a temp project |
| `parseJson` | 22 | Parse JSON from stdout/stderr |
| `withTempDir` | 5 | Create and clean temp project |
| `readEventLog` | 5 | Read `data/event-log.jsonl` |
| `writeManifest` | 6 | Write `.synth/manifest.json` |

**Affected files:** `adapter-introspection`, `agent-certification`, `brownfield-certification`, `brownfield-validation`, `certification-framework`, `clean-machine-output`, `continuous-publication`, `extraction-reporting`, `first-contact-certification`, `first-contact-cli`, `first-contact-experiment`, `governance-lifecycle-contract`, `governance-record`, `initialization-evidence`, `initialization-lifecycle`, `initialization-replay`, `operator-briefing`, `repository-identity`, `resume-briefing`, `runtime-integrity`, `synth-bootstrap`, `synth-cli-govern-explain`, `synth-cli-repo`, `synth-cli`, `verify-engine`.

**Unification:** Create `tests/helpers/cli-harness.js` exposing `runSynth(args, cwd)`, `parseJson(output)`, `withTempDir(prefix, fn)`, and `readEventLog(cwd)`.

---

### Collision B — Governance Read-Model Fixtures

**Helper functions duplicated across governance-resolver / operator-briefing / resume-briefing / stale-state / transition-engine / verify-engine:**

| Helper | Purpose |
|---|---|
| `writeEventLog` | Append events to `data/event-log.jsonl` |
| `writeManifest` | Write project manifest |
| `loadComputeEventHash` | Load hash helper for event chaining |
| `testUninitialized` | Assert state with no mission |
| `testInitializedNoMission` | Assert initialized but no mission |
| `testApprovedNoExpeditions` | Assert approved mission, no expeditions |
| `testExecuting` | Assert executing expedition |
| `testBrokenDecisionLogWarning` | Assert broken decision log handling |
| `testPlanningDraftBelowThreshold` | Assert draft below confidence threshold |
| `testBlocked` | Assert blocked transition |

**Unification:** Create `tests/helpers/governance-read-model-fixture.js` that seeds canonical states (uninitialized, initialized, approved, executing, completed) and exposes each state as a factory. Each test then imports the state it needs and asserts its specific projection.

---

### Collision C — Replay Event Builders

**Helper functions duplicated across explain-observability / graph-integrity / replay-graph-integrity / validation-expansion / historical-aliases / historical-normalizer / identity-resolver / reference-resolver:**

| Helper | Purpose |
|---|---|
| `makeEvent` | Build a `SynthEvent` with hash |
| `missionCreated` | Build `MISSION_CREATED` event |
| `expeditionCreated` | Build `EXPEDITION_CREATED` event |
| `objectiveAdded` | Build `OBJECTIVE_ADDED` event |
| `workItemCreated` | Build `WORK_ITEM_CREATED` event |
| `workItemGenerated` | Build `WORK_ITEM_GENERATED` event |
| `validLog` | Return a minimal valid event log |
| `sha256File` | Hash a file for integrity checks |
| `findViolations` | Find vocabulary violations |
| `writeTmpLog` | Write a temp event log |
| `makeVerifier` | Build a replay verifier |

**Unification:** Create `tests/helpers/kernel-event-fixtures.js` with canonical event builders and log factories. Some helpers already exist in production (`computeEventHash`); the test-specific builders should be centralized.

---

### Collision D — Adapter Lifecycle Assertions

**Pattern duplicated across adapter-*.test.js files:**

```js
test("XAdapter starts in discovered state", () => { ... })
test("XAdapter transitions through lifecycle", async () => { ... })
test("XAdapter health check passes when ...", async () => { ... })
```

**Unification:** Create `tests/helpers/adapter-lifecycle.js` with:

```js
export function assertAdapterLifecycle(t, adapter, options) { ... }
```

Each adapter test imports the helper and passes its adapter instance.

---

### Collision E — Execution Domain Fixtures

**Helper functions duplicated across execution-branch / execution-commit / execution-projection / execution-runtime:**

| Helper | Purpose |
|---|---|
| `makeWorkItem` | Build a work item fixture |
| `makeExpedition` | Build an expedition fixture |
| `makeObjective` | Build an objective fixture |

**Unification:** Create `tests/helpers/execution-fixtures.js`.

---

### Collision F — Trust / Decision Workflow

**Helper functions duplicated across decision-events / draft-integrity / evidence-path / runtime-repair:**

| Helper | Purpose |
|---|---|
| `makeWorkspace` | Create temp workspace |
| `createDraft` | Create a mission draft |
| `approve` | Approve a draft |
| `evidenceAdd` | Add evidence to a draft |
| `initWorkspace` | Initialize workspace |
| `align` | Create alignment |
| `draftPath` | Compute draft path |
| `writeDraft` | Write draft JSON |

**Unification:** Create `tests/helpers/trust-workflow.js` exposing `createApprovedDraft(cwd, options)` and `createDraftWithEvidence(cwd, options)`.

---

### Collision G — Discovery Graph Builders

**Helper `makeGraph` duplicated across:** `discovery-findings`, `discovery-project-model`, `discovery-project-model-rules`.

**Unification:** Move to `tests/helpers/discovery-graph-fixtures.js`.

---

### Collision H — Environment Capability Contexts

**Helper functions duplicated across environment-capability-report / environment-discovery-evidence / environment-discovery:** `makeInMemoryContext`.

**Helper `makeContext` duplicated across:** `environment-revision`, `environment-versioning`, `environment-workspace`.

**Helper `createFakeTools` duplicated across:** `environment-forge`, `environment-runtime`.

**Unification:** Create `tests/helpers/environment-capability-context.js`.

---

### Collision I — Mission Studio Observations

**Helper `makeObservation` duplicated across:** all adapter-architecture/confidence/dependency/expedition-builder/knowledge-extraction/mission-builder/objective-builder/wizard tests, plus draft-integrity, explain-observability, mission-studio-* tests.

**Unification:** Move to `tests/helpers/observation-fixtures.js`.

---

### Collision J — First Contact Materialization

**Pattern duplicated across:** `first-contact-materialize`, `first-contact-replay`, `first-contact-certification`.

All three call `materialize({ projectRoot, approvedArtifact, selectedArchitecture, verificationReport })` and then assert different properties of the result.

**Unification:** Create `tests/helpers/first-contact-materialize.js` with `materializeMinimalProject(tmpDir)` that returns the materialization result. Each test then asserts its specific invariant.

---

### Collision K — Installer Harness

**Helper functions duplicated across all installer tests:** `runInstaller`, `makeTempDir`, `createFakeNpm`, `writeFile`.

**Unification:** Create `tests/helpers/installer-harness.js`.

---

### Collision L — Adapter Document/Filesystem/Specification Fixture Cleanup

**Helpers `cleanFixtures` and `writeFixture` duplicated across:** `adapter-document`, `adapter-filesystem`, `adapter-specification`.

**Unification:** Move to `tests/helpers/adapter-file-fixtures.js`.

---

## Recommendations

### Immediate (pre-simplification)

1. **Create shared test helpers** for the highest-impact collisions:
   - `tests/helpers/cli-harness.js`
   - `tests/helpers/kernel-event-fixtures.js`
   - `tests/helpers/governance-read-model-fixture.js`
   - `tests/helpers/adapter-lifecycle.js`
   - `tests/helpers/execution-fixtures.js`
   - `tests/helpers/trust-workflow.js`

2. **Do not delete tests.** The goal is to remove duplicated helper implementations, not test scenarios.

3. **Preserve script-style certification files.** Files like `ai-benchmark.test.js` and `freeze-certification.test.js` are orchestration scripts; keep them as-is unless their helper logic overlaps with the CLI harness.

### During simplification

4. When a production subsystem is merged or moved, update only the shared helper, not every test file individually.

5. Add a lint rule or CI check that flags new helper functions defined in more than one test file.

### Success metric

After unification, the number of distinct helper-function definitions duplicated across test files should drop by at least 50%. Temp-directory setup and CLI invocation patterns should be imported, not reimplemented.

---

## Appendix: Files with heaviest helper duplication

| File | Duplicated helper groups |
|---|---|
| `synth.test.js` | Bootstrap/replay/alignment fixtures |
| `validation-expansion.test.js` | Replay/integrity/event fixtures |
| `replay-graph-integrity.test.js` | Replay/integrity/event fixtures |
| `operator-briefing.test.js` | CLI harness + governance read model |
| `resume-briefing.test.js` | CLI harness + governance read model |
| `governance-resolver.test.js` | Governance read model |
| `transition-engine.test.js` | Governance read model |
| `synth-cli.test.js` | CLI harness |
| `first-contact-certification.test.js` | CLI harness + materialization |
| `runtime-repair.test.js` | CLI harness + trust workflow |
| `decision-events.test.js` | Trust workflow |
| `draft-integrity.test.js` | Trust workflow |
| `evidence-path.test.js` | Trust workflow |
| `execution-branch.test.js` | Execution fixtures |
| `execution-commit.test.js` | Execution fixtures |
| `execution-projection.test.js` | Execution fixtures |
| `execution-runtime.test.js` | Execution fixtures |
| `adapter-document.test.js` | Adapter file fixtures |
| `adapter-filesystem.test.js` | Adapter file fixtures |
| `adapter-specification.test.js` | Adapter file fixtures |
| `mission-studio-snapshot-integrity.test.js` | Observations + snapshots |
| `mission-studio-snapshot-lineage.test.js` | Observations + snapshots |
