# Phase 3 — CLI Verb Consolidation (Deprecated-Alias Shims)

**Expedition:** 29b9a3704eb1287c (draft, pending approval)
**Parent mission:** Framework Maturation v2 (4ab7e9d2cc7b1b66)
**Prepared by:** operator + agent, after pausing in-flight work on 68b59f0e to avoid
compromising that expedition's delivered scope (Phases 0–2: cold-start, context
inference, E/G gates).

## Objective
Reduce the CLI surface to a minimal, memorable verb set by folding redundant
verbs into canonical targets. Old verbs keep working as **deprecated-alias
shims** (they print a `[deprecated]` notice to stderr and route to the canonical
handler) rather than being hard-deleted.

## Why shims, not deletion
Hard-deleting the folded verbs would break load-bearing subsystems and their
tests:

- `intent` is not dead: `synth intent create/refine/submit/approve` feed the
  Genesis Alignment Layer (`alignment`), and `mission approve` requires an
  aligned contract (see `intake.ts` `mission.approve` gate). Deleting `intent`
  breaks mission approval. → keep as deprecated shim.
- `first-contact` / `genesis` / `bootstrap` / `discover` have dedicated test
  suites (`test:first-contact-*`, `test:brownfield`, `test:discovery`,
  `test:genesis-*`). Removing them breaks the governance pipeline. → keep as
  deprecated shims, with `init --brownfield|--analyze|--greenfield` as the
  canonical entrypoint.
- `report` and `explain status` overlap `status`; `verify` overlaps
  `validate`; `project AGENTS.md` overlaps `docs agents`. These are pure
  aliases → safe to fold, but keep the old form working with a notice.

## Canonical mapping

| Legacy verb | Canonical form | Handler reuse |
|---|---|---|
| `report` | `status` | `cmdStatus()` |
| `explain status` | `status` | `cmdStatus()` |
| `verify` | `validate verify` | `cmdVerify()` |
| `verify signatures` | `validate verify signatures` | `cmdVerifySignatures()` |
| `project AGENTS.md` | `docs agents` | `cmdProjectAgentsMd()` |
| `bootstrap` | `init --brownfield` | `cmdBootstrap()` |
| `discover` | `init --analyze` | `cmdDiscover()` |
| `first-contact` | `init --greenfield` | `cmdFirstContactOnboard()` (no-sub path) |
| `genesis` | `init --greenfield` | (alias of first-contact) |
| `intent` | *(deprecated)* → `alignment` / `init --greenfield` | unchanged |
| `migrate` | *(deprecated)* → `init --analyze` / `first-contact onboard` | unchanged |

## Implementation plan (ordered, each independently buildable)

1. **Helper** — add `emitDeprecation(oldForm, canonical)` in `synth.ts`
   (writes to stderr, never to stdout JSON).
2. **Dispatch shims** (`src/cli/synth.ts`, main `switch`):
   - `case "report"` → `emitDeprecation("report","status"); await cmdStatus()`
   - `case "explain"` → add `else if (sub === "status") { emitDeprecation(...); await cmdStatus() }`
   - `case "verify"` → `emitDeprecation("verify","validate verify")` + keep `signatures` sub
   - `case "validate"` → add `sub === "verify"` → `cmdVerify()` (canonical, no notice)
   - `case "docs"` → add `sub === "agents"` → `cmdProjectAgentsMd(flags)`
   - `case "project"` → `sub === "AGENTS.md"` → `emitDeprecation(...); await cmdProjectAgentsMd(flags)`
   - `case "init"` → flag routing: `--brownfield`→`cmdBootstrap`, `--analyze`→`cmdDiscover`,
     `--greenfield`→`cmdFirstContactOnboard`, else `cmdInit` (no notice — canonical path)
   - `case "bootstrap"` / `case "discover"` / `case "first-contact"/"genesis"` /
     `case "intent"` / `case "migrate"` → `emitDeprecation(...)` + unchanged body
3. **Safety classification** (`src/cli/command-safety.ts`):
   - Registry: add `"docs agents"` (MUTATING, requiresApproval) and
     `"validate verify"` (READ_ONLY).
   - `classifyInvocation`: add `docs agents` and `validate verify` branches so the
     Discovery gate treats them correctly. (Deprecated verbs already classify to
     their original safe strings — no change needed there.)
4. **Help text**:
   - `src/cli/entry.ts` `COMMAND_LIST`: mark deprecated verbs with
     `(deprecated → …)`; add `docs agents` / `validate verify` notes; update
     `init` description to mention the three flags.
   - `src/cli/synth.ts` command-group descriptions (e.g. `intent`, `migrate`
     entries) → append `(deprecated)`.
5. **Docs** (separate, low priority): note deprecated verbs in user docs.

## Verification
- `tsc --noEmit` clean.
- `node dist/cli/entry.js report` → `[deprecated]` on stderr + `status` JSON on stdout.
- `node dist/cli/entry.js explain status` → deprecation + status.
- `node dist/cli/entry.js verify` → deprecation + verify output;
  `validate verify` → verify output, no deprecation.
- `node dist/cli/entry.js docs agents` → AGENTS.md generation;
  `project AGENTS.md` → deprecation + same.
- `node dist/cli/entry.js init --brownfield …` → bootstrap behavior;
  `bootstrap` → deprecation + bootstrap.
- Discovery gate regression: `SYNTH_DISCOVERY_MODE=1 node dist/cli/entry.js status`
  still allowed; mutating deprecated verbs still blocked unless `--discovery-ok`.
- Confirm `intent`→`alignment`→`mission approve` chain still works (alignment
  layer intact).

## Risks & mitigations
- `report`→`status` changes output format (human report → status JSON). Accepted
  per the fold; document in release notes.
- Mapping `first-contact` → `init --greenfield` uses `cmdFirstContactOnboard`
  (the no-sub path), which matches `first-contact` with no subcommand. Verify the
  shared `case` body is unchanged.
- Alias removal (deleting old verbs entirely) is explicitly OUT OF SCOPE for this
  expedition; it can follow later once operators migrate, and must include test
  rewrites.

## Out of scope
- Hard deletion of handlers / test rewrites.
- Verb-floor folds already handled elsewhere (capabilities→`status capabilities`,
  adapter→`status adapters`, doctor→`status health`, snapshot→`repo snapshot`).
- `explain status/report` unification into `status` (covered by the two rows above).
