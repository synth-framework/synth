# CLI Verb Redundancy & Consolidation Plan — Evidence for Mission "Framework Maturation v2"

**Scope:** Observability, Init, Mission-Studio, Validation, Introspection, Integration clusters.
**Governance cluster:** HELD (per operator) — not finalized here.
**Method:** Full `--help` dump of every command + usage grep across `tests/` (100 matches) to separate "used" from "unused".
**Attached to:** Expedition `68b59f0e` (executing, under this mission). Mission-level evidence only accepts textual notes on a draft, so the file artifact lives on the expedition.

---

## 1. Observability cluster — `status`, `report`, `explain`, `log`, `snapshot`, `doctor`, `capabilities`

**Current redundancy:**
- `status` ("current project state") vs `report` ("global human-readable project report") → near-duplicate.
- `explain status` duplicates top-level `status`.
- `doctor` (health), `log` (raw event query), `snapshot` (git-anchored state), `capabilities` (introspection) are each distinct.

**Proposed clean set:**
- **`status`** — keep; absorb `report` (add a `--global`/`--full` rich mode).
- **`explain`** — keep; **remove `explain status`** (use `status`).
- **`log`**, **`doctor`**, **`snapshot`**, **`capabilities`** — keep as-is.

**Removals:** `report` (fold → `status`).

---

## 2. Init cluster — unify into ONE `init`

**Current surface:** `init`, `bootstrap` (brownfield transform), `discover` (read-only analysis), `first-contact` (greenfield/legacy guided onboarding), `genesis` (100% alias of `first-contact`).

**Proposed unified `init`** (detects project type, single entry point):
- `synth init` — interactive: detect greenfield/brownfield/legacy, guide onboarding.
- `synth init --analyze` — read-only discovery (was `discover`).
- `synth init --brownfield [--approve]` — transform existing repo (was `bootstrap`).
- `synth init --greenfield "<intent>"` — idea→project flow (was `first-contact start`…materialize).
- Legacy import dropped (no real installs); one-time `init --archive-legacy` optional cleanup only if needed.

**Removals:** `bootstrap`, `discover`, `first-contact`, `genesis` (all folded into `init`).

---

## 3. Mission-Studio cluster — `mission`, `program`, `project`, `alignment`, `intent`

**Classification (used = has test coverage):**
- **TOTAL KEEP — `mission`**: core concept; heavily used (create/approve/snapshot/show/evidence/complete).
- **TOTAL KEEP — `alignment`**: required for `mission approve` (--alignment-contract-id). Used (`alignment prepare` exercised). Simplify: default contract in `mission approve` (friction Pattern D); drop the `create`-from-intent-model path once `intent` is removed.
- **MEANINGFUL & EASY TO ADOPT/RENAME — `project`**: only regenerates `AGENTS.md` (`project AGENTS.md`, heavily tested). Misnamed verb → rename to **`docs agents`** (fold into `docs` cluster).
- **MEANINGFUL & ADOPTED — `program`**: portfolio rollup (list/show/rank, tested). Keep; optionally surface via `status --programs` later. Not removed.
- **TOTALLY UNUSED — `intent`**: **zero test coverage**; the intent-model → alignment-contract pipeline is vestigial (only `alignment prepare` is exercised). **Recommend removal.** After removal, `alignment` keeps `prepare`/`submit`/`approve` only.

**Removals:** `intent` (unused). **Rename:** `project` → `docs agents`.

---

## 4. Validation cluster — `validate`, `verify`, `govern`

**Current:** `validate` (adaptive validator + `dependencies`/`artifact` subcommands), `verify` (invariants + `signatures`), `govern` (full pipeline; already runs validate+verify internally).

**Proposal — unify under `validate`:**
- `synth validate` (adaptive, existing).
- `synth validate verify` (absorb `verify`: invariants + `validate verify signatures`).
- `synth govern` stays as the full end-to-end pipeline (delegates to validate).

**Removals:** `verify` (fold → `validate verify`).

---

## 5. Introspection cluster — `adapter`, `capabilities`, `snapshot`

**Operator: "Ok."** Keep as-is. (`snapshot` retained in Observability §1; `adapter`/`capabilities` retained.)

**No changes.**

---

## 6. Integration cluster — `ai`, `repo`, `migrate`

- `ai` (`ai refresh`) — keep (small, distinct).
- `repo` (branch/pr/release/status) — keep.
- **`migrate` — REMOVE ENTIRELY** (operator decree: no real-world installs, no legacy support justified). Also aligns with existing expedition intent ("Rip out synth migrate subsystem"). Drop `detect`/`plan`/`archive`/`import` and the `first-contact onboard:archive` legacy path.

**Removals:** `migrate` (all of it).

---

## 7. Governance cluster — `expedition`, `approval`, `certify`

**HELD** per operator. Not finalized in this plan. Note for later: `approval`/`certify` are sub-concerns of `expedition` and are candidates to fold into `expedition approve`/`expedition certify` once discussed.

---

## Proposed consolidated verb set (≈12, from ~30)

`init` · `status` · `explain` · `log` · `doctor` · `validate` · `govern` · `docs` · `mission` · `expedition` · `repo` · `capabilities` (+ `adapter`, `snapshot`, `ai`, `version`, `checkpoint`, `help`).

**Removed:** `report`, `bootstrap`, `discover`, `first-contact`, `genesis`, `intent`, `migrate`, `verify`, `project`(→`docs agents`).
**Renamed:** `project AGENTS.md` → `docs agents`.

---

## Working plan (sequenced)

**Phase 1 — low-risk quick wins:**
1. Add `help` verb (friction Pattern B).
2. `explain` defaults to `replay`; remove `explain status`.
3. Remove `genesis` (alias).
4. Remove `migrate` entirely (incl. `first-contact onboard:archive`).
5. Fold `verify` → `validate verify`; keep `govern`.
6. Fold `report` → `status` (add rich mode).

**Phase 2 — init unification + mission-studio cleanup:**
7. Implement unified `init` (--analyze/--brownfield/--greenfield); remove `bootstrap`, `discover`, `first-contact`.
8. Rename `project AGENTS.md` → `docs agents`.
9. Remove `intent`; trim `alignment` to prepare/submit/approve; default alignment-contract in `mission approve` (Pattern D).

**Phase 3 — context inference (friction Patterns C/D/H):**
10. Infer lone draft/approved/executing ids; `expedition create` infers active mission (the "expedition new" pattern).

**Phase 4 — governance (HELD):** discuss `expedition`/`approval`/`certify` consolidation before touching.

**Cross-cutting:** apply context inference across remaining verbs; keep `program`, `adapter`, `capabilities`, `snapshot`, `ai` as-is (introspection "Ok").
