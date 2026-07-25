# EXP-MUTATION-LIFECYCLE-001 — Mutation Path Inventory

> Catalog of every direct filesystem mutation in `src/` and its classification under the single mutation boundary.

**Status:** Completed  
**Expedition:** EXP-MUTATION-LIFECYCLE-001  
**Program:** EXP-PROGRAM-040 — Repository Simplification

---

## Classification rules

| Class | Description | Routing |
|---|---|---|
| **Provider internal** | Canonical store implementations that already append/write through guarded infrastructure | Keep as-is; exempt from bypass audit |
| **Genesis** | Creates the governance substrate (`.synth/`, initial state, bootstrap artifacts) | Routes through `ExecutionGate.executeGenesis()` or equivalent genesis path |
| **Governed** | Product or expedition artifacts that mutate repository contents during authorized work | Routes through `ExecutionGate.execute()` |
| **External observation** | Caches or records artifacts produced by external systems | Does not initiate mutations; records evidence |

---

## Inventory

| File | Lines | Operation | Class | Notes |
|---|---|---|---|---|
| `src/adapters/bdd/adapter.ts` | 100–101, 256 | `mkdirSync`, `writeFileSync` | Governed | Generates BDD feature/test files during expedition |
| `src/adapters/repository/git.ts` | 178, 381, 390 | `mkdirSync`, `writeFileSync` | Governed | Repository scaffolding and git hooks |
| `src/adapters/tdd/adapter.ts` | 199 | `writeFileSync` | Governed | Writes test skeleton during expedition |
| `src/cli/agent-artifacts.ts` | 70–71 | `writeFile` | **Governed / migrated in this expedition** | `writeAgentArtifacts` already supports `gate` path; callers updated |
| `src/cli/ai-interaction-manifest.ts` | 202, 205 | `mkdir`, `writeFile` | Governed | AI manifest generation during expedition |
| `src/cli/ai-metadata.ts` | 252, 256–260 | `mkdir`, `writeFile` | Governed | Metadata bundle generation |
| `src/cli/synth.ts` | 898, 915 | `mkdir`, `writeFile` | Genesis | Discovery baseline written during `synth init` / bootstrap |
| `src/cli/synth.ts` | 1960, 2008, 2405, 2764 | `mkdir`, `writeFile` | Governed | Draft creation/revision during expedition lifecycle |
| `src/documentation/documentation-expedition.ts` | 76, 78 | `mkdir`, `writeFile` | Governed | Generated documentation projections |
| `src/environment/evidence.ts` | 142 | `writeFile` | Genesis / discovery | Discovery evidence artifact; created during environment discovery |
| `src/first-contact/evidence.ts` | 207, 211 | `mkdir`, `writeFile` | Genesis / discovery | First-contact evidence artifacts |
| `src/first-contact/patterns.ts` | 330, 333 | `mkdir`, `writeFile` | Genesis / discovery | First-contact pattern files |
| `src/infra/checkpoint-store.ts` | 31, 59 | `mkdir`, `writeFile` | Provider internal | Guarded checkpoint store |
| `src/infra/event-store.ts` | 55, 61, 68, 157, 185, 187, 243, 283 | `mkdir`, `appendFile` | Provider internal | Guarded event store |
| `src/infra/filesystem.ts` | 23–33 | `mkdir`, `writeFile`, `appendFile` | Provider internal | Low-level filesystem helpers used by providers |
| `src/infra/state-store.ts` | 63, 69, 110, 112 | `mkdir`, `writeFile` | Provider internal | Guarded state store |
| `src/initialization/evidence-store.ts` | 83 | `writeFile` | Genesis | Initialization evidence artifacts |
| `src/mission-studio/decision-log.ts` | 155 | `writeFile` | Governed | Mission Studio decision records |
| `src/mission-studio/draft-integrity.ts` | 124 | `writeFile` | Governed | Draft integrity records |
| `src/mission-studio/snapshot-store.ts` | 87 | `writeFile` | Governed | Snapshot lineage records |
| `src/mutation/filesystem-provider.ts` | 37–60 | `mkdir`, `writeFile`, `appendFile` | Provider internal | ExecutionGate-authorized filesystem mutation provider |
| `src/repository/adapters/github-adapter.ts` | 125 | `writeFile` | External observation | Caches external forge response bodies |
| `src/runtime/historical-aliases.ts` | 105 | `writeFile` | Governed | Runtime alias registry |
| `src/workspace/workspace.ts` | 437, 444, 447, 450, 453, 459, 466 | `mkdir`, `writeFile` | Genesis | Workspace descriptor and context files |

---

## In-scope for this expedition

1. Register `FilesystemMutationProvider` in bootstrap so `ExecutionGate` can execute `FilesystemWrite` mutations.
2. Update `audit-bypass-map.js` exemption: `src/mutation/filesystem-provider.ts` is a provider, not dead code.
3. Migrate `src/cli/agent-artifacts.ts` callers to pass `gate` when governance authority exists.
4. Add a static check that fails if a new unclassified direct write is introduced.

## Out-of-scope / deferred

The remaining governed paths (adapters, CLI commands, Mission Studio, documentation expedition, runtime aliases) are classified and inventoried. They will be migrated in follow-up work as each surface is touched, rather than in a single large refactor.

## Verification

- Inventory is complete for `src/`.
- Every path has exactly one classification.
- No provider-internal path is classified as governed or genesis.
