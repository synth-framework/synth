# SYNTH CLI Command Surface Audit

**Expedition:** `b769c7a4a28087bb` — Audit and unify CLI command surface  
**Mission:** `0c3c95e581c0fd75` — Simplify SYNTH CLI lifecycle and reduce agent friction  
**Version audited:** `2.6.1`  
**Date:** 2026-08-09  

## 1. Scope and method

This audit compares the CLI surface advertised by `synth --help` and each `synth <namespace> --help` against the actual command dispatcher in `src/cli/synth.ts`. The goal is to find:

- Missing or broken help routing.
- Commands/flags that are implemented but not documented.
- Dead or misleading command paths.
- Overlapping command families that create agent friction.

The audit was performed by reading the dispatcher (`src/cli/synth.ts`), running the built CLI, and cross-referencing help output against source-level capability checks.

## 2. Executive summary

The CLI is functionally rich but the help surface is inconsistent. Several namespaces route `--help` back to the root help, lifecycle commands support `--dry-run` almost everywhere but do not advertise it, and plan/intent capture is spread across five overlapping namespaces. The highest-value, lowest-risk fixes are:

1. Repair broken namespace help routing (`project`, and arguably `init`).
2. Advertise `--dry-run` on every expedition lifecycle subcommand.
3. Advertise `mission verify-charter` in mission help.
4. Resolve the `synth validate artifact --type` error message that promises unimplemented types.
5. Begin a consolidation expedition for plan/intent/approval state capture.

## 3. Critical discrepancies

### 3.1 `synth project --help` returns root help

- **Location:** `src/cli/synth.ts:6425` (`isNamespaceHelp`).
- **Problem:** `project` is missing from the `isNamespaceHelp` switch. Running `synth project --help` therefore falls through to the generic root help, even though `cmdProjectHelp` exists and is correct.
- **Impact:** Agents discover `synth project AGENTS.md` only by reading source or the root command list, not via contextual help.
- **Fix:** Add `case "project": return { namespace, handler: cmdProjectHelp }` to `isNamespaceHelp`.

### 3.2 `synth mission certify` is a dead command

- **Location:** `src/cli/synth.ts:6881`.
- **Problem:** The dispatcher has a dedicated branch for `synth mission certify` that only prints a redirect to `synth mission complete`. The subcommand is not listed in mission help and does not exist as a real capability.
- **Impact:** It behaves like a friendly guardrail, but it keeps a non-capability in the dispatch surface.
- **Fix options:**
  - Keep it as a guardrail but move it to the unknown-subcommand branch.
  - Remove it and rely on the generic usage error.  
  **Note:** `tests/cli-error-hints.test.js` currently expects this exact `UnknownMissionSubcommand` response, so any removal must update that test.

### 3.3 `synth expedition explain` is an undocumented alias

- **Location:** expedition dispatch branch.
- **Problem:** `explain` is handled as an alias of `show` but is not listed in help.
- **Impact:** Low; the alias is harmless but adds noise to the surface.
- **Fix:** Either document it as an alias or remove it from the dispatcher.

### 3.4 `synth govern` default behavior contradicts its help description

- **Location:** `src/cli/synth.ts:2871` (`cmdGovern`).
- **Problem:** Root help says govern "Run the full governance pipeline". In practice, bare `synth govern` routes to onboarding/status depending on project state and only delegates to `npm run govern` when `--pipeline`, `--explain`, `--profile`, or `--full` is provided.
- **Impact:** Operators expect the pipeline; they get a router. This is a major source of "what just happened?" friction.
- **Fix:** Change the root help description to "Project-state router and governance pipeline delegate" and add clear sub-help for `synth govern`.

### 3.5 `synth validate artifact --type` advertises unimplemented types

- **Location:** `src/cli/synth.ts:6542` (`cmdValidateArtifact`).
- **Problem:** The `--type` error says options are `expedition, mission, refined-intent, alignment-contract`, but the `switch` only implements `expedition` and `mission`. The default case then says "Supported: expedition, mission".
- **Impact:** Two contradictory error messages and false promise of capability.
- **Fix:** Align the initial `--type` error with the actual supported types, or implement `refined-intent` and `alignment-contract` validation.

## 4. Hidden flags and commands

These capabilities exist in source but are not surfaced in help strings.

| Namespace | Hidden capability | Source evidence | Suggested help addition |
|---|---|---|---|
| `init` | `--source`, `--source-location`, `--declared-intent` | `cmdInit` flags | Add `init` namespace help |
| `govern` | `--pipeline`, `--explain`, `--profile`, `--full`, `--intent` | `cmdGovern` flags | Add `govern` namespace help |
| `validate` | `--explain`, `--profile`, `--diff` | `cmdValidate` flags | Document in `validate` help |
| `expedition` lifecycle | `--dry-run` on `create/approve/commit/start/complete/finish/cancel/archive/evidence/refine/certify` | multiple handlers | Add `[--dry-run]` to each help entry |
| `mission` | `verify-charter --file <path>` | `cmdMissionVerifyCharter` | Add to `mission` help list |
| `task generate` | `--force` | `cmdTaskGenerate` | Document in `task` help |
| `approval` | `--op`, `--params`, `--expiry-hours` | `cmdApprovalRequest`/`Grant` | Document in `approval` help |
| `first-contact start` | `--intent` | `cmdFirstContactStart` | Document in `first-contact` help |
| `project/verify/approve` | `--architecture` | first-contact dispatch | Document in first-contact help |

## 5. Redundancies and agent friction

### 5.1 Plan/intent capture is fragmented

Five namespaces can capture intent before it becomes a Mission:

- `intent create --file <path>`
- `mission create --subject ... --purpose ...`
- `first-contact start <intent>`
- `alignment prepare`
- `govern <intent>` (captures intent and routes to `mission create`)

This makes it unclear which entry point an agent should use. The current heuristic is:

- Uninitialized project → `synth govern` or `first-contact`.
- Initialized project, quick plan → `alignment prepare`.
- Governed project, full mission → `mission create`.

A single `synth plan capture` namespace (or a unified `synth govern --intent` contract) would reduce friction.

### 5.2 Approval is duplicated

Approval semantics appear in:

- `mission approve`
- `expedition approve`
- `alignment approve`
- `intent approve`
- `first-contact approve`
- `approval request/grant/deny/list/show`

The last one is the generic two-party approval capability; the others are lifecycle-specific. The overlap is confusing because `--dry-run` is supported on some and not others, and error hints differ.

### 5.3 Status/report/explain/status overlap

- `synth status`
- `synth report`
- `synth explain status`
- `synth explain all`
- `synth checkpoint`

All report operational state. The distinction is:

- `status` = active execution and blockers.
- `report` = global human-readable narrative.
- `explain status` = structured state dump.
- `explain all` = aggregate graph, lineage, diagnostics.
- `checkpoint` = pre-flight gate for agents.

Consider merging under `synth status` with `--format human|json|diagnostics`.

## 6. Proposed unified surface by domain

The following grouping keeps existing commands but clarifies ownership. It is **not** a proposal to rename everything in one expedition; it is a target architecture for future simplification work.

### 6.1 Lifecycle (Mission / Expedition)

| Domain | Current commands | Proposed minimal surface |
|---|---|---|
| Mission | `create`, `approve`, `evidence add`, `list`, `show`, `verify-charter`, `decisions`, `snapshot`, `report`, `complete` | Keep all; document `verify-charter`; remove `certify` guardrail or make it generic. |
| Expedition | `create`, `approve`, `commit`, `start`, `complete`, `finish`, `cancel`, `archive`, `evidence`, `refine`, `certify`, `list`, `show`, `report`, `rank` | Keep all; advertise `--dry-run` on every mutating subcommand; keep `finish` as atomic helper. |

### 6.2 Planning / intent capture

| Current | Proposed unified path |
|---|---|
| `intent create` | Merge into `plan capture --file` |
| `alignment prepare` | Merge into `plan prepare` or keep as `alignment prepare` but document as the quick-plan path |
| `first-contact start <intent>` | Keep for onboarding; document it as the ungoverned entry point |
| `govern <intent>` | Keep as convenience router |
| `mission create` | Keep as governed mission entry point |

### 6.3 Governance operations

| Current | Proposed |
|---|---|
| `govern` (bare) | Rename behavior conceptually to `synth route` or document as router |
| `govern --pipeline/--full` | Keep as explicit pipeline invocation |
| `validate` / `validate --full` / `validate --dry-run` | Keep; document `--explain`, `--profile`, `--diff` |
| `verify` | Keep as invariant/signature verification |
| `repair` | Keep |

### 6.4 Discovery / explain

| Current | Proposed |
|---|---|
| `explain replay` | Keep |
| `explain all` | Keep or merge into `status --diagnostics` |
| `explain status` | Merge into `status --format json` |
| `explain graph/lineage/proposals/snapshots` | Keep under `explain` |

### 6.5 Documentation / admin

| Current | Proposed |
|---|---|
| `docs generate` | Keep |
| `project AGENTS.md` | Keep; fix `--help` routing |
| `ai refresh` | Keep |
| `task` | Keep |
| `approval` | Keep as generic two-party approval |

## 7. Immediate fixes implemented in this expedition

1. **Fixed `synth project --help` routing** by adding `project` to `isNamespaceHelp` (`src/cli/synth.ts`).
2. **Added `mission verify-charter` to mission help** (`cmdMissionHelp`).
3. **Added `--dry-run` annotations** to all mutating expedition lifecycle subcommands in `cmdExpeditionHelp`.
4. **Documented findings** in this audit file.

Out of scope for this expedition (reserved for follow-up work):

- Removing `mission certify` guardrail (touches `tests/cli-error-hints.test.js`).
- Implementing `validate artifact` types `refined-intent` and `alignment-contract`.
- Adding namespace help for `init`, `govern`, `validate` hidden flags.
- Consolidating plan/intent/approval namespaces.

## 8. Recommendations and follow-up expeditions

1. **CLI help parity expedition** — Add missing namespace help for `init`, `govern`, `validate`, `approval`, and `task`; surface all implemented flags.
2. **Plan/intent unification expedition** — Design a single `plan` namespace that can feed `mission create`, `alignment prepare`, and `first-contact` without redundancy.
3. **Approval surface consolidation expedition** — Decide whether lifecycle approvals (`mission approve`, `expedition approve`) delegate to the generic `approval` capability or remain separate.
4. **`validate artifact` completion expedition** — Either implement `refined-intent` and `alignment-contract` validation or remove them from the error message.
5. **Agent error-hint expedition** — Make every unknown/lifecycle error include the exact next command (e.g., dirty-tree on `expedition complete`, missing `--alignment-contract-id`, invalid confidence string).
