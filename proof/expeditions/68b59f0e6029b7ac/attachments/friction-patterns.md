# CLI Friction Patterns — Evidence for Expedition 68b59f0e

**Source:** `.synth/data/cli-errors.jsonl` (33 `CLIError` records, 2026-08-17 → 2026-08-22)
**Method:** Each pattern was re-verified against the current build via live CLI probes on branch `expedition/.../consolidate-cli-verbs-...-68b59f0`.
**Goal:** Decide which frictions are still real, plan a solution for every one, and feed the verb-reduction work.

## Classification legend
- **REAL** — reproducible user-facing friction in the current build.
- **BY-DESIGN** — intentional safety/phase gate; friction is the cost, mitigations possible.
- **TEST-ARTIFACT** — negative-test probe; error message is *correct*, no product fix needed (friendlier text optional).
- **BUG?** — needs deeper investigation to confirm real defect vs test.

---

## Pattern A — `explain` requires a subcommand (Usage error) — ~10 hits
- **Records:** lines 2,3,6,7,17,18,21,22,31,33
- **Verified REAL:** `synth explain` → `{"status":"error","kind":"CLIError",...Usage: synth explain <replay|lineage|...>}`
- **Root cause:** `explain` has no default subcommand; raw usage dumped on omission.
- **Note:** `explain` exposes `status`, `identity`, `resume`, `governance` as subcommands — duplicating the top-level `status` verb and the light-routed `explain identity/resume/governance`. Redundant surface.
- **Solution:** Default `synth explain` → `explain replay` (most common). Print a friendly subcommand menu instead of a raw usage string. Fold `explain status` into top-level `status` (keep `explain` for replay/lineage/proposals/snapshots/graph/diagnostics/identity/resume/governance only).

## Pattern B — `synth help` is an unknown command — 1 hit
- **Record:** line 32
- **Verified REAL:** `synth help` → `Unknown command: help`. Only `--help` on subcommands works.
- **Root cause:** No `help` verb registered.
- **Solution:** Add `synth help` (and `synth <cmd> help`) verb aliasing the help renderer. Trivial, high-value, zero-risk.

## Pattern C — `--draft-id is required` — 2 hits
- **Records:** lines 11, 14
- **Verified REAL:** `synth expedition approve` (no `--draft-id`) → error.
- **Root cause:** Explicit ID always required even when context is unambiguous.
- **Solution:** Context inference — when exactly one draft exists for the active mission, infer it; otherwise error listing the candidates. (`--all-drafts --mission` already exists; single-inference is a small addition.) Applies symmetrically to `commit --proposal-id` and `complete --id` (infer the lone approved/executing expedition).

## Pattern D — `Mission approval requires --alignment-contract-id` — 2 hits
- **Records:** lines 24, 27
- **Verified REAL:** `synth mission approve` (no flags) → error; suggestion already lists the one available contract.
- **Root cause:** Flag mandatory even when a single approved contract exists.
- **Solution:** Default `--alignment-contract-id` to the sole available approved contract; only prompt/error when multiple or none. Removes a recurring ceremony step.

## Pattern E — `LifecycleBlocked: Mission approval blocked while expedition X executing` — 3 hits
- **Records:** lines 25, 28, 29
- **Verified:** reproduced in prior sessions (intentional gate).
- **Classification:** BY-DESIGN (keeps mission scope coherent). Still friction.
- **Solution (discuss):** Relax only when the executing expedition belongs to the same mission and is in `completed`/near-close state, or surface a one-command "complete then approve" path. Do NOT remove the guard silently — discuss trade-off.

## Pattern F — `DirtyWorkingTreeBlocksCompletion` — 1 hit
- **Record:** line 26
- **Verified:** guard is intentional safety.
- **Classification:** BY-DESIGN, but the **message is friction** — it dumps a giant `git add ... && git commit ...` suggestion including derived paths (`proof/`, `.agents/`).
- **Solution:** Auto-ignore known-derived paths (`proof/`, `.agents/`, `dist/`, `.synth/data/canonical-state.json`) from the dirty-tree check; shorten the message; only flag genuine source changes.

## Pattern G — mutating command blocked during Discovery (`validate --full`, `init`) — 2 hits
- **Records:** lines 12, 15
- **Verified:** intentional (Discovery is read-only).
- **Classification:** BY-DESIGN friction.
- **Solution:** Message should state the current phase and the exact escape (`synth bootstrap --approve` / complete Discovery), instead of a bare "cannot run during Discovery".

## Pattern H — `Failed to create expedition ... PRECONDITION_FAILED: mission_exists` — 1 hit
- **Record:** line 30
- **Verified REAL (anti-pattern):** creating an expedition when a mission already exists fails with a cryptic capability error.
- **Root cause:** `expedition create` demands `--mission`; when omitted it errors, and the capability layer surfaces `mission_exists` instead of guiding.
- **Solution (the "expedition new" pattern):** `expedition create` infers the single active mission when `--mission` is omitted; if none executing, prompt the operator for a mission (exactly the example given). Optionally add `expedition new` as a thin alias. Replace the cryptic `PRECONDITION_FAILED: mission_exists` with a guided prompt.

## Pattern I — `snapshot certification failed ... signature does not match` — 4 hits
- **Records:** lines 1, 5, 16, 20
- **Paths:** `/var/folders/.../T/explain-observability-*/snapshots` → generated by snapshot-certification **tests** (tampered snapshots to verify the certifier rejects them).
- **Classification:** TEST-ARTIFACT (correct rejection). Mark BUG? only if reproducible outside tests.
- **Solution:** No product fix. If seen in real repos, investigate snapshot signing; otherwise leave. (Fold into the log-canonicalization expedition's reliability scope if it recurs.)

## Pattern J — `event log not found: .../definitely-missing-log.jsonl` — 4 hits
- **Records:** lines 4, 8, 19, 23
- **Filename `definitely-missing-log.jsonl`** → negative-test probe for `--log` handling.
- **Classification:** TEST-ARTIFACT. Error message is correct.
- **Solution:** Optional — when `--log` path is missing, suggest the default log location instead of only the path.

## Pattern K — `Unknown command` / `UNKNOWN_ADAPTER` — 3 hits
- **Records:** lines 9, 10, 13 (`does-not-exist`, `unknown-command-that-does-not-exist`, `unknown-command`)
- **Classification:** TEST-ARTIFACTS (negative tests). Messages are correct.
- **Solution:** Optional — add "did you mean?" suggestions for near-miss commands/adapters (cheap UX win, not required).

---

## Summary
- **Still real, fixable in 68b59f0e:** A (explain default + de-dupe `explain status`), B (`help` verb), C (draft-id inference), D (alignment-contract default), H (expedition-create mission inference / `new`).
- **By-design friction to discuss/mitigate:** E (mission-approval block), F (dirty-tree message + derived-path ignore), G (Discovery-phase message).
- **Test artifacts (no product fix):** I, J, K — optionally friendlier messages.
- **Meta:** the verb surface itself is redundant (`explain status` vs `status`; `mission`/`program`/`project`/`alignment`/`intent` cluster; `validate`/`verify`/`govern`; `init`/`bootstrap`/`first-contact`/`genesis`), reinforcing the verb-reduction mandate.
