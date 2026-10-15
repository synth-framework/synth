# EXP-CLI-003 — item 3: lazy namespace registry and handler extraction

Status: source work committed and pushed. The expedition is NOT complete: harness migration (item 4), the DERIVED budget guard and deliberate regression proof (item 5), and the remaining runtime/timing acceptance checks are still outstanding.

## Commits

- `d29ef08`: initial explain registry, dynamic status loading; pushed before continuing.
- `e9d0633`: replace both dispatch switches; extract the 97 local command handlers into single homes.
- `8f43e9e`: defer bootstrap/governance imports to their actual call sites.
- `b1244b4`: deliberately rebaseline certification matrix and repository-authority index.
- `95df32c`: correct stale and overstated loader comments; no executable behavior change.

All work remains on the verified branch `arena/d5e4625c-synth`.

## Source change and ownership

At the start of this item, synth.ts had 8609 lines after the four shared helper clusters were extracted. Immediately before the namespace extraction it had 8612 lines (the initial explain registry added comments). It is now **149 lines**, holding argument/output-mode processing, identity initialization, discovery-mode checks, lazy dispatch, and the post-command ceremony flush. There are no local cmd* definitions left there.

The registry owns 34 command names (33 distinct namespace routes, plus the existing genesis alias) and namespace/approve-specific help routing. There are 34 namespace modules, including a separate ledger module for expedition deliver/seal/abandon, and 11 shared command-support modules. The already-extracted args, working-tree, gate-reporting and ceremony clusters retain their single homes and state. No new CLI verbs were added.

Extraction used the TypeScript symbol table for dependency/ownership analysis, rather than counting identifier text. All 97 pre-extraction cmd* function bodies were compared byte-for-byte immediately after the move and matched, each with exactly one source definition. The subsequent lazy-import commit intentionally changes import timing at call sites; the final source still has exactly one definition of each of those 97 functions. No declarations were deleted as cleanup, including three previously unreachable declarations.

Both the command switch and the namespace-help switch were replaced. Existing sequencing is retained: namespace help before generic help; discovery checks before loading/executing a namespace; expedition lineage guard before its lifecycle dispatch; ceremony flush after execution. The shared ceremony helper no longer imports core/bootstrap statically just to expose its flush function. Inherited object keys such as constructor/toString/__proto__ are rejected by registry lookup.

Static SCC comparison of compiled JavaScript against d29ef08 found **no added cycles**. Three existing cyclic components remain: cli/ai-interaction-manifest + ai-metadata; sdk/files + workspace discovery; sdk/paths + artifacts. This is not a claim that the entire repository is cycle-free.

## Reproducible eager graphs

Run the committed measurement tool:

```sh
node scripts/audit-module-graph.js --root dist/cli/status-light.js --json
node scripts/audit-module-graph.js $(for f in dist/cli/commands-*.js; do printf ' --root %s' "$f"; done) --json
```

| Root | Before this item | Final modules / KB |
|---|---:|---:|
| shipped entry.js | 60 / 273 | **17 / 47** |
| compatibility synth.js | 302 / 2288 | **40 / 177** |
| status-light.js | 33 / 151 | 33 / 151 |
| main.js SDK root | 171 / 1103 | 171 / 1103 |
| mcp-server.js | 1 / 10 | 1 / 10 |

The shipped dispatcher satisfies <=25 modules / <=150 KB. All 34 namespace module roots are below the original **139-module** eager threshold; this does not raise the allowance merely because extraction added files. Examples: mission 83/487; expedition 90/574; first-contact 96/477; ledger 33/159; doctor 46/186; checkpoint 52/243; log 27/72; governance 115/571. Largest namespace root is repair at 134/925.

These are static-import closures per root, not measured whole-invocation unions. A route can load further modules dynamically for actual work, particularly bootstrap/replay/governance resolution. The forthcoming DERIVED guard must measure representative runtime routes too; these numbers alone do not prove every invocation's 40% acceptance criterion.

## Build identity and deliberate rebaseline

Before: **1062 files**, rootHash **76191d7beaa888d1**.
Initial registry: 1065 files, rootHash 01b2544f8b0a6f01.
Namespace extraction: 1200 files, rootHash 17064c3c47665556.
Lazy call-site imports: 1200 files, rootHash 7630448bc45949ca.
Final comment-corrected build: **1200 files**, rootHash **267cb1342a16e0b6**.

The increase is 46 modules including the registry, with JS/declaration/source-map outputs. dist remains untracked. Certification matrix and authority-index changes were committed deliberately in b1244b4. New timestamped certification reports from the test runs were removed; the 12 already tracked reports were retained. check-artifact-policy passed on 2255 tracked paths before this evidence attachment.

## Verification

- `npm run test:all`: rc=0 after extraction, 257989 ms; rc=0 after final executable changes, 243284 ms. The shim reports one aggregate task; its literal && chain's successful exit proves completion, not an invented per-test count.
- Final comment-only build: build rc=0; loader-entrypoint 25/25, no skips.
- Four source-path guard suites run explicitly: verify-engine, artifact-policy, governance-orchestration, impact-analyzer, all rc=0. Only verify-engine required relocation: its authority assertions now cover commands-log, commands-doctor and command-replay-health, and its forbidden legacy-only presence pattern scans all CLI TypeScript files. It was not deleted or weakened into checking an empty dispatcher.
- Targeted green suites also included explain-observability, synth, ambient-root-resolution, synth-cli, synth-bootstrap, bootstrap-human, bootstrap-output, repository-identity, resume-briefing, no-write-on-read, ledger-ceremony, ledger-delivery, ledger-abandonment, expedition-auto-commit, execution-commit and auto-commit-ignored-paths (see results attachment for run stages).
- Added registry tests reject inherited keys, preserve the bare-explain fast-path alias, and compare 27 namespace help routes plus two approval-specific help invocations across entry.js and synth.js.
- Full-output comparison against an independently built d29ef08 snapshot: 46 invocations for each entry point, **90/92 raw stdout matches** with equal exit codes and equal stderr after excluding only timestamped bootstrap diagnostics. Both remaining cases were explain agents: inspection showed only the `generatedAt` field differed; the JSON objects match after removing that one timestamp. Included all 12 explain subs, all namespace/approval help, log/status/verify, and unknown-command/subcommand failures. This is a before/after routing check, not yet the ceremony equivalence gate required for item 4.

### Two additional unchained reds — not counted as passes

- first-contact-onboard: `event log should be created`.
- task-cli: expected 2 tasks, got 8.

Both fail identically on the pre-extraction d29ef08 build (**01b2544f8b0a6f01**), on the extraction build (**17064c3c47665556**), and after the lazy imports. The pre-extraction build was produced by git archive into a separate scratch directory, not by changing branches. These are pre-existing test/fixture defects, not permission to claim those suites green. This work did not comprehensively rerun every unchained orphan.

## Real project health

Before attaching this evidence: verify rc=0, **6/6** checks; doctor **12/12**, status ok, **1200** dist files verified, **496 events** replayed and chained; checkpoint ok with **496 events** and the actual declared session branch; log --limit 3 reported total=496, matched=496, returned=3. doctor --fix only repointed the stale ledger anchor after source commits; new certification byproducts were removed before that operation, not committed as a fake ledger repair. This evidence ceremony will legitimately increase the event count.

## Timing: remaining acceptance is explicit

`node scripts/measure-cli-startup.js --runs 9 --label cli003-item3 --json-out ...` on the executable-final build, two cores / Node v22.22.3:

- node process floor: 20.3 ms median.
- shipped --version: **30.9 ms** (requested <=45).
- shipped explain replay: **78.3 ms** (requested <=110).
- shipped status: **141.1 ms** (requested <=130) — **NOT MET in this sample**.

No before/after speedup is claimed: this was one absolute timing sample, not a controlled A/B. Item 3's structural budgets are improved, but overall CLI-003 acceptance remains open.

## Append-only corrections to earlier claims

1. The dispatch at original line 7901 was the help switch; the main dispatch was switch(command) at 8273. Early line-number/heuristic reports selected the wrong switch. Both are now gone.
2. Four light explain routes versus twelve accepted subcommands was an intentional fallback arrangement, not by itself proof of behavioral divergence. The handlers were already single implementations. Actual retained differences are bare explain behavior and the pre-existing eight-name usage string. Source comments now say this accurately.
3. d29ef08's commit prose mistyped the old dist hash; the correct value is **76191d7beaa888d1**, as recorded above and in item3a evidence.
4. The original nine byte-identity guards cover version/help/status, NOT explain replay. Earlier comments claiming those nine proved replay identity were wrong. The complete-output before/after comparisons described here actually exercised all twelve explain subcommands.
5. The first 12-sub comparison truncated combined stdout/stderr to 400 bytes and captured the pipeline's last status; it did not prove full output or command exit equivalence. It is superseded by the complete subprocess comparison with separate streams and real exit codes.
6. Absence of bootstrap log lines is not proof that a module was not loaded. Load claims here come from the compiled import graph, not log silence.
7. Several legacy test files run custom main()/assert routines, not node:test describe/it groups. Running them with node --test wraps the whole file as one test; the higher internal counts cannot be inferred from that wrapper.
8. An intermediate lazy-import build failed on type-query scope. Results gathered against that partially emitted dist are not certification evidence. Type references were repaired, the successful build was restored/reproduced, and the full chain and targeted guards were rerun.

9. My first evidence invocation repeated --attach, but the parser retains only its last value. That ceremony attached the timing JSON, diff and test results, not the prose/graph/comparison files. The follow-up uses the implemented comma-separated --attach format to attach those files; this was an invocation error, not a claim that the command accepted all repeated flags.

## Next

1. Prove ceremony-path equivalence, then repoint tests/helpers/cli-harness.js to the shipped dispatcher (item 4).
2. Add the DERIVED load-budget guard, runtime representative measurements, and deliberate regression/failure/removal proof (item 5).
3. Resolve or honestly retain the remaining status timing and whole-invocation graph acceptance checks before completing CLI-003. LIFE-002 and CLEAN-001 remain downstream.
