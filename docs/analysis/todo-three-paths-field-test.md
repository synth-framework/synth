# “Build a TODO app” — three entry paths, actual SYNTH behavior

**Date:** 2026-10-15 (America/Hermosillo)

**Status:** disposable black-box product probe, not an expedition, implementation, customer approval, or claim that a working app was delivered.

**Checkout:** `arena/d5e4625c-synth` at `89819b5614bcbb89c077eae3dd325f772fc30200`; built CLI `dist/cli/entry.js`, Node v22.22.3, SYNTH v2.6.1. This report was written after the probes; the current checkout's `.synth` state was never used as a test fixture or changed.

## Why this probe

The project owner describes SYNTH's intended value as a human–AI preamble that converts vague engineering intent into deliberate choices, a precise mission and build plan, and an outcome checked against that intent. They asked to try the same request, **“Build a TODO app,”** through greenfield, brownfield, and documentation-only approaches. I therefore drove the **shipped CLI**, not a hand-written plan masquerading as SYNTH output. No code generator or human agent was supplied to fill SYNTH's gaps. The result below is an observed limit of these entry paths, **not** a proof that all SDK integrations or historical versions have the same behavior.

## Fixtures and boundaries

Three separate temporary directories under `/tmp/synth-todo-probe-dda_w9w8` (ephemeral, not included in Git):

| Case | Initial state | What SYNTH should have noticed before choosing a plan |
|---|---|---|
| Greenfield | Empty directory | Audience, platform, storage, offline/sync, account and deploy expectations are unstated. No stack should be silently made authoritative. |
| Brownfield | `package.json` with `npm test`; `src/todos.js` exports `addTodo`, `listTodos`, `completeTodo` backed by an **in-memory** array; one passing Node test; README says no persistence, users, UI or deployment recipe. | Preserve and assess existing JavaScript/Node implementation; identify missing persistence, editing/deletion, test coverage and delivery before proposing migration. |
| Documentation-only | README and `docs/product.md` require task creation/editing/completion/deletion and persistence; `docs/constraints.md` says **all data stays on-device/no account/server**, while a second stakeholder requests **cross-device sync**; platform, language and authentication undecided. No application code. | Treat local-only versus cross-device sync as an unresolved product decision. Extract the desired outcome and constraints before selecting architecture. |

The conflict in the documentation fixture is **deliberate**; it is a diagnostic, not a suggestion to resolve it by guessing. The brownfield prototype and docs are small controlled fixtures, not representative customer repositories. Tests were run without connecting external services, creating new Git branches, or touching this repository's authoritative ledger.

### Reproduction procedure

The exact request string for all three was `Build a TODO app`. With `CLI=/home/user/synth/dist/cli/entry.js`, in **each untouched fixture**:

```sh
node "$CLI" first-contact --dry-run
node "$CLI" discover .
node "$CLI" bootstrap . --dry-run
node "$CLI" first-contact start "Build a TODO app"
node "$CLI" first-contact clarify
node "$CLI" first-contact project
node "$CLI" first-contact verify
```

`start` writes **only that fixture's** `.synth/first-contact/draft.json` and transcript. To exercise the technical continuation, I then supplied **five explicitly hypothetical, non-owner answers** via `first-contact clarify --field ... --answer ...`:

| Field | Greenfield | Brownfield | Documentation-only |
|---|---|---|---|
| `audience.primaryUsers` | individuals | individuals | individuals |
| `audience.stakeholders` | product owner | product owner | product owner |
| `environment.targetRuntime` | web | web | web |
| `environment.languagePreferences` | typescript | javascript (matches the fixture) | typescript |
| `capabilities.required` | create tasks; complete tasks; persist tasks | same | same |

These are **synthetic test inputs**, not the user's product decisions. Crucially, the docs conflict was **not** resolved in those answers. In each disposable fixture I ran `clarify`, `project`, `verify`, `approve`, `materialize --dry-run`, `materialize --approve`, `first-contact status`, `explain replay --json`, and `verify --json`. The `approve` calls certify **only these fabricated sandbox artifacts**, not a real project or a stakeholder choice. In a second set of fresh copies without first-contact files I separately ran `bootstrap . --approve`, so the two onboarding paths were not conflated.

## What happened

| Check | Greenfield | Brownfield | Documentation-only |
|---|---|---|---|
| `first-contact --dry-run` detects | `empty` | `brownfield` | **`brownfield`**, not a separate docs-only onboarding plan |
| `discover .` / agent-context class | `empty` / `greenfield` | `node` / `brownfield-node`; sees tests and JavaScript | `unknown` / `brownfield-product`; recognizes specification-discovery and partial implementation |
| `bootstrap . --dry-run` proposes | “Establish deterministic governance baseline”; no expedition proposals | **same baseline mission**, no expedition proposals; no TODO-specific gap plan | **same baseline mission**, no expedition proposals; no request to resolve conflicting docs |
| `first-contact start` from exact request | Four unknowns; overall presence score 0.25 | **same** draft/unknowns/score | **same** draft/unknowns/score |
| `first-contact clarify` | Five generic questions: primary users, stakeholders, runtime, language, required capabilities | **same**, does not mention existing Node app/persistence gap | **same**, does not mention local-only versus sync |
| `first-contact project` before answers | One fallback: “unknown application in unspecified” | **same**, despite discovered Node code | **same**, despite product documents |
| `first-contact verify` before answers | **Blocked** on an unrecognized fallback assumption (“Operator will refine runtime and language choices”) | same | same |
| After five *synthetic* answers | `canApprove: true`; recommends **Next.js + Vercel static app**, `nextjs-chatbot` workflow | **same**, despite existing Node prototype; candidate rationale even says “TypeScript preference” after a JavaScript answer | **same**, despite unresolved no-server versus cross-device-sync conflict |
| Capability verification after answers | **Passed**, although Vercel availability is `UNAVAILABLE` / manually unverified | same | same |
| Simulated approval + `materialize --approve` | Creates `.synth` manifest, proposal JSON and events; **no TODO source code** | same; pre-existing source/test unchanged | same; no source code and no contradiction decision |
| Post-materialization `explain replay --json` / `verify --json` | Replay **consistent**, 4 events; verify **5/6**, Drift fails | same | same |
| Separate `bootstrap . --approve` copy | Adds governance/docs files; **no app** and no mission record | Adds governance/docs files and a `govern: npm test` script to `package.json`; the original **one** test passes, but no TODO functionality is added | Adds governance/generated docs, **no app**; generated AI context repeats both stakeholder notes but does not settle their conflict |

All invoked subprocesses returned their captured exit codes; initial `first-contact verify` exited 1; subsequent `first-contact verify` passed after hypothetical answers. The three post-materialization `verify --json` checks each returned 1 because `Drift` says **“Canonical state lags the event log: state offset 0 < event count 4.”** `ReplayIntegrity` itself passes, as does `explain replay`; this is a real inconsistency between two shipped health surfaces, not a claim that the event hashes are invalid. The generated greenfield/documentation fixtures have no application `src/`, executable TODO behavior or application tests. The brownfield fixture still has only its original in-memory module and one test. No production deployment or safety checks were established.

### Concrete output samples

- First-contact's real five questions include “Who are the primary users of this system?”, “Where will this system run? (e.g., web, CLI, mobile, desktop)”, and “What programming language(s) should be used?” There was **no storage question or option comparison**, even though persistence was one of the synthetic capabilities used to continue.
- Greenfield's materialized mission subject is **“Build a TODO app”**, but its purpose is **“Establish deterministic governance baseline for Next.js + Vercel static app.”** The two expeditions are **“Greenfield Baseline Capture”** and **“Architecture Validation”**, not a derived task model, persistence plan, or acceptance test suite. Brownfield and documentation-only got the **same two expedition subjects**.
- `first-contact materialize --dry-run` chose a **`nextjs-chatbot`** workflow for all three. A generic chatbot template is not a TODO-specific plan. This is a selection error on this fixture, not evidence that all templates are unused.
- In documentation-only, the generated `docs/generated/AI_CONTEXT.md` does reproduce both on-device and cross-device-sync stakeholder notes; **the first-contact approval path did not consume or reconcile them**. Distinguish “text was copied into a projection” from “contradiction was resolved.”

## Targeted existing-test signal

After the black-box run I also executed `node --test tests/first-contact-cli.test.js tests/first-contact-clarify.test.js tests/first-contact-materialize.test.js tests/bootstrap-discovery-integration.test.js`. **Six tests passed, two failed**: `first-contact-cli.test.js` and `first-contact-materialize.test.js` still try to read the old monolithic `.synth/data/event-log.jsonl`, whereas this run produced partitioned `.synth/data/event-stream/` segments. The failing tests were not changed or dismissed as new regressions. Conversely, the passing bootstrap-discovery/clarification tests do not establish the complete product journey. The test command ran against the unchanged source/build; this report adds no production code.

## Interpretation and next proof, not a wholesale rewrite

The CLI has useful building blocks: it classifies repository shape, stores first-contact drafts/answers, blocks an unrecognized architecture assumption, emits traceable artifacts and can replay their four-event journal. But **this end-to-end probe did not build or specify a TODO app**. Its discovery/bootstrapping and first-contact paths do not share enough product context; approval readiness is driven by a few answered fields, not by whether the important contextual ambiguity was resolved; the produced mission and workflow are generic. Successful `bootstrap --approve` or `first-contact materialize --approve` means **governance scaffolding**, not product completion.

The narrowest recovery target is a **single product-facing acceptance test across three fixtures**: greenfield asks and proposes bounded, relevant choices; brownfield cites existing implementation and proposes a delta; docs-only flags the local/sync contradiction and refuses a definitive architecture until a human chooses. Each yields a TODO-specific, testable contract and plan, and a separate execution phase must deliver behavior and evidence that satisfy it. Existing tests should be checked for demo/runtime-only assertions versus this real CLI-to-result outcome. Independently, make first-contact's persisted state pass both replay and verification. Do not add another gate or large persistence system before these seams are measured and repaired.

**Limits:** The owner's report that SYNTH used to achieve this journey was not independently time-located here (the repository checkout is shallow). This probe did **not** test an injected intelligent extraction adapter, an autonomous coding agent, or a large real repository; it exercised the default built CLI and its separate bootstrap flow only. Hypothetical answers and sandbox approvals must not be presented as the owner's authorization. No change to CLI-003, STATE-001, LIFE-002, branch policy, or PR integration is implied by this report.
