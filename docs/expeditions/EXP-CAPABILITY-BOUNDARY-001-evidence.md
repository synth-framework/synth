# EXP-CAPABILITY-BOUNDARY-001 — Pre-Change Evidence

Captured before implementation. Baseline for verifying the mutation boundary change.

---

## 1. Current mutation paths

Direct filesystem/repository mutations found in `src/` that bypass `ExecutionGate`:

| Subsystem | Files | Mutation kind |
|---|---|---|
| CLI core | `src/cli/synth.ts` | `fs.mkdir`, `fs.writeFile` for discovery baseline, manifest, drafts |
| CLI bootstrap | `src/cli/bootstrap-apply.ts` | `fs.mkdir`, `fs.writeFile` for `.synth/`, website, examples |
| CLI first-contact | `src/cli/first-contact.ts` | `fs.mkdir`, `fs.writeFile`, `fs.appendFile` for drafts/transcripts |
| CLI agent artifacts | `src/cli/agent-artifacts.ts` | `fs.writeFile` for contract/context files |
| CLI AI metadata | `src/cli/ai-metadata.ts` | `fs.mkdir`, `fs.writeFile` for `.synth/ai/` metadata |
| CLI certification | `src/cli/certification-runner.ts` | `fs.mkdir`, `fs.writeFile` for artifacts/reports |
| TDD adapter | `src/adapters/tdd/adapter.ts` | `fs.writeFileSync` for test files |
| BDD adapter | `src/adapters/bdd/adapter.ts` | `fs.mkdirSync`, `fs.writeFileSync` for features/tests |
| First-contact materialize | `src/first-contact/materialize/engine.ts` | `fs.mkdir`, `fs.writeFile` for manifest/state/proposals |
| First-contact patterns | `src/first-contact/patterns.ts` | `fs.mkdir`, `fs.writeFile` for pattern files |
| First-contact evidence | `src/first-contact/evidence.ts` | `fs.mkdir`, `fs.writeFile` for evidence files |
| First-contact experiment | `src/first-contact/experiment.ts` | `fs.mkdir`, `fs.writeFile` for experiment artifacts |
| Mission Studio | `src/mission-studio/snapshot-store.ts`, `draft-integrity.ts`, `decision-log.ts` | snapshot/draft/decision writes |
| Workspace | `src/workspace/workspace.ts` | `fs.mkdir`, `fs.writeFile` for workspace descriptors |
| Environment evidence | `src/environment/evidence.ts` | `fs.writeFile` for evidence files |
| Documentation expedition | `src/documentation/documentation-expedition.ts` | `fs.mkdir`, `fs.writeFile` for generated docs |
| Initialization evidence | `src/initialization/evidence-store.ts` | `fs.writeFile` for project-model artifacts |
| GitHub adapter | `src/repository/adapters/github-adapter.ts` | `fs.writeFile` for response bodies |
| Infra stores | `src/infra/event-store.ts`, `state-store.ts`, `checkpoint-store.ts` | append/write of canonical logs and state |

Infra store writes (event/state/checkpoint) are currently the only mutations that flow through `ExecutionGate.execute()` / `executeGenesis()`.

---

## 2. Current ExecutionGate behavior

`src/control/execution-gate.ts` exposes two public mutation entry points:

- `execute(invocation: CapabilityInvocation)` — operational path.
  1. Validate invocation.
  2. Policy check.
  3. Resolve capability.
  4. Execute domain via `runtime.execute()`.
  5. Emit/persist events via `eventStore.appendBatch()`.
  6. Rebuild state.
  7. Commit transaction via `stateStore.commit()`.

- `executeGenesis(events: SynthEvent[])` — bootstrap/genesis path.
  - Appends seed events through the guarded EventStore.
  - Rebuilds state.

- `authorize(mutation: MutationRequest)` — newly added primitive.
  - Reads current state.
  - Requires active Mission + authorized Expedition.
  - Enforces optional scope.
  - Returns `{ allowed, reason, authority? }`.
  - No production callers at baseline.

`execute()` mutates only canonical state/event/state stores. It does not perform filesystem, repository, or generated-code mutations.

---

## 3. Current event model snapshot

Relevant events already present:

- `MISSION_CREATED`, `MISSION_APPROVED`, `MISSION_COMPLETED`, `MISSION_ARCHIVED`
- `EXPEDITION_CREATED`, `EXPEDITION_APPROVED`, `EXPEDITION_COMMITTED`, `EXPEDITION_STARTED`, `EXPEDITION_COMPLETED`
- `EXPEDITION_AUTHORIZED` — added by the surgical governance change; maps replay status to `committed`.

Policy events:
- `POLICY_EVALUATED`, `POLICY_DENIED`, `INVARIANT_VIOLATION`

No `UNAUTHORIZED_MUTATION_ATTEMPT` event at baseline.

---

## 4. Current capability boundary

Capabilities registered in `src/capability/registry.ts`:

```
CreateWorkItem, StartWorkItem, CompleteWorkItem, BlockWorkItem
CreatePlan, ActivatePlan, CompletePlan
CreateMilestone, StartMilestone, CompleteMilestone
CreateProject, InitializeProject
CreateMission, ApproveMission, CompleteMission, ArchiveMission
CreateExpedition, ApproveExpedition, CommitExpedition, StartExpedition, CompleteExpedition
AddObjective, CompleteObjective
RecordDiscovery, RecordDecision, AcceptDecision, RejectDecision, RecordRepair
InitializeRepository, CreateBranch, OpenPullRequest, ApprovePromotion, MergePullRequest, CreateRelease
```

All capabilities:
- Are pure functions over intent and state.
- Return `CapabilityResult` containing events.
- Do not perform filesystem or repository side effects.
- Have `sideEffects: false`.

The Capability Model does not yet model filesystem/repository mutations.

---

## 5. Selected reference mutation path

**Path:** `src/cli/agent-artifacts.ts`

**Why selected:**
- Small, isolated CLI command.
- Writes two metadata files (`contract.md`, `context.json`).
- Representative of CLI direct-write pattern.
- Not on the critical runtime path; safe to refactor as a pattern.
- Easy to regression-test with in-memory filesystem.

**Current code (lines 48-49):**

```ts
await fs.writeFile(contractPath, contract, "utf-8")
await fs.writeFile(contextPath, JSON.stringify(context, null, 2), "utf-8")
```

**Target after migration:**

```ts
await executionGate.execute({
  capability: "filesystem",
  operation: "write",
  target: contractPath,
  payload: { content: contract, encoding: "utf-8" },
})
```

---

## 6. Approval record

EXP-CAPABILITY-BOUNDARY-001 approved by architecture owner on 2026-07-21.

Boundaries:
- ✅ Introduce `MutationRequest`
- ✅ Route one mutation path through `ExecutionGate.execute()`
- ✅ Establish filesystem provider pattern
- ✅ Emit `EXPEDITION_AUTHORIZED` after successful authorized mutation
- ✅ Add regression coverage
- ❌ Modify Protected Asset definitions
- ❌ Change policy semantics
- ❌ Add new governance concepts
- ❌ Expand capability model beyond mutation boundary
- ❌ Migrate all mutation paths in this expedition
