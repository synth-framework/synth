# EXP-CLI-001 (2c13ca22fb8c4e6c) — Phase 0 evidence

Recorded 2026-10-13 on branch `arena/15e0fc51-synth`, 2-core sandbox (`nproc=2`), real repository
with a live segmented ledger.

## 1. What changed

Source:
- **new** `src/cli/usage.ts` — the canonical CLI surface: `COMMANDS` (33 verbs, extracted verbatim
  from the monolith), `PUBLIC_VOCABULARY`, `GLOBAL_OPTIONS`, `helpPayload()`, `renderHelpText()`,
  `printHelp(version, human?)` with the TTY rule.
- **new** `src/cli/version.ts` — `projectVersion()`, `printVersion(version, human?)`.
- **rewritten** `src/cli/entry.ts` (~120 lines) — imports both, adds `applyOutputFlags(argv)` with
  precedence `--json` > `--human` > TTY; keeps `LIGHT_COMMANDS`, the per-verb lazy imports, the
  `run()` export and the `isMainModule()` guard.
- **edited** `src/cli/synth.ts` — 9163 → **9121 lines**. Deleted its private `PUBLIC_VOCABULARY`
  and `COMMANDS` (now imported from `./usage.js`); `cmdVersion` → `printVersion`; `cmdHelp` →
  `printHelp`; `cmdStatus` → `await import("./status-light.js")` + `runStatus()` (the `new
  Logger("status")` line is gone); added `case "help":` alongside `case "version":`.
- `src/cli/status-light.ts` is **unchanged** but is now the single `status` implementation reached
  from both entry points. It had been a line-by-line copy of `cmdStatus` minus the Logger —
  decomposition by duplication, which is how the two paths drifted.

Tests and wiring:
- `tests/loader-entrypoint.test.js` — updated to the new contract and **wired into the chain** (it
  was the only test that spawned the shipped dispatcher, and it was orphaned: green but never run).
- `tests/governance-quiet-output.test.js`, `tests/clean-machine-output.test.js`,
  `tests/human-output-mode.test.js` — each asserted the *old* `status` stderr contract; updated to
  lock the new one.
- `package.json` + `data/tasks/test:loader-entrypoint.task.json` + `data/tasks/test:all.task.json`
  — the chain is now **115 `&&` segments**, ending with `npm run test:loader-entrypoint`.

## 2. Divergence before → after

Nine invocations, stdout captured separately from stderr, exit codes compared. `before` is the
measurement recorded in refine `1f429d32`; `after` was re-measured post-build.

| invocation | before | after |
|---|---|---|
| `version` | entry bare `2.6.1` / synth JSON envelope | **byte-identical** (90 B), rc 0 |
| `--version` | diverged | **byte-identical**, rc 0 |
| `-v` | diverged | **byte-identical**, rc 0 |
| `help` | entry prose rc 0 / synth `CLIError` **rc 1** | **byte-identical** (4892 B), rc 0 |
| `--help` | entry prose / synth JSON | **byte-identical**, rc 0 |
| `-h` | diverged | **byte-identical**, rc 0 |
| `status` | identical stdout, synth emitted an extra stderr INFO line | **byte-identical** (32829 B), 0 non-bootstrap stderr lines on both |
| `status --json` | identical stdout, stderr differed | **byte-identical**, rc 0 |
| `status --human` | entry returned **JSON** (flag ignored) / synth prose | **byte-identical prose** (214 B), rc 0 |

7 of 9 diverged before; **9 of 9 are byte-identical now**, with matching exit codes. `status`
output was confirmed stable across repeated runs (same md5), so byte-identity is not flaky.

Additional contract checks:
- `version --human` → bare `2.6.1` on both paths.
- `help --human` → prose starting `synth v2.6.1` on both.
- TTY rule verified in-process by stubbing `process.stdout.isTTY`: `true` → prose, `false` → JSON
  envelope, and an explicit `--json` beats the TTY heuristic.
- Piped `help` payload keeps the same 8 keys in the same order (`status, name, description, usage,
  commands, vocabulary, globalOptions, note`), 33 commands, 7 vocabulary terms, 6 global options,
  same note — so agent consumers see an unchanged shape.
- The shipped help now includes the four verbs it used to omit: `verify`, `task`, `release`,
  `report`.

## 3. Operator decisions honored (all four, as recorded)

1. `--version` is a JSON envelope everywhere; `--human` yields the bare string.
2. The `status` stderr INFO line is dropped from **both** paths.
3. `help`/`--help` render prose on a TTY and JSON when piped, with `--human`/`--json` overrides —
   help only; every other verb stays JSON-by-default.
4. One unified 33-verb command list, using the monolith's richer wording.

## 4. Verification

- **`npm run test:all`: rc=0 in 407 s** (baseline 334 s), all 115 segments. Proof the new task
  actually executed: the runner swallows child stdout on success, so (a) `synth task explain
  test:all` resolves to a command ending in `&& npm run test:loader-entrypoint`, and (b) under `&&`
  semantics rc=0 means every segment ran and exited 0.
- **`tests/loader-entrypoint.test.js`: 23 pass / 0 fail** (~6.0 s). Before this change it was
  10 pass / 3 fail *and orphaned*. It now carries 9 byte-identity guards over the unified surface
  plus contract assertions on the envelope, `--human`, and the 33-verb list.
- **Blast radius, 19 suites run individually: 18 green.** Suites: loader-entrypoint, synth-cli,
  command-safety, first-operator-experience, human-output-mode, homepage-public-vocabulary,
  agent-guide, capabilities-cli, installer-contract, brownfield-certification,
  repo-local-synth-shim, synth-cli-repo, environment-capability-report,
  environment-discovery-evidence, environment-discovery, installer-distribution, installer-upgrade,
  installer-verify, dry-run-readonly. Plus clean-machine-output, verify-engine, no-write-on-read,
  capability-registry-accuracy, synth-cli-govern-explain, cli-contract,
  explain-status-actionable — all green after their updates.
- **`synth verify`: `status: ok`, 6 total / 6 pass / 0 fail / 0 warn / 0 skipped.**
- **`synth doctor`: 11 of 12 checks ok before housekeeping, 12 of 12 after.** The only not-ok was
  `ledgerSync` — "Anchor is behind arena/15e0fc51-synth by 11 commit(s)", a pre-existing condition
  caused by this branch's earlier ceremony commits, not by this change. Running the sanctioned
  remedy `synth doctor --fix` re-pointed the anchor ("Anchor tracks arena/15e0fc51-synth
  (1f429d32)") and returned `status: ok, healthy: true`; it created no commit and left the working
  tree untouched. `distIntegrity` verifies **1050 dist files**; `replay` and `eventChain` both
  report "470 events, segmented layout".
- **Ledger intact:** events 462 → 470 (this turn's lifecycle transitions), layout segmented,
  replay consistent.
- `installer-upgrade` was checked specifically: it scans `--version` output with
  `/(\d+\.\d+\.\d+[^\s]*)/`, which still matches inside the JSON envelope. Green.

### Pre-existing reds, proven not caused by this change

Each was run against **both** builds in the same session (pre-change source stashed, rebuilt,
re-run, restored, rebuilt), with a probe confirming the build actually reverted (`entry.js version`
prints `2.6.1` on the old build and `{` on the new):

| suite | chained? | failure | old build | new build |
|---|---|---|---|---|
| `synth-cli-repo` | no (orphan) | `repo branch create should exit 0` | rc=1 | rc=1 |
| `migration` | no (orphan) | ENOENT on a temp archive dir | rc=1 | rc=1 |
| `first-contact-cli` | no (orphan) | — | rc=1 | rc=1 |
| `governance-report-cli` | no (orphan) | `expedition report falls back to runtime state…` | rc=1 | rc=1 |

All four fail identically on the pre-change build, and none is among the 115 chain segments. They
are part of the known red-orphan population, not regressions.

A measurement note worth keeping: an early `grep -c "<name>" data/tasks/test:all.task.json` was used
to decide whether a suite was chained. That is **invalid** — every task file's `description` field
contains the words "npm script migration", so the count is 1 for unrelated names. Chain membership
must be read from the parsed `command` field (115 `&&` segments), which is what the table above uses.

## 5. Eager module graphs (deterministic)

Transitive closure of **static** imports only (dynamic `import()` is lazy by definition), counting
`.js` files under the repository and their bytes:

| entry point | before | after |
|---|---|---|
| `dist/cli/entry.js` | 145 modules / 964 KB | **147 / 972 KB** |
| `dist/cli/synth.js` | 296 / 2272 KB | **298 / 2275 KB** |
| `dist/cli/status-light.js` | 134 / 916 KB | **134 / 916 KB** (unchanged) |
| `dist/core/bootstrap.js` | 170 / 1091 KB | 170 / 1089 KB |
| `dist/cli/usage.js` (new) | — | 12 / 31 KB |
| `dist/cli/version.js` (new) | — | 12 / 26 KB |

The two shared modules cost the light path **+2 modules / +8 KB** and the heavy path +2 / +3 KB.
`dist-manifest.json` moves 1044 → **1050 files**, rootHash `13e1948b…` → **`3a59324b…`** — a
deliberate re-baseline for the two added modules and their `.js`/`.d.ts`/`.map` outputs. `dist/` is
gitignored, so nothing derived is committed.

## 6. Timing: no claim is made, and why

Same-session A/B, both builds, 9-run medians, `nproc=2`:

| invocation | old | new | Δ | Δ minus control |
|---|---|---|---|---|
| floor `node -e '1'` | 24.0 ms | 29.4 ms | +5.4 | — |
| `entry.js --version` | 87.1 | 93.5 | +6.4 | −1.6 |
| `synth.js --version` | 147.5 | 161.7 | +14.2 | +6.2 |
| `entry.js status` | 211.6 | 237.6 | +26.0 | +18.0 |
| `synth.js status` | 258.5 | 261.1 | +2.6 | −5.4 |
| **CONTROL** `entry.js explain replay` (untouched code) | 134.6 | 142.6 | **+8.0** | — |

A second A/B run gave control +3.1 ms with `synth.js --version` at +39.6 ms, while the process
floor swung between 20 ms and 36 ms across the session. **An untouched code path moving +3 to
+8 ms is larger than most of the deltas being measured**, so no per-invocation timing effect is
distinguishable from noise here. Phase 0 therefore makes no speed claim in either direction; the
deterministic module counts in §5 are the honest measure of what it cost.

The goal's budgets are **not met** and were not attempted in this phase: `--version` measures
87–94 ms against a ≤45 ms budget, and the dispatcher's eager graph is 147 modules / 972 KB against
a ≤25 modules / ≤150 KB budget. Meeting them is Phases 2–4 (slim `status-light`, verb→loader
registry, then the derived load-budget guard that fails on regression). No such guard exists yet.

## 7. Deviations from the goal's non-goals — deliberate and authorized

The goal states "No behaviour, flag, output or verb-surface changes" and "the only test edits are
the harness path and the four source-path guards that move with the code." Both were violated on
purpose, and are recorded here rather than smoothed over:

1. **Unifying two paths that already disagree necessarily moves one of them.** There is no edit that
   makes `entry.js` and `synth.js` agree on `version` without changing what one of them prints. The
   operator chose the direction in the four decisions in §3, so these are authorized changes, not
   accidents. The full list of observable deltas: entry `version/--version/-v` bare semver → JSON
   envelope; synth bare `help` rc 1 `CLIError` → rc 0; entry `help/--help/-h` prose-when-piped →
   JSON-when-piped (prose preserved on a TTY and via `--human`); entry `status --human` JSON →
   prose; the `status` stderr INFO line removed from both; shipped help 30 → 33 verbs and 21
   drifted descriptions replaced by the monolith's wording.
2. **Four test files were edited**, not just the harness: the three chained/orphaned suites that
   asserted the old stderr contract, plus the dispatcher test that asserted a bare semver. Two of
   them are chain segments (`governance-quiet-output` #2, `clean-machine-output` #83) and each
   turned the chain red until updated — which is evidence the chain really does guard this
   contract. Every edit *locks the new contract* rather than deleting coverage: the assertions were
   inverted, not removed, and comments cite the decision.
3. **`tests/helpers/cli-harness.js:24` was NOT repointed** — that is Phase 4 in the goal. It still
   spawns `dist/cli/synth.js`. It is now *safe* to repoint, because the two paths are byte-identical
   across the measured surface; the census shows 1536 of 1572 CLI invocations in a full run spawn
   `synth.js`, so repointing is the step that changes what the suite actually exercises.
4. **The four source-path guards did not need to move**: `src/cli/synth.ts` still exists at the same
   path, so `verify-engine`, `artifact-policy`, `governance-orchestration` and `impact-analyzer` are
   untouched and green.

## 8. Phase 1 audit result (restated from refine `1f429d32`)

Across 347 `src/**/*.ts` files: exactly **5 module-scope `process.cwd()` captures**
(`infra/event-store.ts:13` `EVENT_LOG_FILE`, `:14` `EVENT_STREAM_DIR`, `infra/state-store.ts:12`
`STATE_FILE`, `:13` `SNAPSHOTS_DIR`, `infra/checkpoint-store.ts:11` `CHECKPOINT_FILE`), **0**
module-scope `process.env` reads, **0** module-scope `process.on()` registrations. The 20 top-level
`new Set/Map` are immutable lookup tables. These five constants are the correctness hazard for
Phases 2–4: making anything lazy changes *when* a module is first imported, so any verb that
resolves roots or changes cwd later could observe different values. They must resolve per call
before the dispatcher becomes a verb→loader registry.

## 9. Remaining work (Phases 2–4)

Make the 5 cwd-bound constants resolve per call; extract the helper clusters (git/working-tree,
ceremony/auto-commit, gates, telemetry/args); turn `synth.ts` dispatch into a verb→loader registry
with per-namespace dynamic imports; shrink `status-light`'s 134-module graph so the dispatcher
approaches ≤25 modules; repoint `cli-harness.js:24` at the shipped entry point; add the derived
load-budget guard and re-baseline dist-manifest / determinism / proof.
