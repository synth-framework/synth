# STATE-001 — preliminary state-access audit

Date: 2026-10-14 (America/Hermosillo)

**Status: preliminary measurements, not an implementation or completed audit.**
EXP-STATE-001 (`90a06965f6a67849`) is approved, not committed/started.
CLI-003 remains executing with unmet absolute status/replay timing criteria.
No criteria have been waived, no dependencies changed, and PR #346 has not
been merged by this work.

## Execution sequencing constraint

`findLiveBranchBindingOwner` in `src/repository/branch-policy.ts` identifies
CLI-003 (`e47a186cb472a20a`) as the live expedition owning
`arena/d5e4625c-synth`. `resolveDeclaredBranch` checks that ownership before
creating/checking out a branch and would reject STATE-001 with
`DECLARED_BRANCH_IN_USE`. Paused expeditions also retain ownership.

Consequently, the accepted sequence needs an operational handoff before
STATE-001 implementation: a separately bound Arena session branch, or an
explicitly reviewed change in sequencing/policy. This session's branch is
fixed. Do not invent another branch, use bare start, bypass the declaration
guard, or complete/cancel CLI-003 merely to release its binding. Even merging
the implementation PR would not itself make CLI-003's acceptance criteria pass
or terminate its expedition.

This preliminary audit is authorized planning work. The only measured mutation
runs in a disposable copy, not in the source repository.

## Reproduction and measurement boundary

From the repository root, with a current successful build:

```sh
node --test tests/state-io-tracer.test.js
node scripts/audit-state-access.js --out /path/outside-the-ledger/state-access.json
```

The script uses the existing built CLI/SDK/API. It does not run `govern`,
create a branch, auto-commit, fabricate ledger events, or call an authorized
store directly to simulate a domain mutation. It selects an actually executing
expedition from the input state. The measurements below selected CLI-003.

The preload observes completed `readFile`, `writeFile` and `appendFile` calls
(sync, callback and promise forms) beneath `.synth`. Bytes are returned read
payloads or requested successful write payloads, not kernel I/O. Failed reads
are recorded separately. It fails on missing instrumentation, unsuccessful
probes, unknown payload byte counts, or traced writes from CLI read probes.

Coverage does **not** include directory/metadata operations, streams,
FileHandles, raw file descriptors, filesystem cache behavior, CPU attribution,
allocations or latency. Capturing stacks adds overhead: these runs must not be
used as CLI-003 timing evidence. Source inspection confirms that the measured
state/event store paths use the covered APIs; this is not a claim that every
repository filesystem operation is instrumented.

Eight CLI probes have exact stdout parity with separate uninstrumented runs.
A ninth probe uses the SDK to select one expedition after `readStateOrThrow`.
All nine reported zero successful traced writes. The complete `.synth/data`
file tree is content-hashed before and after the audit, including on failure;
the successful run left it unchanged. This observes file contents, not mtimes.

The mutation probe copies `.synth/data`, configuration and charter documents
to a temporary root without `.git`. It calls `RefineExpedition` through
bootstrap → API → ExecutionGate, without the CLI auto-commit wrapper. It
separates setup, mutation and verification trace phases; only the mutation
phase is tabulated below. This measures API/gate persistence, not a complete
Git-backed CLI ceremony.

Before and after the copied mutation, the persisted projection must deeply
equal the **entire JSON-serialized replay result**. JSON serialization is the
store's existing representation: for example, an in-memory
`repository: undefined` is omitted. No serialized fields are discarded for
the comparison. Existing events must remain identical, and exactly one
`EXPEDITION_REFINED` event must be appended. This is stronger than comparing
only the stored `stateHash`, but it is not the future crash/concurrency suite.

## Measured baseline

Source commit: `305fa0459bf500c3a701e105fc03514a68a4ba71`.
Node `v22.22.3`, Linux; current built distribution passed doctor's integrity
check. The generated JSON report also records hashes of both measurement
scripts and per-file counts/callers.

- 505 authoritative events; 5 missions; 71 expeditions.
- Aggregate: **251,026 bytes**; logical state hash `804797581`.
- Aggregate file SHA-256:
  `de65581e3babd943362f31124b1510b64723b919f3e3243996fe77ff65bad537`.
- Four event segments total **787,819 bytes** for one full read pass.

These numbers supersede the *pre-creation* size observation of 243,594 bytes
and 70 expeditions. The earlier observation was not wrong: STATE-001 was
subsequently created and approved.

### Read probes

Counts include repeated reads, not just unique files. Aggregate reads are a
subset of total reads. All commands use JSON output.

| Probe | Successful reads | Read bytes under `.synth` | Aggregate reads | Traced writes |
|---|---:|---:|---:|---:|
| `status` | 39 | 1,636,577 | 1 | 0 |
| `mission list` | 39 | 1,636,577 | 1 | 0 |
| `expedition show --id <CLI-003>` | 78 | 3,273,154 | 2 | 0 |
| `expedition report --id <CLI-003>` | 39 | 1,636,577 | 1 | 0 |
| `explain replay` | 9 | 1,826,664 | 1 | 0 |
| `verify` | 55 | 4,757,657 | 4 | 0 |
| `doctor` | 15 | 2,751,823 | 1 | 0 |
| `checkpoint` | 51 | 3,851,607 | 3 | 0 |
| SDK `readStateOrThrow(root).expeditions[id]` | 1 | 251,026 | 1 | 0 |

`status` reads one full event pass, the aggregate, 30 draft files totaling
503,109 bytes, three snapshots totaling 93,025 bytes, and 1,598 bytes of
decisions. Thus aggregate size is only part of the observed state-read work.
One additional failed lookup appears in the detailed trace, not in the
successful-read count.

`expedition show` calls `resolveGovernanceContext` twice in its JSON path
(`src/cli/commands-expedition.ts`, `cmdExpeditionShow`). That explains the
exact doubling versus a single resolver call. It is a candidate for later
work, not a change made by this audit.

`explain replay` intentionally witnesses history; `ReplayVerifier.verify`
loads events and its `verifyChain` currently loads them again. Any future
reuse must preserve the independent validation semantics and coherent source
generation, not skip the chain check.

Observed health during the read-only audit:

- `verify`: 6/6 pass, no warnings or skipped checks.
- Replay: consistent, 505 events.
- `checkpoint`: `ok`.
- `doctor`: **warning**, 11/12 checks pass. The detached ledger anchor was one
  commit behind after STATE-001 approval. No repair was run inside the audit;
  the warning and suggested explicit `doctor --fix` are retained in JSON.

### One copied expedition refinement

| Work during the API mutation | Calls/files | Bytes |
|---|---:|---:|
| Event segment reads | 37 calls across 4 segments | 7,317,088 |
| Append new event | 1 file | 709 |
| Rewrite aggregate | 1 file | 248,502 |
| Write expedition projections | 71 files | 231,730 |
| Write mission projections | 5 files | 4,391 |
| Write reference-evidence projections | 2 files | 518 |
| **Total successful writes** | **80 files** | **485,850** |

**77 of the 80 written files retained identical content:** 70 unrelated
expeditions, all five missions, and both reference-evidence records. Only the
aggregate, target expedition and one event segment changed. The smaller
post-refinement aggregate reflects replacement of the copied expedition's
refinement note, not truncation or optimization of real data.

The copy progressed from 505 to 506 events, preserved existing history, and
passed full JSON replay equality. The real repository remained at 505 events.

This establishes avoidable write amplification and repeated state reads. It
does **not** establish how much of CLI-003's latency gap those operations
cause, or prove a database/content-addressed store is needed.

## Initial producer/consumer map

This is a reviewed entry-point map, not an exhaustive symbol-resolved call
graph. Literal searches alone miss SDK consumers and delegated providers.

| Boundary | Current behavior / files | Constraint for the implementation audit |
|---|---|---|
| Mutation authority | `src/control/execution-gate.ts`: policy/derived-state work, event persistence, runtime rebuild, `stateStore.commit`; snapshot events can cause another save | Keep the gate as authority; account for post-command and continuation events |
| Canonical persistence | `src/infra/state-store.ts`: serialize whole aggregate, then iterate all ten collections, rewrite every entity, prune stale files and relocate archived expeditions | No unrelated entity rewrites; preserve archive/delete semantics and root isolation |
| Event store | `src/infra/event-store.ts`: `loadAll`; `count` and `getLastEvent` each load all; `nextOffset` scans on-disk offsets for external-writer freshness | Repeated scans are observable; do not replace them with an unchecked process-local cursor |
| Runtime execution | `src/runtime/engine.ts`, `executor.ts`: full replay before execution, derived-state build, deep JSON clone, hash computation | Measure CPU/allocation separately; retain full logical state and hash semantics |
| Normalized governance view | `src/runtime/governance-resolver.ts`, `canonical-state-builder.ts`, `state-consistency-validator.ts`: read history, aggregate, decisions, aliases, snapshots, drafts; normalize/replay/validate | Raw replay, normalized governance state and snapshot-enriched views are distinct contracts |
| SDK reads | `src/sdk/state/index.ts`: parse aggregate with no freshness check at this boundary; `src/sdk/events/index.ts`: whole-history reads even for count/last | Provide a shared validated boundary rather than moving unchecked aggregate trust into an index |
| Workspace reads | `src/workspace/state-reader.ts`: prefer stored aggregate, fall back to replay when absent | Treat stale and corrupt data explicitly; absence-only fallback is insufficient for a new representation |
| CLI views | `status-light.ts`, `status-briefing.ts`, `commands-mission.ts`, `commands-expedition.ts`, `resume-briefing.ts`, `commands-checkpoint.ts` | Preserve output contracts, charter/runtime precedence and complete narrative/evidence content |
| Additional SDK callers | `command-lifecycle.ts`, `repository-identity.ts`, `ai-metadata.ts`, `agents-contract.ts` | Branch ownership, identity and generated contracts must migrate with the storage boundary |
| Replay and verification | `src/core/replay-verifier.ts`, `src/verification/{context,checks,engine}.ts`, CLI replay-health/doctor/checkpoint | Full-history verification remains an explicit exception, not a fast-path cache assertion |
| Signatures | `src/cli/signatures.ts` reads events and invokes `src/signing` | Preserve event bytes/hash-chain/signature authority; do not verify projections instead |
| Snapshots | `StateStore.snapshot/loadSnapshot`; `src/mission-studio/snapshot-store.ts`; `src/adapter/git-snapshot.ts` | Full-state snapshots, certified mission snapshots and Git snapshots are not interchangeable caches |
| Consumer checkpoints | `src/infra/checkpoint-store.ts`, `src/runtime/partition-router.ts` | Existing consumer offsets are not proof that an entity projection is fresh; generation/version/source validation still needs design |
| Explicit repair/bootstrap | `commands-repair.ts`, `commands-init.ts`, `bootstrap-apply.ts`, `first-contact.ts`, `migrate.ts` | Rebuild via authorized operations; reads must not silently repair materialized state |
| Artifact protection/staging | `src/state/artifact-policy.ts`, `src/sdk/files/derived.ts`, `src/ledger/{writer,ceremony}.ts`, Git snapshot path lists | Aggregate and per-entity files are currently tracked durable artifacts; on-demand aggregate export requires coordinated contract/staging changes |

In particular, the StateStore comment calling the aggregate "generated" does
not make it optional: artifact policy still classifies it as durable, and SDK,
verification, snapshot and ceremony consumers rely on it. Earlier completed
segmentation work did not eliminate the aggregate or all-entity rewrites.

## What remains before an implementation decision

1. Complete caller/test inventory, including archive/delete paths, standalone
   log input, snapshots, signing, rebuild and ledger staging. Record exact
   output/hash/root-isolation contracts rather than equating every state view.
2. Build deterministic 10x/100x fixtures through supported APIs. The copied
   real-data refinement is not a substitute for those fixtures. Measure bytes,
   file counts and work separately from uninstrumented timing/allocation.
3. Record explicit byte/file/work budgets **before implementation** and choose
   the simplest sufficient representation in an ADR. No numeric scale budgets
   or storage decision have been adopted by this preliminary audit.
4. Evaluate one validated state-access boundary, targeted reads, incremental
   projection writes, aggregate-on-demand export, and immutable narrative
   separation without a second authority or truncation. A database, new public
   verbs and a general migration framework are not defaults.
5. Design generation/version/source offset/hash validation and safe fallback;
   cover missing/corrupt/stale/mixed-generation state, crashes, concurrent
   writers and explicit rebuild. Do not weaken full replay or introduce
   read-time repair to meet budgets.
6. Chain the eventual regression budgets and correctness cases. The five
   measurement-tool tests added here are standalone preliminary tooling tests,
   not the completed STATE-001 acceptance guards.
7. Resolve execution-branch sequencing before implementation. Keep CLI-003's
   timing acceptance and LIFE-002's commit/configuration work with their owners.

No runtime source, production representation, public verb, test-chain task,
canonical ledger or branch policy was changed by this audit.
