# CLI Consolidation — Solutions (Housekeeping, Verb Set, Context Inference)

Evidence for Expedition `68b59f0e` (Mission "Framework Maturation v2").
Builds on `/tmp/redundancy-plan.md` (cluster analysis). Covers operator items 3, 4, 5.

---

## 3. Meta-redundancy — duplicate expeditions (housekeeping, pre-completion)

**Finding:** The mission's expedition set overlaps itself.
- `70a5c5ed2bda5f1b` "Audit CLI command surface and decouple synth.js" (completed) duplicates (a) the CLI command-surface/friction audit scope of `68b59f0e` (executing) and (b) the decoupling scope already delivered by `e5fdf75656be46bb` (executing, loader decoupling). It is effectively superseded by two newer expeditions.

**Housekeeping item (must complete BEFORE `expedition complete 68b59f0e`):**
1. Run a duplicate-expedition audit across the mission (reuse the mission-studio duplicate-detection capability already present in the framework; we should extend it to expeditions within a mission, not just missions).
2. Retire `70a5c5ed2bda5f1b` as **superseded** (its deliverables are covered by `e5fdf756` + `68b59f0e`); any not-yet-delivered fragment merges into `68b59f0e`.
3. Confirm no other overlapping expeditions remain (e.g., `f4e4850f` dependsOn-audit is distinct — keep).

**Standing fix:** add a governance check that flags expeditions in the same mission with overlapping `intentTokens`/`goal` (duplicate-aware advisory), so the set cannot re-duplicate.

---

## 4. Re-thought minimal verb set

**Inputs from analysis (clusters 1 observability, 2 init) + operator directives:**
- `migrate` is **gone entirely** (no real-world installs, no legacy justified).
- Observability: `report` → `status`; drop `explain status`.
- Init: `bootstrap`/`discover`/`first-contact`/`genesis` → unified `init`.

### Removed (final)
`report`, `bootstrap`, `discover`, `first-contact`, `genesis`, `intent`, `migrate`, `verify`, `project` (renamed).

### Folds
- `verify` → `validate verify`
- `report` → `status` (add `--global`/`--full` rich mode)
- `project AGENTS.md` → `docs agents`
- `bootstrap`/`discover`/`first-contact` → `init --brownfield`/`--analyze`/`--greenfield`
- `explain status` → `status`

### Achieved minimal set (~18 verbs, down from ~30)
`init` · `mission` · `expedition` · `status` · `explain` · `log` · `doctor` · `capabilities` · `adapter` · `snapshot` · `validate` · `govern` · `docs` · `repo` · `ai` · `help` · `version` · `checkpoint`

### Stretch folds (for discussion, to reach ~15)
- `snapshot` → `repo snapshot` (git-anchored, repo owns git)
- `capabilities` → `doctor --capabilities`
- `adapter` → `status --adapters` (or keep: it delegates to adapter CLIs)

These are optional; introspection was marked "Ok" so they can stay standalone.

---

## 5. Context-inference ("expedition new" class) + `synth help`

### 5a. `synth help` (long-neglected, add now)
- `synth help` → lists top-level verbs with one-line descriptions (discoverability; fixes friction Pattern B: "I don't know the commands").
- `synth help <verb>` → alias for `<verb> --help`.
- No governance change; pure UX.

### 5b. Alignment Contract for context resolution (operator wants control over "what we use and when")

This is the governing policy for all context inference. **Review/ratify before implementation** (it is the "alignment contract" the operator referenced; codify as an ADR or alignment-contract artifact).

**Precedence (highest → lowest):**
1. Explicit flag (`--id`, `--mission`, `--expedition`, `--alignment-contract-id`, `--draft-id`).
2. Current git branch mapping (on an expedition/mission branch → that entity).
3. Last-active session state (recorded identity/session).
4. Otherwise: **error with a prescriptive suggestion** — never a silent wrong target.

**Per-command rules:**
- `expedition new` (new, ergonomic): infers active mission from current branch **only if** the branch maps to a mission; else errors with suggestion. Creates a draft. (`expedition create` stays explicit with `--mission`.)
- `expedition approve` / `start` / `evidence` / `complete`: infer expedition from current branch when on its branch and unambiguous.
- `mission approve`: default alignment-contract to latest `alignment prepare` (friction Pattern D) unless `--alignment-contract-id` given.
- `log` / `explain` / `status`: default project-wide; optional `--expedition` / `--mission` scope.

**Visibility & safety (the "better control" requirement):**
- Every inferred resolution is **echoed**: `Using expedition 68b59f0e from current branch`. No silent inference.
- **Strict mode** (CI/automation): a config/flag disables inference so scripts must pass explicit ids (prevents ambiguous automation).
- All inference is advisory at the lifecycle layer, consistent with the existing dependsOn model (gate-level enforcement stays hard).

### 5c. Governance cluster (HELD)
`expedition`/`approval`/`certify` consolidation explicitly deferred per operator; the context-inference policy above deliberately leaves it untouched until discussed.

---

## Proposed next actions (subject to operator review)
1. Ratify the context-inference Alignment Contract (§5b) → then implement `synth help` + inference echoes.
2. Complete meta-redundancy housekeeping (§3) before `expedition complete 68b59f0e`.
3. Implement verb removals/folds (§4) in phases (low-risk first: help, explain status, genesis, migrate, verify→validate, report→status; then init unification; then project→docs, intent removal).
