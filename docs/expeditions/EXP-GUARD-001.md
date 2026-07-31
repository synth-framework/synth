# EXP-GUARD-001 — Derived-State Protection & Expedition Scope

> Prevent agents from editing derived files directly and enforce a sandboxed file scope per expedition.

**Status:** Executing  
**Kind:** Governance Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-PROGRAM-043 Workstream A (guided onboarding)  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Purpose

The TaskPRO migration incident included an agent editing `canonical-state.json` by hand and stale `AGENTS.md` directly. SYNTH must treat derived files as read-only outside the CLI/SDK and must sandbox expeditions to their declared scope so a "mobile runtime defects" expedition cannot touch `.synth/` or `knowledge/`.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| G1 | Agent edited canonical-state.json directly | Critical | Fixed in SDK + ExecutionGate |
| G2 | AGENTS.md is edited manually but is derived | High | Fixed in SDK + ExecutionGate |
| G3 | No expedition file-scope enforcement | High | Fixed in ExecutionGate + CLI |

---

## Deliverables

### 1. Derived-file write protection

The CLI and SDK refuse writes to:

- `.synth/data/canonical-state.json`
- `.synth/data/event-log.jsonl`
- `AGENTS.md`
- `docs/generated/*.md`

Error message:

```text
This is derived state. Modify source events or evidence instead.
```

### 2. Expedition scope declaration

When an expedition is created, it declares a `scope` glob list (e.g., `apps/mobile/**`, `packages/ui/**`, `supabase/config.toml`). The CLI/SDK blocks file writes outside that scope unless explicitly authorized.

### 3. Authorization override

A mutating command can request an out-of-scope write with `--authorize-out-of-scope <reason>`. The reason is recorded in the event log.

---

## Design Notes

### Derived-file catalog

`src/governance/derived-files.ts` owns the canonical list of derived paths and a POSIX glob matcher (`**` and `*`). The catalog is consumed by both the public SDK (`src/sdk/files/index.ts`) and the ExecutionGate (`src/control/execution-gate.ts`) so the same patterns apply to direct SDK calls and gated mutations.

### Enforcement layers

1. **SDK guard** — `writeFile` and `appendFile` throw `IllegalMutationError` before any I/O.
2. **ExecutionGate** — `authorize()` rejects derived paths first, then checks expedition scope, then allows an out-of-scope override when `mutation.context.authorizeOutOfScope` is provided. Override reasons are persisted as `OUT_OF_SCOPE_AUTHORIZED` events.
3. **CLI** — `synth expedition create` accepts repeated `--scope <glob>` flags; values are stored in `expedition.metadata.scope`.

### Scope matcher

Scope is stored as an array of POSIX globs. `matchesScope(relativePath, pattern)` converts `**` to any-depth matching and `*` to single-segment matching. Paths are resolved relative to the project root at authorization time.

### Out-of-scope override audit

When a mutation carries `context.authorizeOutOfScope`, the ExecutionGate still records an `OUT_OF_SCOPE_AUTHORIZED` event containing the expedition ID, target path, and reason before the mutation is applied.

### Caveats

- Enforcement is SDK/CLI-only. File-system-level protection (e.g., read-only permissions) is out of scope.
- Scope matching relies on `process.cwd()`-based root resolution; callers that bootstrap with an explicit root must chdir or pass a root-aware wrapper.

---

## Acceptance Criteria

1. Writing `canonical-state.json` directly via the SDK returns a structured error.
2. Writing `AGENTS.md` directly via the SDK returns a structured error.
3. An expedition scoped to `apps/mobile/**` blocks a write to `.synth/data/canonical-state.json`.
4. `--authorize-out-of-scope` appends an `OUT_OF_SCOPE_AUTHORIZED` event with the reason.
5. `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- File-system-level enforcement (kernel permissions).
- Scope enforcement outside the Synth CLI/SDK.

---

## Governance

### Protected

- ExecutionGate as sole mutation authority.
- Event model.

### Not included

- New constitutional rules.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
- `docs/AGENTS.md`
