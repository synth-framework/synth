# EXP-CLI-003 item 2 — slim the light path

**Expedition:** `e47a186cb472a20a` (executing) · **Branch:** `arena/d5e4625c-synth`
**Source commit:** `550a581` · **Baseline:** `337a72f` · **Date:** 2026-10-15
**dist-manifest re-baselined:** 1050 files, rootHash `85a97f1c872cdb7c` → `850e7aa08f79bbec`

## Goal item, verbatim

> 2. Slim status-light.js below its 134-module / 916 KB graph so the dispatcher approaches budget.
>    It is 45% of the monolith's graph and is statically imported by entry.ts, which is why the
>    "light" path is not light. explain-replay-light.js at 45 modules proves the target is reachable.

## Diagnosis: the weight was not where the comments said it was

`status-light.ts` is 1126 bytes and its header claimed it "only pulls in bootstrap-free modules
(ai-metadata, status-briefing, status-validation)". `ai-metadata` is not imported at all. Measuring
each edge with `scripts/audit-module-graph.js --root` located the real weight:

| Edge | Eager graph | Imported by |
| --- | --- | --- |
| `runtime/governance-resolver.js` | **119 modules / 820 KB** | status-briefing |
| `capability/registry.js` | **64 / 429** | status-briefing |
| `validation/planner.js` | **58 / 353** | status-validation |
| `task/task-registry.js` | **55 / 332** | status-validation |
| `mission-studio/adapter-registry.js` | **54 / 331** | status-briefing |
| `sdk/index.js` (the barrel) | 20 / 44 | status-light |
| `cli/print.js` | 12 / 24 | status-light |
| `ledger/delivery.js` | 1 / 17 | status-briefing |
| `runtime/transition-engine.js` | 2 / 6 | status-briefing |
| `runtime/status-projection.js` | 2 / 20 | status-briefing |
| `cli/capabilities-data.js` | 2 / 32 | status-briefing |
| `governance/impact-analyzer.js` | 2 / 15 | status-validation |

The sdk barrel — the obvious suspect, since `status-light.ts` uses only two names from it
(`sdk.paths.ensureDataDir`, `sdk.workspace.root()`) — is 20 modules. `explain-replay-light.ts`
imports the same barrel and sits at 45 modules, which is what made the barrel look guilty and is
what the goal cites as proof the target is reachable. It was never the barrel.

`status-validation.ts` carried the same false claim: "bootstrap-free … only read the working tree
and a capability map", while statically pulling 61 modules / 373 KB.

## Change

`status` genuinely needs all five heavy modules — the briefing *is* a projection of the governance
resolver — so this changes **when** they load, not whether. Each moves to `await import()` at its
single call site, both call sites already being inside `async` functions
(`buildOperatorBriefing:88`, `buildStatusValidationSummary:87`). Type-only imports stay static
(erased at compile time, no runtime edge); the eight cheap edges stay static. Both header comments
now carry measured numbers instead of the claim.

## Result, deterministic

| Entry | Before | After | Δ |
| --- | --- | --- | --- |
| `dist/cli/status-light.js` | 134 modules / 918 KB | **33 / 151** | −101 modules, −767 KB |
| `dist/cli/entry.js` (shipped dispatcher) | 147 / 976 | **60 / 273** | −87 modules, −703 KB |
| `dist/cli/synth.js` | 298 / 2282 | 298 / 2283 | +1 KB |
| `dist/main.js` | 171 / 1103 | 171 / 1103 | unchanged |
| unreachable | 44 of 348 / 2855 lines | 44 of 348 / 2855 | unchanged |

Budget is `dispatcher eager graph <= 25 modules / <= 150 KB`. `status-light.js` is now **33 / 151**
— within 8 modules and 1 KB of it. The dispatcher at 60 / 273 is not yet there because `entry.ts`
still statically imports `explain-replay-light` (45 modules); that is item 3's work.

## Correctness: guarded, not asserted

`tests/loader-entrypoint.test.js` holds nine byte-identity guards comparing this entry against the
heavy one across `--version`, `-v`, `help`, `--help`, `-h`, `status`, `status --json`,
`status --human`, with matching exit codes. It passes. Also green: `ambient-root-resolution` (6),
`operator-briefing` (7), `validate-confidence-transparency` (5), `explain-observability` (25),
`no-write-on-read`, `clean-machine-output` (4), `synth.test.js` (125 assertions). Full results in
`test-results.txt`.

## Timing: NO claim is published, and here is the bound

The A/B (revert the two files to `337a72f`, rebuild, measure both builds in one session, restore)
produced raw deltas of −27.6 ms on `entry.js --version` and −28.7 ms on `entry.js help`. **They are
not publishable**: the control invocation (`entry.js explain replay`, code untouched) drifted
−15.5 ms between the two passes, and the goal's rule is that the control's drift bounds every claim.
After adjustment the script itself labels them `NOT A CLAIM (within control drift)`.

To separate machine noise from the change, the identical build was measured twice with no code
change at all (rootHash held at `850e7aa08f79bbec`): the control stayed quiet at −0.8 ms while
individual invocations still swung up to 8.7 ms adjusted (`synth.js help` +8.7, `entry.js status`
−6.7). So on this 2-core box per-invocation noise is ~9 ms with a quiet control, and a −15.5 ms
control drift means the whole machine shifted between passes.

What can be said factually about absolute medians on the post-change build: `entry.js explain replay`
79.7–80.5 ms against a ≤110 ms budget (**inside**), `entry.js --version` 44.1–47.0 ms against ≤45 ms
(**on the line, straddling it**), `entry.js status` 122.9–130.4 ms against ≤130 ms (**on the
line**). The pre-change build measured 71.0 ms and 155.8 ms for those two in the same session, which
is suggestive and not proof. The acceptance criteria stay **unmet-but-adjacent** until an A/B is run
whose control is quiet; the deterministic module counts above are the claim this item rests on.

## Build-revert probe

The goal warns that a build-revert control must be probed behaviourally. Here the probe was
cryptographic and stronger: reverting the two files reproduced rootHash `85a97f1c872cdb7c` — exactly
the pre-change artifact — and restoring them reproduced `850e7aa08f79bbec`. Both builds were
verifiably the builds they claimed to be. (A module-graph probe written for the same step failed on a
Python f-string backslash and printed nothing; the rootHash probe is the one that ran.)

## Remaining

* **Item 3** — verb → loader registry with per-namespace dynamic imports, and the helper clusters
  extracted once (git/working-tree, ceremony/auto-commit, gates, telemetry/args). This is what takes
  the dispatcher from 60 / 273 to ≤25 / 150.
* **Item 4** — repoint `tests/helpers/cli-harness.js:24` from `dist/cli/synth.js` at the shipped
  dispatcher, after proving the ceremony verbs equivalent (mission 427 and expedition 394 invocations
  are 52% of all calls).
* **Item 5** — the derived load-budget guard, proven with a deliberate temporary regression.
