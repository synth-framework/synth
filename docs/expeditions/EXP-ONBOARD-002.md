# EXP-ONBOARD-002 — Migrate First-Contact Onboarding to the Task Engine

> Replace the hardcoded stage logic in `synth first-contact` with deterministic, explainable tasks executed by the EXP-PROGRAM-034 task engine.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** EXP-REVIEW-003 — Third Convergence Review of Program 043  
**Depends On:** EXP-ONBOARD-001, EXP-TASK-006, EXP-REVIEW-002, EXP-REVIEW-003  
**Blocks:** EXP-PROGRAM-043 Phase 4 (Workstream F identity/trust layer)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

`EXP-ONBOARD-001` made `synth first-contact` a guided, explainable command, but it still encodes onboarding stages as imperative TypeScript code with hardcoded `wouldRun` strings such as `synth init`, `synth bootstrap --approve`, and `npm run govern`. That makes the onboarding flow opaque to operators, hard to extend, and impossible to preview through the same `--dry-run` machinery used by the rest of the CLI.

`EXP-PROGRAM-034` now provides a canonical task engine (`synth task run`, `synth task list`, `synth task explain`, `synth task doctor`). This expedition migrates the onboarding flow to that engine so that first-contact becomes a deterministic task graph rather than a bespoke script.

---

## Scope

### In scope

1. Model first-contact onboarding stages as tasks:
   - `onboarding:detect` — detect greenfield / brownfield / legacy / initialized-v2 state.
   - `onboarding:archive` — archive legacy `.synth/` state.
   - `onboarding:init` — initialize an empty directory as a Synth project.
   - `onboarding:bootstrap` — apply Synth governance to an existing project.
   - `onboarding:mission` — create and approve the baseline mission.
   - `onboarding:govern` — run the canonical governance pipeline.
2. Place onboarding tasks in a canonical `onboarding` task group.
3. Update `synth first-contact` to dispatch to `synth task run <onboarding-task>` instead of calling `initializeEmptyProject()` and `runBootstrap()` directly.
4. Preserve `--dry-run` by passing it through to `synth task run --dry-run`.
5. Preserve `--approve` semantics: without it, the command prints the planned task graph; with it, the command executes the graph.
6. Preserve all existing first-contact/onboarding tests and add a regression test proving the task-engine path produces the same artifacts as the imperative path.

### Out of scope

- Migrating the greenfield idea-to-project workflow (`synth first-contact start`, `clarify`, `project`, `verify`, `approve`, `materialize`). That flow remains governed by `EXP-AIFC-008` and is not part of this expedition.
- Changing the event model, replay semantics, or mission/expedition lifecycle.
- Removing the existing `initializeEmptyProject` or `runBootstrap` helpers entirely; they may be reused as task commands.
- Adding new onboarding stages beyond the ones already implemented in `EXP-ONBOARD-001`.

---

## Design decisions

### Task location

Onboarding tasks are framework-provided, not project-specific. The expedition must choose one of the following approaches and document it:

1. **Framework tasks directory:** Extend the task registry to discover tasks from a framework-owned directory (e.g., `dist/tasks/onboarding/` or `distribution/tasks/onboarding/`) in addition to `data/tasks/` and `.synth/tasks/`.
2. **Project template:** Copy onboarding tasks into the project during materialization, so `synth first-contact` discovers them from `data/tasks/`.
3. **CLI argument:** Add a `--tasks-dir` flag to `synth task run` so `synth first-contact` can point the task engine at the framework's bundled onboarding tasks.

The recommended starting point is option 1, because onboarding runs before a project exists.

### Conditional dispatch

The onboarding flow is conditional on detected repository state. The CLI retains the responsibility to:

1. Run `onboarding:detect`.
2. Read the detected state.
3. Select the appropriate task target:
   - empty → `onboarding:init` → `onboarding:mission` → `onboarding:govern`
   - brownfield → `onboarding:bootstrap` → `onboarding:govern`
   - legacy → `onboarding:archive` → `onboarding:bootstrap` → `onboarding:govern`
   - initialized-v2 → no tasks; report status.

The task engine owns dependency ordering and execution; the CLI owns state-based dispatch.

### Artifact guarantees

The migrated flow must produce exactly the same files as the imperative flow:

- `.synth/manifest.json`
- `.synth/data/event-log.jsonl`
- `.synth/data/canonical-state.json`
- `.synth/first-contact/discovery-artifact.json` (brownfield)
- `.synth/first-contact/transcript.jsonl` (brownfield)
- `.synth/proposals/mission-proposal.json` (where applicable)
- `.synth/proposals/expedition-proposals.json` (where applicable)

---

## Deliverables

### 1. Onboarding task definitions

Create task files for the six onboarding stages. Example shape:

```json
{
  "id": "onboarding:init",
  "description": "Initialize an empty directory as a Synth project",
  "command": "node dist/cli/synth.js init --source first-contact",
  "group": "onboarding",
  "dependsOn": [],
  "tags": ["onboarding", "bootstrap"],
  "estimatedDurationMs": 2000,
  "capabilities": ["NodeJS"]
}
```

Tasks are accepted as framework-owned tasks; their lifecycle is `accepted`.

### 2. Framework task discovery

Extend `src/task/task-registry.ts` (or add a new loader) so the CLI can load framework-provided onboarding tasks from a known location. The change must be minimal and must not break existing project-level task discovery.

### 3. CLI migration

Refactor `src/cli/first-contact.ts`:

- `cmdFirstContactOnboard` calls `onboarding:detect`, then dispatches to the task engine.
- The plan JSON returned in dry-run/proposal mode lists the task ids that would run, not opaque `wouldRun` strings.
- `--approve` executes the task graph and returns a `TaskRunReport`-shaped summary.

### 4. Tests

- Update `tests/first-contact-onboard.test.js` to assert that the onboarding path invokes tasks (e.g., by checking `synth task list --group onboarding` or by mocking the task runner).
- Add `tests/task-onboarding.test.js` that verifies each onboarding task is discoverable and that dependencies form a DAG.
- Ensure existing first-contact and operator-experience tests still pass.

### 5. Documentation

- Update `docs/reference/tasks.md` (or create it if missing) to list the `onboarding` task group.
- Update `docs/operator/01-getting-started.md` if it describes the first-contact output format.

---

## Acceptance Criteria

1. `synth task list --group onboarding` returns the six onboarding tasks.
2. `synth task explain onboarding:init` shows dependencies and consumers.
3. `synth first-contact --dry-run` returns a plan that references task ids instead of hardcoded command strings.
4. `synth first-contact --approve` on an empty directory succeeds and produces the same artifacts as before.
5. `synth first-contact --approve` on a brownfield project succeeds and produces the same artifacts as before.
6. `synth first-contact` in a legacy-state directory archives legacy `.synth/` and proceeds through the task engine.
7. `npm run test:first-operator-experience` passes.
8. `node tests/first-contact-onboard.test.js` passes.
9. `node tests/task-onboarding.test.js` passes.
10. `synth task doctor` reports no cycles or missing dependencies in the `onboarding` group.
11. `npm run govern` passes.

---

## Governance

### Protected

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

### Not included

- New event types.
- Changes to the mission/expedition lifecycle.

---

## Risks

| Risk | Mitigation |
|---|---|
| Task discovery for framework-owned tasks adds complexity | Keep the loader minimal; prefer a single well-known directory. |
| `--dry-run` behavior diverges from current first-contact | Pass `--dry-run` through the task engine and preserve the proposal JSON shape. |
| Brownfield bootstrap is harder to express as a task | Wrap `runBootstrap` as a thin task command; do not reimplement bootstrap logic. |
| Conditional dispatch duplicates orchestration logic | Document that the CLI owns state-based dispatch and the engine owns dependency ordering; this is an explicit boundary. |

---

## Related Documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-ONBOARD-001 — Guided First-Contact Command](EXP-ONBOARD-001.md)
- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-TASK-006 — CI Orchestration Adapter](EXP-TASK-006.md)
- [EXP-REVIEW-003 — Third Convergence Review of Program 043](../governance/convergence-review-043-003.md)
- [ADR-039 — Architectural Convergence Review](../adr/ADR-039-architectural-convergence-review.md)

---

## Completion Notes

Completed in PR #245.

- Six framework-owned onboarding tasks added under `data/tasks/onboarding:*.task.json`.
- Task registry extended to discover framework tasks from `dist/tasks/`; project-level tasks override framework defaults.
- `synth first-contact` refactored to dispatch onboarding stages through `synth task run`.
- Added `synth first-contact onboard:<detect|archive|init|bootstrap|mission|govern>` subcommands.
- `onboarding:init` and `onboarding:mission` made idempotent so the dependency graph can re-run safely.
- `--name` propagated through `SYNTH_PROJECT_NAME` so project naming works across task subprocesses.
- Task runner resolves `synth ...` commands against the current binary, removing PATH dependency in tests.
- Added `tests/task-onboarding.test.js` and extended `tests/first-contact-onboard.test.js`.
- `npm run govern` passes from a clean checkout.
