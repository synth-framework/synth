# EXP-CLI-001 — CLI UX and Diagnostics Hardening

> **Product expedition.** Harden the SYNTH CLI surface so that operator-facing diagnostics are trustworthy, actionable, and clearly separated from runtime internals. Born from gaps observed while closing EXP-BROWNFIELD-001 and running the full governance pipeline.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-BROWNFIELD-001 (Brownfield Bootstrap Hardening), EXP-CONT-001 (Resume Briefing)

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

## Objective

Make the SYNTH CLI the lowest-friction source of truth for operator and agent diagnostics. Every message emitted by the CLI must be:

- **Accurate** — the stated reason for a skip, failure, or warning must match the actual state.
- **Actionable** — the operator knows what to do next without reading source code.
- **Scoped** — environment/installation health, project health, and runtime internals are not conflated.
- **Clean** — no duplicate streams, no deprecation noise, no hidden shell invocations.

This expedition polishes the operator interface. It does not redesign the brownfield workflow, the Discovery compiler, or the runtime event model.

---

## Origin Evidence

Findings collected during EXP-BROWNFIELD-001 implementation and the subsequent `npm run govern` validation run:

- `synth validate --full` reported a misleading "govern skipped" diagnostic on a project whose `package.json` existed but contained no `govern` script.
- Bootstrap and diagnostics emitted the same information to stdout multiple times, polluting machine-readable output.
- The distinction between "documentation capabilities" (what SYNTH can document) and "generated documentation" (what `synth docs generate` produces) was unclear to operators and agents.
- `synth govern` triggered a Node.js `shell: true` deprecation warning that obscured real output.
- `synth doctor` mixed installation integrity (`distIntegrity`) with project health, making it hard to tell whether the CLI or the project was unhealthy.
- Discovery produces transient JSON by default, but operators sometimes need durable evidence. There is no explicit, purity-preserving export path.

---

## Finding 1 — Misleading "Govern Skipped" Diagnostic

### Observation

When `synth validate --full` inspects a `package.json` that exists but defines no `govern` script, it reports that governance was skipped. The diagnostic implies the project is ungoverned, even though SYNTH governance does not require a package script.

### Required Change

Clarify the semantics of the govern-delegation check:

```text
package.json exists + govern script defined     → delegate to project script
package.json exists + no govern script defined  → SYNTH runs internal pipeline (not skipped)
no package.json                                 → skip project-script delegation
```

The CLI should only say "govern skipped" when there is genuinely no project to validate, not when the project simply uses the internal pipeline. The bootstrap message should also explain why a `govern` script is expected and what constitutes a good implementation.

---

## Finding 2 — Duplicate Stdout Logging

### Observation

Bootstrap and some diagnostic paths print the same status lines to stdout more than once. In `--json` mode this is especially harmful: parsers may see concatenated JSON fragments or repeated log objects.

### Required Change

Introduce a single, deterministic output channel for CLI commands:

- Structured commands (`--json`, default JSON output) write exactly one JSON document to stdout.
- Human-readable progress and bootstrap banners are routed through stderr or a structured trace stream, not stdout.
- Duplicate emission is detected and rejected by the clean-machine-output certification.

---

## Finding 3 — Ambiguous Documentation Capability Semantics

### Observation

Operators and agents conflate two concepts:

1. **Documentation capabilities** — the set of document types SYNTH understands and can reason about (e.g., ADRs, runbooks, specs).
2. **Generated documentation** — the artifacts produced by `synth docs generate` from the current repository.

This confusion leads to expectations such as "`synth docs generate` should always produce a website" or "if no docs were extracted, the capability is broken."

### Required Change

Define and surface the distinction in CLI output:

- `synth docs generate` reports what it *produced*, what it *skipped*, and why.
- Capability metadata is exposed separately (e.g., via `synth adapter info` or a dedicated `synth docs capabilities` command).
- Help text and error messages use consistent terminology: "capabilities" are potential, "generated documentation" is actual.

---

## Finding 4 — `shell: true` Deprecation Warning in `synth govern`

### Observation

`synth govern` triggers a Node.js deprecation warning for `shell: true`. The warning leaks implementation detail and trains operators to ignore CLI output.

### Required Change

Remove the `shell: true` invocation from the govern delegation path. Replace it with an explicit, cross-platform execution strategy that does not trigger deprecation warnings and does not change observable behavior.

---

## Finding 5 — Installation Health Is Conflated with Project Health

### Observation

`synth doctor` currently reports `distIntegrity` as a project-health check. A corrupted or outdated `dist/` directory is an installation problem, not a repository problem. Conversely, a greenfield project with no `.synth/discovery/` directory was incorrectly flagged as unhealthy.

### Required Change

Keep the Runtime Health / Project Health split introduced in EXP-BROWNFIELD-001 and make it precise:

```text
Runtime Health
  ✓ binary path valid
  ✓ version resolvable
  ✓ Node.js version compatible
  ✓ dist/ integrity valid

Project Health
  ✓ SYNTH manifest present
  ✓ event-log replay consistent
  ✓ event chain intact
  ✓ discovery baseline present (optional, informational)
```

Each failure must name the layer it belongs to and the exact remediation.

---

## Finding 6 — Discovery Needs an Explicit Export Mode

### Observation

`synth discover` currently emits transient JSON. During large-repository certification the agent had to manually persist discovery output because there was no supported export path. Default discovery must remain read-only and mutation-free, but operators sometimes need durable evidence.

### Required Change

Introduce an explicit, opt-in export mode:

```text
synth discover .              → emits JSON to stdout (default, read-only, no mutation)
synth discover . --export     → writes immutable, signed baseline to .synth/discovery/
```

The exported artifact is read-only for all consumers. Only `synth discover --export` may write it. This preserves discovery purity while giving expeditions durable evidence.

> **Discovery Contract:** `synth discover` MUST remain a pure read-only operation unless an explicit persistence option (`--export`) is supplied. This is a permanent invariant, not an implementation detail.

---

## Deliverables

### 1. Govern Delegation Diagnostic Fix

Correct the "govern skipped" message in `src/cli/govern-delegation.ts` (and callers in `src/cli/synth.ts`) so that:

- A missing `govern` script is reported as "using internal governance pipeline."
- A missing `package.json` is reported as "no project script to delegate to."
- The diagnostic includes the actual condition that triggered it.
- Bootstrap explains what a good `govern` script implementation looks like.

### 2. Single-Channel CLI Output Contract

Document and enforce that every CLI command writes exactly one structured output document to stdout. Add a regression test that fails if a command emits more than one parseable JSON object to stdout.

### 3. Documentation Capability / Generated Docs Separation

- Update `synth docs generate` output to distinguish `capabilities`, `produced`, and `skipped`.
- Add help text explaining the difference.
- Optionally expose capability metadata through a stable subcommand or adapter interface.

### 4. Remove `shell: true` Deprecation Warning

Refactor `synth govern` delegation to avoid `shell: true`. Verify that the change does not alter behavior on macOS, Linux, or Windows (where supported).

### 5. Doctor Layer Clarity

Finalize the Runtime Health / Project Health split:

- `distIntegrity` lives under Runtime Health.
- `discoveryBaseline` remains informational under Project Health.
- Each unhealthy check prints a layer-specific remediation step.

### 6. Discovery Export Mode

Implement `synth discover <path> --export` while preserving the permanent discovery contract:

- Default `synth discover` remains read-only stdout only; it never writes to `.synth/discovery/`.
- `--export` is the only mode that writes an immutable, signed, timestamped baseline to `.synth/discovery/`.
- Consumers read the baseline; they never mutate it.
- Add certification tests that assert the default produces no files and `--export` produces a valid baseline.

### 7. CLI UX Certification Tests

Add or extend certification coverage for:

- `synth validate --full` diagnostics for projects with and without a `govern` script.
- Clean stdout for all `--json` commands.
- `synth doctor` layer separation.
- Absence of deprecation warnings in `synth govern`.
- Documentation capability terminology.
- Discovery default read-only behavior and `--export` behavior.

---

## Goals

This expedition shall:

- Eliminate misleading govern-delegation diagnostics.
- Enforce single-channel, machine-clean CLI output.
- Clarify documentation capability vs. generated documentation semantics.
- Remove the `shell: true` deprecation warning.
- Make `synth doctor` layer boundaries precise and actionable.
- Add an explicit, purity-preserving discovery export mode.
- Add certification tests that prevent regression of the above.
- Ensure `npm run build` and `npm run govern` pass.

---

## Non-Goals

This expedition shall not:

- Redesign the brownfield bootstrap workflow.
- Modify the Discovery compiler architecture.
- Modify the runtime event model or lifecycle guarantees.
- Introduce new public concepts beyond the seven (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Build IDE, MCP, or Web client integrations.
- Implement runtime repair or reconciliation primitives (see EXP-RUNTIME-001).

---

## Execution Constraints

1. **Do not modify existing application behavior.** Harden diagnostics and output; do not change what SYNTH computes.
2. **Preserve backward compatibility.** Existing event logs and existing CLI consumers must continue to work.
3. **Every diagnostic change requires a certification test.** If the message changes, a test must assert the new message.
4. **No new dependencies for shell execution.** Use Node.js built-ins or existing project utilities.
5. **Discovery export must remain opt-in.** Default `synth discover` must not mutate the repository.

---

## Acceptance Criteria

A successful expedition:

- [ ] `synth validate --full` reports accurate govern-delegation status for all three cases (script present, script absent, no package.json).
- [ ] No CLI command emits duplicate stdout in `--json` mode.
- [ ] `synth docs generate` output clearly separates capabilities, produced artifacts, and skipped content.
- [ ] `synth govern` produces no `shell: true` deprecation warning.
- [ ] `synth doctor` reports `distIntegrity` under Runtime Health and does not flag greenfield projects as unhealthy.
- [ ] `synth discover` without `--export` writes nothing to `.synth/discovery/`.
- [ ] `synth discover --export` produces an immutable, signed baseline in `.synth/discovery/`.
- [ ] Certification tests cover all of the above.
- [ ] `npm run build` passes.
- [ ] `npm run govern` passes.

---

## Architectural Principles

> **CLI output is a product surface, not a debug log.**

> **A diagnostic is only helpful if it names the real condition and the right layer.**

> **Read-only discovery must stay read-only by default.**

> **`synth discover` is pure read-only unless `--export` is explicitly supplied.**

> **Machine output is single-document, deterministic, and parser-safe.**

---

## Expected Outcome

After completion:

- Operators and agents trust `synth validate`, `synth doctor`, and `synth govern` diagnostics.
- `--json` output is always safe to parse without filtering duplicate lines.
- Documentation terminology is consistent across CLI, help, and guides.
- The Node.js deprecation warning is gone.
- Installation health and project health are clearly separated.
- Discovery can produce durable evidence through an explicit, opt-in export.
- Future CLI UX regressions are caught by certification tests.

---

## Governance

### Protected

- CLI Output Contract
- Runtime Health / Project Health separation
- Discovery Purity Contract

### Not Included

- Brownfield bootstrap workflow redesign
- Discovery compiler changes
- Runtime event model changes
- Recovery/reconciliation primitives (see EXP-RUNTIME-001)
- New client integrations

---

## Related Documents

- [EXP-BROWNFIELD-001 — Brownfield Bootstrap Hardening](EXP-BROWNFIELD-001.md)
- [EXP-RUNTIME-001 — Runtime Correctness and Recovery](EXP-RUNTIME-001.md)
- [EXP-CONT-001 — Resume Briefing](EXP-CONT-001.md)
- [EXP-PROGRAM-004 — First Contact Program](EXP-PROGRAM-004.md)
- [docs/guides/brownfield-bootstrap-specification.md](../guides/brownfield-bootstrap-specification.md)
