# Initialization Governance Audit

**Date:** 2026-07-18  
**Auditor:** AI operator (EXP-GOV-007 follow-up)  
**Scope:** SYNTH v2 initialization sequence, runtime state authority, command entry points, repository state model, and runtime/governance boundary.  
**Status:** Baseline complete — architectural decisions required before hardening expedition.

---

## Executive Summary

This audit documents the current initialization and governance-interpretation behavior of SYNTH v2 as of the merge of EXP-GOV-007 and EXP-PROGRAM-018. It answers eight governance questions that must be resolved before a hardening expedition can establish a stable initialization contract.

The central finding is that **initialization is not modeled as a replayable lifecycle**. `synth init` is a generator that creates files but writes no event, while the rest of the system is evolving toward an interpreter model where governance context is resolved from durable artifacts. Several CLI commands still bypass the shared resolver and bootstrap their own runtime context, which leaves the architecture partially inconsistent.

---

## 1. Authoritative Initialization Sequence

There are two distinct initialization paths today.

### `synth init` — minimal generator

Source: `src/cli/synth.ts:456-508`

Creates:

```text
.synth/
  manifest.json
  data/
  AGENT_CONTRACT.md
  context.json
```

No event is written. No mission is created. The repository immediately reports phase `planning`.

### `synth bootstrap` — analyzer + optional generator

Source: `src/cli/bootstrap-apply.ts:209-288`

```text
analyzeRepository(targetDir)
generateProposals(...)           # Mission Studio in memory
if --approve:
    initSynthProject(...)        # same files as synth init
    optionally generate docs
    optionally scaffold website
    optionally scaffold example
    optionally run npm run govern
```

### Inferred intended sequence

Source: `src/cli/synth.ts:496-507`

```text
synth init
synth docs generate
synth mission create --subject '...' --purpose '...'
synth mission approve --draft-id <draft-id>
npm run govern
```

**Gap:** there is no explicit initialization state machine. Phases are derived heuristically by `derivePhase` in `src/runtime/governance-resolver.ts:172-198`.

---

## 2. What Is Allowed to Exist Before `init`?

The resolver treats a directory with no `.synth/manifest.json` as `uninitialized` and does not fail.

Sources: `src/runtime/governance-resolver.ts:224-229`, `src/infra/paths.ts:37-42`

Allowed before init:

```text
README
package.json
.git
src/, tests/, docs/, any source tree
legacy data/ (repo-root runtime data for ungoverned trees)
```

Not allowed/required before init:

```text
.synth/
.synth/data/
event-log.jsonl
snapshots/
```

`src/infra/migrate-data-dir.ts:64-132` explicitly supports a repo-root `data/` directory for ungoverned trees, including the SYNTH source repository itself.

**Minimum valid repository:** any directory. The resolver returns phase `uninitialized` with empty events and no active mission or expedition.

---

## 3. Canonical Source of Runtime State

The authority hierarchy implemented by the consistency validator is:

Source: `src/runtime/state-consistency-validator.ts:45-127`

```text
1. Event Log          (event-log.jsonl)      — durable authority
2. Replay             (rebuildState)         — derived canonical state
3. Canonical State    (canonical-state.json) — cached projection
4. Decision Log       (decisions.jsonl)      — planning-layer record
5. Snapshots          (snapshots/)           — certified mission models
6. Manifest           (.synth/manifest.json) — orientation artifact
```

Key behaviors:

- The event log is the only durable authority. `src/types/event.ts:4-5`
- Canonical state is a cache; mismatches against replay are errors. `state-consistency-validator.ts:83-92`
- Snapshots can add approved missions missing from the event log, but contradictions are errors. `state-consistency-validator.ts:104-115`
- Broken decision log chain is a warning, not a hard failure. `state-consistency-validator.ts:95-102`
- The manifest is checked for schema/vocabulary but is not state authority. `src/verification/checks.ts:313-339`

---

## 4. Which Commands Are Entry Points?

Most commands do **not** pass through the governance resolver.

| Command | Uses resolver? | Entry path |
|---|---|---|
| `synth status` | ✅ | `buildOperatorBriefing` → `resolveGovernanceContext` |
| `synth explain resume` | ✅ | `buildResumeBriefing` → `resolveGovernanceContext` |
| `synth explain replay` | ❌ | bootstraps runtime directly |
| `synth explain governance` | ❌ | reads event log directly |
| `synth explain ...` (observability) | ❌ | bootstraps runtime directly |
| `synth verify` | ❌ | builds its own `VerificationContext` |
| `synth mission create` | ❌ | bootstraps in memory, writes draft |
| `synth mission approve` | ❌ | bootstraps in memory, reads draft, appends decision |
| `synth expedition create/start/complete` | ❌ | bootstraps in memory, uses ExecutionGate |
| `synth doctor` | ❌ | checks manifest directly |
| `synth govern` | ❌ | delegates to `npm run govern` |
| `synth validate` | ❌ | delegates or runs validation planner |
| `synth init` / `synth bootstrap` | N/A | create structure |

**Key finding:** the resolver is the intended single interpretation layer, but most mutation commands still bootstrap their own runtime context. This is the main inconsistency EXP-GOV-007 leaves unresolved.

---

## 5. What Constitutes a Governed Repository?

The resolver recognizes these phases:

Source: `src/runtime/governance-resolver.ts:172-198`

```text
uninitialized   -> no .synth/manifest.json
planning        -> manifest exists, no active mission
approved        -> manifest + active mission
executing       -> manifest + active expedition
blocked         -> work item status = blocked
complete        -> all missions terminal
```

This maps to the three repository states:

```text
Not governed   = uninitialized
Initialized    = planning
Operational    = approved / executing / blocked / complete
```

---

## 6. Historical Compatibility Policy

Current policy is **migration, not eternal backward compatibility**.

Source: `src/infra/migrate-data-dir.ts:64-132`

- Automatically moves legacy repo-root `data/` into `.synth/data/` when a manifest is present.
- One-time migration with marker `.synth-data-migrated-v1`.
- Updates manifest `layout.data` to `.synth/data/`.

This supports the policy: *historical repositories remain readable but may require migrations*.

**Open question:** there is no versioned governance schema. The manifest has `schema: "synth-bootstrap-manifest-v1"` but no repository-wide governance version.

---

## 7. What Belongs in Runtime vs Governance?

Current separation:

### Runtime (`src/runtime/`)

- `replay.ts` — rebuild state from events
- `governance-resolver.ts` — read and interpret artifacts
- `state-consistency-validator.ts` — detect divergences
- `transition-engine.ts` — derive next valid action from resolved state
- `status-projection.ts` — render operator/resume briefings

### Governance (`src/governance/`)

- `intake.ts` — `validateAgentAction`, lifecycle preconditions

### Control

- `src/control/execution-gate.ts` — mutation authority
- `src/infra/event-store.ts`, `state-store.ts` — persistence

### Inconsistency

- `src/runtime/transition-engine.ts` encodes lifecycle rules. It may belong in `src/governance/` if the boundary is "runtime = reading/replay, governance = rules."
- `src/governance/intake.ts` is the agent action gate, but CLI mutation commands use it only partially.

---

## 8. Initialization Philosophy

Today `synth init` is mostly **A. Generator**. It creates the manifest, data directory, and agent orientation files.

However, the broader system is moving toward **C. Interpreter**:

- `synth bootstrap` analyzes an existing repository and proposes governance.
- `synth status` and `synth explain resume` interpret whatever exists.
- `resolveGovernanceContext` is designed to read, not create.
- `ensureRuntimeDataDir` migrates existing state rather than failing.

**Tension:** `init` is a generator, but the rest of the system expects to interpret. The missing piece is an initialization lifecycle event. If `init` produced a `SYSTEM_GENESIS` or `PROJECT_INITIALIZED` event, initialization would become replayable and the resolver would have a proper starting point.

---

## Current Behavior Inventory

### Files created by `synth init`

Sources: `src/cli/synth.ts:456-508`, `src/cli/agent-artifacts.ts:12-42`

```text
.synth/manifest.json
.synth/data/
.synth/AGENT_CONTRACT.md
.synth/context.json
```

### Files created by `synth bootstrap --approve`

Same as init, plus optional:

```text
docs/generated/*
website/*
examples/bootstrap-generated/*
```

### Mandatory vs optional

Mandatory for a governed project:

```text
.synth/manifest.json
.synth/data/
```

Optional but expected:

```text
.synth/AGENT_CONTRACT.md
.synth/context.json
event-log.jsonl
canonical-state.json
data/decisions.jsonl
data/snapshots/
data/drafts/
```

### Layout

Source: `src/infra/paths.ts:37-47`

```text
.synth/
  manifest.json          <- orientation / identity
  AGENT_CONTRACT.md      <- generated agent orientation
  context.json           <- generated agent orientation
  data/                  <- runtime authority and projections
    event-log.jsonl
    canonical-state.json
    decisions.jsonl
    drafts/
    snapshots/
```

### Commands that assume initialization

Implicitly assume a manifest or data directory:

- `synth status`
- `synth explain resume`
- `synth explain replay`
- `synth explain governance`
- `synth verify`
- `synth mission *`
- `synth expedition *`

Work on ungoverned directories:

- `synth doctor`
- `synth init`
- `synth bootstrap`
- `synth version`
- `synth help`

### Initialization bugs and inconsistencies

1. **No initialization event.** `synth init` does not write an event, so the event log cannot reconstruct the act of initialization.
2. **Resolver is not used by mutation commands.** Most CLI commands bootstrap their own context instead of resolving governance context first.
3. **`cmdMissionCreate` and `cmdMissionApprove` use memory persistence.** They then write drafts/decisions to disk manually, bypassing the ExecutionGate for persistence.
4. **`cmdExplainGovernance` reads the event log directly.** It does not use the resolver or consistency validator.
5. **`cmdVerify` builds a separate context.** It duplicates artifact-reading logic already in the resolver.
6. **No command checks `GovernanceResolutionFailure` except `status` and `resume`.** Other commands may operate on stale or inconsistent state.
7. **Manifest schema is v1 but there is no governance version.** Compatibility is handled ad-hoc by migration helpers.

---

## Recommendations Before Hardening

1. Define an `INIT` lifecycle event and its replay rule.
2. Invoke the resolver at the start of every command that needs governance context.
3. Decide whether `transition-engine.ts` belongs in runtime or governance.
4. Add a repository governance version field to the manifest.
5. Formalize the policy: historical repositories are migrated, not kept natively valid forever.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-GOV-007.md` | Canonical State Resolution & Status Authority; established the resolver used by `status` and `resume`. |
| `docs/expeditions/EXP-PROGRAM-018.md` | Historical Program Migration; eliminated Program-assignment warnings. |
| `docs/architecture/constitutional-baseline.md` | Defines Protected Assets and the Constitutional Freeze. |
| `docs/operator/01-getting-started.md` | Operator-facing initialization guidance. |
